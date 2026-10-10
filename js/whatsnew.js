import { RELEASES, VERSION } from './version.js';

// "What's new" — a small note in the top-right corner after an update, and the release
// notes it opens. The note sits beside the gear rather than over the clock: on a screen
// nobody is watching, a modal would hide the time until someone walked over to close it.

const SEEN_KEY = 'clockspian.versionSeen';

// Before versions existed nobody stored one, and everyone who had used Clockspian was
// on 1.0.0.
const UNVERSIONED = '1.0.0';

function parts(version) {
  return version.split('.').map(Number);
}

function isNewer(a, b) {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] > y[i];
  }
  return false;
}

// x.y.0 — the releases worth interrupting for. Patches wait for the next one.
function isFeature(release) {
  return parts(release.version)[2] === 0;
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, VERSION);
  } catch {
    // Without storage the note couldn't be put away either, so it never appears.
  }
}

function lastSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) || UNVERSIONED;
  } catch {
    return null;
  }
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return DATE_FORMAT.format(new Date(year, month - 1, day));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderRelease(release) {
  const section = element('section', 'release');
  section.append(element('p', 'release-version', `Version ${release.version} · ${formatDate(release.date)}`));
  for (const note of release.notes) {
    const heading = element('h3');
    const emoji = element('span', 'about-emoji', note.emoji);
    emoji.setAttribute('aria-hidden', 'true');
    heading.append(emoji, note.title);
    section.append(heading, element('p', null, note.text));
  }
  return section;
}

let dialog = null;
let news = null;

function setUp() {
  dialog = document.getElementById('whatsNew');
  news = document.getElementById('news');
  document.getElementById('whatsNewClose').addEventListener('click', () => dialog.close());
  // A click that lands on the <dialog> itself, not its content, was on the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Every way out — the button, the backdrop, Esc — puts the note away for good.
  dialog.addEventListener('close', () => {
    markSeen();
    news.classList.remove('shown');
  });
}

// Every release, or only those newer than `since`.
export function openWhatsNew(since = null) {
  if (!dialog) setUp();
  const releases = RELEASES.filter((r) => r.notes.length && (!since || isNewer(r.version, since)));
  const body = document.getElementById('whatsNewBody');
  const title = element('h2', 'about-title', 'What’s new');
  title.id = 'whatsNewTitle';
  body.replaceChildren(title, ...releases.map(renderRelease));
  body.scrollTop = 0;
  if (!dialog.open) dialog.showModal();
}

// On a first visit the intro does the talking: this version counts as seen, and there
// is nothing earlier to catch up on.
export function initWhatsNew(firstVisit) {
  if (!dialog) setUp();
  if (firstVisit) {
    markSeen();
    return;
  }
  const since = lastSeen();
  if (!since) return;
  const missed = RELEASES.filter((r) => isNewer(r.version, since));
  if (missed.some(isFeature)) {
    news.addEventListener('click', () => openWhatsNew(since));
    news.classList.add('shown');
  } else if (missed.length) {
    markSeen();
  }
}
