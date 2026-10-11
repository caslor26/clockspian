import { onTick } from './clock.js';

// One countdown to a moment of your choosing — lunch, the weekend, Christmas — shown as a
// quiet line under the date. Off until it is switched on and given a date.
//
// The moment is stored as the wall-clock date and time that were typed, not as a
// timestamp, and turned into a Date on every tick. Nothing counts down in storage, so a
// tab closed on Monday and reopened on Friday is still right, and "Christmas Eve at 15:00"
// stays 15:00 wherever the screen is.

const STORAGE_KEY = 'clockspian.countdown';

// How long "now" stays up once the moment arrives, before the line steps aside.
const AFTERGLOW_MS = 60 * 60 * 1000;

const DEFAULTS = { on: false, label: '', date: '', time: '' };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The countdown still runs for this session.
  }
}

const state = load();
const listeners = new Set();

export function getCountdown() {
  return { ...state };
}

export function setCountdown(changes) {
  Object.assign(state, changes);
  save();
  listeners.forEach((listener) => listener(getCountdown()));
}

export function onCountdownChange(listener) {
  listeners.add(listener);
}

// No time means the start of the day — Christmas needs only a date.
export function countdownTarget() {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(state.date);
  if (!date) return null;
  const time = /^(\d{2}):(\d{2})/.exec(state.time) || [null, '0', '0'];
  return new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(time[1]), Number(time[2]));
}

// 'unset' | 'counting' | 'arrived' (within the afterglow) | 'past'
export function countdownStatus(now = new Date()) {
  const target = countdownTarget();
  if (!target) return 'unset';
  const left = target - now;
  if (left > 0) return 'counting';
  return -left < AFTERGLOW_MS ? 'arrived' : 'past';
}

const pad = (n) => String(n).padStart(2, '0');

// Days are counted by the calendar, not in 24-hour lumps, so a daylight-saving night
// (23 or 25 hours long) never nudges the count off by one.
const dayNumber = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;

// Coarser the further out it is: seconds only matter in the last hour, and nobody
// waiting for Christmas wants to watch them.
function remaining(target, now) {
  const total = Math.ceil((target - now) / 1000);
  if (total >= 48 * 3600) {
    const days = dayNumber(target) - dayNumber(now);
    return `${days} days`;
  }
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m ${pad(total % 60)}s`;
}

export function initCountdown() {
  const el = document.getElementById('countdown');
  const labelEl = document.getElementById('countdownLabelText');
  const dotEl = el.querySelector('.dot');
  const valueEl = document.getElementById('countdownValue');

  function render(now = new Date()) {
    const status = countdownStatus(now);
    const shown = state.on && (status === 'counting' || status === 'arrived');
    el.hidden = !shown;
    if (!shown) return;

    const label = state.label.trim();
    labelEl.textContent = label;
    labelEl.hidden = !label;
    dotEl.hidden = !label;
    el.classList.toggle('arrived', status === 'arrived');
    valueEl.textContent = status === 'arrived' ? 'now' : remaining(countdownTarget(), now);
  }

  onTick(render);
  onCountdownChange(() => render());
  render();
}
