/**
 * Keeps the text of a highlighted post readable on top of its background.
 * All it does is set a marker (an attribute); X's colors are untouched, and how it
 * looks lives in `styles.css`. Rather than enumerating targets it measures each
 * element that directly holds text, so it does not depend on X's selectors.
 */
import { backgroundBehind } from '../appearance/background.ts';
import { fixIfWorsened, parseCssColor, BLACK } from '../appearance/contrast.ts';

/** The marker for the target color. Its value is the direction to shift in (`styles.css` holds the colors) */
export const FG_ATTR = 'data-xpro-fg';

/** Whether the element holds text of its own. Measuring containers too would disagree with the color of the text inside */
const hasOwnText = (element: Element): boolean => {
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && (node.nodeValue ?? '').trim() !== '') return true;
  }
  return false;
};

export const clearReadable = (cell: Element): void => {
  for (const el of cell.querySelectorAll(`[${FG_ATTR}]`)) el.removeAttribute(FG_ATTR);
};

/**
 * Marks the text in a highlighted cell, only as far as needed.
 * Only text the highlight made unreadable is marked; text X shows in dim gray to begin
 * with, and elements whose color could not be read, are left alone.
 */
export const markReadable = (cell: Element): void => {
  clearReadable(cell);
  for (const element of cell.querySelectorAll('*')) {
    if (!hasOwnText(element)) continue;
    const current = parseCssColor(getComputedStyle(element).color);
    if (current === null) continue;
    // After the highlight is laid down, and before it (measured with the cell's background skipped)
    const after = backgroundBehind(element);
    const before = backgroundBehind(element, cell);
    if (after === null || before === null) continue;
    const fg = fixIfWorsened(before, after, current);
    if (fg === null) continue;
    element.setAttribute(FG_ATTR, fg === BLACK ? 'dark' : 'light');
  }
};
