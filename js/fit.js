// Everything in the clock's column is sized in multiples of --size, so the column grows in
// step with it. On a window too small to hold it — a quarter of a 1080p screen, snapped to
// a corner — --fit takes --size down just far enough that it all stays on screen, with a
// margin all round. A window with room to spare stays at 1, so the Scale slider is
// untouched there.

// how much of the window's height and width the column may take up
const ROOM = 0.86;
// the least space the calendar keeps from the clock, and from the window's edge
const MARGIN = 32;

export function initFit() {
  const root = document.documentElement;
  const center = document.querySelector('.center');
  const calendar = document.getElementById('calendar');
  let fit = 1;

  function refit() {
    const box = center.getBoundingClientRect();
    if (!box.height) return;
    // the column's size as if --fit were 1
    const height = box.height / fit;
    const width = box.width / fit;
    const next = Math.min(1, (innerHeight * ROOM) / height, (innerWidth * ROOM) / width);
    if (Math.abs(next - fit) >= 0.005) {
      fit = next;
      root.style.setProperty('--fit', fit.toFixed(3));
    }
    placeCalendar();
  }

  // The calendar only takes the room beside the clock; it never shrinks the clock to get
  // some. Where the space to the right is too narrow (or short) for it, it steps out.
  function placeCalendar() {
    const room = (innerWidth - center.getBoundingClientRect().width) / 2;
    const needs = calendar.offsetWidth + 2 * MARGIN;
    const fits = needs <= room && calendar.offsetHeight <= innerHeight * ROOM;
    calendar.classList.toggle('cramped', !fits);
  }

  // The column changes size with the window, the slider, the theme, and the date, weather
  // and countdown coming and going; each one lands here. So does the calendar's own size.
  new ResizeObserver(refit).observe(center);
  new ResizeObserver(placeCalendar).observe(calendar);
  addEventListener('resize', refit);
  refit();
}
