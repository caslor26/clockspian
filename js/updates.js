import { VERSION } from './version.js';

// A screen left on for weeks never reloads, so it would run the version it opened with
// forever. Once an hour — and whenever the tab comes back into view — this reads the live
// js/version.js (a few KB) and, if the newest release there isn't this one, reloads to
// pick it up. Settings and the weather cache live in localStorage, so a reload costs
// nothing but a blink.

const CHECK_EVERY = 60 * 60 * 1000;
// coming back to the tab checks too, but not more often than this
const RECHECK_AFTER = 10 * 60 * 1000;
// someone mid-way through the settings or a dialog gets left alone a little longer
const BUSY_RETRY = 60 * 1000;

const SOURCE = new URL('./version.js', import.meta.url);

let lastCheck = 0;

async function liveVersion() {
  const response = await fetch(SOURCE, { cache: 'no-store' });
  if (!response.ok) return null;
  // the first `version:` in the file is the newest release
  const match = (await response.text()).match(/version:\s*'([^']+)'/);
  return match ? match[1] : null;
}

function busy() {
  return document.body.classList.contains('panel-open') || document.querySelector('dialog[open]');
}

function reloadWhenIdle() {
  if (busy()) setTimeout(reloadWhenIdle, BUSY_RETRY);
  else location.reload();
}

async function check() {
  lastCheck = Date.now();
  try {
    const live = await liveVersion();
    if (live && live !== VERSION) reloadWhenIdle();
  } catch {
    // Offline, most likely. The next check will do.
  }
}

export function watchForUpdates() {
  setInterval(check, CHECK_EVERY);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck > RECHECK_AFTER) check();
  });
}
