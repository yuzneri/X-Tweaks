/** Builds CSS from the appearance settings: effective values per column in, a CSS string out */
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
import { ATTACHMENT_CLASS, ATTACHMENT_WORDS_CLASS } from './card.ts';
import type { ColumnScope } from '../settings/resolve.ts';
import {
  cardStyleOf,
  collapsesNewlines,
  isCompact,
  mediaStyleOf,
  quoteStyleOf,
  timeFormatOf,
  type InjectedSettings,
  X_MENU_KEYS,
  X_NAV_KEYS,
  X_RAIL_KEYS,
  type AppearanceNode,
  type XChromeSettings,
  type XMenuKey,
  type XNavKey,
  type XRailKey,
} from '../settings/schema.ts';

/** The marker put on a column. Its value is the key the rules target */
export const COLUMN_ATTR = 'data-xpro-column';

/**
 * Drops characters that would end an attribute selector's string early. Every value inside
 * `[attr="…"]` goes through this: a page's screen name holds neither, but a settings file
 * from elsewhere can carry any key (`nodeMap` in `settings/schema.ts`), and a `"` would
 * close the selector and expose the rest as CSS.
 */
export const safeInSelector = (value: string): string => value.replace(/["\\]/g, '');

/**
 * The marker on the form a new post is written in, carrying the account it posts as (written
 * by `appearance/compose-mark.ts`). A marker, not a selector: the form holds other avatars
 * too (a quoted post brings one), and a selector cannot say "the first one".
 */
export const COMPOSE_ATTR = 'data-xpro-compose';

/**
 * The key an appearance is applied under, built from the most specific tier resolved: a
 * column with no `columnId` but a resolved account gets the account tier's settings. Columns
 * with equal effective settings share a key. `"` and `\` are dropped as this is a string
 * inside an attribute selector.
 */
export const columnKey = (scope: ColumnScope): string => {
  if (scope.columnId !== null) return `c:${safeInSelector(scope.columnId)}`;
  if (scope.account !== null) return `a:${safeInSelector(scope.account)}`;
  return 'g';
};

/**
 * The marker on a scope holding a post opened to be read (set by `appearance/apply.ts`).
 * What only helps skimming — line limit, packing, dropping line breaks — stands down there.
 * A marker, not a selector: X Pro shows the reply box in that column alone; x.com has one
 * timeline and goes by the address.
 */
export const OPENED_ATTR = 'data-xpro-opened';
export type ColumnAppearance = { key: string; appearance: AppearanceNode };

/** The boxes for images and videos; also where markers are set (`appearance/apply.ts`) */
export const MEDIA_TARGETS = [PHOTO, ...VIDEO];

export const MEDIA_FRAME_ATTR = 'data-xpro-media';

/**
 * The marker holding a post's time in absolute form. Goes on `time`'s parent, not `time`
 * itself: there `::after` inherits font size and colour as-is, so nothing needs measuring.
 */
export const TIME_ATTR = 'data-xpro-time';

/**
 * The marker for posts from today. Under "both", today's posts show
 * `absolute (X's relative)`; older ones show the absolute form alone.
 */
export const TODAY_ATTR = 'data-xpro-today';

/**
 * The marker on a reaction count written out in full. Goes on the box X animates the number
 * inside, saying only that our number is present — the number itself sits in the element
 * beside X's (`COUNT_CLASS`). Only counts X rounded off carry one (`appearance/counts.ts`).
 */
export const COUNT_ATTR = 'data-xpro-count';

/**
 * The class on the number written out in full: a copy of X's own element, class list and
 * all, with the number swapped in (`appearance/apply.ts`). An `::after` on the box instead
 * came out too big — X styles the count on the element *inside* the box (13px against the
 * box's 15px, measured), and a pseudo-element cannot inherit from a child.
 */
export const COUNT_CLASS = 'xpro-count';

/** The marker on the bar carrying the column name. Used to narrow it down to one */
export const HEADER_ATTR = 'data-xpro-header';

/** The class put on posts opened via "Show more". Lifts the line limit for that cell only */
export const OPENED_CLASS = 'xpro-lines-open';

/**
 * The class on the "Show more" the line limit puts under a cut-off body. Its look lives in
 * `filter/styles.css`; here it counts as a link, so the link colour covers it too.
 */
export const MORE_CLASS = 'xpro-more';

/** The class on the description written under a picture (`appearance/apply.ts`) */
export const CAPTION_CLASS = 'xpro-caption';

/**
 * The class on the words inside a caption, given their own element because
 * `-webkit-line-clamp` folding would take the button that opens them along with the text.
 */
export const CAPTION_TEXT_CLASS = 'xpro-caption-text';

/**
 * The class on the "Show more" under a folded caption. Kept apart from `MORE_CLASS`, whose
 * look it shares: that one is swept away wherever no column sets a line limit, and a
 * caption's button is unrelated to that limit.
 */
export const CAPTION_MORE_CLASS = 'xpro-caption-more';

/** The class on a caption that has been opened. Lifts the fold for that caption alone */
export const CAPTION_OPEN_CLASS = 'xpro-caption-open';

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
 * The avatar in a post: the one marker in every post's own skeleton, so packing takes its
 * bearings from it. X's class names are generated (`css-g5y9jx r-1iusvr4 …`), and a path
 * like `> div > div` stops matching the moment the tree changes shape without looking broken.
 */
const AVATAR_BOX = '[data-testid="Tweet-User-Avatar"]';

/** How wide a packed avatar is. X Pro's own is 33px */
const COMPACT_AVATAR_SIZE = 24;

/**
 * How far from the right edge the buttons float when packed: the room the "…" that opens a
 * post's menu takes, measured as a 15px box with a 7px gap beside it. Being off only shifts
 * the buttons sideways.
 */
const COMPACT_ACTIONS_RIGHT = 24;

/**
 * The room opened left of the "…" for those buttons, as a margin on the "…" itself, pushing
 * the name and time aside. X already ellipsis-cuts a long name to fit the width given, so too
 * much room cuts it a little early, too little lets the name run under the buttons.
 */
const COMPACT_ACTIONS_ROOM = 72;

/** The button that opens a post's menu, at the right end of the name row */
const POST_MENU = 'button[data-testid="caret"]';

/** The row of buttons under a post. Named here because both it and its contents are targeted */
const ACTION_BAR = '[role="group"]:has([data-testid="reply"])';

/** What the 10px above and below a post shrinks to when packed */
const COMPACT_GAP = 2;

/**
 * The marker on a card or article whose text was moved into the post (`appearance/apply.ts`).
 * Only what was actually moved is hidden — hiding every card would take the link with it
 * where there was no body to move the text into.
 */
export const CARD_MOVED_ATTR = 'data-xpro-card-moved';

/**
 * The marker on a post whose photos and videos were marked in its body (`appearance/apply.ts`).
 * The mark-only style hides them here alone, so a post with no body for a mark is not left
 * with its media gone and nothing said about it.
 */
export const MEDIA_MARKED_ATTR = 'data-xpro-media-marked';

const TARGETS = {
  text: ['[data-testid="tweetText"]'],
  /** Inside the body text; the spans carry their own styling, so they're set alongside it */
  insideText: ['[data-testid="tweetText"] *'],
  /*
   * The body text excluding a quote, where the line limit applies: a quote is part of the
   * quoting post, so clamping it separately clamps twice and is hard to read.
   */
  textOutsideQuote: ['[data-testid="tweetText"]:not([role="link"] [data-testid="tweetText"])'],
  /**
   * The lines the extension appends to a post. Under a line limit they stand outside the
   * body, unreached by the body's rules, so size and colour follow them here.
   */
  attachmentLine: [`.${ATTACHMENT_CLASS}`],
  name: ['[data-testid="User-Name"] span'],
  /**
   * Timestamps, counts, reply targets and the like — plus the words a picture or quoted
   * post's line carries, dim for the same reason (about the post, not of it), so recolouring
   * secondary text covers these too.
   */
  muted: [
    ...MUTED_COLORS.map((color) => `[style*="color: ${color}"]`),
    `.${ATTACHMENT_WORDS_CLASS}`,
  ],
  /** The column name in the header; the `h2` there (account name) is the dim text instead */
  columnTitle: ['[data-testid="column-title-wrapper"] h1'],
  /** What sits inside a media frame, to fit it within the frame */
  insideFrame: [`[${MEDIA_FRAME_ATTR}] *`],
  /** The bar showing the column name (marker set by `appearance/apply.ts`) */
  columnHeader: [`[${HEADER_ATTR}]`],
  /** The containers inside that bar, made transparent so the bar's color is not covered */
  headerInner: [
    `[${HEADER_ATTR}] div:has([data-testid="column-title-wrapper"])`,
    `[${HEADER_ATTR}] [data-testid="column-title-wrapper"]`,
  ],
  /**
   * The tab bar ("For you" etc), same component as the horizontal image lists, told apart
   * by the tabs
   */
  tabBar: ['[role="tablist"]:has([role="tab"])', 'nav:has([role="tab"])'],
  /** The black square X lays under avatar images */
  avatarBackdrop: ['[data-testid^="UserAvatar-Container"] div'],
  /** Links. "Show more" is not an `a`, so it is picked up by its marker */
  link: [
    '[data-testid="tweetText"] a',
    X_SHOW_MORE,
    `.${MORE_CLASS}`,
    // The button opening a folded caption, reading as a link for the same reason
    `.${CAPTION_MORE_CLASS}`,
    // Lines put into a post that do open something: `a`, covered above where they sit
    // in a body. A post with no body takes its line outside one — left out, being
    // neither links nor painted as such
    `a.${ATTACHMENT_CLASS}`,
    ...LINK_COLORS.map((color) => `a[style*="color: ${color}"]`),
  ],
  /** X's own "Show more", on a post X itself has cut */
  xShowMore: [X_SHOW_MORE],
  /** The avatar, and the boxes nested inside it that each carry a size of their own */
  avatarBox: [AVATAR_BOX],
  insideAvatar: [`${AVATAR_BOX} *`],
  /** The band above a post ("X reposted"), carrying the padding from the post above */
  postTop: [`div:has(+ div > div > ${AVATAR_BOX})`],
  insidePostTop: [`div:has(+ div > div > ${AVATAR_BOX}) *`],
  /** The column beside the avatar: name, body, media. Carries the padding below a post */
  postBody: [`div:has(> ${AVATAR_BOX}) + div`],
  /**
   * The containers between the button row and the column it sits in. X gives nearly every
   * container `position: relative`, so the nearest one, not the column, would decide where
   * the buttons land once taken out of the flow; put back to `static` to hand that to the
   * column (itself unmatched, reached by the descendant combinator).
   *
   * Named by `[role="group"]` alone, not `ACTION_BAR`: `:has()` cannot nest, so the whole
   * rule would be thrown away. Matching one container too many only costs its unused `position`.
   */
  aboveActionBar: [`div:has(> ${AVATAR_BOX}) + div div:has([role="group"])`],
  /** The button that opens a post's menu. Made to give up room on its left */
  postMenu: [POST_MENU],
  /**
   * The row of reply, repost and like buttons, told apart by `aria-label` reading
   * "209 件の表示", worded per UI language
   */
  actionBar: [ACTION_BAR],
  /**
   * Everything in that row but repost and like. Covers both shapes X might use — each button
   * wrapped in its own container, or sitting in the row directly — since matching only the
   * first would hide the two buttons meant to be kept.
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
   * The frames a link card and an article are drawn in, each with its own border, so hiding
   * these takes the frame with the contents. An article's frame has no marker and is found
   * as the element its cover image hangs directly off.
   */
  cardFrame: [LINK_CARD, `div:has(> ${ARTICLE})`],
  /** A card whose text is now in the post. What is left would only say it twice */
  movedCard: [`[${CARD_MOVED_ATTR}]`],
  /**
   * The block of accounts X suggests following, cell by cell: the "Show more" that closes it
   * (`WHO_TO_FOLLOW_MORE`), the accounts above it, and the heading above those — each tied to
   * the link, so a run of accounts for anything else (search results for people) is left
   * alone. The empty cell before the heading stays: it carries no mark of what follows and
   * holds only a few pixels of height.
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
 * The same block of accounts as `TARGETS.whoToFollow`, as x.com draws it in the rail beside
 * the timeline: an `aside` of its own, not timeline cells. Not confined to a scope — the
 * rail belongs to no view (`surface/x.ts`) and carries no marker; x.com shows one view at a
 * time, so that view decides. X Pro has no such rail, so this matches nothing there.
 *
 * Told apart by the link that closes it, as the timeline's own cells are
 * (`WHO_TO_FOLLOW_MORE`): the accounts alone would not do, since x.com stacks a second block
 * of accounts in the same rail — the ones it calls relevant (`RAIL_BLOCKS.relevantPeople`) —
 * and matching on the link is what keeps the two switches apart. What is hidden is the card
 * around the `aside`, since the `aside` alone would leave its border behind, empty.
 */
const WHO_TO_FOLLOW_RAIL = `[data-testid="sidebarColumn"] div:has(> div > aside ${WHO_TO_FOLLOW_MORE})`;

/** Confines every target inside that column's marker */
const within = (scope: string, targets: string[][]): string =>
  targets.flat().map((target) => `${scope} ${target}`).join(', ');

const rule = (selector: string, body: string): string => `${selector} { ${body} }`;

/** Writes a string into CSS `content`; escaped since a symbol could break the rule */
const cssString = (text: string): string => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** The rules for one column; items left unset emit no lines ("unset" means X Pro's own look) */
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

  /** The scope with no post opened; skimming-only rules are confined to it (`OPENED_ATTR`) */
  const skimming = `${scope}:not([${OPENED_ATTR}])`;

  if (isCompact(appearance.compact)) {
    /*
     * The band above a post carries the padding separating it from the post above. Which
     * element inside holds it is not fixed, so the whole branch is zeroed and the gap put
     * back on the band itself, however deeply X nests it.
     */
    rules.push(rule(within(skimming, [TARGETS.postTop]), `padding-top: ${COMPACT_GAP}px !important;`));
    rules.push(rule(within(skimming, [TARGETS.insidePostTop]), 'padding-top: 0 !important;'));
    // Below a post the padding sits on the column beside the avatar, in one place
    rules.push(rule(within(skimming, [TARGETS.postBody]), `padding-bottom: ${COMPACT_GAP}px !important;`));
    /*
     * The avatar is a nest of boxes carrying the same size, some making height out of
     * `padding-bottom` (the aspect-ratio trick), so the outer size alone cannot be replaced —
     * they all follow. The three width properties, as with the column width, are needed
     * because X writes its own.
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
     * The button row floats up beside the name instead of being hidden — hiding it outright
     * took a whole line's height and lost reply-and-like too. Floating keeps that height
     * while leaving the two buttons reachable, left of the "…" that opens the post's menu.
     * Based on the column beside the avatar, not the name row, which would confine them to
     * its height with nowhere to sit.
     */
    rules.push(rule(within(skimming, [TARGETS.postBody]), 'position: relative !important;'));
    rules.push(rule(within(skimming, [TARGETS.aboveActionBar]), 'position: static !important;'));
    rules.push(
      rule(
        within(skimming, [TARGETS.actionBar]),
        // Height is left to the buttons: pinned to a number, the row would stand taller
        // than the "…"'s line and the two would not line up
        `position: absolute !important; top: 0 !important; right: ${COMPACT_ACTIONS_RIGHT}px !important; ` +
          `left: auto !important; width: auto !important; height: auto !important; ` +
          `margin: 0 !important; justify-content: flex-end !important; align-items: center !important; ` +
          `gap: 12px !important;`
      )
    );
    // Only repost and like are kept; reply, the view count and the rest would not fit beside a name
    rules.push(rule(within(skimming, [TARGETS.otherActions]), 'display: none !important;'));
    /*
     * Opens room for them by pushing the "…" away from the name. Padding on the name row
     * would not do, since the "…" lives inside it and would strand the buttons to its right.
     */
    rules.push(
      rule(within(skimming, [TARGETS.postMenu]), `margin-left: ${COMPACT_ACTIONS_ROOM}px !important;`)
    );

    /*
     * X's own "Show more" goes too, matching why the extension's own is not shown while packed
     * (`appearance/apply.ts`): packing fits more posts on screen, and X's cut is still
     * readable by opening the post.
     */
    rules.push(rule(within(skimming, [TARGETS.xShowMore]), 'display: none !important;'));
  }

  if (appearance.maxLines !== null) {
    /*
     * Lines are counted after wrapping on screen, cut by `-webkit-line-clamp`, which cuts at
     * line boundaries so characters stay whole even when emoji make a line taller (cutting by
     * height would slice the bottom off the last line).
     */
    rules.push(
      rule(
        within(skimming, [TARGETS.textOutsideQuote]),
        `display: -webkit-box !important; -webkit-box-orient: vertical !important; ` +
          `-webkit-line-clamp: ${appearance.maxLines} !important; overflow: hidden !important;`
      )
    );
    /*
     * Puts the body's wrapping container back to block: `-webkit-line-clamp` needs
     * `display: -webkit-box`, but flex children are blockified, so it has no effect where X
     * puts the body inside a flex.
     */
    rules.push(
      rule(
        within(skimming, [[`*:has(> [data-testid="tweetText"]):not([role="link"] *)`]]),
        'display: block !important;'
      )
    );
    /*
     * Lifts the limit for posts opened via "Show more" only. Same shape as the limit's rule
     * (with the quote-excluding condition), since dropping that would let `:not()`'s
     * specificity win and the post would not open.
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
     * Lifts the clamping on the wrapping container too: X sometimes clamps on the outer
     * container rather than the body itself. Only the line-count properties are lifted;
     * display and overflow are left alone (touching them breaks X's layout).
     */
    rules.push(
      rule(
        within(skimming, [[`.${OPENED_CLASS} :has([data-testid="tweetText"])`]]),
        '-webkit-line-clamp: none !important; line-clamp: none !important;'
      )
    );
  }

  /*
   * Dropping the line breaks in a post. X keeps them as real newlines shown via
   * `white-space: pre-wrap`; setting that to `normal` folds each into a single space, so
   * words either side do not run together. `white-space` inherits, but the body's spans carry
   * their own styling, so they're set alongside it.
   */
  if (collapsesNewlines(appearance.collapseNewlines)) {
    rules.push(
      rule(within(skimming, [TARGETS.text, TARGETS.insideText]), 'white-space: normal !important;')
    );
  }

  if (appearance.fontSize !== null) {
    rules.push(
      rule(
        within(scope, [TARGETS.text, TARGETS.attachmentLine]),
        `font-size: ${appearance.fontSize}px !important;`
      )
    );
  }

  if (colors.text) {
    rules.push(
      rule(within(scope, [TARGETS.text, TARGETS.attachmentLine]), `color: ${colors.text} !important;`)
    );
  }

  if (colors.name) {
    rules.push(rule(within(scope, [TARGETS.name]), `color: ${colors.name} !important;`));
  }

  // The name area also holds the @ID and the timestamp, so this goes after the name
  // to let the dim text win by coming later
  if (colors.meta) {
    rules.push(rule(within(scope, [TARGETS.muted]), `color: ${colors.meta} !important;`));
    // Put the icons back to their original colour
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
     * The frame is held to the limit, not given it: X's `aspect-ratio`/`padding-bottom`
     * shape is left alone, since removing it would drop the frame to nothing (contents are
     * absolutely positioned). `max-height` holds either shape; one drawn from a percentage
     * `padding-bottom` ignores it and is capped where written instead (`appearance/apply.ts`).
     *
     * Width is held, not set: a box with a ratio and a capped height takes its width from the
     * ratio, turning a wide picture held to 200px into a 200px square with the column empty
     * beside it (measured). `width`, not `min-width` — X lays several pictures as a row, and
     * a frame in a row takes its width from the row, while a lone picture (what this is for)
     * keeps its own. `min-width` clamps a row's frames too, and on a two-up row threw the
     * second picture clear of the column (measured).
     */
    rules.push(
      rule(
        within(scope, [TARGETS.mediaFrame]),
        `max-height: ${maxHeight} !important; width: 100% !important; overflow: hidden !important;`
      )
    );
    // Shrink the contents along with it, keeping the rounded corners of the inner container
    rules.push(rule(within(scope, [TARGETS.insideFrame]), 'max-height: 100% !important;'));
    // Where there is an `img`, keep its aspect ratio intact while it is cropped
    rules.push(rule(within(scope, [TARGETS.photo]), 'object-fit: cover !important;'));
  }

  /*
   * How a post's time is shown. X's own text is only hidden, not removed, so dropping the
   * marker brings it back. For the
   * absolute-only form, X's `time` gets `display: none` and the parent's `::after` shows instead.
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
       * Today's posts read `absolute (X's relative)`: X's own text is wrapped by
       * `::before`/`::after` as the parenthesised part, keeping its wording (language,
       * units) live as X recounts.
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
   * Taking photos and videos off the timeline only hides them, so unsetting brings them
   * back. The frame is hidden too, or it'd take up empty space.
   *
   * Confined to the scope with nothing opened (`OPENED_ATTR`): worth hiding on a timeline,
   * worth seeing once opened to read. Under `text` and `mark` it is confined further, to
   * posts carrying the line (`MEDIA_MARKED_ATTR`).
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
   * How link cards and articles are shown. Confined to the column with nothing opened, as
   * with the media above. `appearance/apply.ts` likewise leaves such a column alone, so no
   * line is put into a post whose card is still shown.
   */
  if (cardStyle === 'hidden') {
    rules.push(rule(within(skimming, [TARGETS.cardFrame]), 'display: none !important;'));
  }

  /*
   * What `appearance/apply.ts` has taken off a post: a card or article whose line is now in
   * the body, and a quote (marked there whichever way it is shown — no selector can tell a
   * quote frame apart by its avatar not being the author's). Only what was actually marked
   * is hidden, so nothing goes without leaving a word behind.
   */
  if (cardStyle === 'text' || cardStyle === 'mark' || quoteStyle !== 'show') {
    rules.push(rule(within(skimming, [TARGETS.movedCard]), 'display: none !important;'));
  }

  return rules;
};

export const buildCss = (
  columns: ColumnAppearance[],
  parens: { open: string; close: string }
): string => {
  const rules = columns.flatMap((column) => columnRules(column, parens));
  return rules.join('\n');
};

/**
 * The posts X appends under a conversation, headed "Discover more". They arrive as timeline
 * cells, like the block of accounts X suggests: one heading cell, then one cell per post
 * offered. None carry a mark, so the heading is the one conversation cell with an `h2`, and
 * what follows to the end is the block.
 *
 * Held to a conversation by X's own mark for the reply box — without it, the accounts-X-
 * suggests heading would answer on a timeline and take the whole timeline under it away, and
 * a profile's own block would answer too. Found by the `section` a conversation stands in,
 * not x.com's column: both sites draw a `section`, only x.com has the other.
 */
const DISCOVER_HEAD =
  `section:has([data-testid="inline_reply_offscreen"]) ${CELL_SELECTOR}:has(h2)`;
const DISCOVER_MORE = `${DISCOVER_HEAD}, ${DISCOVER_HEAD} ~ ${CELL_SELECTOR}`;

/**
 * What X slips into a timeline, taken away for a whole site. Not confined to a scope: these
 * are X's own doing, not a column or view's, and the setting governing them is held per site
 * (`settings/schema.ts`) — `appearance/apply.ts` decides which site is drawn.
 *
 * Every selector holds on both sites: the rail is x.com's alone and matches nothing on X
 * Pro, and the rest are timeline cells, drawn the same way on both.
 */
export const injectedCss = (injected: InjectedSettings): string => {
  const rules: string[] = [];
  // The settings say what is on the page, so a rule is written for what is not (`schema.ts`)
  if (!injected.whoToFollow) {
    rules.push(rule(TARGETS.whoToFollow.join(', '), 'display: none !important;'));
    rules.push(rule(WHO_TO_FOLLOW_RAIL, 'display: none !important;'));
  }
  if (!injected.discoverMore) {
    rules.push(rule(DISCOVER_MORE, 'display: none !important;'));
  }
  return rules.join('\n');
};

// --- x.com's own furniture ---
//
// The page around the timeline: the rail, the items down the left, the compose box, the
// new-posts bar. None belongs to a view, so none is confined to a scope — these settings
// are held for the whole site (`settings/schema.ts`). X Pro has none of this;
// `appearance/apply.ts` keeps these rules off it.

const SIDEBAR = '[data-testid="sidebarColumn"]';
const SIDE_NAV = 'header[role="banner"] nav[role="navigation"]';

/**
 * Refuses anything holding the search box. The rail's blocks are siblings but not all at the
 * same depth: accounts X suggests are wrapped one deeper on a timeline than on a post's own
 * page, so a selector for the deeper shape would match the whole rail — search box
 * included — on the shallower one. Nothing holding search is a block, so one clause rules
 * that out.
 */
const NOT_THE_WHOLE_RAIL = ':not(:has(form[role="search"]))';

/**
 * The blocks of the rail, one selector apiece, named one by one rather than "every block but
 * the search". A block X adds later stays on screen until this list catches up — the same
 * bargain `NOT_A_PROFILE` (`surface/view.ts`) makes, on a container X names nothing.
 *
 * The accounts X suggests are not here: that is X slipping something in, not page furniture,
 * answered for the whole site (`WHO_TO_FOLLOW_RAIL`).
 */
const RAIL_BLOCKS: Record<XRailKey, string> = {
  premium: `${SIDEBAR} div:has(> div > aside a[href*="/i/premium"])${NOT_THE_WHOLE_RAIL}`,
  news: `${SIDEBAR} div:has(> div[data-testid="news_sidebar"])${NOT_THE_WHOLE_RAIL}`,
  /*
   * X draws two rail blocks as a `section` — trends, and (on a profile) relevant accounts —
   * so `> section` alone would take the accounts away on every profile too. `:has()` cannot
   * nest, so the test goes inside the one `:has` as a descendant.
   */
  trends: `${SIDEBAR} div:has(> section [data-testid="trend"])${NOT_THE_WHOLE_RAIL}`,
  /*
   * One block, two shapes: a `section` beside a profile, an `aside` on a post's own page —
   * both matched here. The `aside` shape is also what X uses for accounts it suggests
   * following on a timeline; refusing the link that closes that block keeps this switch off
   * `WHO_TO_FOLLOW_RAIL`'s. Without that clause, turning this on takes the suggestions away
   * on every timeline (measured on saved pages).
   */
  relevantPeople:
    `${SIDEBAR} div:has(> section ${USER_CELL})${NOT_THE_WHOLE_RAIL}, ` +
    `${SIDEBAR} div:has(> aside ${USER_CELL}):not(:has(${WHO_TO_FOLLOW_MORE}))${NOT_THE_WHOLE_RAIL}`,
  // Terms, privacy, cookies, and the rest of the small print
  footer: `${SIDEBAR} div:has(> nav)${NOT_THE_WHOLE_RAIL}`,
};

/**
 * The items down the left, each the anchor for one `XNavKey`. Children of the navigation
 * itself, so hiding the link hides the whole row. Grok, history and creator studio carry no
 * `data-testid` and are told apart by where they lead, as with `WHO_TO_FOLLOW_MORE`. `*=` not
 * `=` because X writes these as paths and a saved page rewrites them whole.
 */
const NAV_ITEMS: Record<XNavKey, string> = {
  explore: `${SIDE_NAV} a[data-testid="AppTabBar_Explore_Link"]`,
  follow: `${SIDE_NAV} a[data-testid="AppTabBar_Follow_Link"]`,
  messages: `${SIDE_NAV} a[data-testid="AppTabBar_DirectMessage_Link"]`,
  grok: `${SIDE_NAV} a[href*="/i/grok"]`,
  history: `${SIDE_NAV} a[href*="/i/history"]`,
  creatorStudio: `${SIDE_NAV} a[href*="/creators/studio"]`,
  articles: `${SIDE_NAV} a[href*="/compose/articles"]`,
  /*
   * X draws this one twice with different marks: `premium-signup-tab` at
   * `/i/premium_sign_up` unsubscribed, `premium-hub-tab` at `/i/premium` subscribed — one
   * address begins the other, so matched on where it leads.
   */
  premium: `${SIDE_NAV} a[href*="/i/premium"]`,
  profile: `${SIDE_NAV} a[data-testid="AppTabBar_Profile_Link"]`,
  // Beside the navigation rather than inside it, being a button rather than a destination
  postButton: 'header[role="banner"] a[data-testid="SideNav_NewTweet_Button"]',
};

/**
 * The items inside the "More" menu, each the anchor for one `XMenuKey`. All named by where
 * they lead, keeping the extension's own entry (no address, `panel/x-menu.ts`) out of reach
 * of any `[href]` selector.
 *
 * Lists and communities live under the signed-in screen name, not a fixed path, so those two
 * match on the end of the address — `*=` would also answer to a list linked from elsewhere.
 */
const MENU = '[role="menu"]';
const MENU_ITEMS: Record<XMenuKey, string> = {
  lists: `${MENU} a[href$="/lists"]`,
  communities: `${MENU} a[href$="/communities"]`,
  communityNotes: `${MENU} a[href*="/i/communitynotes"]`,
  business: `${MENU} a[href*="/verified-orgs-signup"]`,
  ads: `${MENU} a[href*="ads.x.com"]`,
  spaces: `${MENU} a[href*="/i/spaces/start"]`,
  mutedKeyword: `${MENU} a[href*="/settings/add_muted_keyword"]`,
  // Ends the address, so the muted-keyword item one level below it is not caught as well
  settings: `${MENU} a[href$="/settings"]`,
};

/**
 * The box being typed into — exactly one per shape a post is written in. Tells the shapes
 * apart, and, as a plain marker of X's own, is what anything hunting for a form starts from
 * (`appearance/compose-mark.ts`).
 */
export const COMPOSE_LABEL = '[data-testid="tweetTextarea_0_label"]';

/**
 * The block at the head of x.com's timeline: the box for writing stands in one, and so does
 * a post being read with its reply box — which is which is `COMPOSE_BOX`'s to say.
 */
export const COMPOSE_HEAD_BLOCK = '[data-testid="primaryColumn"] > div > div';

/** X Pro's drawer, and x.com's window over the page. Both hold nothing but the form */
const COMPOSE_DRAWER = '[data-testid="drawerAnimatedDiv"]';
const COMPOSE_MODAL = '[role="dialog"][aria-modal="true"]';

/**
 * The three shapes, named without asking what they hold. Kept apart from `COMPOSE_BOX`: that
 * one is a `:has()` selector matched by the browser against the whole page, while this is
 * walked up to from the box being typed in — a few cheap steps against a subtree search.
 *
 * On X Pro the drawer is also where a reply is written, so a reply there is marked too:
 * nothing on the drawer says which it is, and the mark answers the same question either
 * way — which account this is going out as.
 */
export const COMPOSE_SHAPES = [COMPOSE_DRAWER, COMPOSE_MODAL, COMPOSE_HEAD_BLOCK].join(', ');

/**
 * The box for writing a post at the head of the timeline. x.com draws it with the same
 * elements as a reply box, told apart only by where they stand: a reply sits in the post's
 * own cell, this one stands alone above the timeline. `OPENED_ATTR` marks a different
 * question — where a post is read, not where a reply box is.
 *
 * The two steps down from the column are load-bearing: they hold the candidates to the
 * timeline's own blocks, and only there does "holds no cell" mean "is the box for writing".
 * A reply's own cell has plenty of divs holding no cell, so skipping the steps would hide it.
 */
const COMPOSE_BOX = `${COMPOSE_HEAD_BLOCK}:has(${COMPOSE_LABEL}):not(:has(${CELL_SELECTOR}))`;

/**
 * The two bars X floats in the bottom-right corner, collapsed until pressed. Siblings under
 * one parent, each with its own mark of X's, so neither needs telling apart by contents.
 * Hiding the chat one takes its contents with it.
 */
const GROK_DRAWER = '[data-testid="GrokDrawer"]';
const CHAT_DRAWER = '[data-testid="chat-drawer-root"]';

/**
 * Letting the timeline have the room the rail was taking.
 *
 * x.com sizes the two columns together in a box 1050px wide: the timeline may use 600, the
 * rail 350. Hiding the rail leaves the box at 1050 with the timeline still capped at 600 and
 * the emptied half beside it; lifting the cap hands it the whole box.
 *
 * The same 600 is written in three places, all of which must go: the column, the post
 * wrapper one step further down (absent on a post's own page, where it matches nothing), and
 * the button row under each post. Lifting only the column's widens the tab bar but leaves
 * every post at 600, reading as a wide empty column with narrow posts; lifting the first two
 * only bunches the buttons into the left 600 of a 1002-wide post, empty to their right. Once
 * uncapped, the row spaces itself: X gives the first four `flex: 1` inside a `space-between`
 * row, landing them at even steps with bookmark and share at the far end.
 *
 * The box itself is left alone — stretching it too measured worse both ways: it is what
 * x.com centres the page on, so widening it slides the navigation sideways by a couple of
 * hundred pixels, and on a post's own page it settles narrower than it started, making the
 * timeline *narrower* than with the setting off. Left alone, the timeline holds one width
 * everywhere, capped at 1050 regardless of window width — worth having, since a line as wide
 * as a large screen is not readable. Photos keep X's own sizing, to the picture, not the column.
 *
 * Only ever written with the rail hidden — with it still on screen, the timeline would take
 * the whole box and push it out of the window.
 */
const WIDE_TIMELINE: [selector: string, body: string][] = [
  [
    `[data-testid="primaryColumn"], [data-testid="primaryColumn"] div:has(> section), ` +
      `[data-testid="primaryColumn"] ${ACTION_BAR}`,
    'max-width: none !important;',
  ],
];

/** Rules for x.com's own furniture; nothing set emits nothing, as unset appearance does */
export const chromeCss = (chrome: XChromeSettings): string => {
  const hide = (selector: string): string => rule(selector, 'display: none !important;');
  const rules: string[] = [];

  if (chrome.wideTimeline) {
    // The rail goes first: widening with it still on screen pushes it out of the window
    rules.push(hide(SIDEBAR));
    rules.push(...WIDE_TIMELINE.map(([selector, body]) => rule(selector, body)));
  } else {
    // Only worth writing while the rail is still there; hidden, it took them with it
    const rail = X_RAIL_KEYS.filter((key) => !chrome.rail[key]).map((key) => RAIL_BLOCKS[key]);
    if (rail.length > 0) rules.push(hide(rail.join(', ')));
  }

  // Again, a rule for each one taken off: true means it stays where X put it
  const nav = X_NAV_KEYS.filter((key) => !chrome.nav[key]).map((key) => NAV_ITEMS[key]);
  if (nav.length > 0) rules.push(hide(nav.join(', ')));

  const menu = X_MENU_KEYS.filter((key) => !chrome.menu[key]).map((key) => MENU_ITEMS[key]);
  if (menu.length > 0) rules.push(hide(menu.join(', ')));

  if (!chrome.composeBox) rules.push(hide(COMPOSE_BOX));

  const drawers = [!chrome.grokDrawer && GROK_DRAWER, !chrome.chatDrawer && CHAT_DRAWER].filter(
    (one): one is string => one !== false
  );
  if (drawers.length > 0) rules.push(hide(drawers.join(', ')));

  return rules.join('\n');
};

// --- the form a new post is written in ---

/**
 * The background of the compose form. Written against the marker, not confined to a scope:
 * the form belongs to no column and no view (`ACCOUNT_COLORS`, `settings/schema.ts`), and
 * the marker carries the account it posts as.
 *
 * One entry per account with a colour, plus one for `null` meaning "whatever account this
 * is" — the top tier's value, taken by every account unless overridden. Both are one
 * attribute selector, weighing the same, so the caller sends the general one first: later wins.
 *
 * Built from the settings, not the forms on screen: X opens and closes these as used, so
 * rules for a closed form cost nothing, while rebuilding on every open would cost a repaint.
 */
export const composeCss = (
  colors: { account: string | null; color: string }[],
  except: readonly string[] = []
): string => {
  // The general rule reaches any marked form, so accounts holding the appearance back
  // must be named out of it — named, not left to ordering, since they set no colour of
  // their own to overturn this one
  const refuse = except
    .map((account) => `:not([${COMPOSE_ATTR}="${safeInSelector(account)}"])`)
    .join('');
  return colors
    .map(({ account, color }) =>
      rule(
        account === null
          ? `[${COMPOSE_ATTR}]${refuse}`
          : `[${COMPOSE_ATTR}="${safeInSelector(account)}"]`,
        // Laid over what X paints, not put in its place — a colour with alpha is a tint,
        // and swapping it in leaves the form see-through (on x.com's post window, the
        // timeline showed through it). A one-colour gradient is a flat fill, and
        // `background-image` sits above `background-color`, so an opaque choice still
        // covers it whole
        `background-image: linear-gradient(${color}, ${color}) !important;`
      )
    )
    .join('\n');
};

/**
 * The page behind x.com, outside the timeline. One rule on `body`: x.com paints only the
 * timeline — the left items and rail are transparent (measured) — so this reaches margins,
 * navigation and rail while leaving the middle as X draws it, which is what separates it
 * from `background`.
 *
 * Not X Pro: its `body` is the ground the whole deck stands on, a different question from
 * painting a column.
 */
export const pageCss = (color: string | null): string =>
  color === null ? '' : rule('body', `background-color: ${color} !important;`);
