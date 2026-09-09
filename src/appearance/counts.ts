/**
 * Showing a reaction count as the number it is.
 *
 * X rounds the big ones off — 221250 views shown as "22万", "221.3K" — while the full number
 * stays in the button's label (`filter/post.ts` reads it for the rules). This works out what
 * to show; `appearance/apply.ts` writes it into a copy of X's own element (`COUNT_CLASS`).
 */

/**
 * The number written out, in groups of three digits ("221,250").
 *
 * The comma is X's own: below the point where it starts rounding, X writes "2,161" itself.
 * Both languages the extension speaks group the same way, so the separator is written here
 * rather than taken from the locale, matching what X puts beside it on untouched posts.
 */
export const groupDigits = (count: number): string =>
  String(count).replace(/\B(?=(\d{3})+$)/g, ',');

/**
 * What to put in place of the text X shows, or null to leave the post alone.
 *
 * Nothing is done unless X has actually rounded something off. A count that could not be
 * read has nothing to put there. Where X shows nothing at all (nobody has liked it),
 * nothing is added: a timeline of posts newly reading "0" is not what "show me the number"
 * asks for. Where what X shows already holds the whole number ("317", "2,161"), the post is
 * left as it is, which keeps the marker off the great majority of posts.
 *
 * That last one compares the digits rather than the strings: what X puts between the groups
 * is its own interface language's ("3.400" in German, "3 400" in French), and a count
 * written out in full has nothing to correct however it is grouped — replacing it would put
 * commas through a timeline that never uses them.
 */
export const rawCountFor = (shown: string, count: number | null): string | null => {
  if (count === null) return null;
  const trimmed = shown.trim();
  if (trimmed === '') return null;
  if (trimmed.replace(/\D/g, '') === String(count)) return null;
  return groupDigits(count);
};
