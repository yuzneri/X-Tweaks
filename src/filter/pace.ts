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

/**
 * How long to leave between applying one change to the settings and the next.
 *
 * The settings screen saves on every keystroke and on every step of a colour picker, and
 * every save comes back to the page as a change to apply — which means judging every post
 * on it again, and rebuilding what the appearance marks. Typed at speed, that is a stall
 * per character in the very page the screen is standing on.
 *
 * The first change of a burst is applied at once, so the screen answers as it is used;
 * the ones that follow within this window are gathered up, and the last of them is applied
 * when it closes. What is applied is always the whole of the settings, so nothing is lost
 * by skipping the ones in between.
 */
export const APPLY_MS = 200;

/**
 * When to apply a change that arrived at `now`, given when one was last applied.
 * `0` means "now"; anything else is how long to wait.
 */
export const applyIn = (now: number, lastApply: number): number =>
  Math.max(0, APPLY_MS - (now - lastApply));

/**
 * The shortest a round of measuring may leave before the next one.
 *
 * Reading a height back makes the browser lay the page out then and there, and on a real
 * timeline that one reading costs what a whole layout costs — measured on x.com at
 * anywhere from 40ms to 200ms, for a single picture. What it answers is worth having, but
 * not at any price and not on every settling.
 */
export const MEASURE_MS = 400;

/** However slow the page turns out to be, a new picture is capped within this */
export const MEASURE_MAX_MS = 3000;

/**
 * How long to leave before measuring again, given what the last round of it cost.
 *
 * The same arithmetic as `nextWait`, and for the same reason: the page keeps the greater
 * share of the time whatever it turns out to hold. A page where measuring is cheap is
 * measured often; one where it costs a fifth of a second is measured a few times a
 * minute, and what waits for it is a picture keeping its full height a moment longer.
 */
export const measureAgainIn = (took: number): number =>
  Math.min(MEASURE_MAX_MS, Math.max(MEASURE_MS, Math.round(took / SHARE)));
