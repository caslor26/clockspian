// Everything in the clock's column is sized in multiples of --size, so the column grows in
// step with it. On a window too small to hold it — a quarter of a 1080p screen, snapped to
// a corner — --fit takes --size down just far enough that it all stays on screen, with a
// margin all round. A window with room to spare stays at 1, so the Scale slider is
// untouched there. The calendar, when it's on, counts as part of what has to fit.

// how much of the window's height and width the column may take up
const ROOM = 0.86;
// the least space the calendar keeps from the clock, and from the window's edge
const MARGIN = 32;
// With the calendar on, the clock gives up some size to make room for it beside it, but
// never below this; a window narrower than that keeps the clock and leaves the calendar out.
const FLOOR = 0.7;

export function initFit() {
  const root = document.documentElement;
  const center = document.querySelector('.center');
  const calendar = document.getElementById('calendar');
  let fit = 1;

  function refit() {
    const box = center.getBoundingClientRect();
    if (!box.height) return;
    // the column's size, and the calendar's, as if --fit were 1
    const height = box.height / fit;
    const width = box.width / fit;
    const calWidth = calendar.offsetWidth / fit;
    const calHeight = calendar.offsetHeight / fit;
    const alone = Math.min(1, (innerHeight * ROOM) / height, (innerWidth * ROOM) / width);
    let next = alone;
    let cramped = false;
    if (calWidth) {
      // The clock stays centred, so the calendar's room comes in pairs: one width beside
      // it, and the same again, empty, on the other side.
      const withCalendar = Math.min(alone, (innerWidth - 4 * MARGIN) / (width + 2 * calWidth), (innerHeight * ROOM) / calHeight);
      if (withCalendar >= FLOOR) next = withCalendar;
      else cramped = true;
    }
    if (Math.abs(next - fit) >= 0.005) {
      fit = next;
      root.style.setProperty('--fit', fit.toFixed(3));
    }
    calendar.classList.toggle('cramped', cramped);
    document.body.classList.toggle('calendar-cramped', cramped);
  }

  // The column changes size with the window, the slider, the theme, and the date, weather
  // and countdown coming and going; each one lands here. So does the calendar's own size.
  new ResizeObserver(refit).observe(center);
  new ResizeObserver(refit).observe(calendar);
  addEventListener('resize', refit);
  refit();
}
