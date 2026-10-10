// Where the weather is for. Uppsala unless the browser hands over a position.
//
// Two modes: 'auto' asks the browser for a position (the first visit prompts), 'default'
// pins Uppsala without asking. Anything short of a granted position — denied, timed out,
// no Geolocation API, not a secure context — leaves Uppsala on screen.

export const DEFAULT_PLACE = { lat: 59.8586, lon: 17.6389, name: 'Uppsala, Sweden' };

// Shown when a position resolved but the reverse lookup for its name did not.
const UNNAMED = 'Current location';

export const LOCATION_MODES = [
  { id: 'auto', label: 'My location' },
  { id: 'default', label: 'Uppsala' },
];

const STORAGE_KEY = 'clockspian.location';

// Two decimals is ~1 km: finer than weather varies, coarse enough not to store an
// address, and stable enough that small GPS jitter doesn't bust the weather cache.
const round = (n) => Math.round(n * 100) / 100;

// Client-side reverse geocoding, no key. BigDataCloud's terms allow this endpoint only
// for coordinates that came from the device itself — which is exactly the case here.
const GEOCODE =
  'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return { mode: stored.mode === 'default' ? 'default' : 'auto', found: stored.found || null };
  } catch {
    return { mode: 'auto', found: null };
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: state.mode, found: state.found }));
  } catch {
    // The choice still holds for this session.
  }
}

const state = load();

// 'idle' | 'locating' | 'located' | 'denied' | 'unavailable'
let status = 'idle';
let request = 0;
const listeners = new Set();

export function getLocation() {
  if (state.mode === 'default' || !state.found) return DEFAULT_PLACE;
  return { ...state.found, name: state.found.name || UNNAMED };
}

export function getLocationState() {
  return { mode: state.mode, status };
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
    const response = await fetch(`${GEOCODE}&latitude=${lat}&longitude=${lon}`);
    if (!response.ok) return null;
    const data = await response.json();
    const town = data.city || data.locality || data.principalSubdivision;
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

  if (!known || !state.found.name) {
    // Switch the weather over now; the name follows when the lookup returns.
    state.found = { lat, lon, name: known ? state.found.name : null };
    status = 'located';
    save();
    emit();

    const name = await nameFor(lat, lon);
    if (superseded() || !name) return;
    state.found = { lat, lon, name };
    save();
  }

  status = 'located';
  emit();
}

export function setLocationMode(mode) {
  state.mode = mode === 'default' ? 'default' : 'auto';
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
