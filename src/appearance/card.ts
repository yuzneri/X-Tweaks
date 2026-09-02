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
 * The class on a line that came out as the mark alone.
 *
 * Such a line is one character wide, and everything it has to say is in the tooltip. The
 * stylesheet gives it a little more for the pointer to land on, which is worth telling
 * apart from a line carrying words: that one is as wide as its words and needs nothing.
 */
export const MARK_CLASS = 'xpro-mark';

/**
 * The class on the mark inside a line.
 *
 * The mark is held apart from the words so that the tooltip can sit on it alone. Where the
 * words are already on screen, a tooltip repeating them under the pointer says nothing and
 * covers what is being read; on the mark it is still the way to the whole of them.
 */
export const ATTACHMENT_MARK_CLASS = 'xpro-attachment-mark';

/**
 * The class on the words following the mark, where they stand for something the post
 * itself did not write: the description given to a picture, or a quoted post's text. They
 * are drawn dim, the way X draws everything that is about a post rather than of it.
 * A card's headline is not one of these — it is drawn as a link, being one.
 */
export const ATTACHMENT_WORDS_CLASS = 'xpro-attachment-words';

/**
 * The class on a line holding words back from the reader.
 *
 * It is what a "Show more" is put in for (`appearance/apply.ts`), and it is narrower than
 * "the line is not saying everything": under the mark-only style the words are not being
 * held back but declined, and a button to undo the setting is not wanted. The tooltip on
 * the mark is still there for anyone who wants a look.
 */
export const ATTACHMENT_CUT_CLASS = 'xpro-attachment-cut';


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
 * One thing a line stands for: a card, an article, a quoted post, or a single picture.
 *
 * A post's photos get one of these apiece rather than one between them, so that what was
 * written for a picture follows that picture's own mark. Four marks with two descriptions
 * gathered after them left the reader counting to work out which belonged to which.
 */
export type LinePart = {
  mark: string;
  /** The words shown beside the mark, already cut to the length a line shows. null where there are none */
  words: string | null;
  /** The whole of what this mark stands for, shown on hover. null where there is nothing to add */
  title: string | null;
};

/** One part, for the things there is only ever one of on a post */
export const partFor = (
  kind: AttachmentKind,
  words: string | null,
  title: string | null
): LinePart => ({ mark: ATTACHMENT_MARKS[kind], words: words?.trim() || null, title });

/**
 * How much of what a line stands for is shown.
 *
 * `marksOnly` is the shape a post shown cut short takes: the marks alone, because there is
 * room for nothing else and the tooltips carry the rest. `full` is the shape it takes once
 * opened by "Show more": there is no longer anything to save room for, so the words go in
 * as they were written rather than cut to the length a line has room for.
 */
export type LineShown = { marksOnly: boolean; full: boolean };

/** The words one part shows under that shape. null where it shows none and the mark stands alone */
export const wordsShown = (part: LinePart, shown: LineShown): string | null =>
  shown.marksOnly ? null : shown.full ? part.title : part.words;

/**
 * Whether a part has more to say than it is showing.
 *
 * True where the mark stands alone, and true where the words beside it were cut to the
 * length a line has room for — a description of a couple of hundred characters shows its
 * first eighty and there is no "Show more" on a post nothing else cut short, so the mark
 * is the only way to the rest.
 * False once the whole of it is out, which is also when a tooltip would only repeat what
 * is already being read.
 */
export const moreThanShown = (part: LinePart, shown: LineShown): boolean =>
  part.title !== null && wordsShown(part, shown) !== part.title;

/**
 * The line as it goes into the post.
 *
 * Each mark is followed by the words belonging to it, and a mark with nothing to say
 * stands on its own — so a post of four photos where the second and fourth were described
 * reads 📷 📷 …the second… 📷 📷 …the fourth…, and which is which needs no counting.
 * With the marks alone they are run together, nothing standing between them.
 */
export const lineFrom = (parts: readonly LinePart[], shown: LineShown): string =>
  shown.marksOnly
    ? parts.map((part) => part.mark).join('')
    : parts
        .map((part) => {
          const words = wordsShown(part, shown);
          return words ? `${part.mark} ${words}` : part.mark;
        })
        .join(' ');
