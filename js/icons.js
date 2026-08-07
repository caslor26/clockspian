// Weather glyphs built from geometric primitives — circles, rounded rects, straight
// lines — in the same spirit as the original sun-with-ring. No icon font, no gradients.
//
// Every shape group carries its opacity on the <g> rather than on each child, so
// overlapping circles composite as one flat silhouette instead of darkening where
// they cross.

const VIEWBOX = 56;

// `dy` nudges a glyph's whole content so every icon sits optically centred in the
// box. Without it the ones that have no precipitation below the cloud (overcast,
// partly cloudy) ride visibly high, and the icon appears to jump as conditions change.
function svg(inner, dy = 0) {
  const body = dy ? `<g transform="translate(0 ${dy})">${inner}</g>` : inner;
  return `<svg viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}

// Flat-bottomed cloud from two discs and a rounded bar.
function cloud({ x = 0, y = 0, scale = 1, opacity = 0.55 } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="currentColor" opacity="${opacity}">
    <circle cx="21" cy="27" r="8"/>
    <circle cx="32" cy="29" r="6.5"/>
    <rect x="13" y="29" width="27" height="7" rx="3.5"/>
  </g>`;
}

// r is deliberately smaller than the original prototype's disc: at r=18 the clear-sky
// glyph carried far more visual weight than the cloud-based ones, so the icon area
// appeared to swell and shrink as the weather changed.
function sun({ cx = 28, cy = 28, r = 15, ring = true } = {}) {
  const disc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--accent)" opacity="0.9"/>`;
  if (!ring) return disc;
  return `<circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.25"/>${disc}`;
}

// Crescent carved out of a disc with a mask, so the notch stays transparent and the
// stage's background gradient shows through rather than being painted over.
function moon({ cx = 28, cy = 28, r = 15, id = 'moon' } = {}) {
  // The mask rect is oversized so it still covers the disc after svg()'s translate.
  return `<mask id="${id}">
      <rect x="-20" y="-20" width="${VIEWBOX + 40}" height="${VIEWBOX + 40}" fill="#fff"/>
      <circle cx="${cx + 8}" cy="${cy - 7}" r="${r - 1}" fill="#000"/>
    </mask>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--accent)" opacity="0.9" mask="url(#${id})"/>`;
}

function drops(xs, { y = 41, length = 7, slant = -2 } = {}) {
  return `<g stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.7">${xs
    .map((x) => `<line x1="${x}" y1="${y}" x2="${x + slant}" y2="${y + length}"/>`)
    .join('')}</g>`;
}

function flakes(xs, { y = 44 } = {}) {
  return `<g fill="var(--accent)" opacity="0.7">${xs
    .map((x) => `<circle cx="${x}" cy="${y}" r="2"/>`)
    .join('')}</g>`;
}

function bolt() {
  return `<path d="M30 33 L23 43 L28 43 L25 52" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`;
}

// A small sun/moon peeking out behind a cloud, shared by the "partly" conditions.
function peek(isDay) {
  return isDay
    ? sun({ cx: 36, cy: 19, r: 10, ring: false })
    : moon({ cx: 36, cy: 19, r: 10, id: 'moon-peek' });
}

const GLYPHS = {
  clear: (isDay) => svg(isDay ? sun() : moon()),

  'mainly-clear': (isDay) =>
    svg(peek(isDay) + cloud({ x: -2, y: 8, scale: 0.82, opacity: 0.45 }), 5),

  'partly-cloudy': (isDay) => svg(peek(isDay) + cloud({ y: 6, scale: 0.9 }), 4),

  overcast: () =>
    svg(
      cloud({ x: 6, y: -6, scale: 0.72, opacity: 0.3 }) +
        cloud({ x: -2, y: 5, scale: 0.95 }),
      4
    ),

  fog: () =>
    svg(
      cloud({ y: -3, scale: 0.9 }) +
        `<g stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4">
          <line x1="14" y1="40" x2="42" y2="40"/>
          <line x1="18" y1="47" x2="38" y2="47"/>
        </g>`
    ),

  drizzle: () => svg(cloud({ y: -4, scale: 0.9 }) + drops([23, 33], { length: 5 })),

  rain: () => svg(cloud({ y: -4, scale: 0.9 }) + drops([20, 28, 36])),

  showers: (isDay) =>
    svg(peek(isDay) + cloud({ y: 2, scale: 0.85 }) + drops([22, 32], { y: 45, length: 6 })),

  snow: () => svg(cloud({ y: -4, scale: 0.9 }) + flakes([20, 28, 36])),

  'snow-showers': (isDay) =>
    svg(peek(isDay) + cloud({ y: 2, scale: 0.85 }) + flakes([23, 33], { y: 47 })),

  thunder: () => svg(cloud({ y: -6, scale: 0.9 }) + bolt()),
};

/**
 * @param {string} icon  one of the GLYPHS keys
 * @param {boolean} isDay  selects the sun vs. crescent variant where one exists
 * @returns {string} SVG markup
 */
export function glyphFor(icon, isDay = true) {
  const build = GLYPHS[icon] || GLYPHS.clear;
  return build(isDay);
}

export const ICON_KEYS = Object.keys(GLYPHS);
