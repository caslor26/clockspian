import { LOCATION_MODES, getLocation, getLocationState, onLocationChange, setLocationMode, setCity, searchCities } from './location.js';
import { openAbout } from './about.js';
import { openWhatsNew } from './whatsnew.js';
import { VERSION } from './version.js';
import { getCountdown, setCountdown, onCountdownChange, countdownStatus } from './countdown.js';
import { primeAudio } from './insane.js';
import { labelFamily, loadLabelFont } from './fonts.js';
import { THEMES } from './themes.js';

// Persisted display settings. Everything is applied by writing CSS custom
// properties onto :root — no component knows what the current theme is.

const STORAGE_KEY = 'clockspian.settings';

// 'system' follows the computer's own light or dark, and keeps following it as it changes.
const MODES = ['light', 'system', 'dark'];
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const DEFAULTS = { scale: 1, blink: true, bar: true, date: true, weights: {}, theme: 'clockspian', mode: 'system', weather: false };

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
    loaded.weights = { ...loaded.weights };
    loaded.theme = RENAMED_THEMES[loaded.theme] || loaded.theme;
    if (!THEMES.some((t) => t.id === loaded.theme)) loaded.theme = DEFAULTS.theme;
    if (!MODES.includes(loaded.mode)) loaded.mode = DEFAULTS.mode;
    return loaded;
  } catch {
    return { ...DEFAULTS, weights: {} };
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

// The clock's weight as the theme was designed, and as it's set now. Each theme remembers
// its own, since Signal starts bold and Fjord starts thin; only a change is stored.
const designedWeight = (theme) => Number(theme.timeWeight || 200);
function timeWeight(theme) {
  const chosen = state.weights[theme.id];
  if (!theme.weights || chosen == null) return designedWeight(theme);
  return Math.min(theme.weights.max, Math.max(theme.weights.min, chosen));
}

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

  root.style.setProperty('--time-weight', String(timeWeight(theme)));
  if (theme.timeScale) root.style.setProperty('--time-scale', theme.timeScale);
  else root.style.removeProperty('--time-scale');
  if (theme.timeStretch) root.style.setProperty('--time-stretch', theme.timeStretch);
  else root.style.removeProperty('--time-stretch');
  if (theme.lowResOpsz) root.style.setProperty('--time-lowres-variation', `'opsz' ${theme.lowResOpsz}`);
  else root.style.removeProperty('--time-lowres-variation');

  applyFont(theme.font);
  setColorScheme(mode);
  setThemeColor(palette['--bg']);

  document.body.classList.toggle('no-blink', !state.blink);
  document.body.classList.toggle('no-bar', !state.bar);
  document.body.classList.toggle('no-date', !state.date);
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
  loadLabelFont(`https://fonts.googleapis.com/css2?${families.join('&')}&text=${encodeURIComponent(glyphs)}&display=swap`);
}

// A theme's name in its label subset, slotted in after the stack's first face: the
// active theme's full font still wins, and so does Clåde's Anthropic Serif where it's
// installed, but neither steps aside for the stack's fallbacks.
function labelStack(theme) {
  const [first, ...rest] = (theme.font.display || theme.font.stack).split(',');
  if (!theme.font.family) return [first, ...rest].join(',');
  return [first, `'${labelFamily(theme.font.family.replace(/\+/g, ' '))}'`, ...rest].join(',');
}

export function initSettings() {
  apply();

  const toggle = document.getElementById('settingsToggle');
  const panel = document.getElementById('panel');
  const scaleInput = document.getElementById('scaleInput');
  const scaleValue = document.getElementById('scaleValue');
  const blinkSwitch = document.getElementById('blinkSwitch');
  const barSwitch = document.getElementById('barSwitch');
  const dateSwitch = document.getElementById('dateSwitch');
  const modeSwitch = document.getElementById('modeSwitch');
  const themeRow = document.getElementById('themeChoices');
  const weightInput = document.getElementById('weightInput');
  const weightValue = document.getElementById('weightValue');
  const weightNote = document.getElementById('weightNote');
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

  // --- blinking colon, bottom progress bar, date ---

  function syncSeconds() {
    blinkSwitch.setAttribute('aria-checked', String(state.blink));
    barSwitch.setAttribute('aria-checked', String(state.bar));
    dateSwitch.setAttribute('aria-checked', String(state.date));
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
  dateSwitch.addEventListener('click', () => {
    state.date = !state.date;
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
    name.style.fontFamily = labelStack(theme);
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
    syncWeight();
  }

  // --- weight ---
  // Runs from as thin to as bold as the theme's typeface goes, starting where the theme
  // was designed. Fonts that only go one way from there put the thumb at that end.

  function placeWeightThumb(weight) {
    weightInput.value = String(weight);
    const min = Number(weightInput.min);
    const max = Number(weightInput.max);
    weightInput.style.setProperty('--fill', `${max > min ? ((weight - min) / (max - min)) * 100 : 0}%`);
    weightValue.textContent = String(weight);
  }

  function syncWeight() {
    const theme = themeById(state.theme);
    const range = theme.weights;
    weightInput.disabled = !range;
    weightNote.hidden = Boolean(range);
    if (!range) {
      weightNote.textContent = `${theme.label} comes in one weight.`;
      weightInput.min = weightInput.max = String(designedWeight(theme));
      placeWeightThumb(designedWeight(theme));
      return;
    }
    weightInput.min = String(range.min);
    weightInput.max = String(range.max);
    weightInput.step = String(range.step || 10);
    placeWeightThumb(timeWeight(theme));
  }

  function setWeight(weight) {
    const theme = themeById(state.theme);
    if (weight === designedWeight(theme)) delete state.weights[theme.id];
    else state.weights[theme.id] = weight;
    placeWeightThumb(timeWeight(theme));
  }

  // The clock follows the drag; the choice is saved once it's let go.
  weightInput.addEventListener('input', () => {
    setWeight(Number(weightInput.value));
    apply();
  });
  weightInput.addEventListener('change', commit);
  weightInput.addEventListener('dblclick', () => {
    if (weightInput.disabled) return;
    setWeight(designedWeight(themeById(state.theme)));
    commit();
  });
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
