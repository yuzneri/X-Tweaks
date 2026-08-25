/** Builds CSS from the appearance settings. Takes the effective values per column and returns a string */
import type { ColumnScope } from '../settings/resolve.ts';
import { mediaCollapses, timeFormatOf, type AppearanceNode } from '../settings/schema.ts';

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
 * The marker of a column with a post opened (the reply input box). The input box
 * appears in no other column. That column was opened in order to read, so the
 * line limit on the body is not enforced there.
 */
export const OPENED_POST_MARK = '[data-testid="tweetTextarea_0"]';
export type ColumnAppearance = { key: string; appearance: AppearanceNode };

/** The boxes holding images and videos. Also used where the markers are set (`appearance/apply.ts`) */
export const MEDIA_TARGETS = [
  '[data-testid="tweetPhoto"]',
  '[data-testid="videoPlayer"]',
  '[data-testid="videoComponent"]',
];

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

const TARGETS = {
  text: ['[data-testid="tweetText"]'],
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
    '[data-testid="tweet-text-show-more-link"]',
    ...LINK_COLORS.map((color) => `a[style*="color: ${color}"]`),
  ],
  divider: ['[data-testid="cellInnerDiv"] > div'],
  photo: ['[data-testid="tweetPhoto"] img'],
  media: MEDIA_TARGETS,
  mediaFrame: [`[${MEDIA_FRAME_ATTR}]`],
};

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

  if (appearance.maxLines !== null) {
    // A column with a post opened gets neither the limit nor "Show more"
    const clampScope = `${scope}:not(:has(${OPENED_POST_MARK}))`;
    /*
     * Lines are counted after wrapping on screen.
     *
     * The cut is done by `-webkit-line-clamp`, which cuts at line boundaries, so
     * characters stay whole even when emoji make a line taller (cutting by height
     * would slice the bottom off the last line).
     */
    rules.push(
      rule(
        within(clampScope, [TARGETS.textOutsideQuote]),
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
        within(clampScope, [[`*:has(> [data-testid="tweetText"]):not([role="link"] *)`]]),
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
        within(clampScope, [
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
        within(clampScope, [[`.${OPENED_CLASS} :has([data-testid="tweetText"])`]]),
        '-webkit-line-clamp: none !important; line-clamp: none !important;'
      )
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

  /*
   * Hiding media only hides it. The elements stay, so unsetting brings them back.
   * Hiding the box alone leaves the frame taking up space, so the frame is hidden too.
   */
  if (mediaCollapses(media.collapse)) {
    rules.push(
      rule(within(scope, [TARGETS.media, TARGETS.mediaFrame]), 'display: none !important;')
    );
  }

  return rules;
};

export const buildCss = (
  columns: ColumnAppearance[],
  parens: { open: string; close: string }
): string => columns.flatMap((column) => columnRules(column, parens)).join('\n');
