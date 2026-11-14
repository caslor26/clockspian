// The opening on every load: the mark draws itself — the dial, then the hands — the name
// comes up under it, and the whole thing fades away into the clock. The same moment as
// the end of the promo film, minus the words.
//
// The splash is in the HTML from the first frame, so the clock never shows before it; it
// only starts drawing once settings.js has painted the theme, so it draws in the right
// colours. A click or a key skips it, and with reduced motion it never shows at all.

import { loadLabelFont } from './fonts.js';

// The name, and the moods the switch between them shows: Zen, Normal, Insane.
const JOST = 'https://fonts.googleapis.com/css2?family=Jost:wght@400&text=CLOCKSPIANZERM&display=swap';

// The name is always set in Jost, whichever theme is on, so just its letters are loaded,
// as 'Jost Label' (see js/fonts.js).
function loadWordmarkFont() {
  loadLabelFont(JOST);
}

// Resolves once the splash is gone and the clock is showing.
export function playSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return Promise.resolve();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    splash.remove();
    return Promise.resolve();
  }

  loadWordmarkFont();
  return new Promise((resolve) => {
    const finish = () => {
      splash.remove();
      removeEventListener('pointerdown', skip, true);
      removeEventListener('keydown', skip, true);
      resolve();
    };
    function skip() {
      splash.classList.add('skip');
    }
    // Only the splash's own fade-out ends it, not the drawing animations inside it.
    splash.addEventListener('animationend', (event) => {
      if (event.target === splash) finish();
    });
    addEventListener('pointerdown', skip, true);
    addEventListener('keydown', skip, true);
    splash.classList.add('play');
  });
}

// Between moods: a short splash with the mark, the name and the mood it's going to. The
// clock changes behind it (swap), out of sight, and it lifts onto the new one. Pressing
// the switch again mid-way finishes the first change at once and starts over. With
// reduced motion the change is simply made.
const MOOD_NAMES = { zen: 'Zen', normal: 'Normal', insane: 'Insane' };
const SWAP_MS = { zen: 340, normal: 320, insane: 260 };
let shifting = null;

export function shiftMood(mood, swap) {
  if (shifting) {
    shifting.swap();
    shifting.veil.remove();
    clearTimeout(shifting.timer);
    shifting = null;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    swap();
    return;
  }
  loadWordmarkFont();
  const veil = document.createElement('div');
  veil.className = `shift to-${mood}`;
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = `<svg class="splash-mark" viewBox="0 0 64 64" fill="none" stroke-width="7">
      <path class="brand-dial" pathLength="1" d="M47.56 16.44A22 22 0 1 0 47.56 47.56"/>
      <path class="brand-hands" pathLength="1" d="M32 15V32H46"/>
    </svg>
    <span class="brand-name">Clockspian</span>
    <span class="shift-mood">${MOOD_NAMES[mood]}</span>`;
  document.body.append(veil);

  let swapped = false;
  const current = {
    veil,
    swap: () => {
      if (swapped) return;
      swapped = true;
      swap();
    },
  };
  current.timer = setTimeout(current.swap, SWAP_MS[mood]);
  veil.addEventListener('animationend', (event) => {
    if (event.target !== veil || event.animationName !== 'shift-out') return;
    current.swap();
    veil.remove();
    if (shifting === current) shifting = null;
  });
  shifting = current;
}
