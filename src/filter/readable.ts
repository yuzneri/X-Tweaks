/**
 * Keeps the text of a highlighted post readable on top of its background.
 * All it does is set a marker (an attribute); X's colors are untouched, and how it
 * looks lives in `styles.css`. Rather than enumerating targets it measures each
 * element that directly holds text, so it does not depend on X's selectors.
 */
import { backgroundBehind, backgroundWithin } from '../appearance/background.ts';
import { fixIfWorsened, parseCssColor, BLACK } from '../appearance/contrast.ts';

/** The marker for the target color. Its value is the direction to shift in (`styles.css` holds the colors) */
export const FG_ATTR = 'data-xpro-fg';

/**
 * The elements in a post that hold words of their own.
 *
 * Found by walking the words rather than the elements. Measuring a container as well as
 * the text inside it would disagree with the color that text is actually drawn in, so
 * only these are looked at — and a post as X builds one holds a few hundred elements
 * against a few dozen runs of text, so starting from the words is the shorter walk by an
 * order of magnitude. (Measured on the real site: this pass was costing 10ms a post.)
 */
const wordsIn = (cell: Element): Element[] => {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  const found: Element[] = [];
  const seen = new Set<Element>();
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if ((node.nodeValue ?? '').trim() === '') continue;
    const element = node.parentElement;
    if (element === null || seen.has(element)) continue;
    seen.add(element);
    found.push(element);
  }
  return found;
};

/**
 * The marker on a post something of ours was written into.
 *
 * It is here so that taking those marks off again can start by asking whether there are
 * any. Searching a post for them means walking it, and a post as X builds one holds
 * hundreds of elements — asked of every post on the page every time the rules change,
 * that walk was the single heaviest thing the judging did (measured on the real site:
 * 178ms of a 198ms round, for 121 posts).
 *
 * Written on the post itself rather than remembered beside it, so that it goes wherever
 * the post goes: X hands a post's elements on to another one, and a copy carrying our
 * marks has to be found to have them taken off.
 */
const FG_IN_ATTR = 'data-xpro-fg-in';

export const clearReadable = (cell: Element): void => {
  if (!cell.hasAttribute(FG_IN_ATTR)) return;
  cell.removeAttribute(FG_IN_ATTR);
  for (const el of cell.querySelectorAll(`[${FG_ATTR}]`)) el.removeAttribute(FG_ATTR);
};

/**
 * Marks the text in a highlighted cell, only as far as needed.
 * Only text the highlight made unreadable is marked; text X shows in dim gray to begin
 * with, and elements whose color could not be read, are left alone.
 */
export const markReadable = (cell: Element): void => {
  clearReadable(cell);
  /*
   * What is behind the post, with the highlight laid on it and without it. Measured once
   * for the post rather than once per element: the walk from an element runs to the root,
   * and above the post it is the same walk every time. What each element adds of its own
   * is the few layers between it and the post (`backgroundWithin`).
   */
  const behind = backgroundBehind(cell);
  const behindWithout = backgroundBehind(cell, cell);
  if (behind === null || behindWithout === null) return;

  for (const element of wordsIn(cell)) {
    const current = parseCssColor(getComputedStyle(element).color);
    if (current === null) continue;
    // After the highlight is laid down, and before it (measured with the cell's background skipped)
    const after = backgroundWithin(element, cell, behind);
    const before = backgroundWithin(element, cell, behindWithout);
    const fg = fixIfWorsened(before, after, current);
    if (fg === null) continue;
    element.setAttribute(FG_ATTR, fg === BLACK ? 'dark' : 'light');
    cell.setAttribute(FG_IN_ATTR, '');
  }
};
