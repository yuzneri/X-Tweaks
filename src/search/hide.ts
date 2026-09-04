/**
 * Puts the posts the reader asked to leave out of sight, on the search results.
 *
 * Reading a cell is not done again here: `filter/post.ts` already reads every one of these
 * values for the filter, and reading them a second way would be two answers to the same
 * question. This turns what it read into what `exclude.ts` judges, and marks the losers.
 *
 * The mark is this feature's own rather than the filter's. A post gone from the screen
 * should always be traceable to whichever of the two took it away — the rules the reader
 * saved, or the boxes ticked in the search form for this visit alone.
 */
import { CELL_SELECTOR, readPost } from '../filter/post.ts';
import { VIEW_PREFIX, viewKeyOf } from '../surface/view.ts';
import { isExcluded, type Exclusions, type Result, type Terms } from './exclude.ts';

/** The mark on a cell this put out of sight */
export const HIDDEN = 'data-xpro-search-hidden';

/**
 * Whether the page being read is a search's results.
 *
 * These four are done to what a search returned. The form itself stands in the rail on
 * every view, so without this they would reach a home timeline as well — a second filter,
 * one that is not saved and that the settings screen cannot explain the missing posts by.
 *
 * Asked from one place so that what the form shows and what actually happens cannot come
 * to disagree: the form hides the four where this is false, and nothing is applied there.
 */
export const onSearchResults = (): boolean =>
  viewKeyOf(location.pathname, location.search)?.startsWith(`${VIEW_PREFIX}search:`) === true;

/**
 * What the judgement needs, out of what the filter already read.
 *
 * The post's own words are joined with a space: `exclude.ts` asks whether a word is in
 * them at all, and where the word falls among the elements X split the text into is not
 * something it has any use for.
 */
const resultOf = (post: {
  isRepost: boolean;
  values: { text: string[]; screenName: string[]; displayName: string[] };
}): Result => ({
  isRepost: post.isRepost,
  text: post.values.text.join(' '),
  displayName: post.values.displayName[0] ?? '',
  handle: post.values.screenName[0] ?? '',
});

/**
 * What was read out of each cell.
 *
 * The judging has to happen again on every settling — the answer changes as the boxes are
 * ticked — but the reading does not: `readPost` searches a cell a couple of dozen times
 * over, and a page of results holds hundreds of them (measured at ~20ms a settling on a
 * long page, spent reading the same posts over and over). What a post says does not change
 * while it is on screen, and a post X redraws arrives in a new element, which is not this
 * one.
 *
 * A cell that could not be read is not remembered: it may be one X is still building, and
 * the next settling has to look again.
 */
const read = new WeakMap<Element, Result>();

const resultFor = (cell: Element): Result | null => {
  const known = read.get(cell);
  if (known) return known;
  const post = readPost(cell);
  if (post === null) return null;
  const result = resultOf(post);
  read.set(cell, result);
  return result;
};

/**
 * Goes over the results and marks what should not be seen, returning how many were marked.
 *
 * Every cell is judged each time and the mark brought into line, rather than only the
 * new ones being marked: the answer changes as the reader ticks and unticks the boxes, and
 * a cell marked under the previous answer has to be let go of.
 */
export const apply = (
  exclusions: Exclusions,
  terms: Terms,
  root: ParentNode = document
): number => {
  let hidden = 0;
  for (const cell of root.querySelectorAll(CELL_SELECTOR)) {
    const result = resultFor(cell);
    // A cell with no post in it — X's own notices, the box at the head — is left alone
    const out = result !== null && isExcluded(result, exclusions, terms);
    if (out) hidden += 1;
    if (out === cell.hasAttribute(HIDDEN)) continue;
    if (out) cell.setAttribute(HIDDEN, '');
    else cell.removeAttribute(HIDDEN);
  }
  return hidden;
};

/** Lets go of every cell. Used when the form goes away, and while the extension is paused */
export const clear = (root: ParentNode = document): void => {
  root.querySelectorAll(`[${HIDDEN}]`).forEach((cell) => cell.removeAttribute(HIDDEN));
};
