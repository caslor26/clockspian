// A studio preview: the clock's own stage, lifted out of the live index.html so the
// markup never drifts from the app, ticking on the app's own clock.js and sized by its
// fit.js. The studio posts a theme in; this paints it the way js/settings.js would.
// No settings, splash, panel or service worker: nothing here writes to localStorage.

import { initClock } from '/js/clock.js';
import { initFit } from '/js/fit.js';
import { glyphFor } from '/js/icons.js';

const html = await (await fetch('/', { cache: 'no-cache' })).text();
const stage = new DOMParser().parseFromString(html, 'text/html').querySelector('.stage');
stage.querySelector('.settings-toggle')?.remove();
document.body.prepend(document.importNode(stage, true));

// A made-up reading, so the weather row has something to wear the theme.
const set = (id, text) => { document.getElementById(id).textContent = text; };
document.getElementById('glyph').innerHTML = glyphFor('partly-cloudy', true);
set('temp', '14');
set('condition', 'Partly cloudy');
set('place', 'Uppsala');
set('hi', 'H 17°');
set('lo', 'L 9°');

initFit();
initClock();

let fontLink = null;
function applyFont(url) {
  if (!url) {
    fontLink?.remove();
    fontLink = null;
    return;
  }
  if (!fontLink) {
    fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }
  if (fontLink.href !== url) fontLink.href = url;
}

// The same properties js/settings.js writes, from the same theme shape.
function paint({ theme, mode, weight, scale, weather, date, blink }) {
  const root = document.documentElement;
  const palette = theme.palettes[mode];
  root.style.setProperty('--ui-scale', String(scale));
  Object.entries(palette).forEach(([name, value]) => root.style.setProperty(name, value));
  if (!palette['--panel-bg']) root.style.setProperty('--panel-bg', palette['--bg']);
  root.style.setProperty('--time-weight', String(weight));
  const optional = { '--time-scale': theme.timeScale, '--time-stretch': theme.timeStretch };
  Object.entries(optional).forEach(([name, value]) => {
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  });
  if (theme.lowResOpsz) root.style.setProperty('--time-lowres-variation', `'opsz' ${theme.lowResOpsz}`);
  else root.style.removeProperty('--time-lowres-variation');
  root.style.setProperty('--font-stack', theme.font.stack);
  root.style.setProperty('--font-display', theme.font.display || theme.font.stack);
  applyFont(theme.font.url);
  root.style.colorScheme = mode;
  document.body.classList.toggle('no-weather', !weather);
  document.body.classList.toggle('no-date', !date);
  document.body.classList.toggle('no-blink', !blink);
}

addEventListener('message', (event) => {
  if (event.origin !== location.origin) return;
  if (event.data?.type === 'paint') paint(event.data);
  // the studio came up after this frame did, and missed its first hello
  if (event.data?.type === 'hello') parent.postMessage({ type: 'frame-ready' }, location.origin);
});
parent.postMessage({ type: 'frame-ready' }, location.origin);
