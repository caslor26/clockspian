// Clockspian moved from clockspian.vercel.app to clockspian.lorenlabs.se. The old address
// still serves the same deploy, so nothing breaks, but there (and only there) a pill
// stands where "What's new" usually does and says so. Like that pill it never covers the
// clock. Settings stay behind with the old address: the browser keeps them per address.
//
// To see it locally, add ?moved to the address.

const OLD_HOST = 'clockspian.vercel.app';

function onOldAddress() {
  return location.hostname === OLD_HOST || new URLSearchParams(location.search).has('moved');
}

function installed() {
  return matchMedia('(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: fullscreen)').matches
    || navigator.standalone === true;
}

export function initMoved() {
  if (!onOldAddress()) return;

  const pill = document.getElementById('moved');
  const dialog = document.getElementById('movedDialog');
  // The installed app can't follow on its own, so it gets asked to be installed again.
  // A browser tab only needs its bookmark updated.
  document.getElementById(installed() ? 'movedBookmark' : 'movedApp').hidden = true;

  document.body.classList.add('moved');
  pill.classList.add('shown');
  pill.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
