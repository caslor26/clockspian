// Open-Meteo — free, no API key, no attribution requirement beyond a courtesy link.
// One request covers everything on screen: current temperature, the WMO condition
// code, day/night, and today's high and low.

import { glyphFor } from './icons.js';
import { getLocation, onLocationChange } from './location.js';

function endpoint({ lat, lon }) {
  return (
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=1`
  );
}

const samePlace = (a, b) => a.lat === b.lat && a.lon === b.lon;

const REFRESH_MS = 10 * 60 * 1000;
const CACHE_KEY = 'clockspian.weather';
// Past this age a cached reading is worth showing but not worth trusting silently.
const STALE_AFTER_MS = 45 * 60 * 1000;

// WMO 4677 weather codes, collapsed to the categories the glyph set covers.
const CONDITIONS = {
  0:  { label: 'Clear',            icon: 'clear' },
  1:  { label: 'Mainly clear',     icon: 'mainly-clear' },
  2:  { label: 'Partly cloudy',    icon: 'partly-cloudy' },
  3:  { label: 'Overcast',         icon: 'overcast' },
  45: { label: 'Fog',              icon: 'fog' },
  48: { label: 'Rime fog',         icon: 'fog' },
  51: { label: 'Light drizzle',    icon: 'drizzle' },
  53: { label: 'Drizzle',          icon: 'drizzle' },
  55: { label: 'Heavy drizzle',    icon: 'drizzle' },
  56: { label: 'Freezing drizzle', icon: 'drizzle' },
  57: { label: 'Freezing drizzle', icon: 'drizzle' },
  61: { label: 'Light rain',       icon: 'rain' },
  63: { label: 'Rain',             icon: 'rain' },
  65: { label: 'Heavy rain',       icon: 'rain' },
  66: { label: 'Freezing rain',    icon: 'rain' },
  67: { label: 'Freezing rain',    icon: 'rain' },
  71: { label: 'Light snow',       icon: 'snow' },
  73: { label: 'Snow',             icon: 'snow' },
  75: { label: 'Heavy snow',       icon: 'snow' },
  77: { label: 'Snow grains',      icon: 'snow' },
  80: { label: 'Light showers',    icon: 'showers' },
  81: { label: 'Showers',          icon: 'showers' },
  82: { label: 'Heavy showers',    icon: 'showers' },
  85: { label: 'Snow showers',     icon: 'snow-showers' },
  86: { label: 'Snow showers',     icon: 'snow-showers' },
  95: { label: 'Thunderstorm',     icon: 'thunder' },
  96: { label: 'Thunderstorm',     icon: 'thunder' },
  99: { label: 'Thunderstorm',     icon: 'thunder' },
};

const UNKNOWN = { label: 'Unavailable', icon: 'overcast' };

function describe(code) {
  return CONDITIONS[code] || UNKNOWN;
}

// A reading only counts for the place it was fetched for — otherwise a move from
// Uppsala would show Uppsala's weather under the new town's name until the fetch lands.
function readCache(place) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const reading = raw ? JSON.parse(raw) : null;
    return reading && samePlace(reading, place) ? reading : null;
  } catch {
    return null;
  }
}

function writeCache(reading) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(reading));
  } catch {
    // Private browsing or a full quota — the display still works, just without
    // a warm start on the next load.
  }
}

async function fetchReading(place) {
  const response = await fetch(endpoint(place), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
  const data = await response.json();

  return {
    temp: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
    isDay: data.current.is_day === 1,
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
    lat: place.lat,
    lon: place.lon,
    at: Date.now(),
  };
}

export function initWeather() {
  const block = document.getElementById('weather');
  const glyph = document.getElementById('glyph');
  const tempEl = document.getElementById('temp');
  const conditionEl = document.getElementById('condition');
  const hiEl = document.getElementById('hi');
  const loEl = document.getElementById('lo');
  const placeEl = document.getElementById('place');

  let place = getLocation();
  placeEl.textContent = place.name;

  let lastGlyphKey = null;

  function render(reading, stale) {
    const { label, icon } = describe(reading.code);
    const key = `${icon}:${reading.isDay}`;

    // Only touch the DOM when the glyph actually changes — it usually doesn't,
    // and reassigning innerHTML would restart nothing but still churn.
    if (key !== lastGlyphKey) {
      glyph.innerHTML = glyphFor(icon, reading.isDay);
      lastGlyphKey = key;
    }

    tempEl.textContent = reading.temp;
    conditionEl.textContent = label;
    hiEl.textContent = `H ${reading.high}°`;
    loEl.textContent = `L ${reading.low}°`;
    block.classList.toggle('stale', stale);
  }

  // Shown when there is nothing to show: a first run with no cache and no network.
  // `code: null` falls through describe() to the "Unavailable" label, so the block
  // keeps its shape and reads as deliberately empty rather than half-rendered.
  const PLACEHOLDER = { temp: '--', code: null, isDay: true, high: '--', low: '--' };

  // Paint the cached reading before the network settles, so a reload never
  // flashes placeholder dashes.
  function paintCached() {
    const cached = readCache(place);
    if (cached) render(cached, Date.now() - cached.at > STALE_AFTER_MS);
    else render(PLACEHOLDER, false);
  }
  paintCached();

  async function refresh() {
    const target = place;
    try {
      const reading = await fetchReading(target);
      // The location moved while this was in flight; its own refresh is on the way.
      if (!samePlace(target, place)) return;
      writeCache(reading);
      render(reading, false);
    } catch {
      if (!samePlace(target, place)) return;
      // Keep whatever is on screen and mark it as last-known. A dropped Wi-Fi
      // connection should never blank out the dashboard.
      render(readCache(place) || PLACEHOLDER, true);
    }
  }

  onLocationChange((next) => {
    placeEl.textContent = next.name;
    if (samePlace(next, place)) return; // a name arriving, or a status change
    place = next;
    paintCached();
    refresh();
  });

  refresh();
  setInterval(refresh, REFRESH_MS);

  // The laptop lid closes; timers stall. Re-check as soon as it's on screen again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  window.addEventListener('online', refresh);
}
