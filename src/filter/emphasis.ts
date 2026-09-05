/**
 * Paints the emphasis on matched characters. It uses the CSS Custom Highlight API,
 * so nothing is added to the DOM. All this does is turn "positions within a string"
 * into positions in the DOM and register them.
 */
import type { Emphasis, MarkRange } from './decide.ts';
import { markTargets, ownTextNodesOf, type MarkTarget } from './post.ts';
import { backgroundBehind, backgroundWithin } from '../appearance/background.ts';
import { fixIfWorsened, layer, parseColor, parseCssColor, type Rgb } from '../appearance/contrast.ts';

const STYLE_ID = 'xpro-tweaks-mark-style';

/**
 * The names passed to `::highlight()`, one per pair of color and target text color.
 * The name is the only way to choose a color, and taking the target through a CSS
 * variable cannot express "leave the text color alone" (both `inherit` and
 * `currentColor` give the parent's color). The only way to keep the original color is
 * to write no `color` at all, hence a separate name per pair.
 */
const NAME_PREFIX = 'xpro-mark-';

/**
 * lib.dom's `Highlight` carries no set operations, so what is needed is filled in here.
 * `size` and the iterators are implemented inconsistently across browsers, so `forEach`
 * alone is used.
 */
type RangeSet = Highlight & {
  add: (range: AbstractRange) => void;
  delete: (range: AbstractRange) => boolean;
};

/**
 * The registrations per way of painting, keyed by "color × target text color" as built
 * by `styleKey`. A null target means the text color is left alone (as it was).
 */
const byStyle = new Map<string, { name: string; ranges: RangeSet; color: string; fg: string | null }>();

/** The registration key. The same color with a different target text color is a different `::highlight()` */
const styleKey = (color: string, fg: string | null): string => `${color}|${fg ?? ''}`;

/**
 * The running number in `::highlight()` names. Colors that fall out of use are
 * discarded, but their numbers are not handed out again: reusing a discarded number
 * would mix with CSS still carrying the previous color's declaration.
 */
let nextName = 1;

/** The Ranges registered per cell, so a re-judgement can remove just this cell's */
const marked = new WeakMap<Element, Array<{ key: string; range: Range }>>();

/** Does nothing in a browser without support (an environment below the minimum must not throw) */
const supported = (): boolean => typeof CSS !== 'undefined' && CSS.highlights !== undefined;

/** Colors are normalized when saved, but the shape is checked once more before writing them into CSS */
const isColor = (color: string): boolean => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color);

const writeStyles = (): void => {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.append(style);
  }
  style.textContent = Array.from(
    byStyle.values(),
    ({ name, color, fg }) =>
      // With no target color, no `color` is written. Writing none is the only way to say "as it was"
      `::highlight(${name}) { background-color: ${color};${fg === null ? '' : ` color: ${fg};`} }`
  ).join('\n');
};

const setFor = (color: string, fg: string | null): RangeSet | null => {
  const key = styleKey(color, fg);
  const known = byStyle.get(key);
  if (known) return known.ranges;
  if (!isColor(color)) return null;

  const name = `${NAME_PREFIX}${nextName++}`;
  const ranges = new Highlight() as RangeSet;
  CSS.highlights.set(name, ranges);
  byStyle.set(key, { name, ranges, color, fg });
  writeStyles();
  return ranges;
};

type Piece = { range: Range; element: Element };

/**
 * Turns the positions `[start, end)` within the whole text into Ranges, split per text
 * node. As a single Range, a span crossing plain text and a link could only carry one
 * text color. Split up, each piece is judged with its own text color and shifted
 * separately.
 */
const piecesOf = (nodes: Text[], start: number, end: number): Piece[] => {
  const pieces: Piece[] = [];
  let seen = 0;

  for (const node of nodes) {
    const length = node.data.length;
    const from = Math.max(start, seen);
    const to = Math.min(end, seen + length);
    if (from < to && node.parentElement) {
      const range = document.createRange();
      range.setStart(node, from - seen);
      range.setEnd(node, to - seen);
      pieces.push({ range, element: node.parentElement });
    }
    seen += length;
    if (seen >= end) break;
  }
  return pieces;
};

/** Whether it overlaps a range already painted. The overlapping part goes to the rule seen first */
const overlaps = (taken: MarkRange[], spot: MarkRange): boolean =>
  taken.some((other) => spot.start < other.end && other.start < spot.end);

/** Turns the places to paint into a list of pieces. Choosing where to register them is the caller's job (the target color can differ per piece) */
const markTarget = (target: MarkTarget, emphasis: Emphasis, taken: MarkRange[]): Piece[] => {
  const spots = emphasis.ranges(target.value);
  if (spots.length === 0) return [];

  // The nodes the matched string was read from. Reading all of them instead would count
  // the lines the appearance puts into a post, and shift every position by their length
  const nodes = ownTextNodesOf(target.element);
  const pieces: Piece[] = [];
  for (const spot of spots) {
    if (overlaps(taken, spot)) continue;
    const made = piecesOf(nodes, spot.start + target.offset, spot.end + target.offset);
    // A position that could not be painted does not count as taken; it is left to later rules
    if (made.length === 0) continue;
    pieces.push(...made);
    taken.push(spot);
  }
  return pieces;
};

export const unmark = (cell: Element): void => {
  const added = marked.get(cell);
  if (!added) return;
  marked.delete(cell);
  for (const { key, range } of added) byStyle.get(key)?.ranges.delete(range);
};

/**
 * Paints the matched characters, removing what was painted before re-painting.
 * Painting follows list order, and where two overlap on the same characters the rule
 * seen first takes it.
 */
export const mark = (cell: Element, emphases: Emphasis[], adjustContrast: boolean): void => {
  unmark(cell);
  if (emphases.length === 0 || !supported()) return;

  const added: Array<{ key: string; range: Range }> = [];
  /** The ranges already painted, per element. Kept to avoid overlaps */
  const taken = new Map<Element, MarkRange[]>();
  /*
   * What is behind the post, measured once. Everything painted in it sits on this, and
   * the walk up from an element runs to the root — above the post it is the same walk
   * every time (`backgroundWithin`).
   */
  const behind = adjustContrast ? backgroundBehind(cell) : null;
  /** A memo so the same element-and-color pair is not measured twice. Lives for one call only */
  const contrast = new Map<Element, Map<string, string | null>>();
  const fgFor = (element: Element, color: string): string | null => {
    if (behind === null) return null;
    const here = contrast.get(element) ?? new Map<string, string | null>();
    contrast.set(element, here);
    if (!here.has(color)) here.set(color, readableOver(element, cell, behind, color));
    return here.get(color) ?? null;
  };

  for (const emphasis of emphases) {
    for (const target of markTargets(cell, emphasis.target)) {
      const here = taken.get(target.element) ?? [];
      taken.set(target.element, here);
      for (const { range, element } of markTarget(target, emphasis, here)) {
        // Plain text and links have different colors, so the target color is decided per piece
        const fg = adjustContrast ? fgFor(element, emphasis.color) : null;
        const ranges = setFor(emphasis.color, fg);
        if (!ranges) continue;
        ranges.add(range);
        added.push({ key: styleKey(emphasis.color, fg), range });
      }
    }
  }

  if (added.length > 0) marked.set(cell, added);
};

/**
 * A color that keeps that element's text readable on top of the emphasis color, or
 * null when none is needed. The highlight is already part of what `backgroundBehind`
 * measured, so only the single layer of emphasis color is added.
 */
const readableOver = (
  element: Element,
  cell: Element,
  behindCell: Rgb,
  color: string
): string | null => {
  const behind = backgroundWithin(element, cell, behindCell);
  const emphasis = parseColor(color);
  if (emphasis === null) return null;
  const current = parseCssColor(getComputedStyle(element).color);
  // With the text color unreadable, leave it alone. Going on without anything to
  // compare against would turn a perfectly good palette white or black
  if (current === null) return null;
  // The emphasis color is not a CSS background, so the value measured by walking up is "before painting"
  return fixIfWorsened(behind, layer(behind, emphasis), current);
};

/**
 * Whether a Range has nothing left to paint. A Range follows changes in the DOM, and
 * when the text node it pointed at disappears it collapses to a position within the
 * parent and has length 0, so `isConnected` alone is not enough.
 * One that can no longer be touched counts as gone too (Firefox throws on a Range
 * pointing at a discarded node).
 */
const isGone = (range: AbstractRange): boolean => {
  try {
    return range.collapsed || !range.startContainer.isConnected;
  } catch {
    return true;
  }
};

/**
 * Discards what belonged to posts that left the screen.
 * When the virtual list removes a cell outright, `unmark` is never reached, and left
 * as they are these would keep piling up.
 */
export const sweep = (): void => {
  let dropped = false;

  for (const [key, { name, ranges }] of byStyle) {
    // Count first, then delete. Deleting during `forEach` may behave differently across implementations
    const all: AbstractRange[] = [];
    ranges.forEach((range) => all.push(range));

    let live = 0;
    for (const range of all) {
      if (isGone(range)) ranges.delete(range);
      else live++;
    }

    // A color that has fallen out of use is discarded along with its registration.
    // Left in place, they would grow every time a color is picked again.
    // A color that is only temporarily empty because its matches are off screen is
    // discarded too, but it is registered again as soon as something matches, so
    // nothing changes visibly
    if (live === 0) {
      CSS.highlights.delete(name);
      byStyle.delete(key);
      dropped = true;
    }
  }

  if (dropped) writeStyles();
};
