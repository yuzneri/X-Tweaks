/**
 * Telling a description someone wrote for a picture from X's own word for one.
 *
 * X gives every photo an `alt`. Where nobody wrote a description it puts its own word there
 * instead — 「画像」, "Image", "Bild" — and that word is the interface language's, not the
 * extension's, so it cannot be listed here and compared against.
 *
 * Three things have to hold at once. It is one line: X's word is a word, and a description
 * running to a second line is somebody's writing. It is short (see `LONGEST_GENERIC`). And
 * it turns up on two different people's pictures: X's word is on every post whose pictures
 * nobody described, so it crosses accounts at once, while a description belongs to whoever
 * wrote it.
 *
 * That last one is what the other two support. Counting by account, rather than by post or
 * by picture, is what keeps somebody's own writing out: the same post stands in several
 * columns of a deck at once, and one person may repeat a description across their own posts,
 * a shop listing the same goods among them.
 */

/** One picture on screen: what its `alt` says, and whose post it is on */
export type PhotoAlt = { alt: string; account: string | null };

/**
 * How long X's own word may be.
 *
 * Set from the gap between the two, as far as the pages read so far show it. X's words came
 * to 2 and 6 characters (「画像」 and 「埋め込み動画」, the only interface language seen). Of
 * 26 descriptions people had written, 24 ran to more than one line and are turned away for
 * that alone; the two that did not were 22 and 907 characters. So the room between them is
 * 6 and 22, and this sits inside it with something to spare on either side: enough for a
 * language needing more words than Japanese for "embedded video", and short of the shortest
 * thing anybody was seen to write.
 *
 * A word longer than this in some other language would never be learned. That costs the
 * tooltip on pictures nobody described — X's word shown as if it were a description — and
 * is answered by writing the word into the settings by hand, which is why that box exists.
 */
const LONGEST_GENERIC = 20;

/** Whether a text has the shape of X's own word, before looking at whose pictures carry it */
const couldBeGeneric = (alt: string): boolean =>
  !alt.includes('\n') && alt.length <= LONGEST_GENERIC;

/**
 * X's own words, as far as the page has shown them: what was known already plus what this
 * pass can add. A word is not unlearned, X having only one per kind of media and per
 * language, and the language not changing under a running page.
 *
 * A picture whose account cannot be read is left out of the counting rather than guessed at,
 * and still shown its tooltip: until two people prove the text is X's, the honest reading is
 * that somebody wrote it.
 */
export const learnGenericAlts = (
  photos: readonly PhotoAlt[],
  known: ReadonlySet<string>
): Set<string> => {
  const accounts = new Map<string, Set<string>>();
  for (const { alt, account } of photos) {
    if (account === null || known.has(alt) || !couldBeGeneric(alt)) continue;
    const seen = accounts.get(alt) ?? new Set<string>();
    seen.add(account);
    accounts.set(alt, seen);
  }
  const learned = new Set(known);
  for (const [alt, seen] of accounts) {
    if (seen.size > 1) learned.add(alt);
  }
  return learned;
};

/**
 * What a picture says for itself: its description, or null where all it carries is X's own
 * word for a picture and there is nothing to pass on.
 */
export const descriptionOf = (alt: string | null, generic: ReadonlySet<string>): string | null =>
  alt !== null && !generic.has(alt) ? alt : null;
