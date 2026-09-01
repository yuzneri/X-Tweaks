/**
 * Applies the appearance settings: sets the markers the CSS targets and puts the built
 * CSS into a single `<style>`. Only attributes are added, so removing them restores the
 * original.
 *
 * Which elements hold one scope, and where its name is drawn, is the surface's business
 * (`surface/`). Nothing here names a column or a deck.
 */
import { surface } from '../surface/index.ts';
import {
  ARTICLE,
  authorOf,
  cardTextOf,
  CELL_SELECTOR,
  displayNameOf,
  LINK_CARD,
  ownTextOf,
  PHOTO,
  quoteFrameOf,
  VIDEO,
  X_SHOW_MORE,
} from '../filter/post.ts';
import { appearanceFor, type ColumnScope } from '../settings/resolve.ts';
import {
  cardStyleOf,
  collapsesNewlines,
  isCompact,
  mediaStyleOf,
  quoteStyleOf,
  timeFormatOf,
  type AppearanceNode,
  type AttachmentStyle,
  type MediaStyle,
  type Settings,
} from '../settings/schema.ts';
import {
  colorInStyle,
  lineTextFrom,
  markedLine,
  shortLineFrom,
  ATTACHMENT_CLASS,
  type LineParts,
} from './card.ts';
import { timeTextFrom } from './time.ts';
import { limitFor, needsFrame, setsHeight, wrapsBox } from './frame.ts';
import type { Messages } from '../i18n/index.ts';
import {
  buildCss,
  columnKey,
  CARD_MOVED_ATTR,
  COLUMN_ATTR,
  MEDIA_MARKED_ATTR,
  HEADER_ATTR,
  MORE_CLASS,
  OPENED_CLASS,
  OPENED_POST_MARK,
  MEDIA_FRAME_ATTR,
  TIME_ATTR,
  TODAY_ATTR,
  MEDIA_TARGETS,
  type ColumnAppearance,
} from './css.ts';

const STYLE_ID = 'xpro-tweaks-appearance-style';

/**
 * Marks each scope and the bar carrying its name. The marker goes on the range covering
 * one whole scope; marking only its body leaves the header stranded in black.
 *
 * The marker's value is the target key, not the position in the order. Using the
 * position would carry the width and the colors straight over to the neighboring
 * column when the deck is switched.
 * The bar is not searched for again while its marker is still there: the cost of
 * searching turns into a delay in judging new posts.
 */
export const stampColumns = (): void => {
  /** The ranges enumerated this round. A marker outside them is a leftover from something that is no longer a scope, so it comes off */
  const live: Element[] = [];
  const on = surface();

  on.scopeElements().forEach((element) => {
    const value = columnKey(on.scopeOfElement(element));
    const scope = on.rangeOf(element);
    if (scope.getAttribute(COLUMN_ATTR) !== value) scope.setAttribute(COLUMN_ATTR, value);
    live.push(scope);

    const marked = scope.querySelector(`[${HEADER_ATTR}]`);
    if (marked && on.bandStillValid(marked, scope)) return;
    // When searching again, clear every marker in this range before setting one.
    // Two of them left in place make a color with opacity darker further in
    scope.querySelectorAll(`[${HEADER_ATTR}]`).forEach((el) => el.removeAttribute(HEADER_ATTR));
    on.bandOf(scope)?.setAttribute(HEADER_ATTR, '');
  });

  // Clear markers in ranges that are no longer scopes. The loop above only touches
  // the ranges it enumerated, so a stranded marker would keep the bar painted
  document.querySelectorAll(`[${HEADER_ATTR}]`).forEach((el) => {
    if (!live.some((scope) => scope.contains(el))) el.removeAttribute(HEADER_ATTR);
  });
};

/** Picks up only the media inside columns. Markers are set per column, so there is no need to look outside */
const MEDIA_IN_COLUMN = MEDIA_TARGETS.map((target) => `[${COLUMN_ATTR}] ${target}`).join(', ');

/** Text in a post. Walking up past an ancestor containing this would shrink the body along with it */
const TEXT_SELECTOR = '[data-testid="tweetText"], [data-testid="User-Name"]';

/** A post's body text. What the line limit and "Show more" apply to */
const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';

/** The quote frame: the container that jumps to the original post when clicked, with the quoted content beneath it */
const QUOTE_SELECTOR = '[role="link"]';

/** The post proper within a cell. Where the quote frame is looked for */
const TWEET_SELECTOR = '[data-testid="tweet"]';

/** Limit on how far to walk up looking for the frame. Above this we are into the cell's own layout */
const MAX_ANCESTORS = 12;

/**
 * Finds the frame that sets the media's height.
 *
 * Among the ancestors that wrap the box at the same height, takes the outermost
 * one that sets the height, or, failing that, the outermost wrapping one.
 * The job here is walking up and measuring; deciding from the measurements is
 * `frame.ts`.
 */
const frameOf = (media: Element, limit: number): Element | null => {
  const box = media.getBoundingClientRect();
  if (!needsFrame(box.height, limit)) return null;

  let wrapper: Element | null = null;
  let decider: Element | null = null;

  let el = media.parentElement;
  for (let i = 0; el && i < MAX_ANCESTORS; el = el.parentElement, i++) {
    if (el.hasAttribute(COLUMN_ATTR) || el.matches(CELL_SELECTOR)) break;
    if (el.querySelector(TEXT_SELECTOR)) break;
    if (!wrapsBox(box.height, el.getBoundingClientRect().height)) break;
    wrapper = el;
    const style = getComputedStyle(el);
    if (setsHeight(style.aspectRatio, style.paddingBottom, box.height)) decider = el;
  }
  return decider ?? wrapper;
};

/** Takes the marking threshold from the appearance of the column this media sits in. null when none is needed */
const limitOf = (media: Element, columns: ColumnAppearance[]): number | null => {
  const key = media.closest(`[${COLUMN_ATTR}]`)?.getAttribute(COLUMN_ATTR);
  const appearance = columns.find((column) => column.key === key)?.appearance;
  return appearance ? limitFor(appearance) : null;
};

const clearMediaFrames = (): void =>
  document.querySelectorAll(`[${MEDIA_FRAME_ATTR}]`).forEach((el) => el.removeAttribute(MEDIA_FRAME_ATTR));

const clearTimes = (): void =>
  document.querySelectorAll(`[${TIME_ATTR}]`).forEach((el) => {
    el.removeAttribute(TIME_ATTR);
    el.removeAttribute(TODAY_ATTR);
  });

/**
 * Renders a post's time in absolute form and sets it as a marker on the `time`'s parent.
 * Only the marker is set; X's own text is untouched and CSS decides how it is shown.
 * A redraw by X takes the marker with it, but this runs on every settling, so it is set again.
 */
const restampTimes = (columns: ColumnAppearance[], messages: Messages): void => {
  clearTimes();
  const now = new Date();
  document.querySelectorAll(`[${COLUMN_ATTR}] time`).forEach((time) => {
    const key = time.closest(`[${COLUMN_ATTR}]`)?.getAttribute(COLUMN_ATTR);
    const appearance = columns.find((column) => column.key === key)?.appearance;
    const format = appearance ? timeFormatOf(appearance.timeFormat) : 'relative';
    if (format === 'relative') return;
    // Under "both" only the clock time is added. X already shows either a relative
    // time or a month and day, so the clock time is what is missing; adding the date
    // as well steals width from the ID and hides it in narrow columns
    const shown = timeTextFrom(time.getAttribute('datetime'), now, messages);
    // An unreadable time gets no marker. Marking it produces an empty `::after`,
    // which reads as the timestamp having vanished
    if (!shown) return;
    const parent = time.parentElement;
    if (!parent) return;
    parent.setAttribute(TIME_ATTR, shown.text);
    if (shown.today) parent.setAttribute(TODAY_ATTR, '');
  });
};

/**
 * Sets the media frame markers again. They are redone because a stale marker left
 * over from a tighter limit would keep that frame shrunk.
 */
const restampMediaFrames = (columns: ColumnAppearance[]): void => {
  clearMediaFrames();
  document.querySelectorAll(MEDIA_IN_COLUMN).forEach((media) => {
    const limit = limitOf(media, columns);
    if (limit === null) return;
    frameOf(media, limit)?.setAttribute(MEDIA_FRAME_ATTR, '');
  });
};

/** The appearance applied in that column. null when the column is not one of them */
const appearanceOf = (column: Element, columns: ColumnAppearance[]): AppearanceNode | null => {
  const key = column.getAttribute(COLUMN_ATTR);
  return columns.find((marked) => marked.key === key)?.appearance ?? null;
};

/**
 * The button that opens the compose form, in X Pro's side rail.
 *
 * X paints it with the color the user picked, the same one it draws links in, and it is
 * there whether or not anything on screen happens to carry a link.
 * The rail is found by a marker of X Pro's own, and the button within it by being the
 * only one X paints a background on. Its label ("Post") changes with the interface
 * language and is not used.
 */
const COMPOSE_BUTTON_SELECTOR =
  'div:has(> [data-tourstep="side-nav-decks"]) button[style*="background-color"]';

/**
 * One of X's own links in a post, where the same color arrives as the text color.
 * Read when the button cannot be found, so that a change to the rail costs the color
 * rather than losing it.
 * Ours are left out: with a color of our own on them, the one written last time would be
 * read back as X's and would stay behind after the user picked another.
 */
const X_LINK_SELECTOR = `[${COLUMN_ATTR}] ${TWEET_TEXT_SELECTOR} a[style*="color:"]:not(.${ATTACHMENT_CLASS})`;

const styleOf = (selector: string): string | null =>
  document.querySelector(selector)?.getAttribute('style') ?? null;

/**
 * Reads the color X draws its links in, at most once per settling.
 *
 * One place anywhere is enough: the color is one setting for the whole of X, not
 * something a column decides. Reading per column would leave a column that happens to
 * hold no link showing a different color from the one beside it.
 * null when neither can be found, and what would have been painted is left to inherit
 * as before.
 */
const linkColorReader = (): (() => string | null) => {
  let read: string | null | undefined;
  return () => {
    if (read === undefined) {
      read =
        colorInStyle(styleOf(COMPOSE_BUTTON_SELECTOR), 'background-color') ??
        colorInStyle(styleOf(X_LINK_SELECTOR));
    }
    return read;
  };
};

/**
 * Draws what the extension added in the color X draws its own links in, so it reads as a
 * link rather than as body text.
 * Written inline, which the appearance's own link color still beats: that rule carries
 * `!important`. With no color to read, X's own is left to the stylesheet's fallback.
 */
const paintLikeLink = (el: HTMLElement, readLinkColor: () => string | null): void => {
  const color = readLinkColor();
  if (color === null) el.style.removeProperty('color');
  else if (el.style.color !== color) el.style.color = color;
};

/**
 * Colors one line by whether it opens anything.
 *
 * A card's line is a link and is drawn like one. A quote, an article, a photo have
 * nowhere to go — the frame X draws them in carries no address — so they stay in the
 * body's own color: painting them like links would promise a click that does nothing.
 */
const paintLine = (el: HTMLElement, line: Line, readLinkColor: () => string | null): void => {
  if (line.href === null) el.style.removeProperty('color');
  else paintLikeLink(el, readLinkColor);
};

const trimmed = (el: Element | null | undefined): string | null => el?.textContent?.trim() || null;

/**
 * What a card says. Which layout X drew it in is `cardTextOf`'s business, so that the
 * line put into the post and the "the card's domain is ○○" rules read one card alike.
 */
const cardPartsOf = (card: Element): LineParts => {
  const { domain, title } = cardTextOf(card);
  return { source: domain, words: title };
};

/**
 * The post a quote holds: what it says, and who wrote it.
 * The name comes with the ID, the way X writes them side by side: the ID alone often
 * says nothing about who it is, and the name alone is not unique.
 */
const quotePartsOf = (frame: Element): LineParts => {
  const author = authorOf(frame);
  const name = displayNameOf(frame);
  const who = [name, author === null ? null : `@${author}`].filter((part) => part !== null);
  const body = frame.querySelector(TWEET_TEXT_SELECTOR);
  return {
    // Only what the quoted post says. A quote of a post with a photo has a mark of ours
    // in that body, put there on an earlier settling, and reading it back would carry
    // the mark into this line and its tooltip
    words: body === null ? null : ownTextOf(body).trim() || null,
    source: who.length > 0 ? who.join(' ') : null,
  };
};

/**
 * The body a thing belongs to: the last one written before it.
 * Something inside a quote frame then lands on the quoted body, where it is shown.
 */
const bodyBefore = (el: Element, cell: Element): Element | null => {
  let found: Element | null = null;
  for (const text of cell.querySelectorAll(TWEET_TEXT_SELECTOR)) {
    if (text.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) found = text;
  }
  return found;
};

/**
 * The address to hand the line. Only `http(s)` is taken: the value comes out of the
 * page, and writing whatever it holds into an `href` of ours would carry a
 * `javascript:` URL along with it.
 */
const linkTargetOf = (card: Element): string | null => {
  const href = card.querySelector('a[href]')?.getAttribute('href') ?? null;
  return href && /^https?:\/\//i.test(href) ? href : null;
};

/**
 * One line to put into a post.
 * `source` is what it stands for and gets marked as moved; a photo has none, since the
 * whole column's media is hidden by a rule rather than one element at a time.
 */
type Line = {
  anchor: Element;
  source: Element | null;
  /** What it says where it goes at the end of the body: the mark, and the words under the text style */
  text: string;
  /**
   * What it says where it has to run in front of the body instead (see `goesInFront`):
   * the mark alone. The little that is shown of a cut-off post belongs to the post's own
   * first words, not to a headline
   */
  mark: string;
  /**
   * What the line says in full, shown on hover. It is the whole of the information under
   * the mark-only style, where the line itself is one character, and it stands in for the
   * words the body's line limit may have cut off. null where there is nothing to add
   */
  title: string | null;
  href: string | null;
  /** Whether it stands for the post's photos or videos, which are hidden per post */
  media?: true;
};

/** Whether that style asks for what it names to be put into the post as a line */
const movesCards = (style: AttachmentStyle): boolean => style === 'text' || style === 'mark';
const movesMedia = (style: MediaStyle): boolean => style === 'mark';

/**
 * What hangs off a post, in the order the lines go in: the cards first, then the
 * article, then the photos and videos.
 *
 * The two sides are asked for separately. The cards and the photos are two settings, and
 * a post can well have its cards turned into text while its photos stay on screen.
 */
const linesIn = (
  cell: Element,
  quote: Element | null,
  appearance: AppearanceNode,
  messages: Messages
): Line[] => {
  const cardStyle = cardStyleOf(appearance.cardStyle);
  const quoteStyle = quoteStyleOf(appearance.quoteStyle);
  const mediaStyle = mediaStyleOf(appearance.media.style);
  const lines: Line[] = [];
  /** The mark-only style shows the mark and keeps the words for the tooltip */
  const shown = (style: AttachmentStyle, words: string | null): string | null =>
    style === 'mark' ? null : words;

  if (movesCards(cardStyle)) {
    for (const card of cell.querySelectorAll(LINK_CARD)) {
      const parts = cardPartsOf(card);
      lines.push({
        anchor: card,
        source: card,
        text: markedLine('link', shown(cardStyle, shortLineFrom(parts, messages))),
        mark: markedLine('link', null),
        title: lineTextFrom(parts, messages),
        href: linkTargetOf(card),
      });
    }

    const article = cell.querySelector(ARTICLE);
    if (article) {
      // The headline sits in the block next to the cover image; the opening follows it
      // and is left behind, being a paragraph rather than a title
      const parts: LineParts = {
        words: trimmed(article.nextElementSibling?.children[0]),
        source: null,
      };
      lines.push({
        anchor: article,
        // The frame carries the border and is what has to go, not the cover image alone
        source: article.parentElement,
        text: markedLine('article', shown(cardStyle, shortLineFrom(parts, messages))),
        mark: markedLine('article', null),
        title: lineTextFrom(parts, messages),
        href: null,
      });
    }
  }

  /*
   * The quoted post, under a setting of its own. X Pro's frame is a `div` with no
   * address on it, so the line carries no link: the quoted post is reached by opening
   * the post, where everything is shown as it was.
   */
  if (quote && movesCards(quoteStyle)) {
    const parts = quotePartsOf(quote);
    lines.push({
      anchor: quote,
      source: quote,
      text: markedLine('quote', shown(quoteStyle, shortLineFrom(parts, messages))),
      mark: markedLine('quote', null),
      title: lineTextFrom(parts, messages),
      href: null,
    });
  }

  if (movesMedia(mediaStyle)) {
    // A photo and a video are marked separately: which one hung off the post is worth knowing
    for (const [kind, selector] of [
      ['photo', PHOTO],
      ['video', VIDEO.join(', ')],
    ] as const) {
      const media = cell.querySelector(selector);
      // One mark per kind, however many there are: a post with four photos is still "a
      // post with photos", and four marks in a row would say nothing more
      if (media) {
        // No tooltip, and nothing to drop in front of a body: a photo has nothing to say
        // beyond the mark itself
        lines.push({
          anchor: media,
          source: null,
          text: markedLine(kind, null),
          mark: markedLine(kind, null),
          title: null,
          href: null,
          media: true,
        });
      }
    }
  }

  return lines;
};

/**
 * What comes before a line put at the end of a body.
 *
 * It needs something in front, or it butts against the last word. Which one follows the
 * post's own line breaks: kept, the body already reads as several lines and the line is
 * easier to pick out on one of its own; folded into spaces, the post is one paragraph
 * and a line break would undo what that setting is for.
 */
const leadFor = (appearance: AppearanceNode): string =>
  collapsesNewlines(appearance.collapseNewlines) ? ' ' : '\n';

/**
 * How the lines go into one body: what they say, and where they sit in it.
 * `atFront` puts them before the post's own words; `lead` is what parts them from it;
 * `marksOnly` drops the words and leaves the mark.
 */
type Placement = { atFront: boolean; lead: string; marksOnly: boolean };

/** Where the post has no body, the line stands on its own with nothing around it to answer to */
const ON_ITS_OWN: Placement = { atFront: false, lead: '', marksOnly: false };

/**
 * Whether the limit would cut these lines away from the end of that body.
 *
 * The count is taken from the body's own text: what is already in it adds a line apiece
 * where it sits at the end, and nothing where it sits on the first line. Measuring our
 * lines along with the text would make the answer depend on where they were put last
 * time, and they would swap ends on every settling.
 */
const wouldBeCut = (body: Element, lines: Line[], maxLines: number): boolean => {
  const lineHeight = lineHeightOf(body);
  if (!(lineHeight > 0)) return false;
  const ours = body.querySelectorAll(`.${ATTACHMENT_CLASS}`);
  const added = ours.length > 0 && ours[0] !== body.firstElementChild ? ours.length : 0;
  const bodyLines = Math.round(body.scrollHeight / lineHeight) - added;
  return bodyLines + lines.length > maxLines;
};

/**
 * Where the lines go in one body, and what they say there.
 *
 * With no limit on the body they go at the end, on a line of their own, saying what they
 * have to say. That is where they read best.
 *
 * Under a limit they are marks alone, whichever end they go to. A headline runs to
 * however many lines the column is wide enough for, and then "does it still fit" has no
 * answer until it has been put in — the line would move from one end to the other and
 * back on every settling. A mark is one line, always.
 * Which end is then decided by whether the limit reaches them: a body they fit under
 * keeps them at the end, on their own line. A body they do not fit under takes them in
 * front instead, where the cut cannot reach — otherwise the mark goes with everything
 * past the cut, and putting it outside the body would give every cut-off post a line of
 * its own, which is what the limit was set to avoid.
 */
const placementFor = (
  body: Element,
  lines: Line[],
  appearance: AppearanceNode
): Placement => {
  const lead = leadFor(appearance);
  // The limit spares the body inside a quote (matching `textOutsideQuote` in css.ts)
  if (appearance.maxLines === null || body.closest(QUOTE_SELECTOR)) {
    return { atFront: false, lead, marksOnly: false };
  }
  const atFront = wouldBeCut(body, lines, appearance.maxLines);
  return { atFront, lead: atFront ? '' : lead, marksOnly: true };
};

/** The line's text. In front it is the mark, with the space that parts it from the first word */
const textFor = (line: Line, where: Placement): string =>
  where.atFront
    ? `${line.mark} `
    : `${where.lead}${where.marksOnly ? line.mark : line.text}`;

/** Whether that element already says what the line says */
const matches = (el: Element, line: Line, where: Placement): boolean =>
  el.textContent === textFor(line, where) &&
  (el.getAttribute('href') ?? null) === line.href &&
  (el.getAttribute('title') ?? null) === line.title;

/** Builds the element for one line: an `a` where there is something to open, a `span` where there is not */
const lineElement = (line: Line, where: Placement): HTMLElement => {
  const el = document.createElement(line.href === null ? 'span' : 'a');
  el.className = ATTACHMENT_CLASS;
  el.textContent = textFor(line, where);
  // Shown on hover, the way X puts its own explanations on things too small to read
  if (line.title !== null) el.title = line.title;
  if (el instanceof HTMLAnchorElement && line.href !== null) {
    el.href = line.href;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  }
  return el;
};

/**
 * The block a photo or a video occupies: the outermost thing around it that holds no
 * text of the post. It is the same range `frameOf` walks, without the measuring.
 *
 * A line put before this one lands where the media was and stays outside everything the
 * hiding reaches — the box, and the frame the height limit marks. Going by the frame's
 * marker instead would depend on it having been set already, and a frame that only
 * appears once the media has loaded would leave the line hidden inside it.
 */
const mediaBlockOf = (media: Element, cell: Element): Element => {
  let block = media;
  for (let el = media.parentElement; el && el !== cell; el = el.parentElement) {
    if (el.querySelector(TEXT_SELECTOR)) break;
    block = el;
  }
  return block;
};

/**
 * Where a line goes when the post has no body to put it in: in front of the thing it
 * stands for, so it is left where that thing was.
 * For a card that is the frame around it (`source`), which is what gets hidden.
 */
const insertionPoint = (line: Line, cell: Element): Element =>
  line.source ?? mediaBlockOf(line.anchor, cell);

/**
 * Puts what hangs off each post into the post itself, as a line of text apiece, and
 * marks what the line came from so the CSS can take it away.
 *
 * The line goes inside the body, so it follows the body's size and color and is cut by
 * the line limit along with it, and it carries the link where there is one to carry.
 * A post with no body — a photo posted on its own, an article — takes its lines where
 * what they stand for was, so nothing is left saying nothing.
 */
const restampAttachments = (
  columns: ColumnAppearance[],
  messages: Messages,
  readLinkColor: () => string | null
): void => {
  /** The lines and the sources that belong to this round. Anything else is left over */
  const live = new Set<Element>();
  /*
   * The columns with a post opened stand down, as they do in the CSS (`OPENED_POST_MARK`):
   * that post is there to be read, and its card stays on screen. Putting a line in as
   * well would say the same thing twice.
   * Gathered up front, so the search is not repeated for every post in the column
   */
  const opened = new Set(
    [...document.querySelectorAll(`[${COLUMN_ATTR}] ${OPENED_POST_MARK}`)].map((el) =>
      el.closest(`[${COLUMN_ATTR}]`)
    )
  );

  document.querySelectorAll(`[${COLUMN_ATTR}] ${CELL_SELECTOR}`).forEach((cell) => {
    const column = cell.closest(`[${COLUMN_ATTR}]`);
    const appearance = column && appearanceOf(column, columns);
    if (!appearance || opened.has(column)) return;
    const cardStyle = cardStyleOf(appearance.cardStyle);
    const quoteStyle = quoteStyleOf(appearance.quoteStyle);
    const mediaStyle = mediaStyleOf(appearance.media.style);
    if (!movesCards(cardStyle) && quoteStyle === 'show' && !movesMedia(mediaStyle)) return;

    // Found once for the cell: the line for it, and the taking away of it, both need it
    const tweet = cell.querySelector(TWEET_SELECTOR);
    const quote = tweet && quoteFrameOf(tweet);
    /*
     * A quote set to not show is taken away without a line. It cannot be done in the CSS
     * as the cards are: a quote frame is told apart by the avatar inside it not being the
     * author's, and no selector can say that
     */
    if (quote && quoteStyle === 'hidden') {
      quote.setAttribute(CARD_MOVED_ATTR, '');
      live.add(quote);
    }

    const lines = linesIn(cell, quote, appearance, messages);
    if (lines.length === 0) return;

    /** The lines that go into a body, gathered per body: a quoted card goes into the quoted body */
    const inBodies = new Map<Element, Line[]>();
    /** The rest, which stand where what they came from was */
    const onTheirOwn: Line[] = [];
    for (const line of lines) {
      const body = bodyBefore(line.anchor, cell);
      if (body) inBodies.set(body, [...(inBodies.get(body) ?? []), line]);
      else onTheirOwn.push(line);
    }

    for (const [body, wanted] of inBodies) {
      // Decided per body: how much room the limit leaves is the body's own business, and
      // the body inside a quote is outside the limit altogether
      const where = placementFor(body, wanted, appearance);
      const existing = [...body.querySelectorAll(`.${ATTACHMENT_CLASS}`)];
      /*
       * Left as they are while they still say the same thing. Rebuilding them on every
       * settling would take the text away from under a selection or a click.
       * Compared as a whole rather than one by one: with the count or the order changed,
       * which of them to keep is not worth working out.
       */
      const same =
        existing.length === wanted.length &&
        existing.every((el, i) => matches(el, wanted[i]!, where));
      if (!same) existing.forEach((el) => el.remove());
      const put = wanted.map((line, i) => {
        const el = same ? (existing[i] as HTMLElement) : lineElement(line, where);
        paintLine(el, line, readLinkColor);
        live.add(el);
        return el;
      });
      // In front they go in together, so they keep the order they were built in
      if (!same) {
        if (where.atFront) body.prepend(...put);
        else put.forEach((el) => body.append(el));
      }
    }

    for (const line of onTheirOwn) {
      const point = insertionPoint(line, cell);
      // The one that would already be in that place, kept for the same reason as above
      const before = point.previousElementSibling;
      const standing =
        before instanceof HTMLElement &&
        before.classList.contains(ATTACHMENT_CLASS) &&
        matches(before, line, ON_ITS_OWN);
      const el = standing ? (before as HTMLElement) : lineElement(line, ON_ITS_OWN);
      if (!standing) point.before(el);
      paintLine(el, line, readLinkColor);
      live.add(el);
    }

    for (const line of lines) {
      if (!line.source) continue;
      line.source.setAttribute(CARD_MOVED_ATTR, '');
      live.add(line.source);
    }
    /*
     * The media has no one element to take away — a post can hold four photos — so the
     * post is marked instead and the rule hides what is inside it
     */
    if (lines.some((line) => line.media)) {
      cell.setAttribute(MEDIA_MARKED_ATTR, '');
      live.add(cell);
    }
  });

  clearAttachments(live);
};

/**
 * Takes away the lines and the markers that no longer belong to something being moved.
 * Left in place, a post would keep a line while what it stood for is back on screen.
 */
const clearAttachments = (live: Set<Element> = new Set()): void => {
  document.querySelectorAll(`.${ATTACHMENT_CLASS}`).forEach((line) => {
    if (!live.has(line)) line.remove();
  });
  document.querySelectorAll(`[${CARD_MOVED_ATTR}]`).forEach((source) => {
    if (!live.has(source)) source.removeAttribute(CARD_MOVED_ATTR);
  });
  document.querySelectorAll(`[${MEDIA_MARKED_ATTR}]`).forEach((cell) => {
    if (!live.has(cell)) cell.removeAttribute(MEDIA_MARKED_ATTR);
  });
};

/** The height of one line. Estimated from the font size when `line-height` is `normal` */
const lineHeightOf = (text: Element): number => {
  const style = getComputedStyle(text);
  const lineHeight = parseFloat(style.lineHeight);
  return Number.isFinite(lineHeight) ? lineHeight : parseFloat(style.fontSize) * 1.2;
};

/**
 * Whether that body wants a "Show more" under it.
 *
 * Every reason not to have one is gathered here, because each of them is also a reason
 * to take away the one that is already there. A button standing under a body that is no
 * longer cut off says there is more to read where there is not, and the ways a body
 * stops being cut off — the column has a post opened in it, the posts get packed, the
 * limit is lifted — arrive long after the button was put in.
 */
const wantsShowMore = (text: Element, columns: ColumnAppearance[]): boolean => {
  // Body text inside a quote, and columns with a post opened, are outside the limit
  // (matching the targets in css.ts)
  if (text.closest(QUOTE_SELECTOR)) return false;
  if (text.closest(`[${COLUMN_ATTR}]`)?.querySelector(OPENED_POST_MARK)) return false;
  const cell = text.closest(CELL_SELECTOR);
  if (!cell || cell.classList.contains(OPENED_CLASS)) return false;
  // Nothing is added to a cell that has X's own "Show more". Two side by side would
  // mean pressing both to get the full text. X sometimes brings one out later, so in
  // that case the added button is withdrawn
  if (cell.querySelector(X_SHOW_MORE)) return false;

  const column = cell.closest(`[${COLUMN_ATTR}]`);
  const appearance = column && appearanceOf(column, columns);
  if (!appearance || appearance.maxLines === null) return false;
  /*
   * With the posts packed there is no button. Packing is for fitting more posts on
   * screen, and a line of its own under every cut-off post works against that; what is
   * cut off is still read by opening the post
   */
  if (isCompact(appearance.compact)) return false;

  /*
   * Being cut off is not enough; the text must also have reached the limit.
   * Where X itself truncates the body, the text is "overflowing" as well, and a
   * 5-line limit would collapse it at 2. This also guards against the height
   * wobbling mid-render.
   * Measured last: it costs a layout, and everything above is a lookup
   */
  const lineHeight = lineHeightOf(text);
  const reachesLimit = text.clientHeight >= (appearance.maxLines - 0.5) * lineHeight;
  return reachesLimit && text.clientHeight > 0 && text.scrollHeight > text.clientHeight + 2;
};

/**
 * Puts a "Show more" under body text cut off by the line limit, and takes it away again
 * where it is no longer wanted.
 * Whether it is cut off can only be measured (CSS alone cannot show the button on
 * overflowing posts only). Clicking adds a class to that cell, lifting the CSS
 * limit for that cell alone.
 */
const addShowMore = (
  columns: ColumnAppearance[],
  messages: Messages,
  readLinkColor: () => string | null
): void => {
  document.querySelectorAll(`[${COLUMN_ATTR}] ${TWEET_TEXT_SELECTOR}`).forEach((text) => {
    const next = text.nextElementSibling;
    const existing =
      next instanceof HTMLElement && next.classList.contains(MORE_CLASS) ? next : null;

    if (!wantsShowMore(text, columns)) {
      existing?.remove();
      return;
    }
    // Already there: only the color is looked at again, in case X's was changed
    if (existing) {
      paintLikeLink(existing, readLinkColor);
      return;
    }

    const cell = text.closest(CELL_SELECTOR);
    if (!cell) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = MORE_CLASS;
    button.textContent = messages.showMore;
    paintLikeLink(button, readLinkColor);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      cell.classList.add(OPENED_CLASS);
      button.remove();
    });
    text.after(button);
  });
};

/**
 * When X's own "Show more" is pressed, lift our limit for that cell too.
 * X's truncation and ours overlap, so lifting only one still leaves the text short.
 * A single capturing listener on `document` is enough (it arrives even if X stops
 * the event further in).
 */
let listening = false;
const listenToXShowMore = (): void => {
  if (listening) return;
  listening = true;
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const cell = target.closest(X_SHOW_MORE)?.closest(CELL_SELECTOR);
      cell?.classList.add(OPENED_CLASS);
    },
    true
  );
};

/** The per-column appearances applied most recently. Used to re-mark on every settling */
let lastColumns: ColumnAppearance[] = [];
let lastMessages: Messages | null = null;

/**
 * Sets the media frame markers again (called on every settling of the DOM).
 * It measures sizes, so it only measures when some tier sets a height limit.
 * Our own rules are switched off while measuring (with the limit still in effect,
 * only the box shrinks and its height no longer matches the frame).
 */
export const stampMediaFrames = (): void => {
  // The time markers are set again on the same occasion. When every tier says
  // "as X shows it", they are stripped so that no marker of ours is left in X's DOM
  // even though no rule targets them
  if (
    lastMessages &&
    lastColumns.some((column) => timeFormatOf(column.appearance.timeFormat) !== 'relative')
  ) {
    restampTimes(lastColumns, lastMessages);
  } else {
    clearTimes();
  }
  // Whether even one column needs markers. How the limit is derived lives in `limitFor` alone
  const needsFrames = lastColumns.some((column) => limitFor(column.appearance) !== null);
  if (needsFrames) {
    const style = styleElement();
    style.disabled = true;
    restampMediaFrames(lastColumns);
    style.disabled = false;
  } else {
    // Once every tier drops the limit, strip the markers set earlier too.
    // Turning the extension off replaces the settings with empty ones, which arrives here
    clearMediaFrames();
  }
  /**
   * X's link color, read at most once per settling and only if something is drawn in it.
   * Both the lines put into posts and the "Show more" buttons follow it
   */
  const readLinkColor = linkColorReader();
  // The lines put into posts are redone on the same occasion: X redraws a post and takes
  // ours with it. Once no column asks for them, the ones already put in are taken away
  if (
    lastMessages &&
    lastColumns.some(
      (column) =>
        movesCards(cardStyleOf(column.appearance.cardStyle)) ||
        // Every quote style but X's own needs the pass: the frame is marked there, both
        // to put its line in and to take it away
        quoteStyleOf(column.appearance.quoteStyle) !== 'show' ||
        movesMedia(mediaStyleOf(column.appearance.media.style))
    )
  ) {
    restampAttachments(lastColumns, lastMessages, readLinkColor);
  } else {
    clearAttachments();
  }
  if (lastMessages && lastColumns.some((column) => column.appearance.maxLines !== null)) {
    listenToXShowMore();
    addShowMore(lastColumns, lastMessages, readLinkColor);
  } else {
    // Once every tier drops the limit, remove the buttons added earlier too
    document.querySelectorAll(`.${MORE_CLASS}`).forEach((button) => button.remove());
  }
};

const styleElement = (): HTMLStyleElement => {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.append(style);
  return style;
};

/**
 * Applies the appearance again for the current arrangement of columns. Called when
 * the settings change and when columns come and go.
 * Identical content is not rewritten (rewriting makes the browser rebuild the style).
 */
export const applyAppearance = (
  settings: Settings,
  scopes: ColumnScope[],
  messages: Messages
): void => {
  stampColumns();

  // Columns sharing a key share their rules, so they are folded into one.
  // Without folding, columns of the same account standing side by side would emit
  // the same rules over and over
  const columns: ColumnAppearance[] = [];
  const seen = new Set<string>();
  for (const scope of scopes) {
    const key = columnKey(scope);
    if (seen.has(key)) continue;
    seen.add(key);
    columns.push({ key, appearance: appearanceFor(settings, scope) });
  }
  const css = buildCss(columns, messages.appearance.timeParens);

  const style = styleElement();
  if (style.textContent !== css) style.textContent = css;

  lastColumns = columns;
  lastMessages = messages;
  stampMediaFrames();
};
