/**
 * Keeps the text of a highlighted post readable on its background, by setting a marker (an
 * attribute): X's colors are untouched, the look lives in `styles.css`. Measuring each
 * element that directly holds text, rather than enumerating targets, keeps it off X's
 * selectors.
 */
import {
  backgroundBehind,
  backgroundOver,
  layersWithin,
  type Within,
} from '../appearance/background.ts';
import { COLUMN_ATTR } from '../appearance/css.ts';
import { fixIfWorsened, parseCssColor, BLACK, type Rgb } from '../appearance/contrast.ts';

/** The marker for the target color. Its value is the direction to shift in (`styles.css` holds the colors) */
export const FG_ATTR = 'data-xpro-fg';

/**
 * The elements in a post that hold words of their own, found by walking the words rather
 * than the elements. Measuring a container as well as its text would disagree with the
 * colour that text is drawn in — and a post as X builds one holds a few hundred elements
 * against a few dozen runs of text.
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
 * The marker on a post that something of ours was written into it, so removing marks can
 * start by asking whether there are any. Searching a post for them means walking it, and a
 * post as X builds one holds hundreds of elements — asked of every post on every rule change,
 * that walk was the single heaviest thing the judging did. Written on the post itself, not
 * beside it: X hands a post's elements to another, and a copy carrying our marks has to be
 * found to have them removed.
 */
const FG_IN_ATTR = 'data-xpro-fg-in';

/**
 * What the marker says: what the post was looked at under, and whether anything came of it —
 * telling a post that needed nothing apart from one with marks to remove. "Looked at under"
 * means the highlight colour *and* the colour behind the scope, the contrast between them,
 * either able to move alone: the backdrop moves untouched by us, when the reader changes our
 * colours or X switches theme. A marker naming the highlight alone would keep matching,
 * leaving posts read against a background no longer there.
 */
const done = (color: string, behind: string, marked: boolean): string =>
  `${marked ? 'm' : 'n'}:${color}:${behind}`;

/**
 * The backdrop as the marker names it. An unmeasurable scope is named as such rather than
 * left out: the post is still read (its own walk to the root, `readCell`) and the answer
 * kept — just not told apart from the next unmeasurable one.
 */
const under = (behind: Rgb | null): string =>
  behind === null ? '?' : `${behind.r},${behind.g},${behind.b}`;

export const clearReadable = (cell: Element): void => {
  const before = cell.getAttribute(FG_IN_ATTR);
  if (before === null) return;
  cell.removeAttribute(FG_IN_ATTR);
  if (before.startsWith('n')) return;
  for (const el of cell.querySelectorAll(`[${FG_ATTR}]`)) el.removeAttribute(FG_ATTR);
};

/**
 * The posts waiting to have their words looked at, and the colour each was given. Put off to
 * the end of a round rather than done where the post is decided: deciding a post writes to
 * it — the colour, the classes — and reading a colour back makes the browser rework the
 * page's styles before answering. One post at a time costs a styles pass each; a whole round
 * costs about the same as one.
 */
const waiting = new Map<Element, string>();

export const markReadableLater = (cell: Element, color: string): void => {
  waiting.set(cell, color);
};

/** Whether any post is waiting for its words, asked before a round decides to read the page */
export const wordsWaiting = (): boolean => waiting.size > 0;

/**
 * Looks at every post that was waiting, and answers how many had to be worked out. Called
 * once at the end of a round of judging (`filter/engine.ts`): every post is read before any
 * is written to, costing one styles pass per round rather than one per post.
 */
export const markReadableWaiting = (): number => {
  if (waiting.size === 0) return 0;
  const posts = [...waiting];
  waiting.clear();

  /**
   * What is behind each scope, asked once however many of its posts are waiting. The walk from
   * a post runs to the root, and above the scope it is the same for every post in it — the
   * expensive part (`layersWithin` walks the short remainder).
   */
  const behindScope = new Map<Element, Rgb | null>();
  const scopeOf = (cell: Element): { column: Element; behind: Rgb } | null => {
    const column = cell.closest(`[${COLUMN_ATTR}]`);
    if (column === null) return null;
    if (!behindScope.has(column)) behindScope.set(column, backgroundBehind(column));
    const behind = behindScope.get(column) ?? null;
    return behind === null ? null : { column, behind };
  };

  /**
   * What was found between an element and its scope, per column. Shared across the posts in
   * that column on purpose: what lies between a post and the column is the containers X wraps
   * its timeline in, the same for every post in it, so it is read once here rather than once
   * per post — and a post's two readings (with the highlight and without) walk the same
   * containers, so the second is answered from the first.
   */
  const withinScope = new Map<Element, Map<Element, Within>>();
  const seenIn = (column: Element): Map<Element, Within> => {
    const known = withinScope.get(column);
    if (known) return known;
    const fresh = new Map<Element, Within>();
    withinScope.set(column, fresh);
    return fresh;
  };

  let worked = 0;
  const wanted: { element: Element; fg: string }[] = [];
  const marks: { cell: Element; color: string; behind: string; any: boolean }[] = [];
  /** The posts this round has to look at, and what each is judged against */
  const toRead: {
    cell: Element;
    color: string;
    behind: string;
    scope: { column: Element; behind: Rgb } | null;
  }[] = [];
  for (const [cell, color] of posts) {
    /*
     * What is behind the scope is asked first, being half the marker: one reading per scope
     * however many posts are waiting, in a quiet moment where reading the page costs nothing
     * (`quiet.ts`).
     */
    const scope = scopeOf(cell);
    const behind = under(scope === null ? null : scope.behind);
    const already = cell.getAttribute(FG_IN_ATTR);
    // Already worked out, under this colour and over this backdrop
    if (already === done(color, behind, true) || already === done(color, behind, false)) continue;
    worked += 1;
    toRead.push({ cell, color, behind, scope });
  }
  /*
   * Every post's own colours come off before any of them is read: a write between two reads
   * makes the browser rework the page's styles to answer the second — the very thing this
   * round was put off to avoid.
   */
  for (const { cell } of toRead) clearReadable(cell);
  for (const { cell, color, behind, scope } of toRead) {
    const found = readCell(cell, scope, scope === null ? null : seenIn(scope.column));
    if (found === null) continue;
    wanted.push(...found);
    marks.push({ cell, color, behind, any: found.length > 0 });
  }
  for (const { element, fg } of wanted) element.setAttribute(FG_ATTR, fg);
  for (const { cell, color, behind, any } of marks) {
    cell.setAttribute(FG_IN_ATTR, done(color, behind, any));
  }
  return worked;
};

/**
 * Which words in a post want a colour of their own, and which. Reads only — writing is the
 * caller's, so a round of posts can be read before any is written to. null where what is
 * behind the post cannot be measured at all.
 */
const readCell = (
  cell: Element,
  scope: { column: Element; behind: Rgb } | null,
  inScope: Map<Element, Within> | null
): { element: Element; fg: string }[] | null => {
  /*
   * What is behind the post, with the highlight laid on and without. Worked out once per post
   * rather than once per element, from what is behind its scope rather than walking to the
   * root each time.
   */
  const parent = cell.parentElement;
  const behind =
    scope === null
      ? backgroundBehind(cell)
      : backgroundOver(layersWithin(cell, scope.column, inScope ?? undefined), scope.behind);
  const behindWithout =
    scope === null || parent === null
      ? backgroundBehind(cell, cell)
      : backgroundOver(layersWithin(parent, scope.column, inScope ?? undefined), scope.behind);
  if (behind === null || behindWithout === null) return null;

  const wanted: { element: Element; fg: string }[] = [];
  /**
   * What was found between an element and the post, per element on the way. A post's words
   * sit under the same handful of containers, and reading those back once each rather than
   * once per word is most of what this pass costs (`appearance/background.ts`)
   */
  const seen = new Map<Element, Within>();
  for (const element of wordsIn(cell)) {
    const current = parseCssColor(getComputedStyle(element).color);
    if (current === null) continue;
    /*
     * After the highlight is laid down, and before it (measured with the post's own
     * background skipped). What is between this element and the post is the same for both,
     * so it is read once and laid over each backdrop in turn
     */
    const between = layersWithin(element, cell, seen);
    const after = backgroundOver(between, behind);
    const before = backgroundOver(between, behindWithout);
    const fg = fixIfWorsened(before, after, current);
    if (fg === null) continue;
    wanted.push({ element, fg: fg === BLACK ? 'dark' : 'light' });
  }
  return wanted;
};
