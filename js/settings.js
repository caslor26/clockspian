import { LOCATION_MODES, getLocationState, onLocationChange, setLocationMode } from './location.js';
import { openAbout } from './about.js';
import { openWhatsNew } from './whatsnew.js';
import { VERSION } from './version.js';

// Persisted display settings. Everything is applied by writing CSS custom
// properties onto :root — no component knows what the current theme is.

const STORAGE_KEY = 'clockspian.settings';

// A theme is a typeface paired for good with a palette, and every theme carries both a
// dark and a light palette — the sun/moon switch picks between them, independently of
// which theme is chosen. apply() writes all of a palette's properties inline on :root
// every time, so the defaults in css/style.css only cover the frame before JS runs.
//
// --accent carries the highlights (colon, sun, high temperature, seconds bar), --accent-2 the quieter
// structural bits (date dot, brandmark dots). Light accents run darker than their dark-mode
// counterparts so the hi temperature still reads against a pale base.
//
// Every typeface here was measured for tabular figures — identical advance widths for
// 00:00 / 11:11 / 23:38 / 18:47 — so the clock's width never lurches. Most editorial
// serifs (Newsreader, Georgia) and many geometric sans (Lexend, Urbanist, Raleway) fail
// this. Do not add or swap a typeface without re-measuring.
//
// `font.url: null` is the system stack — no network request at all. Every other face sits
// on a Helvetica fallback, so a display that boots before the Wi-Fi connects still shows
// the time, just in the fallback until the font arrives.
// `font.family` is the Google Fonts family the panel loads to preview each name.
export const THEMES = [
  {
    // The default. Jost: geometric, Futura-like — the rounder counterpart to Inter's
    // grotesk — over a cool blue palette. This was "Dusk" until it became the house look.
    id: 'clockspian',
    label: 'Clockspian',
    font: {
      stack: `'Jost','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400&display=swap',
      family: 'Jost',
    },
    palettes: {
      dark: {
        '--bg': '#0e1218', '--line': '#232b37', '--fg': '#eef1f5', '--fg-dim': '#8791a0',
        '--accent': '#8aa4c9', '--accent-2': '#5a6f8a',
      },
      light: {
        '--bg': '#eff2f6', '--line': '#cfd6e0', '--fg': '#172030', '--fg-dim': '#626e82',
        '--accent': '#4a6890', '--accent-2': '#8fa3c0',
      },
    },
  },
  {
    // Kal Studio brand. Bricolage Grotesque for the hero digits, DM Sans for everything
    // else — the split the brand board specifies. Bricolage measures tabular; DM Sans
    // emphatically does not (00:00 is 534px where 11:11 is 247px at the same size), so
    // every numeric readout uses --font-display, not --font-stack. Do not move the time,
    // temperature or hi/lo onto the body face. Also the only theme with the brandmark.
    id: 'kal',
    label: 'Kal Studio',
    brand: true,
    font: {
      stack: `'DM Sans','Helvetica Neue',Arial,sans-serif`,
      display: `'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=DM+Sans:wght@300;400;500&display=swap',
      family: 'Bricolage+Grotesque',
    },
    // Bricolage's lightest cut is 300 — the 200 the clock normally runs at does not exist.
    timeWeight: '300',
    palettes: {
      dark: {
        '--bg': '#2b3a42',       // Djup
        '--line': '#3d5058',
        '--fg': '#f5f2eb',       // Linne
        '--fg-dim': '#9badb8',   // Dimma
        '--accent': '#e2ddd3',   // Näver
        '--accent-2': '#5c7a87', // Fjord
      },
      light: {
        '--bg': '#f5f2eb',       // Linne
        '--line': '#9badb8',     // Dimma — the board's border colour; Näver is too close
                                 // to Linne to read as a rule or a slider track
        '--fg': '#2b3a42',       // Djup
        '--fg-dim': '#7a8e98',
        '--accent': '#5c7a87',   // Fjord
        '--accent-2': '#9badb8', // Dimma
        '--panel-bg': '#e2ddd3', // Näver — the board's card surface
      },
    },
  },
  {
    // The Claude desktop app's look: its page colours and the clay of the Claude mark —
    // named a little off-brand on purpose, since it borrows the look, not the name.
    // Anthropic Serif is Anthropic's own face and isn't ours to serve, so it is only used
    // where it is already installed; everywhere else Source Serif 4 stands in. Both
    // measure tabular with 'tnum' on, which the clock sets — their default figures don't.
    id: 'claude',
    label: 'Clåde',
    font: {
      stack: `'Anthropic Serif','Source Serif 4',Georgia,serif`,
      url: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300;8..60,400&display=swap',
      family: 'Source+Serif+4',
    },
    // Anthropic Serif's lightest cut is 300.
    timeWeight: '300',
    palettes: {
      dark: {
        '--bg': '#262624', '--line': '#3f3e3a', '--fg': '#faf9f5', '--fg-dim': '#9c9a92',
        '--accent': '#d97757', '--accent-2': '#8f5a46',
      },
      light: {
        '--bg': '#faf9f5', '--line': '#dedcd1', '--fg': '#141413', '--fg-dim': '#73726c',
        '--accent': '#c6613f', '--accent-2': '#dfa48d',
      },
    },
  },
  {
    id: 'graphite',
    label: 'Graphite',
    font: {
      stack: `'Inter','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400&display=swap',
      family: 'Inter',
    },
    palettes: {
      dark: {
        '--bg': '#111213', '--line': '#2a2c2e', '--fg': '#efeee9', '--fg-dim': '#8b8e8f',
        '--accent': '#d6d3c8', '--accent-2': '#8a9490',
      },
      light: {
        '--bg': '#f3f3f1', '--line': '#d3d3d0', '--fg': '#161718', '--fg-dim': '#686b6d',
        '--accent': '#4b4e50', '--accent-2': '#9a9d9e',
      },
    },
  },
  {
    // The original Clockspian look: the system sans on warm paper with a tan accent.
    id: 'sand',
    label: 'Sand',
    font: { stack: `'Helvetica Neue',Arial,sans-serif`, url: null },
    palettes: {
      dark: {
        '--bg': '#0f1416', '--line': '#26312f', '--fg': '#f4f2ea', '--fg-dim': '#8a9490',
        '--accent': '#c9b28a', '--accent-2': '#5c7a70',
      },
      light: {
        '--bg': '#f4f2ea', '--line': '#d5d1c4', '--fg': '#1b2124', '--fg-dim': '#626b66',
        '--accent': '#896b37', '--accent-2': '#6f8c82',
      },
    },
  },
  {
    id: 'terminal',
    label: 'Terminal',
    font: {
      stack: `'IBM Plex Mono',ui-monospace,monospace`,
      url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@200;300;400&display=swap',
      family: 'IBM+Plex+Mono',
    },
    palettes: {
      dark: {
        '--bg': '#0d1312', '--line': '#22302c', '--fg': '#e8eee9', '--fg-dim': '#81928b',
        '--accent': '#7d9b8f', '--accent-2': '#4f6b61',
      },
      light: {
        '--bg': '#eef2ef', '--line': '#cdd8d2', '--fg': '#15201c', '--fg-dim': '#5d6f68',
        '--accent': '#4a7062', '--accent-2': '#8aa59a',
      },
    },
  },
  {
    // Spectral is the serif because it ships genuine tabular figures — see above.
    id: 'folio',
    label: 'Folio',
    font: {
      stack: `'Spectral',Georgia,serif`,
      url: 'https://fonts.googleapis.com/css2?family=Spectral:wght@200;300;400&display=swap',
      family: 'Spectral',
    },
    palettes: {
      dark: {
        '--bg': '#141110', '--line': '#322a26', '--fg': '#f3ede6', '--fg-dim': '#988c84',
        '--accent': '#c08e7d', '--accent-2': '#8a6155',
      },
      light: {
        '--bg': '#f7f2ea', '--line': '#ddd3c6', '--fg': '#2a211c', '--fg-dim': '#76685e',
        '--accent': '#9c5d48', '--accent-2': '#c4a392',
      },
    },
  },
];

const DEFAULTS = { scale: 1, blink: true, bar: true, theme: 'clockspian', mode: 'light', weather: true };

// Settings saved before themes existed held a typeface, an accent and a Kal Studio
// switch. Each typeface now lives in exactly one theme, so it alone decides the match.
const LEGACY_FONTS = { system: 'sand', inter: 'graphite', 'plex-mono': 'terminal', spectral: 'folio' };

function migrate(stored) {
  if ('theme' in stored || !('font' in stored || 'kal' in stored)) return stored;
  const { kal, kalMode, font, accent, ...rest } = stored;
  return {
    ...rest,
    theme: kal ? 'kal' : LEGACY_FONTS[font] || DEFAULTS.theme,
    // Kal Studio had its own light/dark; everything else was only ever dark, and stays so
    // rather than turning light under someone who already has it set up.
    mode: kal && kalMode !== 'dark' ? 'light' : 'dark',
  };
}

// Theme ids that have since changed. Dusk became the default and took the Clockspian
// name; the look that was Clockspian is now Sand. A stored 'clockspian' is left alone, so
// it moves to the new default — almost always it was only ever the default, saved along
// with some other setting, not a choice.
const RENAMED_THEMES = { dusk: 'clockspian' };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const loaded = { ...DEFAULTS, ...migrate(raw ? JSON.parse(raw) : {}) };
    loaded.theme = RENAMED_THEMES[loaded.theme] || loaded.theme;
    if (!THEMES.some((t) => t.id === loaded.theme)) loaded.theme = DEFAULTS.theme;
    if (loaded.mode !== 'light' && loaded.mode !== 'dark') loaded.mode = DEFAULTS.mode;
    return loaded;
  } catch {
    return { ...DEFAULTS };
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Nothing to do — the setting still applies for this session.
  }
}

const state = load();

// weather.js and main.js follow "Show weather" through these, the same way they follow
// location.js — settings.js runs first, so the value is settled before either asks.
const weatherListeners = new Set();

export function isWeatherShown() {
  return state.weather;
}

export function onWeatherShownChange(listener) {
  weatherListeners.add(listener);
}

const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

// One reusable <link>; swapping href drops the previous font from the page.
let fontLink = null;
function applyFont(font) {
  if (font.url) {
    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    if (fontLink.href !== font.url) fontLink.href = font.url;
  } else if (fontLink) {
    fontLink.remove();
    fontLink = null;
  }
  const root = document.documentElement;
  root.style.setProperty('--font-stack', font.stack);
  // Only Kal Studio splits display from body; everywhere else the two are the same face.
  root.style.setProperty('--font-display', font.display || font.stack);
}

function setColorScheme(value) {
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.content = value;
}

function apply() {
  const root = document.documentElement;
  const theme = themeById(state.theme);
  const palette = theme.palettes[state.mode];

  root.style.setProperty('--ui-scale', String(state.scale));

  Object.entries(palette).forEach(([name, value]) => root.style.setProperty(name, value));
  // The panel sits on the page colour unless a palette names a surface of its own.
  if (!palette['--panel-bg']) root.style.setProperty('--panel-bg', palette['--bg']);

  if (theme.timeWeight) root.style.setProperty('--time-weight', theme.timeWeight);
  else root.style.removeProperty('--time-weight');

  applyFont(theme.font);
  setColorScheme(state.mode);

  document.body.classList.toggle('no-blink', !state.blink);
  document.body.classList.toggle('no-bar', !state.bar);
  document.body.classList.toggle('no-weather', !state.weather);
  document.body.classList.toggle('kal', Boolean(theme.brand));
  document.body.classList.toggle('kal-dark', Boolean(theme.brand) && state.mode === 'dark');
}

// Each theme's name is set in its own display face. Only the active theme's font is
// loaded for the clock, so the rest are fetched — just the glyphs of the names, via
// `text=` — the first time the panel opens.
let previewsLoaded = false;
function loadThemePreviews() {
  if (previewsLoaded) return;
  previewsLoaded = true;
  const families = THEMES.filter((t) => t.font.family).map((t) => `family=${t.font.family}:wght@400`);
  const glyphs = [...new Set(THEMES.map((t) => t.label).join(''))].join('');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families.join('&')}&text=${encodeURIComponent(glyphs)}&display=swap`;
  document.head.appendChild(link);
}

export function initSettings() {
  apply();

  const toggle = document.getElementById('settingsToggle');
  const panel = document.getElementById('panel');
  const scaleInput = document.getElementById('scaleInput');
  const scaleValue = document.getElementById('scaleValue');
  const blinkSwitch = document.getElementById('blinkSwitch');
  const barSwitch = document.getElementById('barSwitch');
  const modeSwitch = document.getElementById('modeSwitch');
  const themeRow = document.getElementById('themeChoices');
  const weatherSwitch = document.getElementById('weatherSwitch');
  const locationField = document.getElementById('locationField');
  const resetButton = document.getElementById('resetButton');
  const aboutButton = document.getElementById('aboutButton');
  const versionButton = document.getElementById('versionButton');
  const locationRow = document.getElementById('locationChoices');
  const locationNote = document.getElementById('locationNote');

  panel.hidden = false; // the attribute only guards the pre-JS frame

  function commit() {
    apply();
    save();
  }

  // --- scale ---

  // Dragging is continuous, so the clock follows the finger, but every value lands on a
  // 5% step: the label shows the step the thumb is nearest, and letting go glides there.
  const SCALE_STEP = 0.05;
  const GLIDE_MS = 200; // matches the --ui-scale transition in style.css
  const snapScale = (value) => Math.round(value / SCALE_STEP) / (1 / SCALE_STEP); // 0.85, not 0.8500000000000001
  let glide = 0;

  function placeThumb(value) {
    scaleInput.value = String(value);
    const { min, max } = scaleInput;
    scaleInput.style.setProperty('--fill', `${((value - min) / (max - min)) * 100}%`);
  }
  function showScale() {
    cancelAnimationFrame(glide);
    placeThumb(state.scale);
    scaleValue.textContent = `${Math.round(state.scale * 100)}%`;
  }

  // The clock eases to the new size through its CSS transition; the thumb, which CSS
  // cannot move, is walked along the same curve.
  function glideScale(to) {
    cancelAnimationFrame(glide);
    const from = Number(scaleInput.value);
    state.scale = to;
    scaleValue.textContent = `${Math.round(to * 100)}%`;
    commit();
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / GLIDE_MS);
      placeThumb(from + (to - from) * (1 - (1 - t) ** 3));
      if (t < 1) glide = requestAnimationFrame(frame);
    };
    glide = requestAnimationFrame(frame);
  }

  scaleInput.addEventListener('input', () => {
    cancelAnimationFrame(glide);
    state.scale = Number(scaleInput.value);
    placeThumb(state.scale);
    scaleValue.textContent = `${Math.round(snapScale(state.scale) * 100)}%`;
    apply();
  });
  scaleInput.addEventListener('change', () => glideScale(snapScale(state.scale)));

  // With step="any" the browser's own arrow-key step is meaningless, so keys move whole steps.
  const SCALE_KEYS = { ArrowRight: 1, ArrowUp: 1, PageUp: 2, ArrowLeft: -1, ArrowDown: -1, PageDown: -2 };
  scaleInput.addEventListener('keydown', (event) => {
    const min = Number(scaleInput.min);
    const max = Number(scaleInput.max);
    let to;
    if (event.key in SCALE_KEYS) to = snapScale(state.scale) + SCALE_KEYS[event.key] * SCALE_STEP;
    else if (event.key === 'Home') to = min;
    else if (event.key === 'End') to = max;
    else return;
    event.preventDefault();
    glideScale(snapScale(Math.min(max, Math.max(min, to))));
  });
  showScale();

  // --- blinking colon, bottom progress bar ---

  function syncSeconds() {
    blinkSwitch.setAttribute('aria-checked', String(state.blink));
    barSwitch.setAttribute('aria-checked', String(state.bar));
  }
  blinkSwitch.addEventListener('click', () => {
    state.blink = !state.blink;
    commit();
    syncSeconds();
  });
  barSwitch.addEventListener('click', () => {
    state.bar = !state.bar;
    commit();
    syncSeconds();
  });
  syncSeconds();

  // --- theme, light/dark ---

  const themeChoices = THEMES.map((theme) => {
    const button = document.createElement('button');
    button.className = 'choice theme-choice';
    button.type = 'button';
    button.role = 'radio';
    const name = document.createElement('span');
    name.textContent = theme.label;
    // Preview each theme in its own face — the display face, since that sets the clock.
    name.style.fontFamily = theme.font.display || theme.font.stack;
    // A dot of the theme's accent in the current mode, ahead of the name.
    const dot = document.createElement('span');
    dot.className = 'theme-dot';
    dot.setAttribute('aria-hidden', 'true');
    button.append(dot, name);
    button.addEventListener('click', () => {
      state.theme = theme.id;
      commit();
      syncTheme();
    });
    themeRow.appendChild(button);
    return { theme, button, dot };
  });

  function syncTheme() {
    modeSwitch.setAttribute('aria-checked', String(state.mode === 'dark'));
    themeChoices.forEach(({ theme, button, dot }) => {
      button.setAttribute('aria-checked', String(theme.id === state.theme));
      dot.style.background = theme.palettes[state.mode]['--accent'];
    });
  }
  modeSwitch.addEventListener('click', () => {
    state.mode = state.mode === 'dark' ? 'light' : 'dark';
    commit();
    syncTheme();
  });
  syncTheme();

  // --- weather ---

  function syncWeather() {
    weatherSwitch.setAttribute('aria-checked', String(state.weather));
    // Where the weather is for means nothing while there is no weather.
    locationField.hidden = !state.weather;
  }
  function setWeatherShown(shown) {
    if (state.weather === shown) return;
    state.weather = shown;
    commit();
    syncWeather();
    weatherListeners.forEach((listener) => listener(shown));
  }
  weatherSwitch.addEventListener('click', () => setWeatherShown(!state.weather));
  syncWeather();

  // --- location ---
  // Not part of `state`: location.js persists it separately, and "Reset display" leaves it.

  const locationChoices = LOCATION_MODES.map((option) => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.type = 'button';
    button.role = 'radio';
    button.textContent = option.label;
    // Picking "My location" again is the retry — after a denial or a timeout it asks anew.
    button.addEventListener('click', () => setLocationMode(option.id));
    locationRow.appendChild(button);
    return { option, button };
  });

  const LOCATION_NOTES = {
    locating: 'Finding your location…',
    denied: 'Location is blocked for this site. Allow it in the browser’s site settings, then choose My location again.',
    unavailable: 'Couldn’t get a position right now. Choose My location to try again.',
  };

  function syncLocation() {
    const { mode, status } = getLocationState();
    locationChoices.forEach(({ option, button }) => {
      button.setAttribute('aria-checked', String(option.id === mode));
    });
    const note = mode === 'auto' ? LOCATION_NOTES[status] : null;
    locationNote.textContent = note || '';
    locationNote.hidden = !note;
  }
  onLocationChange(syncLocation);
  syncLocation();

  resetButton.addEventListener('click', () => {
    const { weather, ...rest } = DEFAULTS;
    Object.assign(state, rest);
    commit();
    showScale();
    syncSeconds();
    syncTheme();
    setWeatherShown(weather);
  });

  // --- panel visibility ---

  function setOpen(open) {
    document.body.classList.toggle('panel-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  // The panel steps aside for it — the dialog covers the screen anyway, and any click
  // inside would otherwise count as outside the panel and close it mid-read.
  aboutButton.addEventListener('click', () => {
    setOpen(false);
    openAbout();
  });

  versionButton.textContent = `Version ${VERSION}`;
  versionButton.addEventListener('click', () => {
    setOpen(false);
    openWhatsNew();
  });

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    loadThemePreviews();
    setOpen(!document.body.classList.contains('panel-open'));
  });

  document.addEventListener('click', (event) => {
    if (!panel.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  // The toggle is invisible until the pointer moves, so an untouched screen shows
  // nothing but the clock. It fades back out once the pointer goes still.
  let idleTimer = null;
  document.addEventListener('mousemove', () => {
    document.body.classList.add('pointer-active');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      document.body.classList.remove('pointer-active');
    }, 2500);
  });
}
