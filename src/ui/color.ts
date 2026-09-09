/** How color input is read on the settings screen. It holds no JSX because `node --test` cannot transform it */
import { HEX_COLOR_PATTERN } from '../settings/schema.ts';

/**
 * The result. It carries no messages: the explanatory text changes with the language, so the
 * settings screen takes it from the dictionaries.
 */
export type ColorInput = { color: string | null; invalid: boolean };

/**
 * Normalizes to `#rrggbb` or `#rrggbbaa`. An empty box means "use the default color", so it
 * passes through as null. The leading `#` may be omitted, which saves editing a pasted color code.
 */
export const parseColorInput = (text: string): ColorInput => {
  const trimmed = text.trim();
  if (!trimmed) return { color: null, invalid: false };
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_PATTERN.test(withHash)) return { color: null, invalid: true };
  return { color: withHash.toLowerCase(), invalid: false };
};
