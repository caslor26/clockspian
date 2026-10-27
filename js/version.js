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
// the "What is this?" dialog — and, if there's somewhere to go, a `link: { href, text }`
// shown after the text. A bigger release can sort its notes with a `group` ("New",
// "Improved"), labelled where it changes; keep each group's notes together.
//
// A release can also bring a `film: { src, poster }`, which plays above its notes. When it
// is the newest release someone missed, "What's new" shows that release alone, so the
// film has the stage; the older notes are still under the version number in settings.
export const RELEASES = [
  {
    version: '1.8.1',
    date: '2026-10-27',
    notes: [
      {
        group: 'New',
        emoji: '🌸',
        title: 'Åimo and Åimo Perk',
        text: 'Two new themes, cousins from the same family. Åimo is pastel pink, and stays pink after dark. Åimo Perk is deep petroleum with a single bright green. That makes twelve.',
      },
      {
        group: 'Improved',
        emoji: '🪟',
        title: 'Fits any window',
        text: 'Snap Clockspian into a corner of your screen and the whole clock now shrinks to fit, instead of spilling off the top and bottom. Thanks, Rasmus!',
      },
      {
        group: 'Improved',
        emoji: '🎬',
        title: 'A way back from the films',
        text: 'The films page now has an × in the corner, and Esc works too. Either one takes you straight back to the clock.',
      },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-26',
    film: { src: '/media/clockspian-1.8.mp4', poster: '/media/clockspian-1.8.jpg' },
    notes: [
      {
        group: 'New',
        emoji: '💻',
        title: 'Clockspian, the app',
        text: 'Install it from settings and it gets a window and an icon of its own. No tabs, no address bar, and in Chrome and Edge no title bar either. Just the clock. It opens without Wi-Fi, and your screen stays awake for as long as it’s showing.',
      },
      {
        group: 'New',
        emoji: '🌍',
        title: 'Weather for anywhere',
        text: 'Choose a city, start typing, pick one. Or stick with My location. Stockholm has retired as the stand-in, but if it was yours, it still is.',
      },
      {
        group: 'New',
        emoji: '🏋️',
        title: 'Weight',
        text: 'A new slider under Scale makes the clock thinner or bolder, as far as each theme’s typeface will go. Every theme remembers its own, and a double-click puts it back. Moss only comes in one weight, and it’s at peace with that.',
      },
      {
        group: 'Improved',
        emoji: '🚀',
        title: 'Insane mode dresses for the occasion',
        text: 'It now goes off in your theme’s colours, in light or dark, at your size and weight. And if it’s raining outside, it rains in there too.',
      },
      {
        group: 'Improved',
        emoji: '✨',
        title: 'And a few more things',
        text: 'Switch the date off for nothing but the time. Press F for full screen, anywhere. Gala holds its hairlines together on ordinary screens. And the films page now wears your theme.',
      },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-21',
    film: { src: '/media/clockspian-1.7.mp4', poster: '/media/clockspian-1.7.jpg' },
    notes: [
      {
        emoji: '🎨',
        title: 'Ten themes, ten personalities',
        text: 'Some themes had started to look like siblings, so six got makeovers. Signal is a Swiss poster in bold black and red. Moss is seventies botany. Terminal glows phosphor green, or turns watch-LCD grey in the light. Gala is a fashion masthead. Orbit is deep space, and Lagoon is a holiday. Fjord, Kal, Clåde and Ember are just as you left them. Were you on one that retired? You’ve been moved to its successor.',
      },
      {
        emoji: '🖥️',
        title: 'Light or dark, your computer’s call',
        text: 'Light / dark has a third setting, the little screen in the middle: Clockspian follows your computer and keeps following it, so it goes dark when your Mac does at sunset. New visitors start there. You keep whatever you picked.',
      },
      {
        emoji: '✍️',
        title: 'It signs its name',
        text: 'Clockspian now opens by drawing its own logo, the dial and then the hands, before stepping aside for the time. A click skips it, and with reduced motion on it never shows. The logo turns up in a few more places, too, now that it’s found its confidence.',
      },
      {
        emoji: '🎬',
        title: 'The films, one click away',
        text: 'There’s a new link at the bottom of settings, next to “What is this?”. Four short films about a clock now, the newest one just up there.',
        link: { href: '/watch/', text: 'Roll the films' },
      },
    ],
  },
  {
    version: '1.6.2',
    date: '2026-10-21',
    notes: [
      {
        emoji: '🇸🇪',
        title: 'Söderköping, not Soderkoping',
        text: 'Place names keep their å, ä, ö and friends now. Norrtälje gets its dots back, Tromsø its slash. A clock can be off by a minute, but never by an umlaut.',
      },
    ],
  },
  {
    version: '1.6.1',
    date: '2026-10-21',
    notes: [
      {
        emoji: '🕰️',
        title: 'Just a clock, to start',
        text: 'New here? You now start with only the time and the date. The weather is a switch in settings, like the countdown. Already had it on? It stays on.',
      },
      {
        emoji: '📍',
        title: 'Stockholm, if you’d rather not say',
        text: 'Keep your location to yourself and the weather is now for Stockholm instead of Uppsala.',
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-15',
    notes: [
      {
        emoji: '🚀',
        title: 'Insane mode',
        text: 'There’s a new switch under Countdown. We’d rather not say what it does when the countdown hits zero, only that it comes with a warning, and the warning is not a joke. Sound on. Coffee down.',
      },
    ],
  },
  {
    version: '1.5.1',
    date: '2026-10-15',
    notes: [
      {
        emoji: '🛎️',
        title: 'A “now” you can’t miss',
        text: 'When a countdown arrives, “now” turns into a little pill that sends out ripples, big and eager for the first minute, then calmer for the rest. Easy to catch from the corner of your eye, still too polite to ring a bell.',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-10-15',
    notes: [
      {
        emoji: '⌨️',
        title: 'The F11 trick',
        text: 'Clockspian looks its best on the laptop screen beside your monitors, with nothing else around it. Click the clock and press F11 (⌃⌘F on a Mac) and the tabs and address bar slide away, leaving just the clock, edge to edge. The “What is this?” intro has been rewritten around it, too.',
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-12',
    notes: [
      {
        emoji: '🎬',
        title: 'Clockspian, the motion picture',
        text: 'Two short films about a clock: the grand tour, and a second one starring the countdown. Watch them, or send them to someone whose spare screen is going to waste.',
        link: { href: '/watch/', text: 'Roll the films' },
      },
    ],
  },
  {
    version: '1.3.2',
    date: '2026-10-12',
    notes: [
      {
        emoji: '🍽️',
        title: 'A shorter “now”',
        text: 'When a countdown arrives, “now” hangs around for five minutes and then bows out, instead of lingering for an hour like the last guest at lunch.',
      },
    ],
  },
  {
    version: '1.3.1',
    date: '2026-10-11',
    notes: [
      {
        emoji: '🕒',
        title: 'Clockspian has a face',
        text: 'A new little logo in your browser tab and at the bottom of settings: a dial for the C, and the hands at three o’clock for the L. It’s a clock that spells its maker’s initials, which is about as vain as a clock gets.',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-11',
    notes: [
      {
        emoji: '⏳',
        title: 'Count down to something',
        text: 'Lunch, Friday, Christmas, the holiday you keep checking the calendar for. Give it a name and a date in settings and Clockspian quietly counts down under the date. It remembers, too, so closing the tab won’t cancel Christmas.',
        link: { href: '/watch/#countdown', text: 'See it in action' },
      },
      {
        emoji: '🎛️',
        title: 'Switches where they belong',
        text: 'Countdown and Weather now switch on and off right from their headings, so the settings menu still fits without scrolling.',
      },
    ],
  },
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
