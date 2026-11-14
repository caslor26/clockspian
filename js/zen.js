import { isZen, onMoodChange } from './settings.js';
import { onCountdownArrive } from './countdown.js';

// Zen mode. For whoever finds the ticking clock a bit much: the time goes, and in its place
// the mark itself tells it — the dial and its two hands, turning so slowly you never see
// them move — over pools of the theme's own colours, drifting as slowly.
//
// A tap (or Space, or Enter) asks for the exact time: the mark reshapes into it, the dial
// unrolling into the four figures and the hands drawing in to the colon, holds a few
// seconds, and folds back. Another tap sends it back straight away.
//
// It is all six strokes, all the time: the dial in four arcs, and the two hands. As the
// logo they are the mark; as the time they are the figures, drawn as single strokes in the
// mark's own line, so the one can turn into the other point by point.

const SVG_NS = 'http://www.w3.org/2000/svg';

// ── The figures ──
// Each line's centre runs in a 16 × 28 box, top left at 0,0.
//
// Every figure stands on the same two lines: its outside edge, half a line's width outside
// that box (CAP and BASE). Flat strokes and the tops and bottoms of curves run on y 0 and
// y 28; a stem that ends there runs on to the edge itself. A tail that ends on one of the
// lines at a slant (the 6, 7, 9) runs past it and is cut off flat by the band, so it stands
// on the line like the rest.
//
// A loop (0, 6, 8, 9) runs a little past where it began, so its two square ends overlap
// instead of meeting edge to edge, which leaves a hairline slit. The 2's diagonal and the
// tails of the 6 and 9 leave their curves on the tangent, so the line runs on without a
// kink. The 1 and the 4 run a short way flat along the top before turning down the stem,
// so their tops are level; the 2 steps down onto its base, so its foot is square.
const HALF = 2.3; // half the figures' line width
const CAP = -HALF;
const BASE = 28 + HALF;
const DIGITS = {
  0: 'M16 11V20A8 8 0 0 1 0 20V8A8 8 0 0 1 16 8V15',
  1: `M2.5 6.5L8 0H10V${BASE}`,
  2: 'M0.5 7.5A7.5 7.5 0 1 1 13.06 13.04L0.5 24.5V28H16',
  3: 'M1.66 4.04A7 7 0 1 1 8 14A7 7 0 1 1 1.66 23.96',
  4: `M16 19.5H0L8.5 0H11.5V${BASE}`,
  5: 'M15 0H3L2.34 14.34A8 8 0 1 1 1.07 24',
  6: 'M15.46 -3.5L1.58 15.23A8 8 0 1 0 14.42 24.77A8 8 0 1 0 0.33 17.71',
  7: 'M0 0H16L3.63 31.5',
  8: 'M8 13.5A6.75 6.75 0 0 1 8 0A6.75 6.75 0 0 1 8 13.5A7.25 7.25 0 0 0 8 28A7.25 7.25 0 0 0 8 13.5A6.75 6.75 0 0 1 5.15 12.87',
  9: 'M0.54 31.5L14.42 12.77A8 8 0 1 0 1.58 3.23A8 8 0 1 0 15.67 10.29',
};

// HH:MM in the mark's 64 × 64 space, its figures' band centred on the dial.
const OY = 32 - 14;
// The colon's dots, square, centred between the top and bottom lines.
const DOT = 2 * HALF;
const COLON_Y = [OY + 8.5, OY + 19.5];
// The same space between every pair of neighbours, colon included, measured from ink to
// ink. Set by the figures' own boxes, a narrow 1 would leave wide holes either side of it.
const GAP = 3.6;

// ── The mark ──
// The dial is cut into four arcs. It runs from half past one, round the left, to half past
// four. Each piece runs a degree and a half into the next, so with square ends no hairline
// shows where they meet.
const R = 22;
const DEG = Math.PI / 180;
const CUTS = [-45, -112.5, -180, -247.5, -315];
// Which figure each piece becomes: the top two make the hours, the bottom two the minutes.
const PIECE_SLOT = [1, 0, 2, 3];
// The mark's own hands, so at three o'clock the clock is the logo exactly.
const HOUR_HAND = 14;
const MINUTE_HAND = 17;
// Both hands start at the centre. Where they meet, a short stroke bent round the centre
// (the joint) closes the corner the way the mark's L does: one mitred corner at any angle,
// cut flat when the hands are close together.
const JOINT = 4;
// The mark's line, and the figures'.
const MARK_WIDTH = 7;
const FIGURE_WIDTH = 2 * HALF;

const N = 120; // points per stroke

// ── The morph ──
const MORPH_MS = 1100;
const HOLD_MS = 4000;
// A little out of step, so it reads as a reshape, not a swap; but only a little, so no
// piece breaks away on its own while the rest of the mark still sits there. In the order
// of the strokes: the four pieces, then the hour and minute hands.
const STAGGER = [0.04, 0, 0.08, 0.12, 0.03, 0.07];
const STAGGER_MAX = Math.max(...STAGGER);

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const lerp = (a, b, t) => a + (b - a) * t;
// Full precision: rounded to hundredths, a run of points along a straight hand zigzags by
// a hair, and the square tip, set square to the last little step, wobbles as it turns.
const toD = (points) => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}`;

const toward = (angle, r) => {
  const a = (angle - 90) * DEG;
  return [32 + r * Math.cos(a), 32 + r * Math.sin(a)];
};
const handPoints = (angle, length) => Array.from({ length: N }, (_, i) => toward(angle, (length * i) / (N - 1)));
// A colon dot: a stroke as long as it is wide, so it comes out square.
const dotPoints = ([x, y]) => Array.from({ length: N }, (_, i) => [x - DOT / 2 + (DOT * i) / (N - 1), y]);

const dialPieces = CUTS.slice(0, 4).map((a0, k) => {
  const a1 = CUTS[k + 1] + (k < 3 ? -1.5 : 0);
  return Array.from({ length: N }, (_, i) => {
    const a = (a0 + ((a1 - a0) * i) / (N - 1)) * DEG;
    return [32 + R * Math.cos(a), 32 + R * Math.sin(a)];
  });
});

// A figure can be drawn either way along its stroke; take the way that has its points
// travel least, so the pieces unroll instead of twisting through themselves.
function closest(from, to) {
  const cost = (list) => list.reduce((sum, p, i) => sum + (p[0] - from[i][0]) ** 2 + (p[1] - from[i][1]) ** 2, 0);
  const reversed = [...to].reverse();
  return cost(reversed) < cost(to) ? reversed : to;
}

// A figure's points along its stroke: even steps, but with a point landed exactly on every
// joint between its parts, so square corners stay square instead of being shaved off.
function sampleFigures() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
  const path = document.createElementNS(SVG_NS, 'path');
  svg.appendChild(path);
  document.body.appendChild(svg);
  const lengthOf = (d) => {
    path.setAttribute('d', d);
    return path.getTotalLength();
  };
  const figures = {};
  for (const [digit, d] of Object.entries(DIGITS)) {
    const commands = d.match(/[A-Z][^A-Z]*/g);
    const joints = commands.slice(1, -1).map((_, i) => lengthOf(commands.slice(0, i + 2).join('')));
    const length = lengthOf(d);
    const at = Array.from({ length: N }, (_, i) => (length * i) / (N - 1));
    for (const joint of joints) {
      const i = Math.round((joint / length) * (N - 1));
      if (i > 0 && i < N - 1) at[i] = joint;
    }
    figures[digit] = at.map((l) => {
      const p = path.getPointAtLength(l);
      return [p.x, p.y];
    });
  }
  svg.remove();
  return figures;
}

// How far left and right a figure's ink actually reaches, square ends, cut corners and
// all, trimmed to the band as it is on screen: drawn once on a canvas and read off the
// pixels, so it's exact for whatever the figures look like.
function measureFigures() {
  const S = 25; // px per unit
  const canvas = document.createElement('canvas');
  canvas.width = 40 * S;
  canvas.height = 44 * S;
  const c = canvas.getContext('2d', { willReadFrequently: true });
  const spans = {};
  for (const [digit, d] of Object.entries(DIGITS)) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.setTransform(S, 0, 0, S, 12 * S, 8 * S);
    c.save();
    c.beginPath();
    c.rect(-12, CAP, 40, BASE - CAP);
    c.clip();
    c.lineWidth = FIGURE_WIDTH;
    c.lineCap = 'butt';
    c.lineJoin = 'miter';
    c.miterLimit = 2;
    c.stroke(new Path2D(d));
    c.restore();
    const { data, width, height } = c.getImageData(0, 0, canvas.width, canvas.height);
    let left = Infinity;
    let right = -Infinity;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 127) {
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    spans[digit] = { left: left / S - 12, right: (right + 1) / S - 12 };
  }
  return spans;
}

export function initZen() {
  const zen = document.getElementById('zen');
  const svg = document.getElementById('zenClock');
  const band = document.getElementById('zenBand');
  const strokes = [...svg.querySelectorAll('.zen-stroke')];
  const joint = svg.querySelector('.zen-joint');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Measured the first time they're needed: the figures can't be read off an SVG path
  // before the page is laid out.
  let figures = null;
  let spans = null;

  // Where each figure, and the colon, lands for a given time: one GAP between neighbours,
  // the whole time centred on the dial.
  const layouts = new Map();
  function layoutFor(text) {
    if (layouts.has(text)) return layouts.get(text);
    const widths = [...text].map((digit) => spans[digit].right - spans[digit].left);
    const total = widths.reduce((a, b) => a + b, 0) + DOT + 4 * GAP;
    let cursor = 32 - total / 2;
    let colonX = 0;
    const placed = [...text].map((digit, slot) => {
      if (slot === 2) {
        colonX = cursor + DOT / 2;
        cursor += DOT + GAP;
      }
      const shift = cursor - spans[digit].left;
      cursor += widths[slot] + GAP;
      return figures[digit].map(([x, y]) => [x + shift, y + OY]);
    });
    const layout = { figures: placed, colon: COLON_Y.map((y) => [colonX, y]) };
    if (layouts.size > 64) layouts.clear();
    layouts.set(text, layout);
    return layout;
  }

  let progress = 0; // 0 is the mark, 1 is the time
  let target = 0;
  let animating = false;
  let lastFrame = 0;
  let holdTimer = 0;
  let restTimer = 0;

  function render() {
    if (!figures) {
      figures = sampleFigures();
      spans = measureFigures();
    }
    const now = new Date();
    const minutes = now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60000;
    const hours = (now.getHours() % 12) + minutes / 60;
    const pad = (n) => String(n).padStart(2, '0');
    const text = pad(now.getHours()) + pad(now.getMinutes());

    const hourAngle = hours * 30;
    const minuteAngle = minutes * 6;
    const from = [...dialPieces, handPoints(hourAngle, HOUR_HAND), handPoints(minuteAngle, MINUTE_HAND)];
    let to = null;
    if (progress > 0) {
      const layout = layoutFor(text);
      to = [
        ...dialPieces.map((piece, k) => closest(piece, layout.figures[PIECE_SLOT[k]])),
        dotPoints(layout.colon[0]), dotPoints(layout.colon[1]),
      ];
    }

    strokes.forEach((stroke, k) => {
      let points;
      if (progress === 0) {
        // At rest a hand is one straight line from the centre to its tip; it only needs
        // all its points while it's being reshaped.
        points = k >= 4 ? [from[k][0], from[k][N - 1]] : from[k];
      } else {
        // Each piece sets off a little after the last, but all of them arrive together,
        // so none sits waiting while the others are still on their way.
        const e = ease(Math.min(1, Math.max(0, (progress - STAGGER[k]) / (1 - STAGGER[k]))));
        points = from[k].map((p, i) => [lerp(p[0], to[k][i][0], e), lerp(p[1], to[k][i][1], e)]);
      }
      stroke.setAttribute('d', toD(points));
    });

    // Everything else runs off the same curve as the movement, so it all speeds up, slows
    // down and comes to rest together.
    const motion = ease(progress);
    const lastIn = ease(Math.max(0, (progress - STAGGER_MAX) / (1 - STAGGER_MAX)));
    // The band the figures stand in: wide open while it's the mark, it closes onto their
    // top and bottom lines only as they settle, trimming the tails flat.
    const close = Math.min(1, Math.max(0, (lastIn - 0.9) / 0.1));
    const top = lerp(-100, OY + CAP, close);
    const bottom = lerp(164, OY + BASE, close);
    band.setAttribute('y', String(top));
    band.setAttribute('height', String(bottom - top));
    // The colours turn over with the movement: the dial from the accent to ink, the hands
    // from ink to the accent, the way the clock itself colours its figures and its colon.
    svg.style.setProperty('--turn', String(motion));
    // The mark's heavy line thins to the figures' as it becomes them.
    const width = String(lerp(MARK_WIDTH, FIGURE_WIDTH, motion));
    strokes.forEach((stroke) => stroke.setAttribute('stroke-width', width));
    joint.setAttribute('stroke-width', width);
    // The joint melts away as the hands start to leave the centre, over the stretch they
    // take to get going.
    joint.setAttribute('d', toD([toward(hourAngle, JOINT), [32, 32], toward(minuteAngle, JOINT)]));
    joint.style.opacity = String(1 - smooth((progress - STAGGER[4]) / 0.22));

    svg.setAttribute('aria-label', `${Number(text.slice(0, 2))}:${text.slice(2)}`);
  }

  function frame(time) {
    const dt = lastFrame ? time - lastFrame : 16;
    lastFrame = time;
    const step = dt / MORPH_MS;
    progress = target > progress ? Math.min(target, progress + step) : Math.max(target, progress - step);
    render();
    if (progress !== target && isZen()) {
      requestAnimationFrame(frame);
    } else {
      animating = false;
      lastFrame = 0;
    }
  }

  function go(to) {
    target = to;
    zen.classList.toggle('zen-digital', to === 1);
    if (reduceMotion.matches) {
      progress = to;
      render();
      return;
    }
    if (!animating) {
      animating = true;
      requestAnimationFrame(frame);
    }
  }

  // Ask for the time: the mark reshapes into it, holds, and goes back. Asking again while
  // it shows sends it back straight away.
  function askForTime() {
    clearTimeout(holdTimer);
    if (target === 1) {
      go(0);
      return;
    }
    go(1);
    holdTimer = setTimeout(() => go(0), MORPH_MS + HOLD_MS);
  }

  // A tap anywhere that isn't on something else: the gear, the settings, the "What's new"
  // pill, a dialog. While the settings are open, a tap outside them only closes them.
  const on = (target, selector) => target instanceof Element && target.closest(selector);
  document.addEventListener('pointerdown', (event) => {
    if (!isZen() || event.button !== 0) return;
    if (document.body.classList.contains('panel-open') || document.querySelector('dialog[open]')) return;
    if (on(event.target, '.panel, .settings-toggle, .news, dialog, button, input, a')) return;
    askForTime();
  });
  // Space or Enter does the same, unless it's pressing a button or typing somewhere.
  document.addEventListener('keydown', (event) => {
    if (!isZen() || (event.key !== ' ' && event.key !== 'Enter')) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
    if (document.body.classList.contains('panel-open') || document.querySelector('dialog[open]')) return;
    if (on(event.target, 'button, input, textarea, select, a, [contenteditable]')) return;
    event.preventDefault();
    askForTime();
  });

  // Between morphs the hands creep a tenth of a degree a second, so a redraw a second is
  // plenty — and none at all while Zen is off.
  function start() {
    zen.setAttribute('aria-hidden', 'false');
    clearInterval(restTimer);
    render();
    restTimer = setInterval(() => {
      if (!animating) render();
    }, 1000);
  }
  function stop() {
    zen.setAttribute('aria-hidden', 'true');
    clearInterval(restTimer);
    clearTimeout(holdTimer);
    target = 0;
    progress = 0;
    zen.classList.remove('zen-digital');
  }

  // A countdown landing in Zen is met gently: the mark blooms and turns once, and a ring
  // of the accent spreads out from it and fades.
  const box = svg.parentElement;
  onCountdownArrive(() => {
    if (!isZen()) return;
    box.classList.remove('zen-arrive');
    void box.offsetWidth; // so a second arrival starts it over
    box.classList.add('zen-arrive');
  });
  box.addEventListener('animationend', (event) => {
    if (event.animationName === 'zen-arrive') box.classList.remove('zen-arrive');
  });

  if (isZen()) start();
  let wasZen = isZen();
  onMoodChange(() => {
    if (isZen() === wasZen) return;
    wasZen = isZen();
    if (wasZen) start();
    else stop();
  });
}
