/**
 * Measures the background color actually shown on screen.
 * The extension does not know X's own colors, so instead of hard-coding a color
 * per theme it measures them from the page.
 */
import { layer, parseCssColor, type Rgb, type Rgba } from './contrast.ts';

/** Limit on how far to walk up. A page that reaches no opaque color within it counts as unmeasurable */
const MAX_ANCESTORS = 40;

/**
 * The color visible behind an element. Walks up the ancestors remembering
 * translucent backgrounds, then re-composites them frontward once an opaque one
 * is reached. Passing `skip` leaves that one element's background out of the count
 * (used for "how it looked before" with the extension's own paint excluded).
 *
 * null when the walk ends with everything still transparent; callers fall back to
 * leaving things alone. Forcing white or black without being able to measure would
 * recolor text that was perfectly readable.
 */
export const backgroundBehind = (element: Element, skip?: Element): Rgb | null => {
  /** Translucent colors found front to back. Re-composited from the back at the end */
  const stack: Rgba[] = [];

  let el: Element | null = element;
  for (let i = 0; el && i < MAX_ANCESTORS; el = el.parentElement, i++) {
    if (el === skip) continue;
    const color = parseCssColor(getComputedStyle(el).backgroundColor);
    if (color === null || color.a === 0) continue;
    if (color.a === 1) {
      // Reached an opaque color. Use it as the base and lay the remembered
      // translucent colors back over it, moving frontward
      let base: Rgb = { r: color.r, g: color.g, b: color.b };
      for (let j = stack.length - 1; j >= 0; j--) base = layer(base, stack[j]!);
      return base;
    }
    stack.push(color);
  }
  return null;
};
