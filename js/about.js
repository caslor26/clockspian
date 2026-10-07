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

// Ask before anything else gets a chance to write to storage: a first visit is told by
// there being nothing of Clockspian's there yet.
export function isFirstVisit() {
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    // '0' is a first visit that was reloaded before the dialog was closed.
    if (seen) return seen === '0';
    // Anyone with settings, a location or a cached reading was here before this dialog
    // existed — and their screen may be on a wall with nobody around to dismiss it.
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).startsWith('clockspian.')) {
        markSeen();
        return false;
      }
    }
    // Claimed now, before the weather cache lands and makes this look like a return.
    localStorage.setItem(SEEN_KEY, '0');
    return true;
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
