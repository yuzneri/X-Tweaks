/**
 * Judges whether text stays readable on top of a painted color, and picks a color to shift
 * it toward when it does not. Translucent colors are always composited onto their backdrop
 * before judging, which is also why `contrast-color()` is not used: it does not do that.
 */
import { HEX_COLOR_PATTERN } from '../settings/schema.ts';

export type Rgb = { r: number; g: number; b: number };
/** A specified color. `a` is 0..1 */
export type Rgba = Rgb & { a: number };

export const WHITE = '#ffffff';
export const BLACK = '#000000';

/**
 * Fall below this ratio and the text counts as unreadable. 3:1 rather than the WCAG AA
 * body-text threshold (4.5:1): X's own dim text only reaches 4.58:1 on black, so drawing
 * the line at 4.5 would break it the moment the default highlight (15%) is laid down,
 * changing the color of @IDs and timestamps. Recoloring is a visible change too, so limit
 * it to text that is plainly unreadable.
 */
export const MIN_CONTRAST = 3;

/** Reads `#rrggbb` / `#rrggbbaa`. null when unreadable (callers fall back to leaving it alone) */
export const parseColor = (color: string): Rgba | null => {
  if (!HEX_COLOR_PATTERN.test(color)) return null;
  const hex = color.slice(1);
  const at = (i: number): number => parseInt(hex.slice(i, i + 2), 16);
  return {
    r: at(0),
    g: at(2),
    b: at(4),
    a: hex.length === 8 ? at(6) / 255 : 1,
  };
};

/**
 * Reads the colors `getComputedStyle` returns (`rgb()` / `rgba()`). null when unreadable.
 * The newer notations (`color(srgb …)`, `oklch()`) are not read: failing to read
 * only falls back to leaving things alone, so add them here if X starts using them.
 */
export const parseCssColor = (color: string): Rgba | null => {
  const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(
    color.trim()
  );
  if (!match) return null;
  const [r, g, b] = [match[1]!, match[2]!, match[3]!].map(Number) as [number, number, number];
  const raw = match[4];
  const a = raw === undefined ? 1 : raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
  if ([r, g, b, a].some((v) => !Number.isFinite(v))) return null;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: Math.min(Math.max(a, 0), 1) };
};

/**
 * Lays a color over a backdrop (alpha compositing). The backdrop is taken as opaque; called
 * in painting order, this also expresses the three layers background → highlight → emphasis.
 */
export const layer = (base: Rgb, over: Rgba): Rgb => {
  const mix = (b: number, o: number): number => Math.round(b * (1 - over.a) + o * over.a);
  return { r: mix(base.r, over.r), g: mix(base.g, over.g), b: mix(base.b, over.b) };
};

export const luminance = ({ r, g, b }: Rgb): number => {
  const channel = (value: number): number => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** Contrast ratio (1..21). Order does not matter */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
};

/**
 * A text color readable on that background, or null when the current one suffices.
 *
 * What gets judged is the text color currently in effect, a color set by a tier and one X
 * applies alike, composited onto the background first where it is translucent. An unknown
 * text color (null) has nothing to compare against, so a target is always returned; falling
 * back to leaving it alone is the caller's decision.
 *
 * The target is whichever of white or black has the greater contrast. Neither falling short
 * cannot happen: the minimum is the point where both ratios are equal, and even there it is
 * 4.58:1.
 */
export const readableTextColor = (background: Rgb, current: Rgba | null): string | null => {
  const shown = current === null ? null : layer(background, current);
  if (shown !== null && contrastRatio(background, shown) >= MIN_CONTRAST) return null;
  const white = contrastRatio(background, { r: 255, g: 255, b: 255 });
  const black = contrastRatio(background, { r: 0, g: 0, b: 0 });
  return white >= black ? WHITE : BLACK;
};

/**
 * Returns a target color only for text the extension's own painting made unreadable.
 * `before` is the background before painting, `after` the one after; text that was
 * already short of the threshold is left alone. Fixing text X itself shows dimly
 * would overstep what the extension is for.
 */
export const fixIfWorsened = (before: Rgb, after: Rgb, current: Rgba): string | null => {
  if (readableTextColor(before, current) !== null) return null;
  return readableTextColor(after, current);
};
