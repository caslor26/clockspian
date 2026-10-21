# Clockspian

An ambient clock and weather dashboard for a spare screen. Dark, quiet, glanceable:
big tabular-numeral time and today's date, and — switched on in settings — current
conditions where you are, or Stockholm, Sweden, if the browser isn't told.

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

Move the mouse and a faint gear appears in the top-right corner; click it for the
panel. `Esc` or a click anywhere outside closes it. Choices persist in `localStorage`.

- **Scale** — 50%–150%, for tuning to the screen it ends up on.
- **Blinking colon** — on by default. Off holds the colon steady.
- **Bottom progress bar** — the thin line along the bottom edge that fills once a
  minute. On by default.
- **Theme** — a typeface paired for good with a palette:

  | Theme | Typeface | Look |
  |---|---|---|
  | Fjord *(default)* | Jost | Calm Nordic blue |
  | Kal | Bricolage Grotesque over DM Sans | Linne/Näver/Dimma/Fjord/Djup |
  | Clåde | Anthropic Serif if installed, else Source Serif 4 | Warm paper, Claude clay |
  | Signal | Archivo, bold | Swiss poster: black, white, one red |
  | Moss | Young Serif | Seventies botany: forest and lichen |
  | Terminal | Martian Mono, condensed and set smaller | Phosphor CRT in dark, watch LCD in light |
  | Gala | Bodoni Moda | Fashion masthead: ink, white, raspberry |
  | Ember | Barlow Condensed, set larger | Nightstand amber |
  | Orbit | Space Grotesk | Deep space: indigo and electric violet |
  | Lagoon | Baloo 2 | Holiday turquoise |

  Each has its own kind of typeface — no two share one — and a fallback of the same
  kind (Arial Black, Rockwell, Consolas, Bodoni MT, Trebuchet, Arial Rounded) for networks
  that block Google Fonts, so they stay apart even there. Signal, Moss, Terminal, Gala,
  Orbit and Lagoon replaced Graphite, Sand, IBM Plex Mono's Terminal, Folio, Heather
  and Nunito's Lagoon; anyone stored on one of the old ones moves to its successor.
- **Light / dark** — the sun, screen and moon beside *Light / dark*: light, whatever the
  computer is set to, or dark. Every theme has both palettes; new visitors follow the
  computer, and anyone here before keeps light unless they chose otherwise.
- **Countdown** — the switch on the *Countdown* heading; off by default. On, it takes a
  name, a date and an optional time (none means midnight) and shows the time left as a
  quiet line under the date: whole calendar days beyond 48 hours, hours and minutes
  inside them, minutes and seconds in the last hour. At zero it blinks "now" for five minutes,
  then steps aside. It stores the wall-clock date and time as typed, not the time
  remaining, so a closed tab is still right when it reopens. Stored separately, in
  `clockspian.countdown`.
- **Insane mode** (under *Countdown*, only while it's on) — asks "Are you sure?" first.
  On, the moment the countdown crosses zero the clock trembles, explodes into letters
  and flies to warp: the countdown's name and "now" zoom in at the centre of a shaking
  starfield while the letters stream past as debris, to a synthesised boom, rocket roar
  and whooshes; ten seconds later a flash and the clock is back. All of it lives in
  `js/insane.js`. It only goes off on the tick that crosses zero (not on a reload
  after), and only makes sound if the page has been clicked since it last loaded —
  browsers' rule, not ours.
- **Weather** — the switch on the *Weather* heading; off by default. Off hides the weather
  block, stops the Open-Meteo requests, and holds off the location prompt until it is
  on. Browsers that had already closed the intro before 1.6.1 and never touched the
  switch keep the weather on, since it was the default then.
- **Location** (under *Weather*) — *My location* or *Stockholm*. Stored separately, in
  `clockspian.location`.

- **What is this?** — reopens the intro that greets a first visit. It shows once, on
  its own — to everyone, including browsers that used Clockspian before it existed — and
  holds off the location prompt until it is closed so the two don't stack.
- **Version** — centred under the footer. Click it for every release's notes.

Settings saved before themes existed are carried over: Kal keeps its light or
dark palette, and any other setup moves to the theme with its typeface, in dark.

Clockspian used to be the system-sans tan theme, later called Sand (and since replaced by
Moss); the blue Jost theme, once Dusk, took its name as the default. Anyone who had picked
Dusk keeps it, and anyone stored on Clockspian moves to the new default. The default has
since been renamed Fjord, but keeps the `clockspian` id, so nothing moves.

> Every typeface here was measured to confirm it has **tabular figures** — digits of
> equal width. Without them the clock's width lurches every time a `1` appears. Most
> editorial serifs (including Georgia and Newsreader) fail this. Re-measure before
> adding another option. Jost, Archivo, Young Serif, Martian Mono, Bodoni Moda, Space Grotesk
> and Baloo 2 pass; Lexend, Urbanist, Raleway, Playfair Display, DM Serif Display,
> Fredoka, Quicksand, Comfortaa and Oswald were measured and do not.
>
> Bricolage Grotesque passes. **DM Sans does not** — at 190px, `00:00` sets 534px wide
> against 247px for `11:11`. That is why the Kal theme routes every numeric readout through
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

When the weather is first switched on the browser asks for the user's location. Stockholm is drawn first and
stays if the answer is no, the request times out, or geolocation is unavailable
(it needs HTTPS or `localhost`). A granted position replaces it, rounded to two
decimals (~1 km), and is remembered so a reload starts in the right place. The place
name comes from BigDataCloud's free client-side reverse geocoder; if that fails the
label reads *Current location*.

The position is looked up on load and whenever *My location* is chosen, not on every
refresh. Once a site is blocked it cannot re-prompt: the panel says so and points to
the browser's site settings. Choosing *Stockholm* pins it without asking.

The weather cache is keyed to the coordinates it was fetched for, so a reading never
appears under another place's name.

## Releases

Clockspian follows `major.minor.patch`. Every release is an entry at the top of
`js/version.js` — version, date, and a few notes (emoji, heading, a sentence or two in
the voice of the intro). The newest entry *is* the version; nothing else needs bumping.

- **Feature release (x.y.0)** — the next time Clockspian loads, a small *What's new*
  pill appears beside the gear. It never covers the clock; clicking it shows the notes
  for every release since the one last seen, and closing those puts it away.
- **Patch release (x.y.1, …)** — goes out quietly. Its notes show alongside the next
  feature release, or under the version number in settings.
- A first visit gets the intro instead, and counts the current version as seen.

Every change that people will notice ships with its release entry, in the same PR.

Open tabs keep up on their own: once an hour, and whenever the tab comes back into
view (at most every 10 minutes), `js/updates.js` reads the live `js/version.js` — a few
KB — and reloads if the newest version there differs. It waits while the settings panel
or a dialog is open.

## Layout

```
index.html        markup
favicon.svg       tab icon
css/style.css     all styling; theme + scale are CSS custom properties on :root
js/main.js        entry point
js/clock.js       drift-corrected tick, date, seconds bar
js/weather.js     Open-Meteo fetch, WMO mapping, caching, failure handling
js/location.js    geolocation, Stockholm fallback, reverse geocoding
js/icons.js       weather glyphs as inline SVG primitives
js/settings.js    state, persistence, panel UI
js/about.js       the "What is this?" dialog and first-visit check
js/version.js     every release and its notes, newest first
js/whatsnew.js    the What's new pill and release-notes dialog
js/updates.js     hourly check for a newer deploy; reloads to pick it up
watch/index.html  /watch — the promo films, with link previews for sharing
media/            the films and their posters, exported from promo/ (which stays out of git)
prototype/        the original single-file mockup, kept for reference
```

## Deployment

See [DEPLOY.md](DEPLOY.md).
