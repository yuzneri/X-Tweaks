/**
 * Pulling the hashtags out of what was written in the compose box, to put them back after
 * a post so a run of posts sharing the same tags need not be typed out again each time.
 *
 * What counts as a hashtag follows twitter-text, X's own definition of how it reads a post
 * (https://github.com/twitter/twitter-text, v3.1.0) — the rules are not guessable (katakana
 * middle dot, wave dash, zero-width joiners, more), and a tag cut short at one would come
 * back as a tag nobody typed. The tests' expected values were produced by running that
 * library, so changes here can be checked against it. The character classes use Unicode
 * property escapes rather than twitter-text's long range lists: the library predates those
 * escapes, the extension's minimum browsers support them, and they follow the browser's
 * Unicode version rather than the one frozen into the library.
 */

/**
 * Characters that are neither letters nor digits but still belong inside a tag, taken
 * verbatim from twitter-text's `hashtagSpecialChars`. The Japanese ones matter most here:
 * `・` (U+30FB), `〜` (U+301C), `～` (U+FF5E), `゛`/`゜` (U+309B/U+309C).
 */
const SPECIAL = '_\\u200c\\u200d\\ua67e\\u05be\\u05f3\\u05f4\\uff5e\\u301c\\u309b\\u309c\\u30a0\\u30fb\\u3003\\u0f0b\\u0f0c\\u00b7';

/**
 * What a tag has to contain at least one of. Marks count: a tag can be a single combining
 * character, and a letter in decomposed form is a letter plus a mark, not to be cut in two.
 */
const ALPHA = '\\p{L}\\p{M}';

/**
 * Everything a tag may be made of. Only decimal digits (`\p{Nd}`) count as numbers, so
 * `#①` and `#Ⅷ` are not tags, matching twitter-text's list of numeral ranges.
 */
const ALPHANUMERIC = `${ALPHA}\\p{Nd}${SPECIAL}`;

/**
 * A hashtag as X reads one. The character in front must be none of the above, and not `&`
 * either — the `#` in `&#39;` opens an HTML entity, not a tag. A variation selector in front
 * is allowed even though it is a mark, so a tag written straight after an emoji (`✌️#tag`)
 * still counts (twitter-text treats the two the same way, in the boundary itself). `#`
 * followed by U+FE0F or U+20E3 is the keycap emoji `#️⃣`, not a tag. The body must hold at
 * least one letter or mark, keeping `#2026`, `#_` and `#___` from counting.
 */
const HASHTAG = new RegExp(
  `(?:(?<=[\\uFE0E\\uFE0F])|(?<![${ALPHANUMERIC}&]))` +
    `[#＃](?![\\uFE0F\\u20E3])[${ALPHANUMERIC}]*[${ALPHA}][${ALPHANUMERIC}]*`,
  'gu'
);

/**
 * A match is dropped when another `#` or a `://` follows it right away, as twitter-text
 * does (`endHashtagMatch`): `#tag#tag2` links neither, and `#tag://…` is not a tag at all.
 */
const NOT_A_TAG_AFTER = /^(?:[#＃]|:\/\/)/u;

/**
 * Whether the `#` at that position is a URL's fragment rather than a tag.
 *
 * twitter-text settles this by extracting the URLs first and dropping any tag that falls
 * inside one — carrying its URL grammar and overlap rules here would be overkill for a case
 * with one shape: the run of non-space text in front of the `#` is an address. Looking for a
 * scheme, or a dot-separated host followed by a path, covers `https://example.com/#a` and
 * the scheme-less `example.com/#a` alike.
 *
 * The coarser of the two tests, and the one place this file knowingly parts from
 * twitter-text. Where words are separated by spaces the two agree every time; they part only
 * where an address is jammed against surrounding text (`新刊できましたexample.com/#a`),
 * mostly by leaving a tag behind — more machinery than putting a few hashtags back is worth.
 */
const URL_BEFORE = new RegExp(
  // An address starts at the run's start or after something that is not part of a name.
  // `.` and `-` are left out so a host is not split down the middle
  '(?:^|[^\\p{L}\\p{N}_.-])' +
    // Either a scheme, or a bare host with a path after it (`example.com/…`)
    '(?:[a-z][a-z0-9+.-]*://|[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.[a-z]{2,}(?::\\d+)?/)' +
    // and it has to reach the `#`, which is where the run ends
    '[^\\s]*$',
  'iu'
);

const SPACE = /\s/u;

/**
 * How far back an address is looked for: a run this long with no space in it is not an
 * address anyone typed, so its trailing `#` reads as a tag. There has to be some limit — the
 * walk below runs once per `#`, so on a long post with no spaces at all, an unbounded one
 * would cost the square of the post's length.
 */
const URL_LOOKBACK = 2048;

/**
 * Where the run of non-space text touching that position begins, or null when the run
 * carries on past the limit. It walks backwards from the `#` rather than cutting the text
 * in front of it and searching that: cutting copies everything before the `#`, which turned
 * a long post made of tags into two thirds of a second of work.
 */
const runStartFor = (text: string, at: number): number | null => {
  const floor = Math.max(0, at - URL_LOOKBACK);
  let start = at;
  while (start > floor && !SPACE.test(text[start - 1]!)) start--;
  if (start === 0) return 0;
  // Did it stop at a space, or run out of the budget above?
  return SPACE.test(text[start - 1]!) ? start : null;
};

/**
 * The hashtags in the text, in the order they were written. The same tag written twice
 * comes back once, compared as written, so `#tag` and `#Tag` stay apart and a full-width
 * `＃` is not folded into `#`: X treats each pair as the same tag, but rewriting what
 * someone typed would be the more surprising of the two behaviours.
 */
export const hashtagsIn = (text: string): string[] => {
  const found = new Set<string>();
  for (const match of text.matchAll(HASHTAG)) {
    const at = match.index;
    // Only what comes right after decides this, so two characters are enough
    if (NOT_A_TAG_AFTER.test(text.slice(at + match[0].length, at + match[0].length + 3))) continue;
    const from = runStartFor(text, at);
    if (from !== null && URL_BEFORE.test(text.slice(from, at))) continue;
    found.add(match[0]);
  }
  return [...found];
};

/**
 * What gets put back into the emptied compose box. A single space leads the tags so the
 * body, typed at the caret waiting in front of them, does not run into the first tag; with
 * no tags to put back there is nothing to insert, and an empty string says so.
 */
export const restoredText = (tags: string[]): string =>
  tags.length === 0 ? '' : ` ${tags.join(' ')}`;
