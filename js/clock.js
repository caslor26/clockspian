const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const pad = (n) => String(n).padStart(2, '0');

export function initClock() {
  const timeEl = document.getElementById('time');
  const weekdayEl = document.getElementById('weekday');
  const dateEl = document.getElementById('date');
  const track = document.getElementById('secondsTrack');

  // The colon element is animated by CSS, so it has to survive between ticks —
  // rewriting the whole .time innerHTML each second would restart the blink and
  // leave it permanently out of phase.
  timeEl.innerHTML = '<span id="hours">--</span><span class="colon">:</span><span id="minutes">--</span>';
  const hoursEl = timeEl.querySelector('#hours');
  const minutesEl = timeEl.querySelector('#minutes');

  let lastDayStamp = null;

  function tick() {
    const now = new Date();

    hoursEl.textContent = pad(now.getHours());
    minutesEl.textContent = pad(now.getMinutes());

    const dayStamp = now.toDateString();
    if (dayStamp !== lastDayStamp) {
      weekdayEl.textContent = WEEKDAYS[now.getDay()];
      dateEl.textContent = `${MONTHS[now.getMonth()]} ${now.getDate()}`;
      lastDayStamp = dayStamp;
    }

    const seconds = now.getSeconds();
    if (seconds === 0) {
      // Snap back to zero instead of letting the 1s ease animate a visible rewind
      // across the full width of the screen.
      track.classList.add('no-transition');
      track.style.width = '0%';
      void track.offsetWidth; // flush the change before re-enabling the transition
      track.classList.remove('no-transition');
    } else {
      track.style.width = `${(seconds / 60) * 100}%`;
    }
  }

  // setInterval(1000) drifts, and stalls entirely while the lid is shut. Re-aim at
  // the next whole second after every tick so the clock stays aligned to the wall
  // clock over a multi-day always-on session.
  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      tick();
      schedule();
    }, 1000 - (Date.now() % 1000));
  }

  tick();
  schedule();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      tick();
      schedule();
    }
  });
}
