/**
 * Measures the background color actually shown on screen.
 * The extension does not know X's own colors, so instead of hard-coding a color
 * per theme it measures them from the page.
 */
import { layer, parseCssColor, type Rgb, type Rgba } from './contrast.ts';

/**
 * Which round of backdrops is current.
 *
 * What is behind a post does not change while it sits there, so a colour composited over
 * it can be kept and used again (`filter/apply.ts`). What does change it is the extension
 * painting something new — a background colour picked, a scope's rules rewritten — and
 * that is what this counts.
 */
let round = 0;

export const backdropRound = (): number => round;

/** Says that what is behind things may have changed, so nothing measured before it stands */
export const backdropsChanged = (): void => {
  round++;
};

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
      return over({ r: color.r, g: color.g, b: color.b }, stack);
    }
    stack.push(color);
  }
  return null;
};

/** Lays translucent colors, remembered front to back, over an opaque one */
const over = (base: Rgb, stack: readonly Rgba[]): Rgb => {
  let result = base;
  for (let j = stack.length - 1; j >= 0; j--) result = layer(result, stack[j]!);
  return result;
};

/**
 * The color visible behind an element, given what is already known to be behind `within`.
 *
 * The same answer as `backgroundBehind`, for an element inside something whose own
 * backdrop has been measured. Only the few layers between the two are walked, where the
 * plain walk goes up to the root every time — and a post being made readable asks this of
 * every element in it that holds words, twice over (`filter/readable.ts`).
 */
export const backgroundWithin = (element: Element, within: Element, behind: Rgb): Rgb => {
  const stack: Rgba[] = [];
  for (let el: Element | null = element; el !== null && el !== within; el = el.parentElement) {
    const color = parseCssColor(getComputedStyle(el).backgroundColor);
    if (color === null || color.a === 0) continue;
    // An opaque color below `within` hides everything above it, this one included
    if (color.a === 1) return over({ r: color.r, g: color.g, b: color.b }, stack);
    stack.push(color);
  }
  return over(behind, stack);
};
