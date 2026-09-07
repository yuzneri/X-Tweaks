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
 * Drops the characters that would end an attribute selector's string early.
 *
 * Every value written inside `[attr="…"]` goes through this. A screen name comes from
 * the page and holds neither, but a settings file taken in from elsewhere carries
 * whatever keys it likes (`nodeMap` in `settings/schema.ts` keeps them as they are), and
 * a `"` in one would close the selector and let the rest of the string be read as CSS of
 * its own.
 */
export const safeInSelector = (value: string): string => value.replace(/["\\]/g, '');

/**
 * The marker put on the form a new post is written in, carrying the account it will post
 * as (written by `appearance/compose-mark.ts`).
 *
 * A marker rather than a selector reaching for the account: the form holds its author's
 * avatar, but it can hold other people's too — a quoted post brings one — and a selector
 * cannot say "the first one". Which avatar names the account is a question for the code
 * that walks the form, not for a stylesheet.
 */
export const COMPOSE_ATTR = 'data-xpro-compose';

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
  if (scope.columnId !== null) return `c:${safeInSelector(scope.columnId)}`;
  if (scope.account !== null) return `a:${safeInSelector(scope.account)}`;
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

/**
 * The marker on a reaction count written out in full. It goes on the box X animates the
 * number inside, and says only that our own number is in there — the number itself is in
 * the element beside X's (`COUNT_CLASS`).
 *
 * Only the counts X has rounded off carry one (`appearance/counts.ts`), so most posts on a
 * timeline have none.
 */
export const COUNT_ATTR = 'data-xpro-count';

/**
 * The class on the number written out in full.
 *
 * It is a copy of X's own element, class list and all, with the number in place of the
 * rounded form (`appearance/apply.ts`). Drawing it as an `::after` on the box instead —
 * the way the absolute time is drawn — came out too big: X's count is styled on the
 * element *inside* the box (13px against the box's 15px, measured), and a pseudo-element
 * cannot inherit from a child. Copying the element takes every one of those styles with it.
 */
export const COUNT_CLASS = 'xpro-count';

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

/** The class on the description written under a picture (`appearance/apply.ts`) */
export const CAPTION_CLASS = 'xpro-caption';

/**
 * The class on the words inside a caption.
 *
 * They get an element of their own because the folding is done by `-webkit-line-clamp`,
 * which would fold the button that opens them away along with the text it is hiding.
 */
export const CAPTION_TEXT_CLASS = 'xpro-caption-text';

/**
 * The class on the "Show more" under a folded caption. Apart from `MORE_CLASS`, whose
 * look it shares: that one is swept away wherever no column sets a line limit, and a
 * caption's button has nothing to do with that limit.
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
  /**
   * The lines the extension puts at the end of a post. Under a line limit they stand
   * outside the body, where the rules aimed at the body no longer reach them, so the size
   * and the color of the text follow them here instead.
   */
  attachmentLine: [`.${ATTACHMENT_CLASS}`],
  name: ['[data-testid="User-Name"] span'],
  /**
   * Timestamps, counts, reply targets, and the like. The words a line carries for a
   * picture or a quoted post join them: they are dim for the same reason, being about the
   * post rather than of it, and a column that recolors its secondary text means these too.
   */
  muted: [
    ...MUTED_COLORS.map((color) => `[style*="color: ${color}"]`),
    `.${ATTACHMENT_WORDS_CLASS}`,
  ],
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
    // The button that opens a folded caption. It reads as a link for the same reason
    `.${CAPTION_MORE_CLASS}`,
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
 * Told apart by the link that closes it, exactly as the timeline's own cells are
 * (`WHO_TO_FOLLOW_MORE`), so the rail and the timeline agree on what the block is. The
 * accounts alone would not do: x.com stacks a second block of accounts in the same rail —
 * the ones it calls relevant — and that one belongs to a switch of its own
 * (`RAIL_BLOCKS.relevantPeople`), not to this one. Matched on the accounts, the two cross
 * over and each switch takes away the block the other one names.
 *
 * What is hidden is the card around the `aside`: the `aside` alone would leave its border
 * behind with nothing inside.
 */
const WHO_TO_FOLLOW_RAIL = `[data-testid="sidebarColumn"] div:has(> div > aside ${WHO_TO_FOLLOW_MORE})`;

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
     * The frame is held to the limit rather than given it. The shape X drew it with is
     * left where it is: take the `aspect-ratio` and the `padding-bottom` away and the
     * frame falls to nothing, its contents being absolutely positioned — which is why
     * this replaced the height outright before, and why a picture already shorter than
     * the limit was stretched up to it.
     *
     * `max-height` holds a frame drawn from `aspect-ratio`, and one drawn from nothing
     * but its contents. A frame drawn from a percentage `padding-bottom` pays it no
     * attention, and is capped where it is written instead (`appearance/apply.ts`).
     *
     * The width is held where it was. A box with a ratio and a height it cannot exceed
     * takes its width from the ratio instead, which turns a wide picture held to 200px
     * into a 200px square with the rest of the column empty beside it (measured).
     *
     * `width`, not `min-width`. X lays several pictures out as a row, and a frame in a row
     * takes its width from the row rather than from this — while a picture standing on its
     * own keeps the width it had. A `min-width` clamps a row's frames as well, and on a
     * two-up row it threw the second picture clear of the column (measured).
     *
     * Held lightly: of the frames drawn from a ratio in the pages this was checked
     * against, every one was inside a row, where this changes nothing either way. It is
     * here for the frame standing on its own, which is where a ratio and a capped height
     * would leave a square with the column empty beside it.
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
 * The posts X appends under a conversation, headed "Discover more".
 *
 * They arrive as cells of the timeline, like the block of accounts X suggests: one cell
 * carrying the heading, then a cell per post it is offering. There is no mark on any of
 * them, so the heading is found by being the one cell of a conversation with an `h2` in
 * it, and what follows is everything after it — the block runs to the end.
 *
 * Held to a conversation by X's own mark for one, the box for writing a reply. Without
 * that, the heading of the accounts X suggests would answer on a timeline and take the
 * whole timeline under it away; the block beside somebody's profile would answer too.
 *
 * The conversation is found by the `section` it stands in rather than by x.com's column,
 * both sites drawing one and only x.com having the other.
 */
const DISCOVER_HEAD =
  `section:has([data-testid="inline_reply_offscreen"]) ${CELL_SELECTOR}:has(h2)`;
const DISCOVER_MORE = `${DISCOVER_HEAD}, ${DISCOVER_HEAD} ~ ${CELL_SELECTOR}`;

/**
 * What X slips into a timeline, taken away for a whole site.
 *
 * Not confined to a scope. These blocks are X's own doing rather than anything belonging
 * to a column or a view, and the setting that governs them is held per site
 * (`settings/schema.ts`), so which site is being drawn on is all the scoping there is —
 * `appearance/apply.ts` decides that.
 *
 * Every selector here is written to hold on both sites. The rail is x.com's alone and
 * matches nothing on X Pro; the rest are cells of a timeline, which both sites draw the
 * same way.
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
// The page around the timeline: the rail beside it, the items down the left, the box for
// writing a post, the bar announcing new ones. None of it belongs to a view, so none of
// it is confined to a scope — x.com shows one view at a time, and these settings are held
// for the whole site (`settings/schema.ts`). X Pro has none of this; `appearance/apply.ts`
// is what keeps these rules off it.

const SIDEBAR = '[data-testid="sidebarColumn"]';
const SIDE_NAV = 'header[role="banner"] nav[role="navigation"]';

/**
 * Refuses anything holding the search box.
 *
 * The rail's blocks are siblings, but not all of them sit at the same depth: the accounts
 * X suggests are wrapped one deeper on a timeline than on a post's own page. A selector
 * written for the deeper shape matches the whole rail on the shallower one, taking the
 * search box with it. Nothing that holds the search is a block, so saying that outright
 * costs one clause and removes the trap.
 */
const NOT_THE_WHOLE_RAIL = ':not(:has(form[role="search"]))';

/**
 * The blocks of the rail, one selector apiece.
 *
 * Named one by one rather than as "every block but the search". A block X adds later
 * stays on screen until this list catches up, which is the same bargain `NOT_A_PROFILE`
 * (`surface/view.ts`) makes: an item too many is a smaller harm than the sibling
 * arithmetic the other way round would need, on a container X names nothing.
 *
 * The accounts X suggests are not here at all: that block is X slipping something in
 * rather than furniture of the page, and it is answered for the whole site
 * (`WHO_TO_FOLLOW_RAIL`).
 */
const RAIL_BLOCKS: Record<XRailKey, string> = {
  premium: `${SIDEBAR} div:has(> div > aside a[href*="/i/premium"])${NOT_THE_WHOLE_RAIL}`,
  news: `${SIDEBAR} div:has(> div[data-testid="news_sidebar"])${NOT_THE_WHOLE_RAIL}`,
  /*
   * X draws two blocks of the rail as a `section`, and the second only shows up on
   * somebody's profile: what's happening, and the accounts it calls relevant there. So
   * neither is named by being a `section` — each says what it is made of. Written as
   * `> section` alone, the trends rule takes the relevant accounts away on every profile.
   *
   * `:has()` cannot be nested, so the test goes inside the one `:has` as a descendant.
   */
  trends: `${SIDEBAR} div:has(> section [data-testid="trend"])${NOT_THE_WHOLE_RAIL}`,
  /*
   * The one block of the rail X draws in two shapes: a `section` beside somebody's
   * profile, an `aside` on a post's own page. Both are said here, because both are the
   * same block to a reader and one switch is what they asked for.
   *
   * The `aside` shape is also what X uses for the accounts it suggests following, on a
   * timeline. The link that closes that block is the only thing telling the two apart, so
   * refusing it is what keeps this switch off the block that belongs to `WHO_TO_FOLLOW_RAIL`.
   * Written without that clause, turning this on takes the suggestions away on every
   * timeline — measured on the saved pages.
   */
  relevantPeople:
    `${SIDEBAR} div:has(> section ${USER_CELL})${NOT_THE_WHOLE_RAIL}, ` +
    `${SIDEBAR} div:has(> aside ${USER_CELL}):not(:has(${WHO_TO_FOLLOW_MORE}))${NOT_THE_WHOLE_RAIL}`,
  // Terms, privacy, cookies, and the rest of the small print
  footer: `${SIDEBAR} div:has(> nav)${NOT_THE_WHOLE_RAIL}`,
};

/**
 * The items down the left, each the anchor for one `XNavKey`.
 *
 * They are children of the navigation itself, so hiding the link hides the whole row.
 * Grok, the history and the creator studio carry no `data-testid` of their own and are
 * told apart by where they lead, the way the accounts X suggests already are
 * (`WHO_TO_FOLLOW_MORE`). `*=` rather than `=` because X writes these as paths and a
 * saved page rewrites them whole.
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
   * X draws this one twice over, and the two carry different marks of its own:
   * `premium-signup-tab` at `/i/premium_sign_up` for somebody who has not subscribed,
   * `premium-hub-tab` at `/i/premium` for somebody who has. Where it leads is what the two
   * have in common, and one address is the beginning of the other.
   */
  premium: `${SIDE_NAV} a[href*="/i/premium"]`,
  profile: `${SIDE_NAV} a[data-testid="AppTabBar_Profile_Link"]`,
  // Beside the navigation rather than inside it, being a button rather than a destination
  postButton: 'header[role="banner"] a[data-testid="SideNav_NewTweet_Button"]',
};

/**
 * The items inside the "More" menu, each the anchor for one `XMenuKey`.
 *
 * All named by where they lead, which is what keeps the extension's own entry out of
 * reach: `panel/x-menu.ts` gives it no address at all, so an `[href]` selector cannot
 * pick it up however the menu is rearranged.
 *
 * The lists and the communities live under the signed-in screen name rather than a fixed
 * path, so those two are matched on the end of the address instead of somewhere in the
 * middle — `*=` would also answer to a list linked from somewhere else in a menu.
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
 * The box being typed into, which every shape a post is written in holds exactly one of.
 * It is what the shapes are told apart by, and — being a plain marker of X's own — what
 * anything looking for a form starts from (`appearance/compose-mark.ts`).
 */
export const COMPOSE_LABEL = '[data-testid="tweetTextarea_0_label"]';

/**
 * The block at the head of x.com's timeline. The box for writing stands in one, and so
 * does a post being read with its reply box; which is which is `COMPOSE_BOX`'s to say.
 */
export const COMPOSE_HEAD_BLOCK = '[data-testid="primaryColumn"] > div > div';

/** X Pro's drawer, and x.com's window over the page. Both hold nothing but the form */
const COMPOSE_DRAWER = '[data-testid="drawerAnimatedDiv"]';
const COMPOSE_MODAL = '[role="dialog"][aria-modal="true"]';

/**
 * The three shapes, named without asking what they hold.
 *
 * Written apart from `COMPOSE_BOX` because of what each is for. That one carries `:has()`
 * and is a CSS selector, matched by the browser against the page it is styling. This one
 * is walked up to from the box being typed in, and a walk of a few steps costs nothing —
 * where asking the page for the `:has()` form costs a subtree search on every element it
 * might match: measured at ~10ms on a deck of several hundred posts, on every settling,
 * with no form open at all.
 *
 * On X Pro the drawer is also where a reply is written, so a reply there is marked as
 * well. There is nothing on the drawer saying which it is, and what the mark answers —
 * which account this is going out as — is the same question either way.
 */
export const COMPOSE_SHAPES = [COMPOSE_DRAWER, COMPOSE_MODAL, COMPOSE_HEAD_BLOCK].join(', ');

/**
 * The box for writing a post at the head of the timeline.
 *
 * x.com draws it with the same elements as the box for writing a reply, so the two cannot
 * be told apart by what they are — only by where they stand. A reply belongs to the post
 * it answers and sits in that post's cell; this one stands on its own above the timeline.
 * Going by the address instead would answer a different question: `OPENED_ATTR` marks
 * where a post is being read, which is not the same as where a reply box is.
 *
 * The two steps down from the column are load-bearing rather than decoration: they hold
 * the candidates to the blocks the timeline is built out of, and only there does "holds
 * no cell" mean "is the box for writing". Inside a reply's own cell there are plenty of
 * divs holding no cell, and a selector without the two steps hides the reply box —
 * measured on a post's page: 23 matches, the reply among them, against none with them.
 */
const COMPOSE_BOX = `${COMPOSE_HEAD_BLOCK}:has(${COMPOSE_LABEL}):not(:has(${CELL_SELECTOR}))`;

/**
 * The two bars X floats in the bottom-right corner, collapsed until pressed. They are
 * siblings under one parent and each carries a mark of X's own, so neither needs telling
 * apart by what is inside it. Hiding the chat one takes its contents with it.
 */
const GROK_DRAWER = '[data-testid="GrokDrawer"]';
const CHAT_DRAWER = '[data-testid="chat-drawer-root"]';

/**
 * Letting the timeline have the room the rail was taking.
 *
 * x.com sizes the two columns together: the pair stands in a box 1050px wide, of which the
 * timeline may use 600 and the rail takes 350. Hiding the rail leaves the box the size it
 * was, so the timeline stays at 600 with the emptied half beside it. Lifting the cap hands
 * it the whole box — which is exactly the room the rail was taking.
 *
 * The same 600 is written in three places, and all three have to go. The column carries
 * it; so does the wrapper the posts themselves stand in, one step further down where a
 * timeline is drawn; and so does the row of buttons under each post. Lifting only the
 * column's widens the bar of tabs across the top and leaves every post at 600 underneath
 * it, which reads as a wide empty column with narrow posts in it. Lifting the first two
 * and not the third leaves the buttons bunched into the left 600 of a post 1002 wide,
 * with nothing to their right.
 * A post's own page has no such wrapper, and there that second one matches nothing.
 *
 * The row spaces its buttons out itself once the cap is gone: X gives the first four
 * `flex: 1` inside a `space-between` row, so they land at even steps across the whole
 * width with the bookmark and the share at the far end — measured at 231px apart.
 *
 * Nothing is done to the box itself. Stretching it as well was tried and measured worse in
 * both directions: the box's width is what x.com centres the page on, so widening it slides
 * the navigation sideways by a couple of hundred pixels, and on a post's own page the box
 * settles narrower than it started, leaving the timeline *narrower* than with the setting
 * off. Left alone, the navigation does not move at all and the timeline is 1050 wide on
 * every page and every window — measured, not guessed.
 *
 * So the timeline stops growing at 1050 however wide the window is. That is a limit worth
 * having: a line of text the width of a large screen is not one anybody wants to read.
 * Photos are left where X puts them: it sizes those to the picture, not to the column.
 *
 * Only ever written with the rail hidden. With the rail still on screen the timeline takes
 * the whole box and pushes it out of the window.
 */
const WIDE_TIMELINE: [selector: string, body: string][] = [
  [
    `[data-testid="primaryColumn"], [data-testid="primaryColumn"] div:has(> section), ` +
      `[data-testid="primaryColumn"] ${ACTION_BAR}`,
    'max-width: none !important;',
  ],
];

/**
 * The rules for x.com's own furniture. Nothing set emits nothing at all, the same way an
 * unset appearance item does.
 */
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
 * The background of the form a new post is written in.
 *
 * Written against the marker rather than confined to a scope: the form belongs to no
 * column and no view (`ACCOUNT_COLORS` in `settings/schema.ts` says why), and the marker
 * is what carries the account it will post as.
 *
 * One entry per account that has a color, plus one for `null` meaning "whatever account
 * this is" — the value the top tier sets, which every account takes unless it says
 * otherwise. Both are one attribute selector and so weigh the same, which is why the
 * caller hands them over with the general one first: what comes later wins.
 *
 * Built from the settings rather than from the forms on screen. X opens and closes these
 * as they are used, and rules for accounts whose form is not open cost nothing, while
 * rebuilding the stylesheet every time one opens would cost the browser a repaint.
 */
export const composeCss = (
  colors: { account: string | null; color: string }[],
  except: readonly string[] = []
): string => {
  // The general rule reaches any marked form, so the accounts holding the appearance
  // back have to be named out of it. Named, not left to the ordering: they set no colour
  // of their own, so there is no later rule to overturn this one
  const refuse = except
    .map((account) => `:not([${COMPOSE_ATTR}="${safeInSelector(account)}"])`)
    .join('');
  return colors
    .map(({ account, color }) =>
      rule(
        account === null
          ? `[${COMPOSE_ATTR}]${refuse}`
          : `[${COMPOSE_ATTR}="${safeInSelector(account)}"]`,
        // Laid over what X paints rather than put in its place. A color chosen with an
        // alpha is a tint, and swapping it in instead leaves the form see-through: on
        // x.com's post window that meant reading the timeline through it. A gradient of
        // one color is a flat fill, and `background-image` sits above `background-color`,
        // so X's own surface stays underneath and an opaque choice still covers it whole
        `background-image: linear-gradient(${color}, ${color}) !important;`
      )
    )
    .join('\n');
};

/**
 * The page behind x.com, outside the timeline.
 *
 * One rule on `body`, because x.com paints only the timeline: the items down the left and
 * the rail beside it are transparent and take whatever is behind them (measured). So this
 * reaches the margins, the navigation and the rail while leaving the middle of the page
 * as X draws it — which is what makes it a different setting from `background`.
 *
 * x.com alone. X Pro's `body` is the ground the whole deck stands on, and painting it is
 * not the same question as painting a column.
 */
export const pageCss = (color: string | null): string =>
  color === null ? '' : rule('body', `background-color: ${color} !important;`);
