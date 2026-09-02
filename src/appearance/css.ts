/** Builds CSS from the appearance settings. Takes the effective values per column and returns a string */
import {
  ARTICLE,
  CELL_SELECTOR,
  LINK_CARD,
  PHOTO,
  USER_CELL,
  VIDEO,
  WHO_TO_FOLLOW_MORE,
  X_SHOW_MORE,
} from '../filter/post.ts';
import { ATTACHMENT_CLASS } from './card.ts';
import type { ColumnScope } from '../settings/resolve.ts';
import {
  cardStyleOf,
  collapsesNewlines,
  hidesWhoToFollow,
  isCompact,
  mediaStyleOf,
  quoteStyleOf,
  timeFormatOf,
  type AppearanceNode,
} from '../settings/schema.ts';

/** The marker put on a column. Its value is the key the rules target */
export const COLUMN_ATTR = 'data-xpro-column';

/**
 * The key an appearance is applied under.
 *
 * It is built from the most specific tier that could be resolved, so a column
 * whose `columnId` is unavailable but whose account resolved still gets the
 * settings effective up to the account tier.
 * Several columns may share a key (equal effective settings mean equal rules).
 *
 * `"` and `\` are dropped because this value is written as a string inside an
 * attribute selector.
 */
export const columnKey = (scope: ColumnScope): string => {
  const safe = (value: string): string => value.replace(/["\\]/g, '');
  if (scope.columnId !== null) return `c:${safe(scope.columnId)}`;
  if (scope.account !== null) return `a:${safe(scope.account)}`;
  return 'g';
};

/**
 * The marker on a scope holding a post opened to be read (set by `appearance/apply.ts`
 * from what the surface says). That scope was opened in order to read and to reply, so
 * what makes a timeline quicker to skim is not enforced there: the line limit on the
 * body, the packing, and the dropping of line breaks all stand down.
 *
 * How a surface tells one is its own business — X Pro has the reply box appear in that
 * column alone, x.com has one timeline and goes by the address — so it arrives here as a
 * marker rather than as a selector of X's.
 */
export const OPENED_ATTR = 'data-xpro-opened';
export type ColumnAppearance = { key: string; appearance: AppearanceNode };

/**
 * The boxes holding images and videos. Also used where the markers are set
 * (`appearance/apply.ts`). What they look like is `filter/post.ts`'s to say, that being
 * the one place that knows the shape of X's DOM
 */
export const MEDIA_TARGETS = [PHOTO, ...VIDEO];

export const MEDIA_FRAME_ATTR = 'data-xpro-media';

/**
 * The marker holding a post's time in absolute form. It goes on the parent of the
 * `time`, not the `time` itself: on the parent, `::after` inherits the parent's
 * font size and color as they are, so nothing has to be measured.
 */
export const TIME_ATTR = 'data-xpro-time';

/**
 * The marker for posts from today.
 * Under "both", today's posts show `absolute (X's relative)` while older ones show
 * the absolute form alone. Putting a relative time next to an older post is no
 * help in reading it.
 */
export const TODAY_ATTR = 'data-xpro-today';

/** The marker on the bar carrying the column name. Used to narrow it down to one */
export const HEADER_ATTR = 'data-xpro-header';

/** The class put on posts opened via "Show more". Lifts the line limit for that cell only */
export const OPENED_CLASS = 'xpro-lines-open';

/**
 * The class on the "Show more" the line limit puts under a body it cut off.
 * Its look lives in `filter/styles.css`; here it counts as a link, so the link color
 * covers it as it covers X's own button of the same name.
 */
export const MORE_CLASS = 'xpro-more';

/** The colors X shows dim text in. Fixed per theme */
const MUTED_COLORS = ['rgb(113, 118, 123)', 'rgb(83, 100, 113)', 'rgb(139, 152, 165)'];

/** The colors X uses for links. Users pick from six */
const LINK_COLORS = [
  'rgb(29, 155, 240)', // blue (default)
  'rgb(255, 212, 0)', // yellow
  'rgb(249, 24, 128)', // pink
  'rgb(120, 86, 255)', // purple
  'rgb(255, 122, 0)', // orange
  'rgb(0, 186, 124)', // green
];

/**
 * The avatar in a post.
 *
 * The one marker that sits in every post's own skeleton, so the packing takes its
 * bearings from it. X's class names are generated (`css-g5y9jx r-1iusvr4 …`) and a path
 * written as `> div > div` stops matching the moment the tree changes shape, without
 * anything looking broken.
 */
const AVATAR_BOX = '[data-testid="Tweet-User-Avatar"]';

/** How wide a packed avatar is. X Pro's own is 33px */
const COMPACT_AVATAR_SIZE = 24;

/**
 * How far from the right edge the buttons float when packed.
 *
 * The room taken by the "…" that opens a post's menu, measured on the real thing: a
 * 15px box with a 7px gap beside it. Being off here only shifts the buttons sideways.
 */
const COMPACT_ACTIONS_RIGHT = 24;

/**
 * The room opened up to the left of the "…" for those buttons.
 *
 * Given as a margin on the "…" itself, which pushes the name and the time to give way.
 * X already cuts a long name with an ellipsis to fit the width it is given, so too much
 * room only cuts the name a little early, while too little lets the name run under the
 * buttons.
 */
const COMPACT_ACTIONS_ROOM = 72;

/** The button that opens a post's menu, at the right end of the name row */
const POST_MENU = 'button[data-testid="caret"]';

/**
 * The row of buttons under a post. Named here because both the row itself and its
 * contents are targeted.
 */
const ACTION_BAR = '[role="group"]:has([data-testid="reply"])';

/** What the 10px above and below a post shrinks to when packed */
const COMPACT_GAP = 2;

/**
 * The marker on a card or an article whose text was moved into the post (set by
 * `appearance/apply.ts`). Only what was actually moved is hidden: hiding every card
 * would take the link with it wherever there was no body to move the text into.
 */
export const CARD_MOVED_ATTR = 'data-xpro-card-moved';

/**
 * The marker on a post whose photos and videos were marked in its body (set by
 * `appearance/apply.ts`). The mark-only style hides them here alone: a post with no body
 * to put a mark in would otherwise be left with its media gone and nothing said about
 * it, which reads as an empty post.
 */
export const MEDIA_MARKED_ATTR = 'data-xpro-media-marked';

const TARGETS = {
  text: ['[data-testid="tweetText"]'],
  /** What is inside the body text. The spans carry their own styling, so they are set alongside the container */
  insideText: ['[data-testid="tweetText"] *'],
  /*
   * The body text excluding what is inside a quote. Where the line limit applies.
   * A quote is part of the quoting post, so clamping it separately clamps twice
   * and makes it hard to read.
   */
  textOutsideQuote: ['[data-testid="tweetText"]:not([role="link"] [data-testid="tweetText"])'],
  name: ['[data-testid="User-Name"] span'],
  /** Timestamps, counts, reply targets, and the like */
  muted: MUTED_COLORS.map((color) => `[style*="color: ${color}"]`),
  /** The column name in the column header. The `h2` in that same header (the account name) is the dim text instead */
  columnTitle: ['[data-testid="column-title-wrapper"] h1'],
  /** What sits inside a media frame. Used to fit it within the frame */
  insideFrame: [`[${MEDIA_FRAME_ATTR}] *`],
  /** The bar showing the column name (the marker is set by `appearance/apply.ts`) */
  columnHeader: [`[${HEADER_ATTR}]`],
  /** The containers inside that bar. Made transparent so the bar's color is not covered */
  headerInner: [
    `[${HEADER_ATTR}] div:has([data-testid="column-title-wrapper"])`,
    `[${HEADER_ATTR}] [data-testid="column-title-wrapper"]`,
  ],
  /** The tab bar ("For you" and friends). It is the same component as the horizontal image lists, so tell them apart by the tabs */
  tabBar: ['[role="tablist"]:has([role="tab"])', 'nav:has([role="tab"])'],
  /** The black square X lays under avatar images */
  avatarBackdrop: ['[data-testid^="UserAvatar-Container"] div'],
  /** Links. "Show more" is not an `a`, so it is picked up by its marker */
  link: [
    '[data-testid="tweetText"] a',
    X_SHOW_MORE,
    `.${MORE_CLASS}`,
    // The lines put into a post that do open something. They are `a` and would be
    // covered by the rule above where they sit in a body, but a post with no body takes
    // its line outside one.
    // The ones with nowhere to go are left out: they are not links and are not painted
    // like them
    `a.${ATTACHMENT_CLASS}`,
    ...LINK_COLORS.map((color) => `a[style*="color: ${color}"]`),
  ],
  /** X's own "Show more", on a post X itself has cut */
  xShowMore: [X_SHOW_MORE],
  /** The avatar, and the boxes nested inside it that each carry a size of their own */
  avatarBox: [AVATAR_BOX],
  insideAvatar: [`${AVATAR_BOX} *`],
  /**
   * The band above a post, where "X reposted" goes. It carries the padding that separates
   * one post from the one above. Found as the element the post's own row follows.
   */
  postTop: [`div:has(+ div > div > ${AVATAR_BOX})`],
  insidePostTop: [`div:has(+ div > div > ${AVATAR_BOX}) *`],
  /** The column beside the avatar: the name, the body, the media. It carries the padding below a post */
  postBody: [`div:has(> ${AVATAR_BOX}) + div`],
  /**
   * The containers between the row of buttons and the column it sits in.
   *
   * X gives nearly every one of its containers `position: relative`, so the nearest one
   * of them, not the column, would decide where the buttons land once they are taken out
   * of the flow. They are put back to `static` to hand that job to the column.
   * The column itself is not matched: it is reached by the descendant combinator.
   *
   * The row is named by `[role="group"]` alone rather than by `ACTION_BAR`, because a
   * `:has()` inside another `:has()` is not valid and the whole rule would be thrown away.
   * Matching one container too many only costs it its `position`, which it is not using.
   */
  aboveActionBar: [`div:has(> ${AVATAR_BOX}) + div div:has([role="group"])`],
  /** The button that opens a post's menu. Made to give up room on its left */
  postMenu: [POST_MENU],
  /**
   * The row of reply, repost and like buttons.
   * Told apart by the buttons it holds: its `aria-label` reads "209 件の表示", which is
   * worded and counted per UI language.
   */
  actionBar: [ACTION_BAR],
  /**
   * Everything in that row other than repost and like.
   *
   * Written to cover both shapes X might use: each button wrapped in a container of its
   * own, or the buttons sitting in the row directly. Matching only the first would hide
   * the two buttons meant to be kept.
   */
  otherActions: [
    `${ACTION_BAR} > *:not(:has([data-testid="retweet"])):not(:has([data-testid="like"]))` +
      `:not([data-testid="retweet"]):not([data-testid="like"])`,
  ],
  divider: ['[data-testid="cellInnerDiv"] > div'],
  photo: ['[data-testid="tweetPhoto"] img'],
  media: MEDIA_TARGETS,
  mediaFrame: [`[${MEDIA_FRAME_ATTR}]`],
  /**
   * The frames a link card and an article are drawn in. Each carries its own border, so
   * hiding these takes the frame along with the contents.
   * An article's frame has no marker of its own, and is found as the element its cover
   * image hangs directly off.
   */
  cardFrame: [LINK_CARD, `div:has(> ${ARTICLE})`],
  /** A card whose text is now in the post. What is left would only say it twice */
  movedCard: [`[${CARD_MOVED_ATTR}]`],
  /**
   * The block of accounts X suggests following, cell by cell: the "Show more" that closes
   * it (see `WHO_TO_FOLLOW_MORE`), the accounts above that link, and the heading above
   * those. Each is tied to the link, so a run of accounts standing for anything else —
   * the results of a search for people, say — is left alone.
   *
   * The empty cell X puts before the heading stays: it carries no mark of what follows
   * it, and all it holds is a few pixels of height.
   */
  whoToFollow: [
    `${CELL_SELECTOR}:has(${WHO_TO_FOLLOW_MORE})`,
    `${CELL_SELECTOR}:has(${USER_CELL}):has(~ ${CELL_SELECTOR} ${WHO_TO_FOLLOW_MORE})`,
    `${CELL_SELECTOR}:has(+ ${CELL_SELECTOR} ${USER_CELL}):has(~ ${CELL_SELECTOR} ${WHO_TO_FOLLOW_MORE})`,
  ],
  /** The photos and videos of a post that carries their marks */
  markedMedia: [...MEDIA_TARGETS, `[${MEDIA_FRAME_ATTR}]`].map(
    (target) => `[${MEDIA_MARKED_ATTR}] ${target}`
  ),
};

/**
 * The same block of accounts as `TARGETS.whoToFollow`, as x.com draws it in the rail
 * beside the timeline: an `aside` of its own rather than cells in the timeline.
 *
 * It is not confined to a scope, because the rail belongs to no view (`surface/x.ts`) and
 * carries no marker. x.com has one view on screen at a time, so the view being looked at
 * is the one that decides. X Pro has no such rail, and there this matches nothing.
 *
 * An `aside` listing accounts in the rail is only ever this block, so the link the
 * timeline needs to tell it apart is not needed here. What is hidden is the card around
 * it: the `aside` alone would leave its border behind with nothing inside.
 */
const WHO_TO_FOLLOW_RAIL = `[data-testid="sidebarColumn"] div:has(> div > aside ${USER_CELL})`;

/** Confines every target inside that column's marker */
const within = (scope: string, targets: string[][]): string =>
  targets.flat().map((target) => `${scope} ${target}`).join(', ');

const rule = (selector: string, body: string): string => `${selector} { ${body} }`;

/** Writes a string into CSS `content`. A single symbol in a dictionary message would break the rule, so escape it */
const cssString = (text: string): string => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * The rules for one column. Items left unset emit no lines at all:
 * "unset means X Pro's own look" is satisfied by writing no rule.
 */
const columnRules = (
  { key, appearance }: ColumnAppearance,
  parens: { open: string; close: string }
): string[] => {
  const scope = `[${COLUMN_ATTR}="${key}"]`;
  const { colors, media } = appearance;
  const rules: string[] = [];

  if (colors.background) rules.push(rule(scope, `background-color: ${colors.background} !important;`));

  if (appearance.columnWidth !== null) {
    // X Pro sets the width too, so it takes all three to have any effect
    const width = `${appearance.columnWidth}px`;
    rules.push(rule(scope, `width: ${width} !important; min-width: ${width} !important; max-width: ${width} !important;`));
  }

  /**
   * The scope with no post opened. What only serves skimming a timeline is confined to
   * it (see `OPENED_ATTR`).
   */
  const skimming = `${scope}:not([${OPENED_ATTR}])`;

  if (isCompact(appearance.compact)) {
    /*
     * The band above a post carries the padding that separates it from the post above.
     * Which element inside that band holds the padding is not fixed, so the whole branch
     * is zeroed and the gap is put back on the band itself. That way the result is the
     * same gap however deeply X nests it.
     */
    rules.push(rule(within(skimming, [TARGETS.postTop]), `padding-top: ${COMPACT_GAP}px !important;`));
    rules.push(rule(within(skimming, [TARGETS.insidePostTop]), 'padding-top: 0 !important;'));
    // Below a post the padding sits on the column beside the avatar, in one place
    rules.push(rule(within(skimming, [TARGETS.postBody]), `padding-bottom: ${COMPACT_GAP}px !important;`));
    /*
     * The avatar is a nest of boxes, each carrying the same size, and some of them make
     * their height out of `padding-bottom` (the trick for holding an aspect ratio).
     * Replacing the outer size alone would leave the inner ones as they were, so they are
     * all made to follow. The three width properties are needed for the same reason the
     * column width needs them: X writes its own.
     */
    const avatar = `${COMPACT_AVATAR_SIZE}px`;
    rules.push(
      rule(
        within(skimming, [TARGETS.avatarBox]),
        `width: ${avatar} !important; min-width: ${avatar} !important; max-width: ${avatar} !important; ` +
          `height: ${avatar} !important;`
      )
    );
    rules.push(
      rule(
        within(skimming, [TARGETS.insideAvatar]),
        'width: 100% !important; height: 100% !important; min-width: 0 !important; ' +
          'padding-bottom: 0 !important;'
      )
    );
    /*
     * The row of buttons is floated up beside the name instead of being hidden.
     *
     * Hiding it outright took a whole line's worth of height, but it also took away the
     * repost and the like: there was no way to act on a post at all. Floating it out of
     * the flow keeps that height (nothing below moves up around it) while leaving the two
     * buttons within reach, to the left of the "…" that opens the post's menu.
     *
     * The base is the column beside the avatar, not the name row: a base of the name row
     * would confine the buttons to its height and leave nowhere to sit them.
     */
    rules.push(rule(within(skimming, [TARGETS.postBody]), 'position: relative !important;'));
    rules.push(rule(within(skimming, [TARGETS.aboveActionBar]), 'position: static !important;'));
    rules.push(
      rule(
        within(skimming, [TARGETS.actionBar]),
        // The height is left to the buttons themselves. Pinned to a number, the row would
        // stand taller than the line the "…" sits on and the two would not line up
        `position: absolute !important; top: 0 !important; right: ${COMPACT_ACTIONS_RIGHT}px !important; ` +
          `left: auto !important; width: auto !important; height: auto !important; ` +
          `margin: 0 !important; justify-content: flex-end !important; align-items: center !important; ` +
          `gap: 12px !important;`
      )
    );
    // Only the repost and the like are kept. Reply, the view count and the rest would not fit beside a name
    rules.push(rule(within(skimming, [TARGETS.otherActions]), 'display: none !important;'));
    /*
     * Opens up the room they sit in, by pushing the "…" away from the name.
     * Padding on the name row would not do: the "…" lives inside that row, so padding
     * would carry it along and leave the buttons stranded to its right.
     */
    rules.push(
      rule(within(skimming, [TARGETS.postMenu]), `margin-left: ${COMPACT_ACTIONS_ROOM}px !important;`)
    );

    /*
     * X's own "Show more" goes as well, for the reason the extension's own is not put in
     * while the posts are packed (`appearance/apply.ts`): packing is for fitting more
     * posts on screen, and a line of its own under every cut-off post works against that.
     * What X cut is still read by opening the post, where nothing is packed.
     */
    rules.push(rule(within(skimming, [TARGETS.xShowMore]), 'display: none !important;'));
  }

  if (appearance.maxLines !== null) {
    // A column with a post opened gets neither the limit nor "Show more"
    /*
     * Lines are counted after wrapping on screen.
     *
     * The cut is done by `-webkit-line-clamp`, which cuts at line boundaries, so
     * characters stay whole even when emoji make a line taller (cutting by height
     * would slice the bottom off the last line).
     */
    rules.push(
      rule(
        within(skimming, [TARGETS.textOutsideQuote]),
        `display: -webkit-box !important; -webkit-box-orient: vertical !important; ` +
          `-webkit-line-clamp: ${appearance.maxLines} !important; overflow: hidden !important;`
      )
    );
    /*
     * Puts the container wrapping the body back to block.
     * `-webkit-line-clamp` needs `display: -webkit-box`, but children of a flex
     * container are blockified, so it has no effect where X puts the body inside a flex.
     */
    rules.push(
      rule(
        within(skimming, [[`*:has(> [data-testid="tweetText"]):not([role="link"] *)`]]),
        'display: block !important;'
      )
    );
    /*
     * Lifts the limit for posts opened via "Show more" only.
     * The target has the same shape as the limit's rule (with the quote-excluding
     * condition). `:not()` carries the specificity of its contents, so dropping the
     * condition would let the limit win and the post would not open.
     */
    rules.push(
      rule(
        within(skimming, [
          [`.${OPENED_CLASS} [data-testid="tweetText"]:not([role="link"] [data-testid="tweetText"])`],
        ]),
        'display: block !important; -webkit-line-clamp: none !important; ' +
          'line-clamp: none !important; max-height: none !important; overflow: visible !important;'
      )
    );
    /*
     * Lifts the clamping on the container wrapping the body as well.
     * X sometimes clamps lines on the outer container rather than on the body
     * itself, and lifting it on the body alone leaves the post closed. Only the
     * line-count properties are lifted; display and overflow are left untouched
     * (touching them breaks X's layout).
     */
    rules.push(
      rule(
        within(skimming, [[`.${OPENED_CLASS} :has([data-testid="tweetText"])`]]),
        '-webkit-line-clamp: none !important; line-clamp: none !important;'
      )
    );
  }

  /*
   * Dropping the line breaks written into a post.
   *
   * X keeps them as real newlines in the text and shows them through `white-space:
   * pre-wrap`, so putting that back to `normal` folds each one into a single space. The
   * text itself is not touched, and a break becomes a space rather than nothing, so words
   * on either side do not run together.
   * `white-space` is inherited, but the spans inside the body carry styling of their own,
   * so they are set alongside it.
   */
  if (collapsesNewlines(appearance.collapseNewlines)) {
    rules.push(
      rule(within(skimming, [TARGETS.text, TARGETS.insideText]), 'white-space: normal !important;')
    );
  }

  if (appearance.fontSize !== null) {
    rules.push(rule(within(scope, [TARGETS.text]), `font-size: ${appearance.fontSize}px !important;`));
  }

  if (colors.text) {
    rules.push(rule(within(scope, [TARGETS.text]), `color: ${colors.text} !important;`));
  }

  if (colors.name) {
    rules.push(rule(within(scope, [TARGETS.name]), `color: ${colors.name} !important;`));
  }

  // The name area also holds the @ID and the timestamp, so this goes after the name
  // to let the dim text win by coming later
  if (colors.meta) {
    rules.push(rule(within(scope, [TARGETS.muted]), `color: ${colors.meta} !important;`));
    // Put the icons back to their original color
    MUTED_COLORS.forEach((color) => {
      rules.push(rule(within(scope, [[`[style*="color: ${color}"] svg`]]), `color: ${color} !important;`));
    });
  }

  if (colors.columnTitle) {
    rules.push(rule(within(scope, [TARGETS.columnTitle]), `color: ${colors.columnTitle} !important;`));
  }

  if (colors.columnHeader) {
    rules.push(
      rule(within(scope, [TARGETS.columnHeader]), `background-color: ${colors.columnHeader} !important;`)
    );
    // Make the inner containers transparent. Only one layer is painted, so anything
    // stacked on top would hide the color
    rules.push(rule(within(scope, [TARGETS.headerInner]), 'background-color: transparent !important;'));
  }

  // Placed after the column-name bar. The tab bar belongs to the timeline rather than
  // to that bar, so it follows the column background even when a bar color is set
  if (colors.background) {
    rules.push(
      rule(within(scope, [TARGETS.tabBar]), `background-color: ${colors.background} !important;`)
    );
  }

  // Only when either color is painted. Keeps X's black backdrop from being left behind as a square
  if (colors.background || colors.columnHeader) {
    rules.push(rule(within(scope, [TARGETS.avatarBackdrop]), 'background-color: transparent !important;'));
  }

  if (colors.link) {
    rules.push(rule(within(scope, [TARGETS.link]), `color: ${colors.link} !important;`));
  }

  if (colors.border) {
    rules.push(
      rule(within(scope, [TARGETS.divider]), `border-bottom-color: ${colors.border} !important;`)
    );
  }

  if (media.maxThumbHeight !== null) {
    const maxHeight = `${media.maxThumbHeight}px`;
    // The box is what carries the height; a limit on the `img` inside has no effect
    rules.push(
      rule(within(scope, [TARGETS.media]), `max-height: ${maxHeight} !important; overflow: hidden !important;`)
    );
    /*
     * The frame gets its height replaced outright (not `max-height`).
     * Removing the `aspect-ratio` and `padding-bottom` that create the height leaves
     * it at 0, since the contents are absolutely positioned, and `max-height` then
     * determines no height at all.
     */
    rules.push(
      rule(
        within(scope, [TARGETS.mediaFrame]),
        `height: ${maxHeight} !important; padding-bottom: 0 !important; ` +
          `aspect-ratio: auto !important; overflow: hidden !important;`
      )
    );
    // Shrink the contents along with it, keeping the rounded corners of the inner container
    rules.push(rule(within(scope, [TARGETS.insideFrame]), 'max-height: 100% !important;'));
    // Where there is an `img`, keep its aspect ratio intact while it is cropped
    rules.push(rule(within(scope, [TARGETS.photo]), 'object-fit: cover !important;'));
  }

  /*
   * How a post's time is shown.
   *
   * X's own text is not removed, only hidden; drop the marker and the rules and it
   * comes back. For the absolute-only form, X's `time` is set to `display: none`
   * and the parent's `::after` shows in its place.
   */
  const timeFormat = timeFormatOf(appearance.timeFormat);
  if (timeFormat !== 'relative') {
    const absoluteOnly = (selector: string) => [
      rule(`${selector}::after`, `content: attr(${TIME_ATTR}) !important;`),
      rule(`${selector} > time`, 'display: none !important;'),
    ];
    if (timeFormat === 'absolute') {
      rules.push(...absoluteOnly(`${scope} [${TIME_ATTR}]`));
    } else {
      /*
       * Today's posts read `absolute (X's relative)`.
       * X's own text is kept as the parenthesized part, wrapped by `::before` and
       * `::after`. That keeps X's wording (language, units) as is, and it follows
       * along automatically whenever X recounts.
       */
      const today = `${scope} [${TIME_ATTR}][${TODAY_ATTR}]`;
      rules.push(
        rule(`${today}::before`, `content: attr(${TIME_ATTR}) ${cssString(parens.open)} !important;`),
        rule(`${today}::after`, `content: ${cssString(parens.close)} !important;`)
      );
      // Older posts start from the date; the relative time is hidden
      rules.push(...absoluteOnly(`${scope} [${TIME_ATTR}]:not([${TODAY_ATTR}])`));
    }
  }

  const cardStyle = cardStyleOf(appearance.cardStyle);
  const quoteStyle = quoteStyleOf(appearance.quoteStyle);

  /*
   * Taking the photos and videos off the timeline only hides them. The elements stay, so
   * unsetting brings them back. Hiding the box alone leaves the frame taking up space,
   * so the frame is hidden too.
   *
   * Confined to the scope with nothing opened (see `OPENED_ATTR`). A post was
   * opened in order to be read, and what is worth taking off a timeline is worth seeing
   * there.
   *
   * Under `text` and `mark` the hiding is confined to the posts that carry the line:
   * hiding them everywhere would leave a post with no body to put a line in with its
   * photos gone and nothing said about it, which reads as an empty post (see
   * `MEDIA_MARKED_ATTR`).
   */
  const mediaStyle = mediaStyleOf(media.style);
  if (mediaStyle === 'hidden') {
    rules.push(
      rule(within(skimming, [TARGETS.media, TARGETS.mediaFrame]), 'display: none !important;')
    );
  } else if (mediaStyle === 'text' || mediaStyle === 'mark') {
    rules.push(rule(within(skimming, [TARGETS.markedMedia]), 'display: none !important;'));
  }

  /*
   * How link cards and articles are shown. Confined to the column with nothing opened,
   * for the same reason as the media above: the post that was opened is being read.
   * `appearance/apply.ts` leaves such a column alone too, so no line is put into a post
   * whose card is still on screen.
   */
  if (cardStyle === 'hidden') {
    rules.push(rule(within(skimming, [TARGETS.cardFrame]), 'display: none !important;'));
  }

  /*
   * What `appearance/apply.ts` has taken off a post: a card or an article whose line is
   * now in the body, and a quote, which is marked there whichever way it is shown — a
   * quote frame is told apart by the avatar inside it not being the author's, and no
   * selector can say that.
   * Only what was actually marked is hidden, so nothing goes without leaving a word behind.
   */
  if (cardStyle === 'text' || cardStyle === 'mark' || quoteStyle !== 'show') {
    rules.push(rule(within(skimming, [TARGETS.movedCard]), 'display: none !important;'));
  }

  /*
   * Taking the accounts X suggests following off the timeline.
   *
   * Not held back where a post is opened, unlike the media and the cards above: those
   * belong to the post that was opened to be read, while this block is X's own aside and
   * is no more wanted there than on a timeline.
   */
  if (hidesWhoToFollow(appearance.hideWhoToFollow)) {
    rules.push(rule(within(scope, [TARGETS.whoToFollow]), 'display: none !important;'));
  }

  return rules;
};

export const buildCss = (
  columns: ColumnAppearance[],
  parens: { open: string; close: string }
): string => {
  const rules = columns.flatMap((column) => columnRules(column, parens));
  /*
   * The rail is nobody's scope, so its rule is written here rather than per column: from
   * inside `columnRules` the same line would come out once per key.
   */
  if (columns.some((column) => hidesWhoToFollow(column.appearance.hideWhoToFollow))) {
    rules.push(rule(WHO_TO_FOLLOW_RAIL, 'display: none !important;'));
  }
  return rules.join('\n');
};
