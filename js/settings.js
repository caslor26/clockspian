import { LOCATION_MODES, getLocation, getLocationState, onLocationChange, setLocationMode, setCity, searchCities } from './location.js';
import { openAbout } from './about.js';
import { openWhatsNew } from './whatsnew.js';
import { VERSION } from './version.js';
import { getCountdown, setCountdown, onCountdownChange, countdownStatus } from './countdown.js';
import { primeAudio } from './insane.js';

// Persisted display settings. Everything is applied by writing CSS custom
// properties onto :root — no component knows what the current theme is.

const STORAGE_KEY = 'clockspian.settings';

// A theme is a typeface paired for good with a palette, and every theme carries both a
// dark and a light palette — the sun/moon switch picks between them, independently of
// which theme is chosen. apply() writes all of a palette's properties inline on :root
// every time, so the defaults in css/style.css only cover the frame before JS runs.
//
// --accent carries the highlights (colon, sun, high temperature, seconds bar), --accent-2 the quieter
// structural bits (date dot). Light accents run darker than their dark-mode
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
    // grotesk — over a cool blue palette. Shown as "Fjord"; once "Dusk", then "Clockspian".
    // The id stays 'clockspian' so stored settings keep pointing here.
    id: 'clockspian',
    label: 'Fjord',
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
    // temperature or hi/lo onto the body face.
    id: 'kal',
    label: 'Kal',
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
    // A Swiss poster: black and white and one red, with the digits set heavy — the only
    // bold clock in the set. Archivo is a grotesque cut for posters; Arial Black stands
    // in where the font can't load, so the weight carries the look either way.
    id: 'signal',
    label: 'Signal',
    font: {
      stack: `'Archivo','Arial Black','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;700&display=swap',
      family: 'Archivo',
    },
    timeWeight: '700',
    palettes: {
      dark: {
        '--bg': '#0b0b0b', '--line': '#2a2a2a', '--fg': '#f6f6f3', '--fg-dim': '#8e8e8a',
        '--accent': '#ff3b2f', '--accent-2': '#5e5e5b',
      },
      light: {
        '--bg': '#f6f6f3', '--line': '#d6d6d2', '--fg': '#0b0b0b', '--fg-dim': '#62625f',
        '--accent': '#e3170a', '--accent-2': '#a5a5a1',
      },
    },
  },
  {
    // Seventies botany: deep forest and lichen, in Young Serif's soft, chunky figures —
    // the one heavy serif. Its default figures are old-style; the clock asks for lining
    // ones, so the digits share a baseline. Rockwell, then Georgia, if the font can't load.
    id: 'moss',
    label: 'Moss',
    font: {
      stack: `'Young Serif',Rockwell,Georgia,serif`,
      url: 'https://fonts.googleapis.com/css2?family=Young+Serif&display=swap',
      family: 'Young+Serif',
    },
    // Young Serif comes in one weight. Its lining figures run wider than the old-style
    // ones, so the clock is set a little smaller to span what the others do.
    timeWeight: '400',
    timeScale: '0.96',
    palettes: {
      dark: {
        '--bg': '#0f1a12', '--line': '#24362a', '--fg': '#eef0dc', '--fg-dim': '#8f9c84',
        '--accent': '#b3cc6b', '--accent-2': '#5f7a45',
      },
      light: {
        '--bg': '#f3f0e0', '--line': '#d8d6bd', '--fg': '#1f2a17', '--fg-dim': '#66705a',
        '--accent': '#557a1f', '--accent-2': '#b3c08f',
      },
    },
  },
  {
    // A CRT in the dark — phosphor green on black, everything glowing the one colour —
    // and in the light, the grey-green of a digital watch's LCD with its dark segments.
    // Martian Mono is wide and square, so it reads as a machine even from across a room.
    // Like every monospace face its colon takes a whole digit's width, so the clock sets
    // it at its narrowest (75%) and a little smaller, to span what the others do.
    id: 'terminal',
    timeStretch: '75%',
    timeScale: '0.85',
    label: 'Terminal',
    // wide, so set down a little to fit its half of the row
    labelStyle: { fontSize: '14px' },
    font: {
      stack: `'Martian Mono',ui-monospace,Consolas,monospace`,
      url: 'https://fonts.googleapis.com/css2?family=Martian+Mono:wdth,wght@75..112.5,200..400&display=swap',
      family: 'Martian+Mono',
    },
    palettes: {
      dark: {
        '--bg': '#050a06', '--line': '#15301c', '--fg': '#a6fbbd', '--fg-dim': '#4c9a63',
        '--accent': '#3dff7f', '--accent-2': '#1e6b37',
      },
      light: {
        '--bg': '#c7d1bd', '--line': '#a9b49d', '--fg': '#18200f', '--fg-dim': '#4c5640',
        '--accent': '#2e3f1f', '--accent-2': '#7f8c70',
      },
    },
  },
  {
    // A fashion masthead: a Didone with hairline serifs, ink on white, and a raspberry
    // pink. Bodoni Moda measures tabular; Bodoni MT or Didot stand in where it can't load,
    // so it stays a world away from Clåde's book serif either way.
    id: 'gala',
    label: 'Gala',
    font: {
      stack: `'Bodoni Moda','Bodoni MT',Didot,'Bodoni 72',serif`,
      url: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&display=swap',
      family: 'Bodoni+Moda',
    },
    // Bodoni Moda's lightest cut is 400; its hairlines are thin enough already.
    timeWeight: '400',
    palettes: {
      dark: {
        '--bg': '#0b0a0c', '--line': '#2a2329', '--fg': '#f8f5f2', '--fg-dim': '#9b948f',
        '--accent': '#ff5c93', '--accent-2': '#86304f',
      },
      light: {
        '--bg': '#fcfbf9', '--line': '#e5e0db', '--fg': '#0c0b0b', '--fg-dim': '#6d6864',
        '--accent': '#b3124f', '--accent-2': '#e6a8bf',
      },
    },
  },
  {
    // Amber on warm black, for a clock on the nightstand — no blue in the dark palette
    // at all. Barlow Condensed is the one narrow face in the set, so its clock is set
    // larger to fill the screen as wide as the others do.
    id: 'ember',
    timeScale: '1.4',
    label: 'Ember',
    // Condensed, with a small x-height: at the panel's 16px its name reads a size
    // smaller than the rest, so it is set up a little and opened out.
    labelStyle: { fontSize: '19px', letterSpacing: '0.04em' },
    font: {
      stack: `'Barlow Condensed','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@200;300;400&display=swap',
      family: 'Barlow+Condensed',
    },
    palettes: {
      dark: {
        '--bg': '#14100b', '--line': '#2e261b', '--fg': '#f2e6d3', '--fg-dim': '#9a8a72',
        '--accent': '#e0a050', '--accent-2': '#8a6a3c',
      },
      light: {
        '--bg': '#faf3df', '--line': '#e6d8b8', '--fg': '#2a1f10', '--fg-dim': '#7a6a4c',
        '--accent': '#a85f00', '--accent-2': '#d2ad6e',
      },
    },
  },
  {
    // Deep space: indigo night and an electric violet, in Space Grotesk — a grotesque
    // with a sci-fi kink in its figures. Trebuchet if it can't load. (Unbounded, tried
    // first, was too wide.)
    id: 'orbit',
    label: 'Orbit',
    font: {
      stack: `'Space Grotesk','Trebuchet MS','Helvetica Neue',sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400&display=swap',
      family: 'Space+Grotesk',
    },
    // Space Grotesk's lightest cut is 300.
    timeWeight: '300',
    palettes: {
      dark: {
        '--bg': '#0f0b24', '--line': '#2a2352', '--fg': '#eeeaff', '--fg-dim': '#8f87bd',
        '--accent': '#b18cff', '--accent-2': '#5b4aa8',
      },
      light: {
        '--bg': '#eeebff', '--line': '#d2cbf6', '--fg': '#18123f', '--fg-dim': '#615a92',
        '--accent': '#6b3fe0', '--accent-2': '#aa9cf2',
      },
    },
  },
  {
    // Holiday water: bright turquoise, with Baloo 2's soft, round, chunky figures — the
    // friendliest clock here. Arial Rounded where the font can't load.
    id: 'lagoon',
    label: 'Lagoon',
    font: {
      stack: `'Baloo 2','Arial Rounded MT Bold',ui-rounded,'Helvetica Neue',sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500&display=swap',
      family: 'Baloo+2',
    },
    // Baloo 2's lightest cut is 400.
    timeWeight: '400',
    palettes: {
      dark: {
        '--bg': '#031e1f', '--line': '#0e3a3b', '--fg': '#e2fbf8', '--fg-dim': '#6fa9a6',
        '--accent': '#2ee8d6', '--accent-2': '#137a74',
      },
      light: {
        '--bg': '#dcf7f3', '--line': '#b2e4de', '--fg': '#033b39', '--fg-dim': '#3f7672',
        '--accent': '#00a396', '--accent-2': '#6fd0c6',
      },
    },
  },
];

// 'system' follows the computer's own light or dark, and keeps following it as it changes.
const MODES = ['light', 'system', 'dark'];
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const DEFAULTS = { scale: 1, blink: true, bar: true, theme: 'clockspian', mode: 'system', weather: false };

// Settings saved before themes existed held a typeface, an accent and a Kal Studio
// switch. Each typeface now lives in exactly one theme, so it alone decides the match.
const LEGACY_FONTS = { system: 'sand', inter: 'graphite', 'plex-mono': 'terminal', spectral: 'folio' };

function migrate(stored) {
  if ('theme' in stored || !('font' in stored || 'kal' in stored)) return stored;
  const { kal, kalMode, font, accent, ...rest } = stored;
  return {
    ...rest,
    theme: kal ? 'kal' : LEGACY_FONTS[font] || DEFAULTS.theme,
    // Kal had its own light/dark; everything else was only ever dark, and stays so
    // rather than turning light under someone who already has it set up.
    mode: kal && kalMode !== 'dark' ? 'light' : 'dark',
  };
}

// Theme ids that have since changed. Dusk became the default and took the Clockspian
// name; the look that was Clockspian is now Sand. A stored 'clockspian' is left alone, so
// it moves to the new default — almost always it was only ever the default, saved along
// with some other setting, not a choice.
const RENAMED_THEMES = {
  dusk: 'clockspian',
  // Six themes got personalities of their own; each moves to its successor.
  graphite: 'signal',
  sand: 'moss',
  folio: 'gala',
  heather: 'orbit',
};

// Weather was on by default until 1.6.1, and light/dark was light until 'system' came
// along. Someone who has been here before (the intro was closed) and never touched either
// keeps what they had; a new visitor starts with just the clock, light or dark as their
// computer is. Whichever it is gets written down, so the intro closing doesn't flip it later.
function seenBefore() {
  try {
    return Boolean(localStorage.getItem('clockspian.introSeen'));
  } catch {
    return false;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    if (!('weather' in stored) || !('mode' in stored)) {
      if (!('weather' in stored)) stored.weather = seenBefore();
      if (!('mode' in stored)) stored.mode = seenBefore() ? 'light' : DEFAULTS.mode;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    const loaded = { ...DEFAULTS, ...migrate(stored) };
    loaded.theme = RENAMED_THEMES[loaded.theme] || loaded.theme;
    if (!THEMES.some((t) => t.id === loaded.theme)) loaded.theme = DEFAULTS.theme;
    if (!MODES.includes(loaded.mode)) loaded.mode = DEFAULTS.mode;
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

// The palette actually showing: 'system' settled into light or dark.
function shownMode() {
  if (state.mode !== 'system') return state.mode;
  return systemDark.matches ? 'dark' : 'light';
}

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
  // Only Kal splits display from body; everywhere else the two are the same face.
  root.style.setProperty('--font-display', font.display || font.stack);
}

function setColorScheme(value) {
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.content = value;
}

// Installed as an app, this colours the window's title bar, or the strip behind its
// buttons when the title bar is hidden, so it melts into the page.
function setThemeColor(value) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = value;
}

function apply() {
  const root = document.documentElement;
  const theme = themeById(state.theme);
  const mode = shownMode();
  const palette = theme.palettes[mode];

  root.style.setProperty('--ui-scale', String(state.scale));

  Object.entries(palette).forEach(([name, value]) => root.style.setProperty(name, value));
  // The panel sits on the page colour unless a palette names a surface of its own.
  if (!palette['--panel-bg']) root.style.setProperty('--panel-bg', palette['--bg']);

  if (theme.timeWeight) root.style.setProperty('--time-weight', theme.timeWeight);
  else root.style.removeProperty('--time-weight');
  if (theme.timeScale) root.style.setProperty('--time-scale', theme.timeScale);
  else root.style.removeProperty('--time-scale');
  if (theme.timeStretch) root.style.setProperty('--time-stretch', theme.timeStretch);
  else root.style.removeProperty('--time-stretch');

  applyFont(theme.font);
  setColorScheme(mode);
  setThemeColor(palette['--bg']);

  document.body.classList.toggle('no-blink', !state.blink);
  document.body.classList.toggle('no-bar', !state.bar);
  document.body.classList.toggle('no-weather', !state.weather);
}

// Each theme's name is set in its own display face. Only the active theme's font is
// loaded for the clock, so the rest are fetched — just the glyphs of the names, via
// `text=` — the first time the panel opens.
let previewsLoaded = false;
function loadThemePreviews() {
  if (previewsLoaded) return;
  previewsLoaded = true;
  const families = THEMES.filter((t) => t.font.family).map((t) => `family=${t.font.family}:wght@400`);
  // plus the wordmark at the foot of the panel, which is always set in Jost
  const glyphs = [...new Set(THEMES.map((t) => t.label).join('') + 'CLOCKSPIAN')].join('');
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
  const aboutButton = document.getElementById('aboutButton');
  const versionButton = document.getElementById('versionButton');
  const locationRow = document.getElementById('locationChoices');
  const locationNote = document.getElementById('locationNote');
  const citySearch = document.getElementById('citySearch');
  const cityInput = document.getElementById('cityInput');
  const cityResults = document.getElementById('cityResults');
  const countdownSwitch = document.getElementById('countdownSwitch');
  const countdownField = document.getElementById('countdownField');
  const countdownName = document.getElementById('countdownName');
  const countdownDate = document.getElementById('countdownDate');
  const countdownTime = document.getElementById('countdownTime');
  const countdownNote = document.getElementById('countdownNote');
  const insaneSwitch = document.getElementById('insaneSwitch');
  const insaneNote = document.getElementById('insaneNote');
  const insaneWarning = document.getElementById('insaneWarning');

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
    Object.assign(name.style, theme.labelStyle);
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
    modeSwitch.dataset.mode = state.mode;
    modeButtons.forEach((button) => {
      button.setAttribute('aria-checked', String(button.dataset.mode === state.mode));
    });
    themeChoices.forEach(({ theme, button, dot }) => {
      button.setAttribute('aria-checked', String(theme.id === state.theme));
      dot.style.background = theme.palettes[shownMode()]['--accent'];
    });
  }
  const modeButtons = [...modeSwitch.querySelectorAll('button')];
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.mode = button.dataset.mode;
      commit();
      syncTheme();
    });
  });
  // The computer switching between light and dark, say at sunset, while this is open.
  systemDark.addEventListener('change', () => {
    if (state.mode !== 'system') return;
    apply();
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
  // Not part of `state`: location.js persists it separately.

  const locationChoices = LOCATION_MODES.map((option) => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.type = 'button';
    button.role = 'radio';
    button.textContent = option.label;
    // Picking "My location" again is the retry — after a denial or a timeout it asks anew.
    // "Choose a city" with none chosen yet goes straight to the search.
    button.addEventListener('click', () => {
      setLocationMode(option.id);
      if (option.id === 'city' && !getLocationState().city) cityInput.focus();
    });
    locationRow.appendChild(button);
    return { option, button };
  });

  const LOCATION_NOTES = {
    locating: 'Finding your location…',
    denied: 'Location is blocked for this site, so pick a city instead. Or allow it in the browser’s site settings, then choose My location again.',
    unavailable: 'Couldn’t get a position right now. Choose My location to try again, or pick a city.',
  };

  // The box shows the chosen city whenever it isn't being typed in.
  function showChosenCity() {
    if (document.activeElement === cityInput) return;
    const { mode, city } = getLocationState();
    cityInput.value = mode === 'city' && city ? city.name : '';
  }

  function syncLocation() {
    const { mode, status } = getLocationState();
    locationChoices.forEach(({ option, button }) => {
      button.setAttribute('aria-checked', String(option.id === mode));
    });
    const note = mode === 'auto' ? LOCATION_NOTES[status] : null;
    locationNote.textContent = note || '';
    locationNote.hidden = !note;
    // My location that came to nothing offers the search too, rather than leaving no weather.
    citySearch.hidden = !(mode === 'city' || (!getLocation() && (status === 'denied' || status === 'unavailable')));
    showChosenCity();
  }

  // --- city search ---

  let searchTimer = null;
  let searching = null;
  let matches = [];

  function closeResults() {
    clearTimeout(searchTimer);
    searching?.abort();
    matches = [];
    cityResults.replaceChildren();
    cityResults.hidden = true;
  }

  function showResultsNote(text) {
    const line = document.createElement('p');
    line.className = 'city-empty';
    line.textContent = text;
    cityResults.replaceChildren(line);
    cityResults.hidden = false;
  }

  function pick(city) {
    closeResults();
    cityInput.blur();
    setCity(city);
  }

  function showMatches(found) {
    matches = found;
    if (!found.length) {
      showResultsNote('No town or city by that name. Try another spelling, or the English one.');
      return;
    }
    cityResults.replaceChildren(...found.map((city) => {
      const button = document.createElement('button');
      button.className = 'city-result';
      button.type = 'button';
      button.role = 'option';
      const name = document.createElement('span');
      name.textContent = city.city;
      const region = document.createElement('span');
      region.className = 'city-region';
      region.textContent = city.region;
      button.append(name, region);
      // Keep focus in the box, so the click lands before the list closes behind it.
      button.addEventListener('mousedown', (event) => event.preventDefault());
      // The list is gone by the time the click reaches the document, which would
      // otherwise read it as a click outside the panel.
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        pick(city);
      });
      return button;
    }));
    cityResults.hidden = false;
  }

  cityInput.addEventListener('focus', () => cityInput.select());
  cityInput.addEventListener('input', () => {
    closeResults();
    const query = cityInput.value.trim();
    if (query.length < 2) return;
    // A beat after the last keystroke, so a word typed fast is one search, not seven.
    searchTimer = setTimeout(async () => {
      searching = new AbortController();
      try {
        showMatches(await searchCities(query, searching.signal));
      } catch (error) {
        if (error.name !== 'AbortError') showResultsNote('Couldn’t search right now. Check the connection and try again.');
      }
    }, 250);
  });

  // Enter takes the top match; the arrows walk the list; Esc puts the chosen city back
  // without closing the panel.
  citySearch.addEventListener('keydown', (event) => {
    const options = [...cityResults.querySelectorAll('.city-result')];
    const at = options.indexOf(document.activeElement);
    if (event.key === 'Enter' && event.target === cityInput && matches.length) {
      event.preventDefault();
      pick(matches[0]);
    } else if (event.key === 'ArrowDown' && options.length) {
      event.preventDefault();
      options[Math.min(at + 1, options.length - 1)].focus();
    } else if (event.key === 'ArrowUp' && at >= 0) {
      event.preventDefault();
      (at === 0 ? cityInput : options[at - 1]).focus();
    } else if (event.key === 'Escape' && (cityResults.hidden === false || event.target === cityInput)) {
      event.stopPropagation();
      closeResults();
      cityInput.blur();
    }
  });

  // Leaving the search without picking anything leaves the city as it was.
  citySearch.addEventListener('focusout', () => {
    setTimeout(() => {
      if (citySearch.contains(document.activeElement)) return;
      closeResults();
      showChosenCity();
    });
  });

  onLocationChange(syncLocation);
  syncLocation();

  // --- countdown ---
  // Not part of `state`: countdown.js persists it separately.

  const COUNTDOWN_NOTES = {
    unset: 'Pick a date to start counting. The time is optional.',
    past: 'That moment has passed. Pick a new date to count again.',
  };

  function syncCountdown() {
    const countdown = getCountdown();
    countdownSwitch.setAttribute('aria-checked', String(countdown.on));
    countdownField.hidden = !countdown.on;
    // Only fill fields that aren't being typed in, so a re-sync never moves the caret.
    if (document.activeElement !== countdownName) countdownName.value = countdown.label;
    if (document.activeElement !== countdownDate) countdownDate.value = countdown.date;
    if (document.activeElement !== countdownTime) countdownTime.value = countdown.time;
    const note = COUNTDOWN_NOTES[countdownStatus()];
    countdownNote.textContent = note || '';
    countdownNote.hidden = !note;
    insaneSwitch.setAttribute('aria-checked', String(countdown.insane));
    insaneNote.hidden = !countdown.insane;
  }
  // Switching the countdown off disarms Insane mode too: it's a dangerous setting, so
  // a countdown switched back on starts polite and has to be talked into it again.
  countdownSwitch.addEventListener('click', () => {
    const on = !getCountdown().on;
    setCountdown(on ? { on } : { on, insane: false });
  });
  countdownName.addEventListener('input', () => setCountdown({ label: countdownName.value }));
  countdownDate.addEventListener('input', () => setCountdown({ date: countdownDate.value }));
  countdownTime.addEventListener('input', () => setCountdown({ time: countdownTime.value }));
  onCountdownChange(syncCountdown);
  syncCountdown();

  // --- insane mode ---
  // Off is one click. On has to get past the warning first.

  insaneSwitch.addEventListener('click', () => {
    if (getCountdown().insane) {
      setCountdown({ insane: false });
      return;
    }
    insaneWarning.returnValue = '';
    insaneWarning.showModal();
  });
  // The click that says yes is the one the browser counts as permission to make noise
  // later, so the sound is unlocked right in it rather than in the close that follows.
  document.getElementById('insaneConfirm').addEventListener('click', primeAudio);
  insaneWarning.addEventListener('close', () => {
    if (insaneWarning.returnValue === 'go') setCountdown({ insane: true });
  });
  // Kept from the document's outside-the-panel check, so the panel is still open behind
  // it to show the switch flip. A click on the <dialog> itself was on the backdrop.
  insaneWarning.addEventListener('click', (event) => {
    event.stopPropagation();
    if (event.target === insaneWarning) insaneWarning.close();
  });
  // Likewise its Esc, which should close the warning and leave the panel open.
  insaneWarning.addEventListener('keydown', (event) => event.stopPropagation());

  // --- panel visibility ---

  function setOpen(open) {
    if (open) syncCountdown(); // the moment may have passed while the panel was shut
    document.body.classList.toggle('panel-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  // The panel steps aside for it — the dialog covers the screen anyway, and any click
  // inside would otherwise count as outside the panel and close it mid-read.
  aboutButton.addEventListener('click', () => {
    setOpen(false);
    openAbout();
  });

  document.getElementById('versionNumber').textContent = `Version ${VERSION}`;
  versionButton.addEventListener('click', () => {
    setOpen(false);
    openWhatsNew();
  });

  // The release notes open from the "What's new" pill too, panel unopened, and their
  // heading is set in Jost like the signature.
  document.getElementById('news').addEventListener('click', loadThemePreviews);

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
