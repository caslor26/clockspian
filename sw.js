// The service worker: what lets Clockspian open with no network, installed or not.
//
// Clockspian's own files go network-first. Online, every load is the live deploy, exactly
// as before, and js/updates.js still sees a new release the moment it lands. Each response
// is kept on the way through, so offline the last copy that loaded opens instead. A
// network that is there but crawling gets a few seconds before the kept copy steps in.
//
// The theme fonts never change at a given URL, so they come from the cache once fetched.
// Weather and place lookups pass straight through: js/weather.js and js/location.js keep
// their own last readings in localStorage. So do the films, which are big and streamed.

const CACHE = 'clockspian';
const NETWORK_TIMEOUT = 4000;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  // The page itself, so even an install made from a half-loaded tab opens offline.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function keep(request, response) {
  // Opaque font responses report status 0, but they are still the font.
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const fresh = fetch(request).then((response) => keep(request, response));
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT));
  try {
    const response = await Promise.race([fresh, timeout]);
    if (response) return response;
  } catch {
    // Offline. The kept copy will do.
  }
  // `?v=` style queries aside, a navigation to any path of the app is the app.
  const kept = await caches.match(request, { ignoreSearch: request.mode === 'navigate' })
    || (request.mode === 'navigate' && await caches.match('/'));
  // Nothing kept: wait the network out after all, and let it fail if it fails.
  return kept || fresh;
}

// A Google Fonts stylesheet names its font files, which the page may have fetched before
// this worker was around to keep them. They're fetched alongside it, so the font is
// whole offline and not just its description.
async function keepFontFiles(response) {
  if (response.type === 'opaque') return;
  const css = await response.clone().text();
  const files = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((match) => match[1]);
  const cache = await caches.open(CACHE);
  await Promise.all(files.map(async (file) => {
    if (!(await cache.match(file))) await cache.add(file).catch(() => {});
  }));
}

async function cacheFirst(event) {
  const { request } = event;
  const kept = await caches.match(request);
  if (kept) return kept;
  const response = await keep(request, await fetch(request));
  if (new URL(request.url).hostname === 'fonts.googleapis.com') event.waitUntil(keepFontFiles(response));
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(event));
  } else if (url.origin === self.location.origin && !url.pathname.startsWith('/media/')) {
    event.respondWith(networkFirst(request));
  }
});
