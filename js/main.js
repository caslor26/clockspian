import { initSettings, isWeatherShown, onWeatherShownChange } from './settings.js';
import { initClock } from './clock.js';
import { initWeather } from './weather.js';
import { startLocation } from './location.js';
import { isFirstVisit, openAbout } from './about.js';

const firstVisit = isFirstVisit();

// Settings first — it writes the theme custom properties, so everything that
// follows renders in the right accent and scale on the first frame.
initSettings();
initClock();
initWeather();

// On a first visit the intro explains the location prompt, so the browser asks once it
// is closed rather than on top of it.
const introDone = firstVisit ? openAbout() : Promise.resolve();

// Last: the weather block has already painted Uppsala (or the remembered place) by the
// time the browser gets to ask, so the prompt never holds the screen hostage. With the
// weather hidden there is nothing to locate for, so the asking waits until it returns.
introDone.then(() => {
  if (isWeatherShown()) startLocation();
});
onWeatherShownChange((shown) => {
  if (shown) startLocation();
});
