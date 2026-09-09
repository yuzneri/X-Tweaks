/**
 * How long to wait before picking up the DOM's changes again. Split out from `engine.ts` so
 * the decision can be read and tested without a page — it is arithmetic over how long the
 * last round took, the same split `timeline/new-posts.ts` makes with `timeline/timing.ts`.
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
 * at all".
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
 * X rewrites the DOM continuously, so the waiting decides how often a round runs at all:
 * with a fixed wait, a round costing more than it leaves nothing for the browser to draw or
 * listen with. Tying the wait to the last round holds the extension to its share of the
 * time whatever the page turns out to hold.
 *
 * The last round alone, not an average: it climbs down as readily as up, so a page that
 * grew heavy while scrolling and then settled is back to `SETTLE_MS` on the next round.
 */
export const nextWait = (took: number): number =>
  Math.min(MAX_SETTLE_MS, Math.max(SETTLE_MS, Math.round(took / SHARE)));

/**
 * How long to leave between applying one change to the settings and the next.
 *
 * The screen saves on every keystroke and every step of a colour picker, and every save
 * judges every post again and rebuilds what the appearance marks — a stall per character in
 * the page the screen is standing on. The first change of a burst goes in at once and the
 * rest are gathered up; what is applied is the whole of the settings, so nothing is lost by
 * skipping the ones between.
 */
export const APPLY_MS = 200;

/**
 * When to apply a change that arrived at `now`. `0` means now, anything else is the wait.
 *
 * Never longer than the gap itself: a reading from before the last one says the clock moved
 * — a machine waking from sleep, a correction from the network — and the difference would
 * otherwise become the wait.
 */
export const applyIn = (now: number, lastApply: number): number =>
  Math.min(APPLY_MS, Math.max(0, APPLY_MS - (now - lastApply)));

/**
 * The shortest a round of measuring may leave before the next one.
 *
 * Reading a height back makes the browser lay the page out then and there, and on a real
 * timeline that one reading costs what a whole layout costs. What it answers is worth
 * having, but not at any price and not on every settling.
 * not at any price and not on every settling.
 */
export const MEASURE_MS = 400;

/** However slow the page turns out to be, a new picture is capped within this */
export const MEASURE_MAX_MS = 3000;

/**
 * How much of the time measuring may take, which is half of what the judging may.
 *
 * Its rounds are the long ones — most of a round is the browser working out a page X had
 * written to — long enough that the page cannot answer for several frames of it.
 * frames the page cannot answer in. What waits on it is a picture keeping its full height
 * and a "show more" arriving, half a second later at worst; what waits on a settling is
 * whether a post is shown at all, which is why that one keeps the larger share.
 */
const MEASURE_SHARE = 0.1;

/**
 * How long to leave before measuring again, given what the last round of it cost.
 *
 * The same arithmetic as `nextWait`: the page keeps the greater share of the time whatever
 * it turns out to hold. A page where measuring is cheap is measured often; one where it
 * costs a fifth of a second is measured a few times a minute.
 */
export const measureAgainIn = (took: number): number =>
  Math.min(MEASURE_MAX_MS, Math.max(MEASURE_MS, Math.round(took / MEASURE_SHARE)));
