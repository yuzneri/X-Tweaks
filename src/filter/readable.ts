/**
 * Keeps the text of a highlighted post readable on top of its background.
 * All it does is set a marker (an attribute); X's colors are untouched, and how it
 * looks lives in `styles.css`. Rather than enumerating targets it measures each
 * element that directly holds text, so it does not depend on X's selectors.
 */
import { backgroundBehind, backgroundOver, layersWithin } from '../appearance/background.ts';
import { COLUMN_ATTR } from '../appearance/css.ts';
import { fixIfWorsened, parseCssColor, BLACK, type Rgb } from '../appearance/contrast.ts';

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

/**
 * What the marker says: the colour the post was looked at under, and whether anything
 * came of it. A post that needed nothing is worth telling from one that has marks to
 * take off, so that taking them off costs nothing where there are none.
 */
const done = (color: string, marked: boolean): string => `${marked ? 'm' : 'n'}:${color}`;

export const clearReadable = (cell: Element): void => {
  const before = cell.getAttribute(FG_IN_ATTR);
  if (before === null) return;
  cell.removeAttribute(FG_IN_ATTR);
  if (before.startsWith('n')) return;
  for (const el of cell.querySelectorAll(`[${FG_ATTR}]`)) el.removeAttribute(FG_ATTR);
};

/**
 * The posts waiting to have their words looked at, and the colour each was given.
 *
 * The work is put off to the end of a round of judging rather than done where the post is
 * decided. Deciding a post writes to it — the colour, the classes — and reading a colour
 * back makes the browser work out the page's styles again before it answers. One post at
 * a time, that is a pass over the page's styles per post: measured on the real site at
 * 10ms a post, where a whole round of them costs about the same as one.
 */
const waiting = new Map<Element, string>();

export const markReadableLater = (cell: Element, color: string): void => {
  waiting.set(cell, color);
};

/**
 * Looks at every post that was waiting, and answers how many had to be worked out.
 *
 * Called once at the end of a round of judging (`filter/engine.ts`). Every post is read
 * before any of them is written to, so the round costs one pass over the page's styles
 * rather than one per post.
 */
export const markReadableWaiting = (): number => {
  if (waiting.size === 0) return 0;
  const posts = [...waiting];
  waiting.clear();

  /**
   * What is behind each scope, asked once however many of its posts are waiting.
   *
   * The walk from a post runs to the root, and above the scope it is the same walk for
   * every post in it — which is the long part of it (`layersWithin` walks the short one).
   */
  const behindScope = new Map<Element, Rgb | null>();
  const scopeOf = (cell: Element): { column: Element; behind: Rgb } | null => {
    const column = cell.closest(`[${COLUMN_ATTR}]`);
    if (column === null) return null;
    if (!behindScope.has(column)) behindScope.set(column, backgroundBehind(column));
    const behind = behindScope.get(column) ?? null;
    return behind === null ? null : { column, behind };
  };

  let worked = 0;
  const wanted: { element: Element; fg: string }[] = [];
  const marks: { cell: Element; color: string; any: boolean }[] = [];
  for (const [cell, color] of posts) {
    const already = cell.getAttribute(FG_IN_ATTR);
    // Already worked out under this colour, and what is behind a post does not move
    if (already === done(color, true) || already === done(color, false)) continue;
    worked += 1;
    clearReadable(cell);
    const found = readCell(cell, scopeOf(cell));
    if (found === null) continue;
    wanted.push(...found);
    marks.push({ cell, color, any: found.length > 0 });
  }
  for (const { element, fg } of wanted) element.setAttribute(FG_ATTR, fg);
  for (const { cell, color, any } of marks) cell.setAttribute(FG_IN_ATTR, done(color, any));
  return worked;
};

/**
 * Which words in a post want a colour of their own, and which. Reads only; the writing is
 * the caller's, so that a round of posts can be read before any of them is written to.
 * null where what is behind the post could not be measured at all.
 */
const readCell = (
  cell: Element,
  scope: { column: Element; behind: Rgb } | null
): { element: Element; fg: string }[] | null => {
  /*
   * What is behind the post, with the highlight laid on it and without it. Worked out
   * once for the post rather than once per element, and from what is behind its scope
   * rather than by walking to the root each time.
   */
  const parent = cell.parentElement;
  const behind =
    scope === null ? backgroundBehind(cell) : backgroundOver(layersWithin(cell, scope.column), scope.behind);
  const behindWithout =
    scope === null || parent === null
      ? backgroundBehind(cell, cell)
      : backgroundOver(layersWithin(parent, scope.column), scope.behind);
  if (behind === null || behindWithout === null) return null;

  const wanted: { element: Element; fg: string }[] = [];
  for (const element of wordsIn(cell)) {
    const current = parseCssColor(getComputedStyle(element).color);
    if (current === null) continue;
    /*
     * After the highlight is laid down, and before it (measured with the post's own
     * background skipped). What is between this element and the post is the same for
     * both, so it is read once and laid over each backdrop in turn
     */
    const between = layersWithin(element, cell);
    const after = backgroundOver(between, behind);
    const before = backgroundOver(between, behindWithout);
    const fg = fixIfWorsened(before, after, current);
    if (fg === null) continue;
    wanted.push({ element, fg: fg === BLACK ? 'dark' : 'light' });
  }
  return wanted;
};
