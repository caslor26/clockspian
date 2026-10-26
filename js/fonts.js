// Fonts cut down to a few letters, for setting names: each theme's name in its own face
// in the panel, and the wordmark in Jost.
//
// Google Fonts serves such a subset (`text=`) under the font's own name. Loaded next to
// the full font, it wins any exact match on its weight, and every glyph it lacks then
// falls through to the next font in the stack. With the Weight slider at 400, Lagoon's
// clock came out in Arial Rounded, and half the date with it. So the subsets go in under
// a name of their own, which nothing but a label asks for.

export const labelFamily = (family) => `${family} Label`;

export async function loadLabelFont(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const css = await response.text();
    const style = document.createElement('style');
    style.textContent = css.replace(/font-family: '([^']+)'/g, (_, family) => `font-family: '${labelFamily(family)}'`);
    document.head.appendChild(style);
  } catch {
    // The names show in their fallback faces. Still readable.
  }
}
