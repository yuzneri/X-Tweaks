/**
 * The text that stands in a post for what hangs off it — a link card, an article, a
 * photo, a video.
 *
 * Kept apart from the DOM: reading a post is `appearance/apply.ts`'s job, and what to
 * write is decided here so it can be pinned down without a browser.
 */
import type { Messages } from '../i18n/index.ts';

/**
 * The class on the text put into a post in place of what hung off it.
 *
 * The filter reads it too, to leave it out of the body text: it is the extension's own
 * addition, and a rule written against the body must not start matching a card's
 * headline because of it.
 */
export const ATTACHMENT_CLASS = 'xpro-attachment';

/**
 * The mark each kind is given.
 *
 * They tell a line the extension put in from the post's own words, and in the
 * mark-only style they are the whole of it. Symbols rather than words, so nothing here
 * has to be translated.
 * The photo is a camera rather than a framed picture: at the size body text is read at,
 * a frame is a gray box and reads as nothing in particular.
 */
export const ATTACHMENT_MARKS = {
  link: '🔗',
  article: '📄',
  quote: '💬',
  photo: '📷',
  video: '🎬',
} as const;

export type AttachmentKind = keyof typeof ATTACHMENT_MARKS;

/**
 * One color out of an inline `style`.
 *
 * X writes the color the user picked (one of six) straight onto each thing it paints
 * with it, so the only way to match it is to read one and copy the value: no selector
 * carries an inline value across to another element.
 * The property is named because the same color arrives as the text color on a link and
 * as the background of the button that opens the compose form.
 */
export const colorInStyle = (
  style: string | null,
  property: 'color' | 'background-color' = 'color'
): string | null => {
  // Anchored on the start or a `;` so that `color` does not also match `background-color`
  const match = style?.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i'));
  return match?.[1]?.trim() || null;
};

/**
 * What a line says: the words themselves, and where they came from — a card's domain, a
 * quoted post's author. Either can be missing (an ad's card carries no domain, a quote of
 * a post with only a photo has no words).
 */
export type LineParts = { words: string | null; source: string | null };

/**
 * How much of the words the line shows.
 *
 * A card's headline is a headline, but a quoted post runs to a couple of hundred
 * characters, and put in whole it takes more room than the frame it replaced. What is cut
 * off is not lost: the tooltip carries the words as they were written.
 */
const WORDS_SHOWN = 80;

/** Whitespace runs, the line breaks written into a quoted post among them, become one space */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

const built = (
  { words, source }: LineParts,
  m: Messages,
  limit: number | null
): string | null => {
  const said = limit === null ? words?.trim() : words && oneLine(words);
  const shortened = limit !== null && said && said.length > limit ? `${said.slice(0, limit)}…` : said;
  const from = source?.trim() || null;
  if (!shortened) return from;
  if (!from) return shortened;
  const { open, close } = m.appearance.cardParens;
  return `${shortened}${open}${from}${close}`;
};

/**
 * The whole of what the thing says, with where it came from in brackets after it. What
 * the tooltip carries, so the line breaks are left as they were written.
 * null when there is nothing at all to say, in which case only the mark goes in.
 */
export const lineTextFrom = (parts: LineParts, m: Messages): string | null =>
  built(parts, m, null);

/** The same, cut down to what goes on screen: one line, and only so many characters of it */
export const shortLineFrom = (parts: LineParts, m: Messages): string | null =>
  built(parts, m, WORDS_SHOWN);

/**
 * The line as it goes into the post: the mark, and the words after it where there are
 * any. The mark alone is a line in its own right — that is the whole of the mark-only
 * style, and it is also what is left of a photo, which has no words to carry.
 */
export const markedLine = (kind: AttachmentKind, text: string | null): string => {
  const mark = ATTACHMENT_MARKS[kind];
  const words = text?.trim();
  return words ? `${mark} ${words}` : mark;
};
