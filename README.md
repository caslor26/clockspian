# Clockspian

An ambient clock and weather dashboard for a spare screen. Dark, quiet, glanceable:
big tabular-numeral time, today's date, and current conditions for Uppsala, Sweden.

Point a browser at it full-window and leave it there.

## Running it

There is no build step and no dependencies. Any static file server works:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

A server is required — the app uses ES modules, which browsers refuse to load over
`file://`.

## Settings

Move the mouse and a faint control appears in the bottom-right corner; click it for the
panel. `Esc` or a click anywhere outside closes it. Choices persist in `localStorage`.

- **Scale** — 70%–160%, for tuning to the screen it ends up on.
- **Accent** — five curated pairs, all built for the same dark base.
- **Typeface** — system sans, Inter, IBM Plex Mono, or Spectral.

> Every typeface here was measured to confirm it has **tabular figures** — digits of
> equal width. Without them the clock's width lurches every time a `1` appears. Most
> editorial serifs (including Georgia and Newsreader) fail this. Re-measure before
> adding another option.

## Weather

[Open-Meteo](https://open-meteo.com/) — free, no API key, no account. One request
covers current temperature, WMO condition code, day/night, and today's high and low.
It refreshes every 10 minutes, and again whenever the tab becomes visible or the
network reconnects.

Readings are cached in `localStorage`. If a fetch fails the last known value stays on
screen, dimmed, with a small dot beside it — the display never blanks out or breaks.

Location is hardcoded in `js/weather.js` (`LAT`/`LON`).

## Layout

```
index.html        markup
css/style.css     all styling; theme + scale are CSS custom properties on :root
js/main.js        entry point
js/clock.js       drift-corrected tick, date, seconds bar
js/weather.js     Open-Meteo fetch, WMO mapping, caching, failure handling
js/icons.js       weather glyphs as inline SVG primitives
js/settings.js    state, persistence, panel UI
prototype/        the original single-file mockup, kept for reference
```

## Deployment

See [DEPLOY.md](DEPLOY.md).
