import { initSettings, isWeatherShown, onWeatherShownChange } from './settings.js';
import { initClock } from './clock.js';
import { initWeather } from './weather.js';
import { startLocation } from './location.js';

// Settings first — it writes the theme custom properties, so everything that
// follows renders in the right accent and scale on the first frame.
initSettings();
initClock();
initWeather();
// Last: the weather block has already painted Uppsala (or the remembered place) by the
// time the browser gets to ask, so the prompt never holds the screen hostage. With the
// weather hidden there is nothing to locate for, so the asking waits until it returns.
if (isWeatherShown()) startLocation();
onWeatherShownChange((shown) => {
  if (shown) startLocation();
});
