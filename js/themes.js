// Every theme: a typeface, a palette for dark and for light, and how the clock is set in
// it. Data only, so both the clock (js/settings.js) and the films page (/watch) read it.

// A theme is a typeface paired for good with a palette, and every theme carries both a
// dark and a light palette — the sun/moon switch picks between them, independently of
// which theme is chosen. js/settings.js writes all of a palette's properties inline on
// :root every time, so the defaults in css/style.css only cover the frame before JS runs.
//
// --accent carries the highlights (colon, sun, high temperature, seconds bar), --accent-2 the quieter
// structural bits (date dot). Light accents run darker than their dark-mode
// counterparts so the hi temperature still reads against a pale base.
//
// Every typeface here was measured for tabular figures — identical advance widths for
// 00:00 / 11:11 / 23:38 / 18:47 — so the clock's width never lurches. Most editorial
// serifs (Newsreader, Georgia) and many geometric sans (Lexend, Urbanist, Raleway) fail
// this. Do not add or swap a typeface without re-measuring.
//
// `font.url: null` is the system stack — no network request at all. Every other face sits
// on a Helvetica fallback, so a display that boots before the Wi-Fi connects still shows
// the time, just in the fallback until the font arrives.
// `font.family` is the Google Fonts family the panel loads to preview each name.
// `weights` is how far the Weight slider can take the clock: the range the font has, loaded
// whole. `timeWeight` (200 if unset) is where it starts. Moss's Young Serif has one weight,
// so it has no `weights` and the slider sits out. Barlow Condensed comes in fixed cuts,
// a hundred apart, so Ember's slider steps between them.
// Bolder figures are wider, though all stay tabular at every weight (measured at both
// ends for each theme). A `max` keeps the clock on screen at the 150% scale.
export const THEMES = [
  {
    // The default. Jost: geometric, Futura-like — the rounder counterpart to Inter's
    // grotesk — over a cool blue palette. Shown as "Fjord"; once "Dusk", then "Clockspian".
    // The id stays 'clockspian' so stored settings keep pointing here.
    id: 'clockspian',
    label: 'Fjord',
    font: {
      stack: `'Jost','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Jost:wght@100..900&display=swap',
      family: 'Jost',
    },
    weights: { min: 100, max: 900 },
    palettes: {
      dark: {
        '--bg': '#0e1218', '--line': '#232b37', '--fg': '#eef1f5', '--fg-dim': '#8791a0',
        '--accent': '#8aa4c9', '--accent-2': '#5a6f8a',
      },
      light: {
        '--bg': '#eff2f6', '--line': '#cfd6e0', '--fg': '#172030', '--fg-dim': '#626e82',
        '--accent': '#4a6890', '--accent-2': '#8fa3c0',
      },
    },
  },
  {
    // Kal Studio brand. Bricolage Grotesque for the hero digits, DM Sans for everything
    // else — the split the brand board specifies. Bricolage measures tabular; DM Sans
    // emphatically does not (00:00 is 534px where 11:11 is 247px at the same size), so
    // every numeric readout uses --font-display, not --font-stack. Do not move the time,
    // temperature or hi/lo onto the body face.
    id: 'kal',
    label: 'Kal',
    font: {
      stack: `'DM Sans','Helvetica Neue',Arial,sans-serif`,
      display: `'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=DM+Sans:wght@300;400;500&display=swap',
      family: 'Bricolage+Grotesque',
    },
    weights: { min: 200, max: 800 },
    // Bricolage's lightest cut is 300 — the 200 the clock normally runs at does not exist.
    timeWeight: '300',
    palettes: {
      dark: {
        '--bg': '#2b3a42',       // Djup
        '--line': '#3d5058',
        '--fg': '#f5f2eb',       // Linne
        '--fg-dim': '#9badb8',   // Dimma
        '--accent': '#e2ddd3',   // Näver
        '--accent-2': '#5c7a87', // Fjord
      },
      light: {
        '--bg': '#f5f2eb',       // Linne
        '--line': '#9badb8',     // Dimma — the board's border colour; Näver is too close
                                 // to Linne to read as a rule or a slider track
        '--fg': '#2b3a42',       // Djup
        '--fg-dim': '#7a8e98',
        '--accent': '#5c7a87',   // Fjord
        '--accent-2': '#9badb8', // Dimma
        '--panel-bg': '#e2ddd3', // Näver — the board's card surface
      },
    },
  },
  {
    // The Claude desktop app's look: its page colours and the clay of the Claude mark —
    // named a little off-brand on purpose, since it borrows the look, not the name.
    // Anthropic Serif is Anthropic's own face and isn't ours to serve, so it is only used
    // where it is already installed; everywhere else Source Serif 4 stands in. Both
    // measure tabular with 'tnum' on, which the clock sets — their default figures don't.
    id: 'claude',
    label: 'Clåde',
    font: {
      stack: `'Anthropic Serif','Source Serif 4',Georgia,serif`,
      url: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,200..900&display=swap',
      family: 'Source+Serif+4',
    },
    weights: { min: 200, max: 900 },
    // Anthropic Serif's lightest cut is 300.
    timeWeight: '300',
    palettes: {
      dark: {
        '--bg': '#262624', '--line': '#3f3e3a', '--fg': '#faf9f5', '--fg-dim': '#9c9a92',
        '--accent': '#d97757', '--accent-2': '#8f5a46',
      },
      light: {
        '--bg': '#faf9f5', '--line': '#dedcd1', '--fg': '#141413', '--fg-dim': '#73726c',
        '--accent': '#c6613f', '--accent-2': '#dfa48d',
      },
    },
  },
  {
    // A Swiss poster: black and white and one red, with the digits set heavy — the only
    // bold clock in the set. Archivo is a grotesque cut for posters; Arial Black stands
    // in where the font can't load, so the weight carries the look either way.
    id: 'signal',
    label: 'Signal',
    font: {
      stack: `'Archivo','Arial Black','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&display=swap',
      family: 'Archivo',
    },
    weights: { min: 100, max: 900 },
    timeWeight: '700',
    palettes: {
      dark: {
        '--bg': '#0b0b0b', '--line': '#2a2a2a', '--fg': '#f6f6f3', '--fg-dim': '#8e8e8a',
        '--accent': '#ff3b2f', '--accent-2': '#5e5e5b',
      },
      light: {
        '--bg': '#f6f6f3', '--line': '#d6d6d2', '--fg': '#0b0b0b', '--fg-dim': '#62625f',
        '--accent': '#e3170a', '--accent-2': '#a5a5a1',
      },
    },
  },
  {
    // Seventies botany: deep forest and lichen, in Young Serif's soft, chunky figures —
    // the one heavy serif. Its default figures are old-style; the clock asks for lining
    // ones, so the digits share a baseline. Rockwell, then Georgia, if the font can't load.
    id: 'moss',
    label: 'Moss',
    font: {
      stack: `'Young Serif',Rockwell,Georgia,serif`,
      url: 'https://fonts.googleapis.com/css2?family=Young+Serif&display=swap',
      family: 'Young+Serif',
    },
    // Young Serif comes in one weight. Its lining figures run wider than the old-style
    // ones, so the clock is set a little smaller to span what the others do.
    timeWeight: '400',
    timeScale: '0.96',
    palettes: {
      dark: {
        '--bg': '#0f1a12', '--line': '#24362a', '--fg': '#eef0dc', '--fg-dim': '#8f9c84',
        '--accent': '#b3cc6b', '--accent-2': '#5f7a45',
      },
      light: {
        '--bg': '#f3f0e0', '--line': '#d8d6bd', '--fg': '#1f2a17', '--fg-dim': '#66705a',
        '--accent': '#557a1f', '--accent-2': '#b3c08f',
      },
    },
  },
  {
    // A CRT in the dark — phosphor green on black, everything glowing the one colour —
    // and in the light, the grey-green of a digital watch's LCD with its dark segments.
    // Martian Mono is wide and square, so it reads as a machine even from across a room.
    // Like every monospace face its colon takes a whole digit's width, so the clock sets
    // it at its narrowest (75%) and a little smaller, to span what the others do.
    id: 'terminal',
    timeStretch: '75%',
    timeScale: '0.85',
    label: 'Terminal',
    // wide, so set down a little to fit its half of the row
    labelStyle: { fontSize: '14px' },
    font: {
      stack: `'Martian Mono',ui-monospace,Consolas,monospace`,
      url: 'https://fonts.googleapis.com/css2?family=Martian+Mono:wdth,wght@75..112.5,100..800&display=swap',
      family: 'Martian+Mono',
    },
    weights: { min: 100, max: 800 },
    palettes: {
      dark: {
        '--bg': '#050a06', '--line': '#15301c', '--fg': '#a6fbbd', '--fg-dim': '#4c9a63',
        '--accent': '#3dff7f', '--accent-2': '#1e6b37',
      },
      light: {
        '--bg': '#c7d1bd', '--line': '#a9b49d', '--fg': '#18200f', '--fg-dim': '#4c5640',
        '--accent': '#2e3f1f', '--accent-2': '#7f8c70',
      },
    },
  },
  {
    // A fashion masthead: a Didone with hairline serifs, ink on white, and a raspberry
    // pink. Bodoni Moda measures tabular; Bodoni MT or Didot stand in where it can't load,
    // so it stays a world away from Clåde's book serif either way.
    id: 'gala',
    label: 'Gala',
    font: {
      stack: `'Bodoni Moda','Bodoni MT',Didot,'Bodoni 72',serif`,
      url: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400..900&display=swap',
      family: 'Bodoni+Moda',
    },
    weights: { min: 400, max: 900 },
    // Bodoni Moda's lightest cut is 400; its hairlines are thin enough already.
    timeWeight: '400',
    // At clock size the browser picks the display cut (opsz 96), whose hairlines are about
    // a pixel wide: crisp on a Retina screen, broken up on a 1080p one. Standard-resolution
    // screens get a sturdier optical size instead. Every opsz measures the same tabular width.
    lowResOpsz: 28,
    palettes: {
      dark: {
        '--bg': '#0b0a0c', '--line': '#2a2329', '--fg': '#f8f5f2', '--fg-dim': '#9b948f',
        '--accent': '#ff5c93', '--accent-2': '#86304f',
      },
      light: {
        '--bg': '#fcfbf9', '--line': '#e5e0db', '--fg': '#0c0b0b', '--fg-dim': '#6d6864',
        '--accent': '#b3124f', '--accent-2': '#e6a8bf',
      },
    },
  },
  {
    // Amber on warm black, for a clock on the nightstand — no blue in the dark palette
    // at all. Barlow Condensed is the one narrow face in the set, so its clock is set
    // larger to fill the screen as wide as the others do.
    id: 'ember',
    timeScale: '1.4',
    label: 'Ember',
    // Condensed, with a small x-height: at the panel's 16px its name reads a size
    // smaller than the rest, so it is set up a little and opened out.
    labelStyle: { fontSize: '19px', letterSpacing: '0.04em' },
    font: {
      stack: `'Barlow Condensed','Helvetica Neue',Arial,sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@100;200;300;400;500;600&display=swap',
      family: 'Barlow+Condensed',
    },
    // Its fixed cuts go to 900, but the clock is set 1.4× large and widens as it
    // thickens: past 600 it runs off the screen at the 150% scale.
    weights: { min: 100, max: 600, step: 100 },
    palettes: {
      dark: {
        '--bg': '#14100b', '--line': '#2e261b', '--fg': '#f2e6d3', '--fg-dim': '#9a8a72',
        '--accent': '#e0a050', '--accent-2': '#8a6a3c',
      },
      light: {
        '--bg': '#faf3df', '--line': '#e6d8b8', '--fg': '#2a1f10', '--fg-dim': '#7a6a4c',
        '--accent': '#a85f00', '--accent-2': '#d2ad6e',
      },
    },
  },
  {
    // Deep space: indigo night and an electric violet, in Space Grotesk — a grotesque
    // with a sci-fi kink in its figures. Trebuchet if it can't load. (Unbounded, tried
    // first, was too wide.)
    id: 'orbit',
    label: 'Orbit',
    font: {
      stack: `'Space Grotesk','Trebuchet MS','Helvetica Neue',sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap',
      family: 'Space+Grotesk',
    },
    weights: { min: 300, max: 700 },
    // Space Grotesk's lightest cut is 300.
    timeWeight: '300',
    palettes: {
      dark: {
        '--bg': '#0f0b24', '--line': '#2a2352', '--fg': '#eeeaff', '--fg-dim': '#8f87bd',
        '--accent': '#b18cff', '--accent-2': '#5b4aa8',
      },
      light: {
        '--bg': '#eeebff', '--line': '#d2cbf6', '--fg': '#18123f', '--fg-dim': '#615a92',
        '--accent': '#6b3fe0', '--accent-2': '#aa9cf2',
      },
    },
  },
  {
    // Holiday water: bright turquoise, with Baloo 2's soft, round, chunky figures — the
    // friendliest clock here. Arial Rounded where the font can't load.
    id: 'lagoon',
    label: 'Lagoon',
    font: {
      stack: `'Baloo 2','Arial Rounded MT Bold',ui-rounded,'Helvetica Neue',sans-serif`,
      url: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..800&display=swap',
      family: 'Baloo+2',
    },
    weights: { min: 400, max: 800 },
    // Baloo 2's lightest cut is 400.
    timeWeight: '400',
    palettes: {
      dark: {
        '--bg': '#031e1f', '--line': '#0e3a3b', '--fg': '#e2fbf8', '--fg-dim': '#6fa9a6',
        '--accent': '#2ee8d6', '--accent-2': '#137a74',
      },
      light: {
        '--bg': '#dcf7f3', '--line': '#b2e4de', '--fg': '#033b39', '--fg-dim': '#3f7672',
        '--accent': '#00a396', '--accent-2': '#6fd0c6',
      },
    },
  },
];
