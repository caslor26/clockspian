import { LOCATION_MODES, getLocationState, onLocationChange, setLocationMode } from './location.js';

// Persisted display settings. Everything is applied by writing CSS custom
// properties onto :root — no component knows what the current theme is.

const STORAGE_KEY = 'clockspian.settings';

// Curated pairs, all checked against the #0f1416 base. --accent carries the
// highlights (colon, sun, high temperature), --accent-2 the quieter structural
// bits (seconds bar, date dot).
export const ACCENTS = [
  { id: 'tan',   label: 'Tan',   accent: '#c9b28a', accent2: '#5c7a70' },
  { id: 'sage',  label: 'Sage',  accent: '#7d9b8f', accent2: '#5c7a70' },
  { id: 'blue',  label: 'Blue',  accent: '#8aa4c9', accent2: '#5a6f8a' },
  { id: 'clay',  label: 'Clay',  accent: '#c08e7d', accent2: '#8a6155' },
  { id: 'mono',  label: 'Mono',  accent: '#d6d3c8', accent2: '#8a9490' },
];

// `url: null` means the system stack — no network request at all, which is why
// it stays the default on a display that may boot before the Wi-Fi connects.
export const FONTS = [
  {
    id: 'system',
    label: 'System Sans',
    stack: `'Helvetica Neue',Arial,sans-serif`,
    url: null,
  },
  {
    id: 'inter',
    label: 'Inter',
    stack: `'Inter','Helvetica Neue',Arial,sans-serif`,
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400&display=swap',
  },
  {
    id: 'plex-mono',
    label: 'Plex Mono',
    stack: `'IBM Plex Mono',ui-monospace,monospace`,
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@200;300;400&display=swap',
  },
  {
    // Spectral is the serif here because it ships genuine tabular figures — measured
    // identical advance widths for 00:00 / 11:11 / 23:38. Most editorial serifs
    // (Newsreader, and the Georgia fallback) use proportional oldstyle numerals, which
    // make the clock's width lurch every time a 1 appears. Do not swap this for another
    // serif without re-measuring.
    id: 'spectral',
    label: 'Spectral',
    stack: `'Spectral',Georgia,serif`,
    url: 'https://fonts.googleapis.com/css2?family=Spectral:wght@200;300;400&display=swap',
  },
];

// Kal Studio brand mode. Unlike the accents above, these repaint the surface itself, so
// apply() writes them inline on :root and removes them again when the mode is switched
// off — that hands control back to the :root defaults in css/style.css, no !important.
export const KAL_MODES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const KAL_THEMES = {
  light: {
    colorScheme: 'light',
    vars: {
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
  dark: {
    colorScheme: 'dark',
    vars: {
      '--bg': '#2b3a42',       // Djup
      '--line': '#3d5058',
      '--fg': '#f5f2eb',       // Linne
      '--fg-dim': '#9badb8',   // Dimma
      '--accent': '#e2ddd3',   // Näver
      '--accent-2': '#5c7a87', // Fjord
      '--panel-bg': '#2b3a42',
    },
  },
};

// Every property either theme touches, so switching off clears the lot in one pass.
const KAL_VARS = [...new Set(Object.values(KAL_THEMES).flatMap((t) => Object.keys(t.vars)))];

// Bricolage Grotesque for the hero digits, DM Sans for everything else — the split the
// brand board specifies. Unlike System Sans this needs the network; if the request fails
// the stacks fall through to Helvetica and only the typeface is lost, not the palette.
// Measured, per the rule the Spectral note above sets out: Bricolage gives identical
// advance widths for 00:00 / 11:11 / 23:38 / 18:47, so it is safe on the clock. DM Sans
// emphatically does not (00:00 is 534px where 11:11 is 247px at the same size) — every
// numeric readout therefore uses --font-display, not --font-stack. Do not move the time,
// temperature or hi/lo onto the body face.
const KAL_FONT = {
  stack: `'DM Sans','Helvetica Neue',Arial,sans-serif`,
  display: `'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif`,
  url: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=DM+Sans:wght@300;400;500&display=swap',
};

// Bricolage's lightest cut is 300 — the 200 the clock normally runs at does not exist.
const KAL_TIME_WEIGHT = '300';

const DEFAULTS = { scale: 1, blink: true, bar: true, accent: 'tan', font: 'system', kal: false, kalMode: 'light' };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return { ...DEFAULTS, ...stored };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Nothing to do — the setting still applies for this session.
  }
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
  // Only Kal mode splits display from body; everywhere else the two are the same face.
  root.style.setProperty('--font-display', font.display || font.stack);
}

function setColorScheme(value) {
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.content = value;
}

function apply(state) {
  const root = document.documentElement;

  root.style.setProperty('--ui-scale', String(state.scale));

  if (state.kal) {
    const theme = KAL_THEMES[state.kalMode] || KAL_THEMES.light;
    Object.entries(theme.vars).forEach(([name, value]) => root.style.setProperty(name, value));
    root.style.setProperty('--time-weight', KAL_TIME_WEIGHT);
    applyFont(KAL_FONT);
    setColorScheme(theme.colorScheme);
  } else {
    // Drop the inline overrides so the :root defaults in css/style.css take back over,
    // then re-state the accent and typeface the user had chosen before.
    KAL_VARS.forEach((name) => root.style.removeProperty(name));
    root.style.removeProperty('--time-weight');

    const accent = ACCENTS.find((a) => a.id === state.accent) || ACCENTS[0];
    const font = FONTS.find((f) => f.id === state.font) || FONTS[0];
    root.style.setProperty('--accent', accent.accent);
    root.style.setProperty('--accent-2', accent.accent2);
    applyFont(font);
    setColorScheme('dark');
  }

  document.body.classList.toggle('no-blink', !state.blink);
  document.body.classList.toggle('no-bar', !state.bar);
  document.body.classList.toggle('kal', state.kal);
  document.body.classList.toggle('kal-dark', state.kal && state.kalMode === 'dark');
}

export function initSettings() {
  const state = load();
  apply(state);

  const toggle = document.getElementById('settingsToggle');
  const panel = document.getElementById('panel');
  const scaleInput = document.getElementById('scaleInput');
  const scaleValue = document.getElementById('scaleValue');
  const swatchRow = document.getElementById('accentSwatches');
  const fontRow = document.getElementById('fontChoices');
  const accentField = document.getElementById('accentField');
  const fontField = document.getElementById('fontField');
  const blinkSwitch = document.getElementById('blinkSwitch');
  const barSwitch = document.getElementById('barSwitch');
  const kalSwitch = document.getElementById('kalSwitch');
  const kalModeField = document.getElementById('kalModeField');
  const kalModeRow = document.getElementById('kalModeChoices');
  const resetButton = document.getElementById('resetButton');
  const locationRow = document.getElementById('locationChoices');
  const locationNote = document.getElementById('locationNote');

  panel.hidden = false; // the attribute only guards the pre-JS frame

  function commit() {
    apply(state);
    save(state);
  }

  // --- scale ---

  function showScale() {
    scaleInput.value = String(state.scale);
    scaleValue.textContent = `${Math.round(state.scale * 100)}%`;
  }
  scaleInput.addEventListener('input', () => {
    state.scale = Number(scaleInput.value);
    showScale();
    commit();
  });
  showScale();

  // --- blinking colon, minute progress bar ---

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

  // --- accent ---

  const swatches = ACCENTS.map((option) => {
    const button = document.createElement('button');
    button.className = 'swatch';
    button.type = 'button';
    button.role = 'radio';
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    button.innerHTML = `<i style="background:${option.accent}"></i>`;
    button.addEventListener('click', () => {
      state.accent = option.id;
      commit();
      syncAccent();
    });
    swatchRow.appendChild(button);
    return { option, button };
  });

  function syncAccent() {
    swatches.forEach(({ option, button }) => {
      button.setAttribute('aria-checked', String(option.id === state.accent));
    });
  }
  syncAccent();

  // --- font ---

  const choices = FONTS.map((option) => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.type = 'button';
    button.role = 'radio';
    button.textContent = option.label;
    // Preview each option in its own face.
    button.style.fontFamily = option.stack;
    button.addEventListener('click', () => {
      state.font = option.id;
      commit();
      syncFont();
    });
    fontRow.appendChild(button);
    return { option, button };
  });

  function syncFont() {
    choices.forEach(({ option, button }) => {
      button.setAttribute('aria-checked', String(option.id === state.font));
    });
  }
  syncFont();

  // --- Kal Studio ---

  const kalModeChoices = KAL_MODES.map((option) => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.type = 'button';
    button.role = 'radio';
    button.textContent = option.label;
    button.addEventListener('click', () => {
      state.kalMode = option.id;
      commit();
      syncKal();
    });
    kalModeRow.appendChild(button);
    return { option, button };
  });

  function syncKal() {
    kalSwitch.setAttribute('aria-checked', String(state.kal));
    kalModeField.hidden = !state.kal;
    kalModeChoices.forEach(({ option, button }) => {
      button.setAttribute('aria-checked', String(option.id === state.kalMode));
    });
    // The brand drives both colour and typeface, so these two have nothing to say while
    // it is on. `inert` keeps them out of the tab order as well as out of reach.
    [accentField, fontField].forEach((field) => {
      field.toggleAttribute('data-disabled', state.kal);
      field.inert = state.kal;
    });
  }

  kalSwitch.addEventListener('click', () => {
    state.kal = !state.kal;
    commit();
    syncKal();
  });
  syncKal();

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
    Object.assign(state, DEFAULTS);
    commit();
    showScale();
    syncSeconds();
    syncAccent();
    syncFont();
    syncKal();
  });

  // --- panel visibility ---

  function setOpen(open) {
    document.body.classList.toggle('panel-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
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
