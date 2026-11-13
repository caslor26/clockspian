// Everything in the clock's column is sized in multiples of --size, so the column grows in
// step with it. On a window too small to hold it — a quarter of a 1080p screen, snapped to
// a corner, or any window once the calendar joins the column — --fit takes --size down just
// far enough that it all stays on screen, with a margin all round. A window with room to
// spare stays at 1, so the Scale slider is untouched there.
//
// --fit transitions (see style.css), so when the calendar unfolds — switched on, or opened
// from its strip to the weeks around — the clock squeezes down to make room as it opens,
// and springs back as it folds away.

// how much of the window's height and width the column may take up
const ROOM = 0.86;

export function initFit() {
  const root = document.documentElement;
  const center = document.querySelector('.center');
  const slot = document.querySelector('.calendar-slot');
  const calendar = document.getElementById('calendar');
  const weekFolds = [...calendar.querySelectorAll('.fold')];
  let target = 1;

  // No squeeze on the first frame: the clock opens at the size it belongs at.
  root.classList.add('fit-instant');

  function refit() {
    const box = center.getBoundingClientRect();
    if (!box.height) return;
    // Mid-squeeze, the column is drawn at the --fit of that moment, not the target, and the
    // calendar's folds are part-way open. So measure at the current --fit, and count each
    // fold at the height it is heading for rather than the height it has reached.
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--fit')) || 1;
    const gap = parseFloat(getComputedStyle(center).rowGap) || 0;
    const shown = document.body.classList.contains('show-calendar');
    let ahead = (shown ? calendar.scrollHeight + gap : 0)
      - (slot.offsetHeight + parseFloat(getComputedStyle(slot).marginTop) + gap);
    // The weeks' folds sit inside the slot, whose scrollHeight above has them as they are now.
    if (shown) {
      const open = calendar.classList.contains('expanded');
      for (const fold of weekFolds) ahead += (open ? fold.firstElementChild.scrollHeight : 0) - fold.offsetHeight;
    }
    // the column's size as if --fit were 1
    const height = (box.height + ahead) / current;
    const width = box.width / current;
    const next = Math.min(1, (innerHeight * ROOM) / height, (innerWidth * ROOM) / width);
    if (Math.abs(next - target) < 0.005) return;
    target = next;
    root.style.setProperty('--fit', target.toFixed(3));
  }

  // Dragging the window's edge is followed straight away; a squeeze there would only lag.
  let settle = 0;
  function onResize() {
    root.classList.add('fit-instant');
    refit();
    clearTimeout(settle);
    settle = setTimeout(() => root.classList.remove('fit-instant'), 200);
  }

  // The column changes size with the window, the slider, the theme, and the date, weather,
  // countdown and calendar coming and going; each one lands here.
  new ResizeObserver(refit).observe(center);
  addEventListener('resize', onResize);
  // The calendar's switch flips a class on <body>; refit then, so the squeeze starts with
  // the unfolding rather than a frame or more behind it.
  new MutationObserver(refit).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  // Likewise the calendar opening from its strip, or folding back.
  new MutationObserver(refit).observe(calendar, { attributes: true, attributeFilter: ['class'] });
  refit();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('fit-instant')));
}
