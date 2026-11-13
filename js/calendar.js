import { onTick, isoWeek } from './clock.js';

// This week, as one line under the date: the week number, then Monday to Sunday, with
// days gone by faded back and today in the accent. A click unfolds the weeks around it,
// two before and seven after, enough for "what day is the 25th?" or
// "Thursday, week 52?" in the middle of a call. Earlier weeks open upwards, later ones
// downwards, so this week stays put while the rest arrive around it. Open, the wheel, a
// trackpad or the arrow keys scroll it a week at a time (Home comes back to this week).
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

  const before = [];
  for (let w = -WEEKS_BEFORE; w < 0; w++) {
    before.push(weekRow(weekFrom(w), today, { label: w === -WEEKS_BEFORE, distance: -w }));
  }
  const after = [];
  for (let w = 1; w <= WEEKS_AFTER; w++) after.push(weekRow(weekFrom(w), today, { distance: w }));

  const current = document.getElementById('calCurrent');
  document.getElementById('calHeads').replaceChildren(heads);
  document.getElementById('calBefore').replaceChildren(...before);
  current.replaceChildren(...weekRow(weekFrom(0), today).childNodes);
  current.classList.toggle('this-week', shift === 0);
  document.getElementById('calAfter').replaceChildren(...after);
}

export function initCalendar() {
  const calendar = document.getElementById('calendar');
  const current = document.getElementById('calCurrent');

  let shift = 0;
  let now = new Date();

  // One week further on (1) or back (-1). Every row stays where it is and rolls its new
  // week in from the way it's going, like an odometer, so nothing slides across the edges
  // of the folds (which would clip it there) and no row is left empty mid-step.
  function step(by) {
    const next = Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, shift + by));
    if (next === shift) return;
    const dir = Math.sign(next - shift);
    shift = next;
    render(now, shift);
    const nudge = current.offsetHeight * 0.35;
    for (const row of calendar.querySelectorAll('#calBefore .cal-row, #calCurrent, #calAfter .cal-row')) {
      row.animate([{ transform: `translateY(${dir * nudge}px)`, opacity: 0.3 }, { transform: 'none', opacity: 1 }], {
        duration: 170,
        easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
      });
    }
  }

  let idle = 0;
  function setExpanded(open) {
    calendar.classList.toggle('expanded', open);
    calendar.setAttribute('aria-expanded', String(open));
    clearTimeout(idle);
    if (open) idle = setTimeout(() => setExpanded(false), IDLE_MS);
    else if (shift !== 0) {
      // folded, it's this week again
      shift = 0;
      render(now, shift);
    }
  }
  const expanded = () => calendar.classList.contains('expanded');
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
    else if (event.key === 'Home') step(-shift);
    else if (by) step(by);
    else return;
    event.preventDefault();
    keepOpen();
  });

  // A wheel notch is a week; a trackpad's stream of small deltas adds up to one a row's
  // height at a time, so the weeks follow the fingers.
  let wheel = 0;
  calendar.addEventListener('wheel', (event) => {
    if (!expanded()) return;
    event.preventDefault();
    keepOpen();
    const row = current.offsetHeight || 30;
    const delta = event.deltaY * (event.deltaMode === 1 ? row : event.deltaMode === 2 ? row * 5 : 1);
    // a wheel's notch arrives as one big delta: one week, whatever its size
    if (Math.abs(delta) >= row) {
      wheel = 0;
      step(Math.sign(delta));
      return;
    }
    wheel += delta;
    if (Math.abs(wheel) >= row) {
      const by = Math.sign(wheel);
      wheel -= by * row;
      step(by);
    }
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
