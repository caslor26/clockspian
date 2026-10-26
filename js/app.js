// Clockspian as an app of its own: installable, openable offline, and awake for as long
// as it's on screen. Most of this is quietly useful in a plain browser tab too.

// --- offline ---

// sw.js keeps a copy of everything the page loads, so the next launch works offline.
// On a first visit the page has already loaded before the worker starts, so once it's
// running everything the page fetched so far is asked for again, this time through it.
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const firstVisit = !navigator.serviceWorker.controller;
  const taken = new Promise((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
  });
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // No offline copy this time. Online, nothing is different.
    return;
  }
  if (!firstVisit) return;
  await taken;
  // The films stream, and the weather keeps its own last reading.
  performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => !url.includes('/media/') && !/^api\./.test(new URL(url).hostname))
    .forEach((url) => fetch(url).catch(() => {}));
}

// --- the screen stays on ---

// A clock that lets the screen go dark isn't much of a clock. The browser lets go of the
// lock whenever the window is hidden or minimised, so it's asked for again on the way back.
let wakeLock = null;

async function stayAwake() {
  if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    // Battery saver, or a browser policy. The screen sleeps as it would have anyway.
  }
}

// --- full screen on F ---

function typingInto(target) {
  return target.closest('input, textarea, select, [contenteditable]');
}

function toggleFullscreen(event) {
  if (event.key !== 'f' && event.key !== 'F') return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
  if (typingInto(event.target) || document.querySelector('dialog[open]')) return;
  if (!document.fullscreenEnabled) return;
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

// --- "Install as an app" ---

// Chrome and Edge hand over their install prompt for the page to raise from its own
// button. Safari on a Mac never does, but File → Add to Dock does the same job, so there
// the button says how. Anything else (Firefox, a phone) gets no button at all.
function standalone() {
  return matchMedia('(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: fullscreen)').matches
    || navigator.standalone === true;
}

function safariOnMac() {
  const ua = navigator.userAgent;
  return /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua)
    && navigator.maxTouchPoints === 0; // an iPad says Macintosh too
}

function initInstall() {
  const field = document.getElementById('installField');
  const button = document.getElementById('installButton');
  const note = document.getElementById('installNote');
  let deferred = null;

  if (standalone()) return;

  if (safariOnMac()) {
    field.hidden = false;
    button.addEventListener('click', () => {
      note.textContent = 'In Safari’s menu bar, choose File, then Add to Dock.';
      note.hidden = false;
    });
    return;
  }

  addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    field.hidden = false;
  });
  addEventListener('appinstalled', () => {
    deferred = null;
    field.hidden = true;
  });
  button.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The prompt is spent either way; Chrome offers a fresh one if it's still wanted.
    deferred = null;
    if (outcome === 'accepted') field.hidden = true;
  });
}

export function initApp() {
  registerServiceWorker();

  stayAwake();
  document.addEventListener('visibilitychange', stayAwake);

  document.addEventListener('keydown', toggleFullscreen);

  // Installed, the window is titled by the app's name; the browser-tab tagline would
  // only repeat it in the Dock and the taskbar.
  if (standalone()) document.title = 'Clockspian';
  initInstall();
}
