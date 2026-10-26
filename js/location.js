// Where the weather is for: wherever the browser says you are, or a city you picked.
//
// Two modes: 'auto' asks the browser for a position (the first visit prompts), 'city'
// uses one chosen from the search in settings, without asking. There is no stand-in:
// until there is a place, there is no weather on screen, rather than some other city's.

// Before 1.8 the only alternative to your own location was Stockholm, so anyone who had
// picked it keeps it, now as their chosen city.
const STOCKHOLM = { lat: 59.33, lon: 18.07, name: 'Stockholm, Sweden' };

// Shown when a position resolved but the reverse lookup for its name did not.
const UNNAMED = 'Current location';

export const LOCATION_MODES = [
  { id: 'auto', label: 'My location' },
  { id: 'city', label: 'Choose a city' },
];

// Open-Meteo's place search, from the same people as the weather: free, no key. Names
// come back in English ("Gothenburg", "Munich") with local letters kept where English has
// no name of its own ("Söderköping").
const SEARCH = 'https://geocoding-api.open-meteo.com/v1/search';
const SHOWN_RESULTS = 5;

const STORAGE_KEY = 'clockspian.location';

// Two decimals is ~1 km: finer than weather varies, coarse enough not to store an
// address, and stable enough that small GPS jitter doesn't bust the weather cache.
const round = (n) => Math.round(n * 100) / 100;

// Client-side reverse geocoding, no key. BigDataCloud's terms allow this endpoint only
// for coordinates that came from the device itself — which is exactly the case here.
const GEOCODE = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

// Letters that don't decompose into a base letter plus accent.
const FOLD = { ø: 'o', Ø: 'O', æ: 'ae', Æ: 'AE', ß: 'ss', ł: 'l', Ł: 'L', đ: 'd', Đ: 'D' };
const fold = (c) => FOLD[c] || c.normalize('NFD').replace(/\p{M}/gu, '');

// The English names come back as plain ASCII ("Soderkoping"); the local-language ones
// keep their letters but add words ("Söderköpings kommun"). Find the English name inside
// the local one, and take that stretch of the local spelling. A real English exonym
// ("Gothenburg" for Göteborg) won't match, and stays as it is.
function respell(english, local) {
  if (!english || !local) return english;
  let folded = '';
  const from = []; // folded index → index in local
  for (let i = 0; i < local.length; i++) {
    for (const c of fold(local[i])) {
      from.push(i);
      folded += c;
    }
  }
  from.push(local.length);
  const at = folded.toLowerCase().indexOf(english.toLowerCase());
  if (at < 0) return english;
  const end = at + english.length;
  // Only whole local letters: "ae" from "æ" can't be split.
  if (from[at - 1] === from[at] || from[end - 1] === from[end]) return english;
  return local.slice(from[at], from[end]);
}

async function lookup(lat, lon, language) {
  const response = await fetch(
    `${GEOCODE}?latitude=${lat}&longitude=${lon}&localityLanguage=${language}`
  );
  return response.ok ? response.json() : null;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    if (stored.mode === 'default') return { mode: 'city', found: stored.found || null, city: STOCKHOLM };
    if (stored.mode === 'city') return { mode: 'city', found: stored.found || null, city: stored.city || null };
    return { mode: 'auto', found: stored.found || null, city: stored.city || null };
  } catch {
    return { mode: 'auto', found: null, city: null };
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: state.mode, found: state.found, city: state.city }));
  } catch {
    // The choice still holds for this session.
  }
}

const state = load();

// 'idle' | 'locating' | 'located' | 'denied' | 'unavailable'
let status = 'idle';
let request = 0;
const listeners = new Set();

// The place the weather is for, or null while there isn't one yet: a chosen city not yet
// chosen, or a position not yet given.
export function getLocation() {
  if (state.mode === 'city') return state.city;
  if (!state.found) return null;
  return { ...state.found, name: state.found.name || UNNAMED };
}

export function getLocationState() {
  return { mode: state.mode, status, city: state.city };
}

export function onLocationChange(listener) {
  listeners.add(listener);
}

function emit() {
  const place = getLocation();
  listeners.forEach((listener) => listener(place, getLocationState()));
}

async function nameFor(lat, lon) {
  try {
    const [data, local] = await Promise.all([
      lookup(lat, lon, 'en'),
      lookup(lat, lon, 'default').catch(() => null),
    ]);
    if (!data) return null;
    const town = respell(
      data.city || data.locality || data.principalSubdivision,
      local && (local.city || local.locality || local.principalSubdivision)
    );
    if (!town) return data.countryName || null;
    return data.countryName ? `${town}, ${data.countryName}` : town;
  } catch {
    return null;
  }
}

function currentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      // Only runs once permission is granted — an open prompt doesn't count against it.
      timeout: 20000,
      maximumAge: 30 * 60 * 1000,
    });
  });
}

async function locate() {
  const token = ++request;
  const superseded = () => token !== request || state.mode !== 'auto';

  if (!('geolocation' in navigator) || !window.isSecureContext) {
    status = 'unavailable';
    emit();
    return;
  }

  status = 'locating';
  emit();

  let position;
  try {
    position = await currentPosition();
  } catch (error) {
    if (superseded()) return;
    if (error.code === error.PERMISSION_DENIED) {
      // Don't keep showing a place the user has since withdrawn permission for.
      state.found = null;
      save();
      status = 'denied';
    } else {
      // Timeout or no fix: a previously found place is still the best answer.
      status = 'unavailable';
    }
    emit();
    return;
  }
  if (superseded()) return;

  const lat = round(position.coords.latitude);
  const lon = round(position.coords.longitude);
  const known = state.found && state.found.lat === lat && state.found.lon === lon;

  // Names saved before 1.6.2 lost their accents ("Soderkoping"), so look those up again.
  if (!known || !state.found.name || !state.found.spelled) {
    // Switch the weather over now; the name follows when the lookup returns.
    state.found = { lat, lon, name: known ? state.found.name : null };
    status = 'located';
    save();
    emit();

    const name = await nameFor(lat, lon);
    if (superseded() || !name) return;
    state.found = { lat, lon, name, spelled: true };
    save();
  }

  status = 'located';
  emit();
}

export function setLocationMode(mode) {
  state.mode = mode === 'city' ? 'city' : 'auto';
  save();
  if (state.mode === 'auto') {
    locate();
  } else {
    request++;
    status = 'idle';
    emit();
  }
}

export function startLocation() {
  if (state.mode === 'auto') locate();
}

// Picking a city from the search is also choosing to use one.
export function setCity(city) {
  state.city = { lat: city.lat, lon: city.lon, name: city.name };
  state.mode = 'city';
  request++;
  status = 'idle';
  save();
  emit();
}

// Towns and cities matching what was typed, biggest first as Open-Meteo ranks them.
// Airports, parks and mountains named the same are left out. `region` is there to tell
// the Portlands apart; `name` is what the weather block shows.
export async function searchCities(query, signal) {
  const url = `${SEARCH}?name=${encodeURIComponent(query)}&count=20&language=en&format=json`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Place search responded ${response.status}`);
  const { results = [] } = await response.json();
  const seen = new Set();
  return results
    .filter((result) => result.feature_code?.startsWith('PPL'))
    .map((result) => ({
      lat: round(result.latitude),
      lon: round(result.longitude),
      city: result.name,
      region: [result.admin1, result.country].filter((part, i, all) => part && all.indexOf(part) === i).join(', '),
      name: result.country ? `${result.name}, ${result.country}` : result.name,
    }))
    .filter((result) => {
      const key = `${result.city}|${result.region}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, SHOWN_RESULTS);
}
