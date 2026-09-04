/**
 * How long to wait before picking up the DOM's changes again.
 *
 * Split out from `engine.ts` so the decision can be read and tested without a page: it is
 * arithmetic over how long the last round took, the same split `timeline/new-posts.ts`
 * makes with `timeline/timing.ts`.
 */

/**
 * How long to wait while changes keep coming, batching them together. It turns directly
 * into the delay before a new post is collapsed, so it is as short as it can be while
 * still gathering the changes X makes in bulk.
 *
 * requestAnimationFrame is not used because it is not called in a background tab, and the
 * accumulated changes would keep growing unprocessed until the tab comes back.
 */
export const SETTLE_MS = 50;

/**
 * The longest this will ever wait.
 *
 * The wait is also how long a post that should be collapsed stays on screen, so a page
 * slow enough to reach this is being answered with "half a second late" rather than "not
 * at all". Nothing measured comes near it: a settling costs about 20ms on a deck of
 * several hundred posts with every setting turned on.
 */
export const MAX_SETTLE_MS = 500;

/**
 * How much of the time the extension may take for itself. A round costing 20ms is
 * followed by 100ms of waiting, so four fifths of the time belongs to the page.
 */
const SHARE = 0.2;

/**
 * How long to wait after a round that took `took` ms.
 *
 * The point is a page that cannot be typed in. X rewrites the DOM continuously, so the
 * waiting is what decides how often a round runs at all — with a fixed wait, a round
 * costing more than the wait leaves nothing for the browser to draw or listen with, and
 * the tab stops answering. Tying the wait to what the last round cost holds the extension
 * to its share of the time whatever the page turns out to hold.
 *
 * The last round alone, not an average: it climbs down as readily as it climbs up, so a
 * page that grew heavy while scrolling and then settled is back to `SETTLE_MS` on the
 * next round rather than staying slow for the rest of the visit.
 */
export const nextWait = (took: number): number =>
  Math.min(MAX_SETTLE_MS, Math.max(SETTLE_MS, Math.round(took / SHARE)));
