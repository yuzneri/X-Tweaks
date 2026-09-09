/**
 * When to go at the offer X floats over the timeline, and what to try when going. Split out
 * from `new-posts.ts` so the decision can be read and tested without a page: everything here
 * is arithmetic over what was already tried and how long ago, the same split `compose/keep.ts`
 * makes with `compose/signal.ts`. The DOM, the clock and the pressing stay on the other side.
 */

/**
 * How far down the timeline still counts as being at the top. Pressing the button does not
 * only load: it moves to the posts it loaded, and a reader further down would be pulled away
 * from the post they were on, which is worse than the wait this is meant to save. So it is
 * pressed only where the move costs nothing, and left alone otherwise — the button stays,
 * and pressing it by hand still works.
 */
const AT_TOP_PX = 200;

export const atTop = (scrollY: number): boolean => scrollY <= AT_TOP_PX;

/**
 * How long to leave a standing offer alone before going at it again.
 *
 * There is no telling from here whether a press worked; the offer still standing means
 * either that the press did nothing or that X has already put the next batch behind the same
 * button. Both are answered by going again, and the wait keeps that from becoming a stream
 * of presses — at worst one every few seconds, slower than X gathers new posts anyway.
 *
 * A floor on the interval rather than a beat: the question is asked whenever the page
 * settles, so a page that stops changing is not gone at again until it moves, which on x.com
 * is not a state worth designing around, the timeline being what changes. Waiting for the
 * offer to disappear instead does not work: whatever X does to the button between batches is
 * not something this can see, so the first batch would be taken and every batch after it
 * ignored.
 */
export const RETRY_MS = 4000;

/**
 * What to do about an offer that is standing. `later` and `wait` both mean "not now", and
 * are told apart because only one of them is worth saying out loud: `later` is the reader
 * being somewhere else on the page, `wait` is this having just gone and holding off.
 */
export type Go = 'later' | 'wait' | 'press' | 'period';

/**
 * Given what has been tried at the offer now standing, what to try next. `goes` counts what
 * has already been done, so the second go is the one taken while it still reads 1; that
 * second go is the only one that tries the key rather than the button, on the chance that
 * what X listens for is the key it names on the button itself.
 */
export const nextGo = (
  tried: { goes: number; lastGo: number },
  now: number,
  reading: { scrollY: number }
): Go => {
  if (!atTop(reading.scrollY)) return 'later';
  if (tried.goes > 0 && now - tried.lastGo < RETRY_MS) return 'wait';
  return tried.goes === 1 ? 'period' : 'press';
};
