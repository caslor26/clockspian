import { initSettings, isWeatherShown, onWeatherShownChange } from './settings.js';
import { initClock } from './clock.js';
import { initCountdown } from './countdown.js';
import { initInsane } from './insane.js';
import { initWeather } from './weather.js';
import { startLocation } from './location.js';
import { isFirstVisit, openAbout } from './about.js';
import { initWhatsNew } from './whatsnew.js';
import { watchForUpdates } from './updates.js';
import { playSplash } from './splash.js';
import { initApp } from './app.js';

const firstVisit = isFirstVisit();

// Settings first — it writes the theme custom properties, so everything that
// follows renders in the right accent and scale on the first frame.
initSettings();
initClock();
initCountdown();
initInsane();
initWeather();
initWhatsNew(firstVisit);
watchForUpdates();
initApp();

// The theme is painted, so the mark can draw in its colours.
const splashDone = playSplash();

// On a first visit the intro follows the splash, and explains the location prompt, so the
// browser asks once it is closed rather than on top of it.
const introDone = firstVisit ? splashDone.then(openAbout) : Promise.resolve();

// Last: the clock (and the remembered place's weather, if any) has already painted by the
// time the browser gets to ask, so the prompt never holds the screen hostage. With the
// weather hidden there is nothing to locate for, so the asking waits until it returns.
introDone.then(() => {
  if (isWeatherShown()) startLocation();
});
onWeatherShownChange((shown) => {
  if (shown) startLocation();
});
