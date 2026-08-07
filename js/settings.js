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

const DEFAULTS = { scale: 1, accent: 'tan', font: 'system' };

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
  document.documentElement.style.setProperty('--font-stack', font.stack);
}

function apply(state) {
  const root = document.documentElement;
  const accent = ACCENTS.find((a) => a.id === state.accent) || ACCENTS[0];
  const font = FONTS.find((f) => f.id === state.font) || FONTS[0];

  root.style.setProperty('--accent', accent.accent);
  root.style.setProperty('--accent-2', accent.accent2);
  root.style.setProperty('--ui-scale', String(state.scale));
  applyFont(font);
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
  const resetButton = document.getElementById('resetButton');

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

  resetButton.addEventListener('click', () => {
    Object.assign(state, DEFAULTS);
    commit();
    showScale();
    syncAccent();
    syncFont();
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
