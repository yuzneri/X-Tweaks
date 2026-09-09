/**
 * Measures the background color actually shown on screen. The extension does not know X's
 * own colors, so instead of hard-coding one per theme it reads them off the page.
 */
import { layer, parseCssColor, type Rgb, type Rgba } from './contrast.ts';


/** Limit on how far to walk up. A page that reaches no opaque color within it counts as unmeasurable */
const MAX_ANCESTORS = 40;

/**
 * The color visible behind an element. Walks up the ancestors remembering translucent
 * backgrounds, then re-composites them frontward once an opaque one is reached. `skip`
 * leaves that one element's background out of the count (used for "how it looked before",
 * with the extension's own paint excluded).
 *
 * null when the walk ends with everything still transparent; callers fall back to leaving
 * things alone, since forcing white or black without being able to measure would recolor
 * text that was perfectly readable.
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
      // Reached an opaque color: it is the base, and the remembered ones go back over it
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
 * What lies between an element and something it sits inside: either a colour that hides
 * everything above it, or the translucent layers to lay over whatever is behind that
 * container.
 *
 * Read once for both answers a highlighted post needs, with the highlight and without: the
 * two differ only in what is behind the post, never in what is inside it
 * (`filter/readable.ts`).
 *
 * `seen` remembers each element's answer on the way up, so a second element under the same
 * containers stops at the first one already answered for: every word in a post shares most
 * of its walk, and reading a colour back out of the page is the dear part. The map must not
 * outlive the round — it is what the page looks like now, not a fact about the elements.
 */
export type Within = { opaque: Rgb } | { layers: Rgba[] };

export const layersWithin = (
  element: Element,
  within: Element,
  seen?: Map<Element, Within>
): Within => {
  const known = seen?.get(element);
  if (known) return known;
  if (element === within || element.parentElement === null) return { layers: [] };

  const color = parseCssColor(getComputedStyle(element).backgroundColor);
  const above = layersWithin(element.parentElement, within, seen);
  const found = color === null || color.a === 0 ? above : laidOver(color, above);
  seen?.set(element, found);
  return found;
};

/** One colour in front of what was found above it */
const laidOver = (color: Rgba, above: Within): Within => {
  // An opaque color below `within` hides everything above it, that one alone decides
  if (color.a === 1) return { opaque: { r: color.r, g: color.g, b: color.b } };
  if ('opaque' in above) return { opaque: layer(above.opaque, color) };
  return { layers: [color, ...above.layers] };
};

/** What such a reading means over a given backdrop */
export const backgroundOver = (found: Within, behind: Rgb): Rgb =>
  'opaque' in found ? found.opaque : over(behind, found.layers);

/**
 * The color visible behind an element, given what is already known to be behind `within`.
 * The same answer as `backgroundBehind`, walking only what lies between the two.
 */
export const backgroundWithin = (element: Element, within: Element, behind: Rgb): Rgb =>
  backgroundOver(layersWithin(element, within), behind);
