# Clockspian

An ambient clock and weather dashboard for a spare screen. Dark, quiet, glanceable:
big tabular-numeral time, today's date, and current conditions where you are — or
Uppsala, Sweden, if the browser isn't told.

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

- **Scale** — 50%–150%, for tuning to the screen it ends up on.
- **Kal Studio** — re-skins the whole interface in the Kal Studio brand: Bricolage
  Grotesque over DM Sans, the Linne/Näver/Dimma/Fjord/Djup palette, and a small
  *Clockspian - A Clock by Kal Studio* line in the bottom-left corner. Comes in **Light**
  (Linne base) and **Dark** (Djup base). It supplies its own colour and type, so the
  Accent and Typeface fields dim out while it is on and return untouched when it is off.
- **Accent** — five curated pairs, all built for the same dark base.
- **Typeface** — system sans, Inter, IBM Plex Mono, or Spectral.
- **Location** (under *Weather*) — *My location* or *Uppsala*. Stored separately, so
  **Reset display** leaves it alone.

> Every typeface here was measured to confirm it has **tabular figures** — digits of
> equal width. Without them the clock's width lurches every time a `1` appears. Most
> editorial serifs (including Georgia and Newsreader) fail this. Re-measure before
> adding another option.
>
> Bricolage Grotesque passes. **DM Sans does not** — at 190px, `00:00` sets 534px wide
> against 247px for `11:11`. That is why Kal mode routes every numeric readout through
> `--font-display` (Bricolage) and leaves `--font-stack` (DM Sans) to labels and body
> copy. Don't move the time, temperature or hi/lo onto the body face.

## Weather

[Open-Meteo](https://open-meteo.com/) — free, no API key, no account. One request
covers current temperature, WMO condition code, day/night, and today's high and low.
It refreshes every 10 minutes, and again whenever the tab becomes visible or the
network reconnects.

Readings are cached in `localStorage`. If a fetch fails the last known value stays on
screen, dimmed, with a small dot beside it — the display never blanks out or breaks.

### Location

On first load the browser asks for the user's location. Uppsala is drawn first and
stays if the answer is no, the request times out, or geolocation is unavailable
(it needs HTTPS or `localhost`). A granted position replaces it, rounded to two
decimals (~1 km), and is remembered so a reload starts in the right place. The place
name comes from BigDataCloud's free client-side reverse geocoder; if that fails the
label reads *Current location*.

The position is looked up on load and whenever *My location* is chosen, not on every
refresh. Once a site is blocked it cannot re-prompt: the panel says so and points to
the browser's site settings. Choosing *Uppsala* pins it without asking.

The weather cache is keyed to the coordinates it was fetched for, so a reading never
appears under another place's name.

## Layout

```
index.html        markup
css/style.css     all styling; theme + scale are CSS custom properties on :root
js/main.js        entry point
js/clock.js       drift-corrected tick, date, seconds bar
js/weather.js     Open-Meteo fetch, WMO mapping, caching, failure handling
js/location.js    geolocation, Uppsala fallback, reverse geocoding
js/icons.js       weather glyphs as inline SVG primitives
js/settings.js    state, persistence, panel UI
prototype/        the original single-file mockup, kept for reference
```

## Deployment

See [DEPLOY.md](DEPLOY.md).
