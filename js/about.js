// "What is this?" — shown by itself on a first visit, and from the settings panel after.
//
// A <dialog> opened with showModal(): the page behind goes inert, focus moves in and
// comes back out on close, and Esc closes it — all without a line of focus-trapping here.

const SEEN_KEY = 'clockspian.introSeen';

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // It shows again next visit. There are worse fates.
  }
}

// "First visit" means first since this dialog shipped: people who were already using
// Clockspian get it once too, so the key is all that counts — not whether there are
// settings or a cached reading.
export function isFirstVisit() {
  try {
    return !localStorage.getItem(SEEN_KEY);
  } catch {
    // No storage means no way to remember it was seen, so it would greet every load.
    return false;
  }
}

let dialog = null;
let waiting = [];

function setUp() {
  dialog = document.getElementById('about');
  document.getElementById('aboutClose').addEventListener('click', () => dialog.close());
  // A click that lands on the <dialog> itself, not its content, was on the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Every way out — the button, the backdrop, Esc — ends here.
  dialog.addEventListener('close', () => {
    markSeen();
    waiting.forEach((resolve) => resolve());
    waiting = [];
  });
}

// Resolves once the dialog is closed again.
export function openAbout() {
  if (!dialog) setUp();
  if (!dialog.open) dialog.showModal();
  return new Promise((resolve) => waiting.push(resolve));
}
