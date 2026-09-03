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
 * Goes over the results and marks what should not be seen, returning how many were marked.
 *
 * Every cell is looked at each time and the mark brought into line, rather than only the
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
    const post = readPost(cell);
    // A cell with no post in it — X's own notices, the box at the head — is left alone
    const out = post !== null && isExcluded(resultOf(post), exclusions, terms);
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
