// Everything in the clock's column is sized in multiples of --size, so the column grows in
// step with it. On a window too small to hold it — a quarter of a 1080p screen, snapped to
// a corner — --fit takes --size down just far enough that it all stays on screen, with a
// margin all round. A window with room to spare stays at 1, so the Scale slider is
// untouched there.

// how much of the window's height and width the column may take up
const ROOM = 0.86;

export function initFit() {
  const root = document.documentElement;
  const center = document.querySelector('.center');
  let fit = 1;

  function refit() {
    const box = center.getBoundingClientRect();
    if (!box.height) return;
    // the column's size as if --fit were 1
    const height = box.height / fit;
    const width = box.width / fit;
    const next = Math.min(1, (innerHeight * ROOM) / height, (innerWidth * ROOM) / width);
    if (Math.abs(next - fit) < 0.005) return;
    fit = next;
    root.style.setProperty('--fit', fit.toFixed(3));
  }

  // The column changes size with the window, the slider, the theme, and the date, weather
  // and countdown coming and going; each one lands here.
  new ResizeObserver(refit).observe(center);
  addEventListener('resize', refit);
  refit();
}
