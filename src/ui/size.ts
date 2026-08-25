/**
 * How size input (px) is interpreted on the settings screen.
 * Like colors (`ui/color.ts`), it lives in a file without JSX so node --test can read it directly.
 */

/** The result of the interpretation. A null `size` means not set (X Pro's own) */
export type SizeInput = { size: number | null; invalid: boolean };

/**
 * Reads it as a px value. The format is decided by a regular expression before converting to
 * a number because `Number()` also accepts whitespace, `0x1f` and `1e3`.
 */
export const parseSizeInput = (text: string): SizeInput => {
  const trimmed = text.trim();
  if (!trimmed) return { size: null, invalid: false };
  if (!/^[0-9]+$/.test(trimmed)) return { size: null, invalid: true };
  const size = Number(trimmed);
  if (size <= 0) return { size: null, invalid: true };
  return { size, invalid: false };
};
