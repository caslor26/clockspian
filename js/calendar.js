import { onTick, isoWeek } from './clock.js';

// This week, as one line under the date: the week number, then Monday to Sunday, with
// days gone by faded back and today in the accent. A click unfolds the weeks around it,
// two before and seven after, enough for "what day is the 25th?" or
// "Thursday, week 52?" in the middle of a call. Earlier weeks open upwards, later ones
// downwards, so this week stays put while the rest arrive around it. Open, it scrolls:
// smoothly under a trackpad, a week a notch on a wheel, and by the arrow keys (Home comes
// back to this week), always coming to rest on a whole week.
// Another click, Esc, a click anywhere else, or a minute left alone folds it back to the
// strip, and to this week.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADS = ['M','T','W','T','F','S','S'];
const WEEKS_BEFORE = 2;
const WEEKS_AFTER = 7;
const IDLE_MS = 60000;
// how far the open calendar scrolls: a year back, two ahead
const MIN_SHIFT = -52;
const MAX_SHIFT = 104;

function cell(className, text) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

const sameDay = (a, b) => a.toDateString() === b.toDateString();

// One week as a row: its number, seven days, and, where a month begins in it (or it's the
// first row shown), that month's name on the right.
function weekRow(monday, today, { label = false, distance = 0 } = {}) {
  const row = cell('cal-row', '');
  row.style.setProperty('--distance', String(distance));
  row.append(cell('cal-week', String(isoWeek(monday))));
  let month = label ? monday.getMonth() : null;
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    let cls = 'cal-day';
    if (sameDay(day, today)) cls += ' today';
    else if (day < today) cls += ' past';
    if (day.getDate() === 1) {
      cls += ' first';
      month = day.getMonth();
    }
    const el = cell(cls, String(day.getDate()));
    if (sameDay(day, today)) el.setAttribute('aria-current', 'date');
    row.append(el);
  }
  row.append(cell('cal-month', month === null ? '' : MONTHS[month]));
  return row;
}

// `shift` weeks away from this one: scrolling the open calendar moves the whole run, so the
// middle row (the strip, folded) is this week again only at 0.
function render(now, shift) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekFrom = (offset) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + (shift + offset) * 7);

  const heads = cell('cal-row cal-heads', '');
  heads.style.setProperty('--distance', String(WEEKS_BEFORE + 1));
  heads.append(cell('cal-week', ''));
  DAY_HEADS.forEach((d) => heads.append(cell('cal-head', d)));
  heads.append(cell('cal-month', ''));

  // A spare week either side, just outside the clipped edges, ready to scroll into view.
  const spare = (offset) => {
    const row = weekRow(weekFrom(offset), today, { label: offset < 0 });
    row.classList.add('cal-buffer', offset < 0 ? 'cal-buffer-top' : 'cal-buffer-bottom');
    return row;
  };

  const before = [spare(-WEEKS_BEFORE - 1)];
  for (let w = -WEEKS_BEFORE; w < 0; w++) {
    before.push(weekRow(weekFrom(w), today, { label: w === -WEEKS_BEFORE, distance: -w }));
  }
  const after = [];
  for (let w = 1; w <= WEEKS_AFTER; w++) after.push(weekRow(weekFrom(w), today, { distance: w }));
  after.push(spare(WEEKS_AFTER + 1));

  const current = document.getElementById('calCurrent');
  document.getElementById('calHeads').replaceChildren(heads);
  document.getElementById('calBefore').replaceChildren(...before);
  current.replaceChildren(...weekRow(weekFrom(0), today).childNodes);
  current.classList.toggle('this-week', shift === 0);
  document.getElementById('calAfter').replaceChildren(...after);
}

// how long the folds take to open (--squeeze in style.css), after which it can scroll
const UNFOLD_MS = 720;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initCalendar() {
  const calendar = document.getElementById('calendar');
  const current = document.getElementById('calCurrent');
  const moving = ['calBefore', 'calCurrent', 'calAfter'].map((id) => document.getElementById(id));

  let now = new Date();

  // The scroll: `pos` is where the weeks are drawn, in weeks from this one and fractions
  // of one; `target` is where they're heading. Each frame closes part of the gap, so it
  // glides and eases out. The rows are rebuilt only when the nearest whole week changes;
  // in between, they're shifted by the fraction left over.
  let shift = 0;
  let pos = 0;
  let target = 0;
  let raf = 0;

  function draw() {
    const nearest = Math.round(pos);
    if (nearest !== shift) {
      shift = nearest;
      render(now, shift);
    }
    const y = -(pos - shift) * current.offsetHeight;
    for (const el of moving) el.style.transform = Math.abs(y) < 0.01 ? '' : `translateY(${y}px)`;
  }
  function frame() {
    const gap = target - pos;
    pos = reducedMotion.matches || Math.abs(gap) < 0.002 ? target : pos + gap * 0.22;
    draw();
    raf = pos === target ? 0 : requestAnimationFrame(frame);
  }
  function scrollTo(to) {
    target = Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, to));
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function reset() {
    cancelAnimationFrame(raf);
    raf = 0;
    pos = target = 0;
    draw();
  }

  let idle = 0;
  let settle = 0;
  function setExpanded(open) {
    const was = expanded();
    calendar.classList.toggle('expanded', open);
    calendar.setAttribute('aria-expanded', String(open));
    clearTimeout(idle);
    if (open) {
      idle = setTimeout(() => setExpanded(false), IDLE_MS);
      // Once unfolded, the folds stop clipping and the weeks clip as one, so they can scroll.
      if (!was) settle = setTimeout(() => calendar.classList.add('settled'), UNFOLD_MS);
    } else {
      clearTimeout(settle);
      calendar.classList.remove('settled');
      reset(); // folded, it's this week again
    }
  }
  function expanded() {
    return calendar.classList.contains('expanded');
  }
  const scrollable = () => calendar.classList.contains('settled');
  const keepOpen = () => {
    if (expanded()) setExpanded(true);
  };

  calendar.addEventListener('click', () => setExpanded(!expanded()));
  calendar.addEventListener('pointermove', keepOpen); // stays open while it's being read
  document.addEventListener('click', (event) => {
    if (expanded() && !calendar.contains(event.target)) setExpanded(false);
  });
  document.addEventListener('keydown', (event) => {
    if (!expanded()) return;
    const by = { ArrowDown: 1, ArrowUp: -1, PageDown: 4, PageUp: -4 }[event.key];
    if (event.key === 'Escape') setExpanded(false);
    else if (!scrollable() && (by || event.key === 'Home')) return;
    else if (event.key === 'Home') scrollTo(0);
    else if (by) scrollTo(Math.round(target) + by);
    else return;
    event.preventDefault();
    keepOpen();
  });

  // The weeks follow a trackpad by the pixel, and a wheel a week a notch: any one event
  // moves them a week at most. When the scrolling stops, they settle on the nearest week.
  let rest = 0;
  calendar.addEventListener('wheel', (event) => {
    if (!expanded()) return;
    event.preventDefault();
    if (!scrollable()) return;
    keepOpen();
    const row = current.offsetHeight || 30;
    const delta = event.deltaY * (event.deltaMode === 1 ? row : event.deltaMode === 2 ? row * 5 : 1);
    scrollTo(target + Math.max(-1, Math.min(1, delta / row)));
    clearTimeout(rest);
    rest = setTimeout(() => scrollTo(Math.round(target)), 120);
  }, { passive: false });

  // Switched off in settings: it comes back as the strip.
  new MutationObserver(() => {
    if (!document.body.classList.contains('show-calendar') && expanded()) setExpanded(false);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  let lastDay = null;
  const update = (tick) => {
    const stamp = tick.toDateString();
    if (stamp === lastDay) return;
    lastDay = stamp;
    now = tick;
    render(now, shift);
  };
  update(new Date());
  onTick(update);
}
