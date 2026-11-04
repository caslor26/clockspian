// The theme studio. A draft is a theme in exactly the shape js/themes.js holds (plus the
// note that becomes its comment), so a draft started from a theme round-trips unchanged.
// The two previews are the real clock (studio/frame.html); the checks measure what the
// comments in js/themes.js otherwise ask to be measured by hand.

import { THEMES } from '/js/themes.js';

const TOKENS = ['--bg', '--line', '--fg', '--fg-dim', '--accent', '--accent-2'];
const TOKEN_NAMES = {
  '--bg': 'Background', '--line': 'Lines', '--fg': 'Text', '--fg-dim': 'Dim text',
  '--accent': 'Accent', '--accent-2': 'Accent 2', '--panel-bg': 'Panel',
};
const MODES = ['dark', 'light'];
const KEYS = {
  current: 'clockspian.studio.current',
  drafts: 'clockspian.studio.drafts',
  shortlist: 'clockspian.studio.shortlist',
};
// The clock's size in css/style.css at a scale of 100%: clamp(72px, 15vw, 190px) × 1.4.
const clockPx = (screenWidth) => Math.min(190, Math.max(72, screenWidth * 0.15)) * 1.4;
// js/fit.js lets the clock's column take this much of the window before shrinking it.
const ROOM = 0.86;
const SAMPLES = ['00:00', '11:11', '23:38', '18:47'];

const $ = (id) => document.getElementById(id);
const clone = (value) => structuredClone(value);
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Unsaved, not lost: the draft is still on screen and in the export.
  }
};

/* ---------- Colour ---------- */

function hexToRgb(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const validHex = (hex) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(hex).trim());
function normalHex(hex) {
  return '#' + hexToRgb(hex).map((v) => v.toString(16).padStart(2, '0')).join('');
}
const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v) => {
  const c = Math.min(1, Math.max(0, v));
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
};
const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toOklab(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
function toOklch(hex) {
  const [l, a, b] = toOklab(hex);
  return { l, c: Math.hypot(a, b), h: Math.atan2(b, a) };
}
// Out of the sRGB gamut, chroma gives way until it fits; lightness and hue hold.
function fromOklch(l, c, h) {
  let chroma = c;
  for (let i = 0; i < 90; i++) {
    const lin = oklabToLinear([l, chroma * Math.cos(h), chroma * Math.sin(h)]);
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) return rgbToHex(lin.map(fromLinear));
    chroma *= 0.94;
  }
  return rgbToHex(oklabToLinear([l, 0, 0]).map(fromLinear));
}
const labDistance = (a, b) => {
  const [p, q] = [toOklab(a), toOklab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

// The other mode, drafted: each token keeps its hue, takes the lightness the set's
// themes tend to give it there, and a share of its chroma. [lightness, chroma factor]
const DRAFT = {
  light: {
    '--bg': [0.965, 0.6], '--line': [0.87, 0.8], '--fg': [0.22, 1], '--fg-dim': [0.52, 0.8],
    '--accent': [0.52, 1], '--accent-2': [0.76, 0.8], '--panel-bg': [0.93, 0.6],
  },
  dark: {
    '--bg': [0.17, 1.2], '--line': [0.29, 1], '--fg': [0.95, 0.6], '--fg-dim': [0.68, 0.8],
    '--accent': [0.76, 1], '--accent-2': [0.48, 0.9], '--panel-bg': [0.21, 1.2],
  },
};
function draftMode(to) {
  const from = to === 'light' ? 'dark' : 'light';
  const source = theme.palettes[from];
  const next = {};
  Object.entries(source).forEach(([token, hex]) => {
    const [l, k] = DRAFT[to][token] || [0.5, 1];
    const { c, h } = toOklch(hex);
    next[token] = fromOklch(l, Math.min(0.32, c * k), h);
  });
  theme.palettes[to] = next;
}

/* ---------- Fonts ---------- */

const GOOGLE = 'https://fonts.googleapis.com/css2?family=';
const plus = (name) => name.trim().replace(/\s+/g, '+');
const spaced = (family) => (family || '').replace(/\+/g, ' ');
const faces = (stack) => stack.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''));
const displayStack = (t) => t.font.display || t.font.stack;

// Every theme's font, loaded into the studio too, so the checks and the gallery measure
// and show the real faces. Resolves once the stylesheet is in (or has failed).
const fontLinks = new Map();
function ensureFont(url) {
  if (!url) return Promise.resolve();
  if (!fontLinks.has(url)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    const ready = new Promise((resolve) => {
      link.onload = resolve;
      link.onerror = resolve;
    });
    document.head.appendChild(link);
    fontLinks.set(url, ready);
  }
  return fontLinks.get(url);
}
async function loadWeights(t, weights) {
  await ensureFont(t.font.url);
  await Promise.all(weights.map((w) => document.fonts.load(`${w} 100px ${displayStack(t)}`, '0123456789:').catch(() => [])));
}

// Which weights Google serves the family in, and whether as one variable font.
async function probeFamily(name) {
  const fam = plus(name);
  const ask = async (spec) => {
    try {
      return (await fetch(GOOGLE + fam + spec)).ok;
    } catch {
      return false;
    }
  };
  const cuts = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const found = (await Promise.all(cuts.map(async (w) => ((await ask(`:wght@${w}`)) ? w : null)))).filter(Boolean);
  if (!found.length) {
    if (!(await ask(''))) throw new Error(`Google Fonts has no family called “${name.trim()}”.`);
    return { url: `${GOOGLE}${fam}&display=swap`, weights: null, single: 400, note: 'One weight.' };
  }
  if (found.length === 1) {
    return { url: `${GOOGLE}${fam}:wght@${found[0]}&display=swap`, weights: null, single: found[0], note: `One weight: ${found[0]}.` };
  }
  const min = found[0];
  const max = found[found.length - 1];
  if (await ask(`:wght@${min}..${max}`)) {
    return { url: `${GOOGLE}${fam}:wght@${min}..${max}&display=swap`, weights: { min, max }, note: `Variable, ${min}–${max}.` };
  }
  return {
    url: `${GOOGLE}${fam}:wght@${found.join(';')}&display=swap`,
    weights: { min, max, step: 100 },
    note: `Fixed cuts: ${found.join(', ')}.${found.length < (max - min) / 100 + 1 ? ' Some steps between are missing.' : ''}`,
  };
}

/* ---------- The draft ---------- */

const slug = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-theme';

function blankTheme() {
  const fjord = THEMES[0];
  return {
    id: 'new-theme',
    label: 'New theme',
    comment: '',
    font: {
      stack: `'Inter','Helvetica Neue',Arial,sans-serif`,
      url: `${GOOGLE}Inter:wght@100..900&display=swap`,
      family: 'Inter',
    },
    weights: { min: 100, max: 900 },
    palettes: clone(fjord.palettes),
  };
}

// The comment above each theme in js/themes.js, read from the file itself, so a draft
// started from a theme keeps its story.
const comments = new Map();
async function readComments() {
  try {
    const text = await (await fetch('/js/themes.js', { cache: 'no-cache' })).text();
    text.split(/\n  \{\n/).slice(1).forEach((chunk) => {
      const lines = chunk.split('\n');
      const note = [];
      for (const line of lines) {
        const m = line.match(/^ {4}\/\/ ?(.*)$/);
        if (m) note.push(m[1]);
        else break;
      }
      const id = chunk.match(/^ {4}id: '([^']+)'/m);
      if (id) comments.set(id[1], note.join(' ').replace(/\s+/g, ' ').trim());
    });
  } catch {
    // Drafts from themes just start without their note.
  }
}

let theme = read(KEYS.current, null) || blankTheme();
let idEdited = theme.id !== 'new-theme';
let previewWeight = 'designed';
const pv = { weather: true, date: true, blink: false, scale: 1, size: [1440, 900] };

const designed = (t) => Number(t.timeWeight || 200);
const range = (t) => t.weights || { min: designed(t), max: designed(t) };
function shownWeight() {
  const r = range(theme);
  if (previewWeight === 'min') return r.min;
  if (previewWeight === 'max') return r.max;
  return designed(theme);
}

/* ---------- Form ---------- */

function buildPalettes() {
  document.querySelectorAll('.palette').forEach((box) => {
    const mode = box.dataset.mode;
    [...TOKENS, '--panel-bg'].forEach((token) => {
      const row = document.createElement('div');
      row.className = 'swatch';
      row.dataset.token = token;
      const name = token === '--panel-bg'
        ? `<label><input type="checkbox" class="own" aria-label="Own panel colour"> ${TOKEN_NAMES[token]}</label>`
        : `<span>${TOKEN_NAMES[token]}</span>`;
      row.innerHTML = `<input type="color" aria-label="${mode} ${TOKEN_NAMES[token]}">${name}<input type="text" spellcheck="false" aria-label="${mode} ${TOKEN_NAMES[token]} hex">`;
      const [picker, hexInput] = row.querySelectorAll('input[type="color"], input[type="text"]');
      const own = row.querySelector('.own');
      const set = (hex) => {
        theme.palettes[mode][token] = normalHex(hex);
        changed();
      };
      picker.addEventListener('input', () => {
        hexInput.value = picker.value;
        if (own) own.checked = true;
        set(picker.value);
      });
      hexInput.addEventListener('input', () => {
        if (!validHex(hexInput.value)) return;
        picker.value = normalHex(hexInput.value);
        if (own) own.checked = true;
        set(hexInput.value);
      });
      own?.addEventListener('change', () => {
        if (own.checked) theme.palettes[mode][token] = picker.value;
        else delete theme.palettes[mode][token];
        fillPalettes();
        changed();
      });
      box.appendChild(row);
    });
  });
}

function fillPalettes() {
  document.querySelectorAll('.palette').forEach((box) => {
    const palette = theme.palettes[box.dataset.mode];
    box.querySelectorAll('.swatch').forEach((row) => {
      const token = row.dataset.token;
      const own = row.querySelector('.own');
      const value = palette[token] || (token === '--panel-bg' ? palette['--bg'] : '#000000');
      row.querySelector('input[type="color"]').value = normalHex(value);
      row.querySelector('input[type="text"]').value = normalHex(value);
      if (own) {
        own.checked = Boolean(palette[token]);
        row.classList.toggle('off', !own.checked);
      }
    });
  });
}

function fillWeights() {
  const r = range(theme);
  $('wMin').value = theme.weights ? theme.weights.min : '';
  $('wMax').value = theme.weights ? theme.weights.max : '';
  $('wStep').value = theme.weights?.step ?? '';
  const slider = $('weight');
  slider.min = r.min;
  slider.max = r.max;
  slider.step = theme.weights?.step || 10;
  slider.disabled = !theme.weights;
  slider.value = designed(theme);
  $('weightOut').textContent = designed(theme);
}

function fillForm() {
  $('label').value = theme.label;
  $('id').value = theme.id;
  $('comment').value = theme.comment || '';
  $('family').value = spaced(theme.font.family);
  $('stack').value = theme.font.stack;
  $('url').value = theme.font.url || '';
  const note = $('displayNote');
  note.hidden = !theme.font.display;
  if (theme.font.display) note.textContent = `The clock is set in ${faces(theme.font.display)[0]}; the rest in the stack above. Kept as is in the export.`;
  fillWeights();
  const ts = Number(theme.timeScale || 1);
  $('timeScale').value = ts;
  $('scaleOut').textContent = `${Math.round(ts * 100)}%`;
  const stretch = parseFloat(theme.timeStretch) || 100;
  $('timeStretch').value = stretch;
  $('stretchOut').textContent = theme.timeStretch ? `${stretch}%` : 'normal';
  $('lowResOpsz').value = theme.lowResOpsz ?? '';
  fillPalettes();
}

function fillStartFrom() {
  const select = $('startFrom');
  const drafts = read(KEYS.drafts, []);
  select.innerHTML = '<option value="" selected disabled>Choose a starting point…</option><option value="blank">Blank</option>';
  const group = (label, items) => {
    if (!items.length) return;
    const og = document.createElement('optgroup');
    og.label = label;
    items.forEach(([value, text]) => og.appendChild(new Option(text, value)));
    select.appendChild(og);
  };
  group('Themes', THEMES.map((t) => [`theme:${t.id}`, t.label]));
  group('Your drafts', drafts.map((d, i) => [`draft:${i}`, `${d.label} (${d.id})`]));
}

function load(next, { keepId = true } = {}) {
  theme = clone(next);
  if (!theme.palettes.dark || !theme.palettes.light) throw new Error('A theme needs both palettes.');
  idEdited = keepId;
  fillForm();
  changed();
}

function bindForm() {
  $('startFrom').addEventListener('change', (event) => {
    const [kind, key] = event.target.value.split(':');
    if (kind === 'blank') load(blankTheme(), { keepId: false });
    if (kind === 'theme') {
      const t = THEMES.find((x) => x.id === key);
      load({ ...clone(t), comment: comments.get(key) || '' });
    }
    if (kind === 'draft') load(read(KEYS.drafts, [])[Number(key)]);
    event.target.value = '';
  });
  $('saveDraft').addEventListener('click', () => {
    const drafts = read(KEYS.drafts, []).filter((d) => d.id !== theme.id);
    drafts.push(clone(theme));
    write(KEYS.drafts, drafts);
    fillStartFrom();
    flash($('saveDraft'), 'Saved');
  });
  $('deleteDraft').addEventListener('click', () => {
    const drafts = read(KEYS.drafts, []);
    const kept = drafts.filter((d) => d.id !== theme.id);
    write(KEYS.drafts, kept);
    fillStartFrom();
    flash($('deleteDraft'), kept.length < drafts.length ? 'Deleted' : 'No draft by this id');
  });

  $('label').addEventListener('input', (e) => {
    theme.label = e.target.value;
    if (!idEdited) {
      theme.id = slug(theme.label);
      $('id').value = theme.id;
    }
    changed();
  });
  $('id').addEventListener('input', (e) => {
    idEdited = true;
    theme.id = slug(e.target.value);
    changed();
  });
  $('comment').addEventListener('input', (e) => {
    theme.comment = e.target.value;
    changed();
  });
  $('stack').addEventListener('input', (e) => {
    theme.font.stack = e.target.value;
    changed();
  });
  $('url').addEventListener('input', (e) => {
    theme.font.url = e.target.value.trim() || null;
    changed();
  });

  const loadFont = async () => {
    const name = $('family').value;
    const note = $('fontNote');
    if (!name.trim()) return;
    note.classList.remove('bad');
    note.textContent = `Looking up ${name.trim()}…`;
    try {
      const found = await probeFamily(name);
      const rest = faces(theme.font.stack).slice(1).map((f) => (/\s/.test(f) || /^[A-Z]/.test(f) ? `'${f}'` : f));
      const fallback = rest.length ? rest : [`'Helvetica Neue'`, 'Arial', 'sans-serif'];
      theme.font = {
        stack: [`'${name.trim()}'`, ...fallback].join(','),
        url: found.url,
        family: plus(name),
      };
      if (found.weights) theme.weights = found.weights;
      else delete theme.weights;
      const r = range(theme);
      const w = found.weights ? Math.min(r.max, Math.max(r.min, designed(theme))) : found.single;
      if (w === 200) delete theme.timeWeight;
      else theme.timeWeight = String(w);
      note.textContent = `${found.note} The stack and URL are set; the display face, if any, is dropped.`;
      fillForm();
      changed();
    } catch (error) {
      note.classList.add('bad');
      note.textContent = error.message;
    }
  };
  $('loadFont').addEventListener('click', loadFont);
  $('family').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadFont();
  });

  const weightsFromForm = () => {
    const min = Number($('wMin').value);
    const max = Number($('wMax').value);
    const step = Number($('wStep').value);
    if (!min || !max || min >= max) {
      delete theme.weights;
    } else {
      theme.weights = { min, max };
      if (step) theme.weights.step = step;
      const w = Math.min(max, Math.max(min, designed(theme)));
      if (w === 200) delete theme.timeWeight;
      else theme.timeWeight = String(w);
    }
    fillWeights();
    changed();
  };
  ['wMin', 'wMax', 'wStep'].forEach((id) => $(id).addEventListener('change', weightsFromForm));
  $('weight').addEventListener('input', (e) => {
    const w = Number(e.target.value);
    if (w === 200) delete theme.timeWeight;
    else theme.timeWeight = String(w);
    $('weightOut').textContent = w;
    changed();
  });
  $('timeScale').addEventListener('input', (e) => {
    const v = Number(e.target.value);
    if (v === 1) delete theme.timeScale;
    else theme.timeScale = String(v);
    $('scaleOut').textContent = `${Math.round(v * 100)}%`;
    changed();
  });
  $('timeStretch').addEventListener('input', (e) => {
    const v = Number(e.target.value);
    if (v === 100) delete theme.timeStretch;
    else theme.timeStretch = `${v}%`;
    $('stretchOut').textContent = v === 100 ? 'normal' : `${v}%`;
    changed();
  });
  $('lowResOpsz').addEventListener('input', (e) => {
    const v = Number(e.target.value);
    if (v) theme.lowResOpsz = v;
    else delete theme.lowResOpsz;
    changed();
  });

  $('lightFromDark').addEventListener('click', () => {
    draftMode('light');
    fillPalettes();
    changed();
  });
  $('darkFromLight').addEventListener('click', () => {
    draftMode('dark');
    fillPalettes();
    changed();
  });
}

function flash(button, text) {
  const was = button.dataset.label || button.textContent;
  button.dataset.label = was;
  button.textContent = text;
  clearTimeout(button.flashTimer);
  button.flashTimer = setTimeout(() => {
    button.textContent = was;
  }, 1400);
}

/* ---------- Previews ---------- */

const frames = [...document.querySelectorAll('.screen')].map((screen) => ({
  screen,
  mode: screen.dataset.mode,
  iframe: screen.querySelector('iframe'),
  ready: false,
}));

function paint(frame) {
  if (!frame.ready) return;
  frame.iframe.contentWindow.postMessage({
    type: 'paint',
    theme: clone(theme),
    mode: frame.mode,
    weight: shownWeight(),
    scale: pv.scale,
    weather: pv.weather,
    date: pv.date,
    blink: pv.blink,
  }, location.origin);
}
const paintAll = () => frames.forEach(paint);

addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.data?.type !== 'frame-ready') return;
  const frame = frames.find((f) => f.iframe.contentWindow === event.source);
  if (!frame) return;
  frame.ready = true;
  paint(frame);
});

// Each preview is a whole screen at its real size, scaled down to fit its box, so the
// clock lays itself out exactly as it would on that screen.
function layoutFrames() {
  const [w, h] = pv.size;
  frames.forEach(({ screen, iframe }) => {
    screen.style.aspectRatio = `${w} / ${h}`;
    iframe.style.width = `${w}px`;
    iframe.style.height = `${h}px`;
    iframe.style.transform = `scale(${screen.clientWidth / w})`;
  });
}

function bindPreview() {
  new ResizeObserver(layoutFrames).observe(document.querySelector('.previews'));
  document.querySelectorAll('[data-pw]').forEach((button) => {
    button.addEventListener('click', () => {
      previewWeight = button.dataset.pw;
      document.querySelectorAll('[data-pw]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      paintAll();
    });
  });
  const toggle = (id, key) => $(id).addEventListener('change', (e) => {
    pv[key] = e.target.checked;
    paintAll();
  });
  toggle('pvWeather', 'weather');
  toggle('pvDate', 'date');
  toggle('pvBlink', 'blink');
  $('pvScale').addEventListener('change', (e) => {
    pv.scale = Number(e.target.value);
    paintAll();
  });
  $('pvSize').addEventListener('change', (e) => {
    pv.size = e.target.value.split('x').map(Number);
    layoutFrames();
    scheduleChecks();
  });
}

/* ---------- Checks ---------- */

const probe = document.createElement('span');
$('measure').appendChild(probe);
function widthOf(t, weight, sizePx, text) {
  Object.assign(probe.style, {
    fontFamily: displayStack(t),
    fontWeight: String(weight),
    fontStretch: t.timeStretch || 'normal',
    fontSize: `${sizePx}px`,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums lining-nums',
    fontFeatureSettings: "'tnum' 1, 'lnum' 1",
  });
  probe.textContent = text;
  return probe.getBoundingClientRect().width;
}
const widest = (t, weight, sizePx) => Math.max(...SAMPLES.map((s) => widthOf(t, weight, sizePx, s)));

// Each current theme's clock width at its own weight and size, measured once.
let setWidths = null;
async function measureSet() {
  if (setWidths) return setWidths;
  await Promise.all(THEMES.map((t) => loadWeights(t, [designed(t)])));
  setWidths = new Map(THEMES.map((t) => [t.id, widthOf(t, designed(t), 100 * Number(t.timeScale || 1), '23:38')]));
  return setWidths;
}
const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};

// How far apart two themes' palettes are: background, accent and text, in both modes,
// in OKLab. Background and accent count double; they are most of what a theme looks like.
function paletteDistance(a, b) {
  let sum = 0;
  let total = 0;
  MODES.forEach((mode) => {
    [['--bg', 1], ['--accent', 1], ['--fg', 0.5]].forEach(([token, weight]) => {
      sum += weight * labDistance(a.palettes[mode][token], b.palettes[mode][token]);
      total += weight;
    });
  });
  return sum / total;
}
let closestPair = null;
function currentClosestPair() {
  if (closestPair) return closestPair;
  closestPair = { d: Infinity };
  THEMES.forEach((a, i) => THEMES.slice(i + 1).forEach((b) => {
    const d = paletteDistance(a, b);
    if (d < closestPair.d) closestPair = { a, b, d };
  }));
  return closestPair;
}

const fmt = (n, digits = 1) => n.toFixed(digits);
const grade = (value, good, ok) => (value >= good ? 'ok' : value >= ok ? 'warn' : 'bad');
const worst = (statuses) => (statuses.includes('bad') ? 'bad' : statuses.includes('warn') ? 'warn' : 'ok');

function contrastCheck(mode) {
  const p = theme.palettes[mode];
  const parts = [
    ['text', contrast(p['--fg'], p['--bg']), 7, 4.5],
    ['dim', contrast(p['--fg-dim'], p['--bg']), 4.5, 3],
    ['accent', contrast(p['--accent'], p['--bg']), 4.5, 3],
    ['accent 2', contrast(p['--accent-2'], p['--bg']), 1.6, 1.25],
    ['lines', contrast(p['--line'], p['--bg']), 1.15, 1.05],
  ];
  if (p['--panel-bg']) {
    parts.push(['text on panel', contrast(p['--fg'], p['--panel-bg']), 7, 4.5]);
    parts.push(['dim on panel', contrast(p['--fg-dim'], p['--panel-bg']), 4.5, 3]);
  }
  const graded = parts.map(([name, ratio, good, ok]) => ({ name, ratio, status: grade(ratio, good, ok) }));
  const weak = graded.filter((g) => g.status !== 'ok').map((g) => g.name);
  return {
    status: worst(graded.map((g) => g.status)),
    title: `${mode === 'dark' ? 'Dark' : 'Light'} contrast${weak.length ? `: ${weak.join(', ')} low` : ''}`,
    detail: graded.map((g) => `${g.name} ${fmt(g.ratio)}`).join(' · ')
      + ' (wants text 7, dim and accent 4.5: the hi temperature is small text)',
  };
}

let checkRun = 0;
let checkTimer = null;
function scheduleChecks() {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(runChecks, 250);
}

async function runChecks() {
  const run = ++checkRun;
  const t = clone(theme);
  const r = range(t);
  const weights = [...new Set([r.min, designed(t), r.max])];
  const results = [];

  // The font: did the face the theme names actually arrive?
  await loadWeights(t, weights);
  if (run !== checkRun) return;
  const family = spaced(t.font.family) || faces(displayStack(t))[0];
  const loaded = (await document.fonts.load(`${designed(t)} 100px '${family}'`, '0123456789:').catch(() => [])).length > 0;
  if (run !== checkRun) return;
  const first = faces(displayStack(t))[0];
  results.push(loaded
    ? {
      status: 'ok',
      title: `${family} loads`,
      detail: first !== family ? `${first} comes first in the stack where it’s installed; everything here measures ${first} if this browser has it, ${family} if not.` : 'Measured in the real face, not a fallback.',
    }
    : { status: 'bad', title: `${family || 'The font'} didn’t load`, detail: 'Every measurement below is of a fallback face. Check the family name or the URL.' });

  // Tabular figures at every end of the Weight slider.
  const spreads = weights.map((w) => {
    const widths = SAMPLES.map((s) => widthOf(t, w, 200, s));
    const digits = [...'0123456789'].map((d) => widthOf(t, w, 200, d));
    return { w, spread: Math.max(...widths) - Math.min(...widths), digitSpread: Math.max(...digits) - Math.min(...digits), widths };
  });
  const lurch = spreads.filter((s) => s.spread > 0.5 || s.digitSpread > 0.5);
  results.push(lurch.length
    ? {
      status: 'bad',
      title: 'Figures aren’t tabular',
      detail: lurch.map((s) => `at ${s.w}: ${SAMPLES.map((x, i) => `${x} ${fmt(s.widths[i], 0)}px`).join(', ')}`).join('; ') + ' (200px type). The clock would lurch as the minutes turn.',
    }
    : { status: 'ok', title: 'Figures are tabular', detail: `${SAMPLES.join(' / ')} all measure the same at ${weights.join(', ')}.` });

  // Width against the set: every clock spans about the same width.
  const set = await measureSet();
  if (run !== checkRun) return;
  const others = THEMES.filter((x) => x.id !== t.id);
  const target = median(others.map((x) => set.get(x.id)));
  const ts = Number(t.timeScale || 1);
  const own = widthOf(t, designed(t), 100 * ts, '23:38');
  const ratio = own / target;
  const suggest = Math.round(ts * (target / own) * 100) / 100;
  results.push({
    status: ratio > 0.92 && ratio < 1.08 ? 'ok' : 'warn',
    title: `Clock is ${Math.round(ratio * 100)}% as wide as the set’s`,
    detail: ratio > 0.92 && ratio < 1.08 ? 'Within 8% of the median theme at its own weight.' : `Size ${Math.round(suggest * 100)}% would match the median theme.`,
    action: ratio > 0.92 && ratio < 1.08 ? null : {
      label: `Set size ${Math.round(suggest * 100)}%`,
      fn: () => {
        if (suggest === 1) delete theme.timeScale;
        else theme.timeScale = String(suggest);
        fillForm();
        changed();
      },
    },
  });

  // Room at the top of the Scale slider, at the heaviest weight.
  const [sw] = pv.size;
  const big = clockPx(sw) * 1.5 * ts;
  const share = widest(t, r.max, big) / sw;
  let fitsAt = null;
  if (share > ROOM && t.weights) {
    const step = t.weights.step || 50;
    for (let w = r.max - step; w >= r.min; w -= step) {
      if (widest(t, w, big) / sw <= ROOM) {
        fitsAt = w;
        break;
      }
    }
  }
  results.push(share <= ROOM
    ? { status: 'ok', title: 'Fits at 150%', detail: `At ${r.max} the widest time takes ${Math.round(share * 100)}% of a ${sw}px screen.` }
    : {
      status: 'warn',
      title: `Crowded at 150%, weight ${r.max}`,
      detail: `The widest time takes ${Math.round(share * 100)}% of a ${sw}px screen, past the ${ROOM * 100}% where the clock starts shrinking to fit, so the top of the Scale slider does nothing.${fitsAt ? ` A max of ${fitsAt} fits.` : ''}`,
      action: fitsAt ? {
        label: `Max ${fitsAt}`,
        fn: () => {
          theme.weights.max = fitsAt;
          if (designed(theme) > fitsAt) theme.timeWeight = String(fitsAt);
          fillForm();
          changed();
        },
      } : null,
    });

  // Contrast, per mode.
  MODES.forEach((mode) => results.push(contrastCheck(mode)));

  // Distinct from the rest: palette and face.
  const near = others.map((x) => ({ x, d: paletteDistance(t, x) })).sort((a, b) => a.d - b.d);
  const pair = currentClosestPair();
  const tooClose = near[0].d < pair.d;
  results.push({
    status: tooClose ? 'warn' : 'ok',
    title: tooClose ? `Very close to ${near[0].x.label}` : `Nearest: ${near[0].x.label}`,
    detail: `${near.slice(0, 3).map((n) => `${n.x.label} ${fmt(n.d, 3)}`).join(' · ')}. The two closest current themes, ${pair.a.label} and ${pair.b.label}, are ${fmt(pair.d, 3)} apart.`,
  });
  const sharing = others.filter((x) => x.font.family && x.font.family === t.font.family);
  results.push(sharing.length
    ? { status: 'warn', title: `Shares its face with ${sharing.map((x) => x.label).join(', ')}`, detail: 'A typeface paired for good with one palette is most of what makes a theme its own.' }
    : { status: 'ok', title: 'Its own typeface', detail: 'No current theme uses it.' });

  if (run !== checkRun) return;
  renderChecks(results);
}

let lastChecks = [];
function renderChecks(results) {
  lastChecks = results;
  const list = $('checks');
  list.innerHTML = '';
  results.forEach((r) => {
    const li = document.createElement('li');
    li.className = r.status;
    const body = document.createElement('div');
    body.innerHTML = `<b></b><span class="detail"></span>`;
    body.querySelector('b').textContent = r.title;
    body.querySelector('.detail').textContent = r.detail;
    if (r.action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = r.action.label;
      button.addEventListener('click', r.action.fn);
      body.querySelector('b').after(button);
    }
    li.appendChild(body);
    list.appendChild(li);
  });
  const bad = results.filter((r) => r.status === 'bad').length;
  const warn = results.filter((r) => r.status === 'warn').length;
  $('checkSummary').textContent = bad || warn ? `${bad} failing, ${warn} to look at` : 'all clear';
}

/* ---------- Export ---------- */

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
function wrap(text, width = 84) {
  const lines = [];
  let line = '';
  text.split(/\s+/).filter(Boolean).forEach((word) => {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  });
  if (line) lines.push(line);
  return lines;
}
const inline = (obj) => `{ ${Object.entries(obj).map(([k, v]) => `${k}: ${typeof v === 'string' ? q(v) : v}`).join(', ')} }`;

function exportTheme(t) {
  const i = '    ';
  const out = ['  {'];
  wrap(t.comment || '').forEach((line) => out.push(`${i}// ${line}`));
  out.push(`${i}id: ${q(t.id)},`);
  out.push(`${i}label: ${q(t.label)},`);
  if (t.labelStyle) out.push(`${i}labelStyle: ${inline(t.labelStyle)},`);
  if (t.timeScale) out.push(`${i}timeScale: ${q(t.timeScale)},`);
  if (t.timeStretch) out.push(`${i}timeStretch: ${q(t.timeStretch)},`);
  if (t.lowResOpsz) out.push(`${i}lowResOpsz: ${t.lowResOpsz},`);
  out.push(`${i}font: {`);
  out.push(`${i}  stack: \`${t.font.stack}\`,`);
  if (t.font.display) out.push(`${i}  display: \`${t.font.display}\`,`);
  out.push(`${i}  url: ${t.font.url ? q(t.font.url) : 'null'},`);
  if (t.font.family) out.push(`${i}  family: ${q(t.font.family)},`);
  out.push(`${i}},`);
  if (t.weights) out.push(`${i}weights: ${inline(t.weights)},`);
  if (t.timeWeight && t.timeWeight !== '200') out.push(`${i}timeWeight: ${q(t.timeWeight)},`);
  out.push(`${i}palettes: {`);
  MODES.forEach((mode) => {
    const p = t.palettes[mode];
    const pairs = (tokens) => tokens.filter((k) => p[k]).map((k) => `${q(k)}: ${q(p[k])}`).join(', ');
    out.push(`${i}  ${mode}: {`);
    out.push(`${i}    ${pairs(['--bg', '--line', '--fg', '--fg-dim'])},`);
    out.push(`${i}    ${pairs(['--accent', '--accent-2'])},`);
    if (p['--panel-bg']) out.push(`${i}    ${pairs(['--panel-bg'])},`);
    out.push(`${i}  },`);
  });
  out.push(`${i}},`);
  out.push('  },');
  return out.join('\n');
}

function renderExport() {
  $('exportCode').textContent = exportTheme(theme);
}

/* ---------- Gallery ---------- */

const shortlist = new Set(read(KEYS.shortlist, []));
function renderShortCount() {
  $('shortCount').textContent = shortlist.size ? `★ ${shortlist.size}` : '';
}

function half(t, mode, time) {
  const el = document.createElement('div');
  el.className = 'half';
  const p = t.palettes[mode];
  Object.entries(p).forEach(([k, v]) => el.style.setProperty(k, v));
  el.style.setProperty('--font-stack', t.font.stack);
  el.style.setProperty('--font-display', displayStack(t));
  el.innerHTML = `<div class="g-time"></div><div class="g-row"><span>${mode === 'dark' ? 'Dark' : 'Light'}</span><span class="dot"></span><span class="hi">H 17°</span></div>`;
  const clock = el.querySelector('.g-time');
  Object.assign(clock.style, {
    fontSize: `${46 * Number(t.timeScale || 1)}px`,
    fontWeight: String(designed(t)),
    fontStretch: t.timeStretch || 'normal',
  });
  clock.innerHTML = `${time.slice(0, 2)}<i>:</i>${time.slice(3)}`;
  return el;
}

function renderGallery() {
  const cards = $('cards');
  cards.innerHTML = '';
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const entries = [{ t: theme, draft: true }, ...THEMES.map((t) => ({ t }))];
  entries.forEach(({ t, draft }) => {
    ensureFont(t.font.url);
    const card = document.createElement('article');
    card.className = `card${draft ? ' draft' : ''}`;
    const halves = document.createElement('div');
    halves.className = 'halves';
    halves.title = draft ? 'The draft: back to the editor' : `Start a draft from ${t.label}`;
    MODES.forEach((mode) => halves.appendChild(half(t, mode, time)));
    halves.addEventListener('click', () => {
      if (!draft) load({ ...clone(t), comment: comments.get(t.id) || '' });
      showTab('editor');
    });
    const footer = document.createElement('footer');
    footer.innerHTML = `<span><span class="name"></span> <small></small></span>`;
    footer.querySelector('.name').textContent = draft ? `${t.label} (draft)` : t.label;
    footer.querySelector('small').textContent = spaced(t.font.family) || faces(displayStack(t))[0];
    if (!draft) {
      const star = document.createElement('button');
      star.className = 'star';
      star.type = 'button';
      star.textContent = '★';
      star.setAttribute('aria-label', `Shortlist ${t.label}`);
      star.setAttribute('aria-pressed', String(shortlist.has(t.id)));
      star.addEventListener('click', () => {
        if (shortlist.has(t.id)) shortlist.delete(t.id);
        else shortlist.add(t.id);
        write(KEYS.shortlist, [...shortlist]);
        star.setAttribute('aria-pressed', String(shortlist.has(t.id)));
        renderShortCount();
      });
      footer.appendChild(star);
    }
    card.append(halves, footer);
    cards.appendChild(card);
  });
}

function showTab(name) {
  document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  $('editorView').hidden = name !== 'editor';
  $('galleryView').hidden = name !== 'gallery';
  scrollTo(0, 0);
  if (name === 'gallery') renderGallery();
  else layoutFrames();
}

/* ---------- Wiring ---------- */

let paintQueued = false;
function changed() {
  write(KEYS.current, theme);
  if (!paintQueued) {
    paintQueued = true;
    requestAnimationFrame(() => {
      paintQueued = false;
      paintAll();
    });
  }
  renderExport();
  scheduleChecks();
}

// Everything a chat needs to pick the theme up where the studio left it: the entry
// itself, what the checks say about it, and how it was being looked at.
function forClaude() {
  const mark = { ok: '✅', warn: '⚠️', bad: '❌' };
  const weightShown = previewWeight === 'designed' ? `its set weight (${designed(theme)})` : `its ${previewWeight} weight (${shownWeight()})`;
  return [
    `A Clockspian theme from the studio (studio/), “${theme.label}” (\`${theme.id}\`).`,
    '',
    '```js',
    exportTheme(theme),
    '```',
    '',
    'Checks:',
    ...lastChecks.map((r) => `- ${mark[r.status] || '•'} ${r.title}: ${r.detail}`),
    '',
    `Previewed on a ${pv.size.join('×')} screen at ${pv.scale * 100}% scale, at ${weightShown}, weather ${pv.weather ? 'on' : 'off'}, date ${pv.date ? 'on' : 'off'}.`,
  ].join('\n');
}

async function copy(button, text) {
  try {
    await navigator.clipboard.writeText(text);
    flash(button, 'Copied');
  } catch {
    flash(button, 'Couldn’t copy');
  }
}
$('copyExport').addEventListener('click', () => copy($('copyExport'), exportTheme(theme)));
$('copyClaude').addEventListener('click', () => copy($('copyClaude'), forClaude()));
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

buildPalettes();
bindForm();
bindPreview();
fillStartFrom();
fillForm();
renderShortCount();
layoutFrames();
changed();
readComments();
// A preview that came up before this script was listening says hello again.
frames.forEach((f) => f.iframe.contentWindow?.postMessage({ type: 'hello' }, location.origin));
