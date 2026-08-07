import { initSettings } from './settings.js';
import { initClock } from './clock.js';
import { initWeather } from './weather.js';

// Settings first — it writes the theme custom properties, so everything that
// follows renders in the right accent and scale on the first frame.
initSettings();
initClock();
initWeather();
