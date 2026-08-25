/**
 * How color input is interpreted on the settings screen.
 * It lives in a file without JSX because `node --test` cannot transform JSX.
 */
import { HEX_COLOR_PATTERN } from '../settings/schema.ts';

/**
 * The result of the interpretation. It carries no messages: the explanatory text
 * changes with the language, so the side that shows it (the settings screen) takes it
 * from the dictionaries.
 */
export type ColorInput = { color: string | null; invalid: boolean };

/**
 * Normalizes to the form `#rrggbb` or `#rrggbbaa`.
 * An empty box means "use the default color", so it passes through as no color (null).
 * The leading `#` may be omitted, which saves adding or removing it when pasting a color
 * code from elsewhere.
 */
export const parseColorInput = (text: string): ColorInput => {
  const trimmed = text.trim();
  if (!trimmed) return { color: null, invalid: false };
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_PATTERN.test(withHash)) return { color: null, invalid: true };
  return { color: withHash.toLowerCase(), invalid: false };
};
