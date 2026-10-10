// Every release, newest first. The first entry is the running version: the settings
// panel shows it, and js/updates.js finds it in this file's text on the live site to
// tell when a newer one is out — so keep each `version:` on one line, in single quotes.
//
// A new x.y.0 shows its notes to everyone the next time Clockspian loads. A patch
// (x.y.1 and on) goes out quietly, its notes only showing alongside the next x.y.0 or
// under the version number in settings. A patch with nothing worth telling anyone can
// leave `notes` empty: it still bumps the version, but "What's new" skips it.
//
// Each note is an emoji, a short heading and a sentence or two — in the same voice as
// the "What is this?" dialog.
export const RELEASES = [
  {
    version: '1.2.1',
    date: '2026-10-10',
    notes: [],
  },
  {
    version: '1.2.0',
    date: '2026-10-10',
    notes: [
      {
        emoji: '🎨',
        title: 'Three new themes',
        text: 'Ember glows amber in the dark, easy on the eyes at 3 a.m. Heather goes quietly violet. Lagoon is cool teal with soft, rounded numbers, for when the time should feel like a holiday.',
      },
      {
        emoji: '🧩',
        title: 'Themes, two by two',
        text: 'Ten themes made a long list, so the settings menu now lines them up in pairs. Everything fits on screen again, no scrolling for the Reset button.',
      },
    ],
  },
  {
    version: '1.1.1',
    date: '2026-10-08',
    notes: [
      {
        emoji: '📏',
        title: 'A seconds bar you can actually see',
        text: 'The bar along the bottom is thicker now, filled in the theme’s accent, and runs along a faint rail, so you can see how far into the minute you are. It still knows its place.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-08',
    notes: [
      {
        emoji: '⚙️',
        title: 'A tidier settings menu',
        text: 'Settings now open in a neat little card right under the gear, instead of a panel taking over the whole side of the screen. Same knobs, better manners.',
      },
      {
        emoji: '🎚️',
        title: 'A smoother size slider',
        text: 'Drag Scale and the clock grows and shrinks right along with you, then settles on the nearest 5% when you let go. No more lurching.',
      },
      {
        emoji: '🔄',
        title: 'It keeps itself up to date',
        text: 'Left Clockspian running for days? It now checks for a new version about once an hour and quietly reloads to pick it up. Your settings stay put.',
      },
      {
        emoji: '✨',
        title: 'Notes like this one',
        text: 'Clockspian has a version number now, at the bottom of the settings menu. When something changes, you’ll hear about it here. Which, evidently, you just did.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-08',
    notes: [
      {
        emoji: '🎉',
        title: 'Clockspian, officially',
        text: 'The time, the date and the weather where you are, in seven themes, light or dark. It is, after all, just a clock.',
      },
    ],
  },
];

export const VERSION = RELEASES[0].version;
