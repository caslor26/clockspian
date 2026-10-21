// The opening on every load: the mark draws itself — the dial, then the hands — the name
// comes up under it, and the whole thing fades away into the clock. The same moment as
// the end of the promo film, minus the words.
//
// The splash is in the HTML from the first frame, so the clock never shows before it; it
// only starts drawing once settings.js has painted the theme, so it draws in the right
// colours. A click or a key skips it, and with reduced motion it never shows at all.

const JOST = 'https://fonts.googleapis.com/css2?family=Jost:wght@400&text=CLOCKSPIAN&display=swap';

// The name is always set in Jost, which only the default theme loads by itself.
function loadWordmarkFont() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = JOST;
  document.head.appendChild(link);
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
