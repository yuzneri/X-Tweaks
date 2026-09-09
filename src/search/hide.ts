/**
 * Puts the posts the reader asked to leave out of sight, on the search results.
 *
 * Cells are not read again here: `filter/post.ts` already reads every one of these values
 * for the filter, and reading them a second way would be two answers to one question. This
 * turns what it read into what `exclude.ts` judges, and marks the losers. The mark is this
 * feature's own rather than the filter's, so a post gone from the screen is traceable to
 * whichever of the two took it away — the rules the reader saved, or the boxes ticked in
 * the search form for this visit alone.
 */
import { CELL_SELECTOR, readPost } from '../filter/post.ts';
import type { Post } from '../filter/decide.ts';
import { VIEW_PREFIX, viewKeyOf } from '../surface/view.ts';
import { isExcluded, type Exclusions, type Result, type Terms } from './exclude.ts';

/** The mark on a cell this put out of sight */
export const HIDDEN = 'data-xpro-search-hidden';

/**
 * Whether the page being read is a search's results. The four are done to what a search
 * returned, and the form stands in the rail on every view, so without this they would reach
 * a home timeline as well — a second filter, one that is not saved and whose missing posts
 * the settings screen cannot explain. Asked from one place so that what the form shows and
 * what actually happens cannot disagree: the form hides the four where this is false, and
 * nothing is applied there.
 */
export const onSearchResults = (): boolean =>
  viewKeyOf(location.pathname, location.search)?.startsWith(`${VIEW_PREFIX}search:`) === true;

/**
 * What the judgement needs, out of what the filter already read. The post's own words are
 * joined with a space: `exclude.ts` asks whether a word is in them at all, and where the
 * word falls among the elements X split the text into is of no use to it.
 */
const resultOf = (post: Post): Result => ({
  isRepost: post.isRepost,
  text: post.values.text.join(' '),
  displayName: post.values.displayName[0] ?? '',
  handle: post.values.screenName[0] ?? '',
  /*
   * The hashtags are counted rather than looked for in the words. What is counted is what X
   * itself marked as a tag (`filter/post.ts`), so a `#` that X does not treat as one —
   * `C#`, a `#1` counting something, the fragment on the end of an address, a `#` written
   * tight against something else as in `【#C106 …】` — is not one here either. Agreeing with
   * the site is the whole point of the boundary: X neither links those nor finds them by
   * searching for the tag (checked against X's own search, 2026-09-04).
   */
  counts: {
    hashtag: post.counts.hashtag,
    reply: post.counts.reply,
    repost: post.counts.repost,
    like: post.counts.like,
    view: post.counts.view,
  },
});

/**
 * What was read out of each cell. The judging has to happen again on every settling — the
 * answer changes as the boxes are ticked — but the reading does not: `readPost` searches a
 * cell a couple of dozen times over, and a page of results holds hundreds of them. What a
 * post says does not change while it is on screen, and a post X redraws arrives in a new
 * element, which is not this one. A cell that could not be read is not remembered: it may
 * be one X is still building, and the next settling has to look again.
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
 * Every cell is judged each time and the mark brought into line, rather than only the new
 * ones being marked: the answer changes as the reader ticks and unticks the boxes, and a
 * cell marked under the previous answer has to be let go of.
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
