/** The decisions behind spotting a media frame. Walking up ancestors to measure lives in `apply.ts` */
import { mediaHidden, type AppearanceNode } from '../settings/schema.ts';

/**
 * How much larger than the box the frame is allowed to be, covering its padding
 * and borders. Larger media carries larger padding, so take whichever is bigger:
 * the ratio or the floor.
 */
export const slack = (height: number): number => Math.max(10, height * 0.05);

/**
 * Whether this media needs the frame marker. `height` gets applied to the frame,
 * so marking one shorter than the limit would stretch it out.
 * Height 0 means "not drawn yet", which is not marked either.
 */
export const needsFrame = (boxHeight: number, limit: number): boolean =>
  boxHeight > 0 && boxHeight > limit;

/**
 * Whether this ancestor still wraps the box at the same height. Allows 1px of
 * rounding below and `slack` above. Past the first ancestor outside that range
 * we are inside a container larger than the media (the cell's own layout).
 */
export const wrapsBox = (boxHeight: number, rectHeight: number): boolean =>
  rectHeight >= boxHeight - 1 && rectHeight <= boxHeight + slack(boxHeight);

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
 * The height threshold for marking frames, derived from that column's appearance;
 * null when no marker is needed. With media hidden, every media frame needs the
 * marker: hiding only the box leaves the frame taking up space, so an empty frame remains.
 */
export const limitFor = (appearance: AppearanceNode): number | null =>
  mediaHidden(appearance.media.style) ? 0 : appearance.media.maxThumbHeight;
