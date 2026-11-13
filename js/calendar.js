import { onTick, isoWeek } from './clock.js';

// This week, as one line under the date: the week number, then Monday to Sunday, with
// days gone by faded back and today in the accent. A click unfolds the weeks around it,
// two before and seven after, enough for "what day is the 25th?" or
// "Thursday, week 52?" in the middle of a call. Earlier weeks open upwards, later ones
// downwards, so this week stays put while the rest arrive around it. Another click, Esc,
// a click anywhere else, or a minute left alone folds it back to the strip.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADS = ['M','T','W','T','F','S','S'];
const WEEKS_BEFORE = 2;
const WEEKS_AFTER = 7;
const IDLE_MS = 60000;

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

function render(now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekFrom = (offset) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset * 7);

  const heads = cell('cal-row cal-heads', '');
  heads.style.setProperty('--distance', String(WEEKS_BEFORE + 1));
  heads.append(cell('cal-week', ''));
  DAY_HEADS.forEach((d) => heads.append(cell('cal-head', d)));
  heads.append(cell('cal-month', ''));

  const before = [heads];
  for (let w = -WEEKS_BEFORE; w < 0; w++) {
    before.push(weekRow(weekFrom(w), today, { label: w === -WEEKS_BEFORE, distance: -w }));
  }
  const after = [];
  for (let w = 1; w <= WEEKS_AFTER; w++) after.push(weekRow(weekFrom(w), today, { distance: w }));

  document.getElementById('calBefore').replaceChildren(...before);
  document.getElementById('calCurrent').replaceChildren(...weekRow(monday, today).childNodes);
  document.getElementById('calAfter').replaceChildren(...after);
}

export function initCalendar() {
  const calendar = document.getElementById('calendar');

  let idle = 0;
  function setExpanded(expanded) {
    calendar.classList.toggle('expanded', expanded);
    calendar.setAttribute('aria-expanded', String(expanded));
    clearTimeout(idle);
    if (expanded) idle = setTimeout(() => setExpanded(false), IDLE_MS);
  }
  const expanded = () => calendar.classList.contains('expanded');

  calendar.addEventListener('click', () => setExpanded(!expanded()));
  calendar.addEventListener('pointermove', () => {
    if (expanded()) setExpanded(true); // keeps it open while it's being read
  });
  document.addEventListener('click', (event) => {
    if (expanded() && !calendar.contains(event.target)) setExpanded(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && expanded()) setExpanded(false);
  });
  // Switched off in settings: it comes back as the strip.
  new MutationObserver(() => {
    if (!document.body.classList.contains('show-calendar') && expanded()) setExpanded(false);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  let lastDay = null;
  const update = (now) => {
    const stamp = now.toDateString();
    if (stamp === lastDay) return;
    lastDay = stamp;
    render(now);
  };
  update(new Date());
  onTick(update);
}
