import { onTick, isoWeek } from './clock.js';

// This month, beside the clock: Monday first, with each row's ISO week number down the
// left, the way a Swedish wall calendar does it. Days gone by fade back, and today wears
// the accent. It redraws when the day turns, riding the clock's tick.

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADS = ['M','T','W','T','F','S','S'];

function cell(className, text) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

function render(root, now) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // blanks before the 1st

  const title = cell('calendar-title', `${MONTHS[month]} ${year}`);
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  grid.append(cell('calendar-head calendar-week', ''));
  DAY_HEADS.forEach((d) => grid.append(cell('calendar-head', d)));

  for (let start = 1 - lead; start <= daysInMonth; start += 7) {
    // the row's Monday may fall in last month; its week number is the same either way
    grid.append(cell('calendar-week', String(isoWeek(new Date(year, month, Math.max(start, 1))))));
    for (let day = start; day < start + 7; day++) {
      if (day < 1 || day > daysInMonth) {
        grid.append(cell('calendar-day', ''));
        continue;
      }
      const when = day < today ? ' past' : day === today ? ' today' : '';
      const el = cell(`calendar-day${when}`, String(day));
      if (day === today) el.setAttribute('aria-current', 'date');
      grid.append(el);
    }
  }

  root.replaceChildren(title, grid);
}

export function initCalendar() {
  const root = document.getElementById('calendar');
  let lastDay = null;
  const update = (now) => {
    const stamp = now.toDateString();
    if (stamp === lastDay) return;
    lastDay = stamp;
    render(root, now);
  };
  update(new Date());
  onTick(update);
}
