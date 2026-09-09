/** The decisions behind spotting a media frame. Walking up ancestors to measure lives in `apply.ts` */
import { mediaHidden, type AppearanceNode } from '../settings/schema.ts';

/**
 * How much larger than the box the frame may be, covering its padding and borders. Larger
 * media carries larger padding, so take whichever is bigger: the ratio or the floor.
 */
export const slack = (height: number): number => Math.max(10, height * 0.05);

/**
 * Whether this ancestor still wraps the box at the same height. Allows 1px of
 * rounding below and `slack` above. Past the first ancestor outside that range
 * we are inside a container larger than the media (the cell's own layout).
 */
export const wrapsBox = (boxHeight: number, rectHeight: number): boolean =>
  rectHeight >= boxHeight - 1 && rectHeight <= boxHeight + slack(boxHeight);

/**
 * The percentage a length is built from, if it is built from one at all.
 *
 * X writes a frame's shape as a plain `56.25%` or as a `calc(79.8223% - 3.193px)`, the
 * second where the frame is a row of pictures with gaps between them — most of the frames
 * holding more than one. Both are a height that follows the width, which is all anything
 * deciding about a frame has to know; the few pixels the `calc` takes off do not change it.
 */
export const percentageIn = (value: string): number | null => {
  const found = /(-?[0-9.]+)%/.exec(value);
  const percent = found === null ? NaN : parseFloat(found[1]!);
  return percent > 0 ? percent : null;
};

/**
 * How to write a frame's own padding so that it stops at the limit, or null where there is
 * nothing to stop. What X asked for is kept whole inside the `min()`, so the browser goes
 * on resolving the percentage against the width and takes the smaller of the two, leaving a
 * picture already shorter than the limit exactly as it was. A padding written as a length
 * is a height already settled, which the stylesheet's own `max-height` holds.
 */
export const cappedPadding = (asked: string, limit: number): string | null =>
  percentageIn(asked) === null ? null : `min(${asked}, ${limit}px)`;

/**
 * Whether this element is the one setting the height. X uses `aspect-ratio` and
 * percentage `padding-bottom`. Padding must be at least half the box height:
 * counting a few px of padding would pick up containers that set nothing.
 */
export const setsHeight = (
  aspectRatio: string,
  paddingBottom: string,
  boxHeight: number
): boolean => aspectRatio !== 'auto' || parseFloat(paddingBottom) >= boxHeight * 0.5;

/**
 * Whether this column's frames want the marker. Either of two things is enough: media taken
 * off the timeline, because hiding the box alone leaves the frame holding the space, and
 * media held to a height, because the frame is what the height belongs to.
 *
 * It says nothing about how tall the picture may be drawn — a frame is marked whether the
 * picture is over the limit or under it, the limit being applied to the marked frame as a
 * cap that a shorter picture never reaches (`appearance/apply.ts`).
 */
export const marksFrames = (appearance: AppearanceNode): boolean =>
  mediaHidden(appearance.media.style) || appearance.media.maxThumbHeight !== null;
