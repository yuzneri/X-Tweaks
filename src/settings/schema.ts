/**
 * The storage structure of the settings, and the normalization of stored values.
 * Merging the tiers lives in resolve.ts, and reading and writing in storage.ts.
 */

import { isLanguage, type Language, type Messages } from '../i18n/index.ts';

export const SCHEMA_VERSION = 3;

export const ACTIONS = {
  COLLAPSE: 'collapse', // fold it up
  HIDE: 'hide', // remove it without a trace
  HIGHLIGHT: 'highlight', // keep it shown, with a background color
  EMPHASIZE: 'emphasize', // color only the matched characters
  NOTHING: 'nothing', // stop every setting for this post (those of upper tiers included)
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

/**
 * The post traits usable as conditions, in the order shown on the settings screen.
 * "Has no photo or video" is expressed by negation (`negate`), with no paired entry.
 */
export const TRAIT_KEYS = [
  'repost',
  'quote',
  'reply',
  'communityNote',
  'communityNoteRating',
  'pollOpen',
  'pollClosed',
  'linkCard',
  'space',
  'article',
  'ad',
  'media',
  'mediaWithoutAlt',
  'verified',
  'link',
] as const;
export type TraitKey = (typeof TRAIT_KEYS)[number];

/** Default highlight colour; trailing `26` is 15% opacity, so the background shows through and text stays readable */
export const DEFAULT_HIGHLIGHT_COLOR = '#f9188026';

/** Default emphasis colour: same colour at 40% opacity — at the highlight's 15% a few characters would be invisible */
export const DEFAULT_EMPHASIS_COLOR = '#f9188066';

export const usesColor = (action: Action): boolean =>
  action === ACTIONS.HIGHLIGHT || action === ACTIONS.EMPHASIZE;

export const defaultColorFor = (action: Action): string =>
  action === ACTIONS.EMPHASIZE ? DEFAULT_EMPHASIS_COLOR : DEFAULT_HIGHLIGHT_COLOR;

/*
 * What happens when no tier sets anything, consulted by both judging and the settings
 * screen — a changed default not updated in both would leave the screen silently stale.
 */

export const filterApplies = (enabled: boolean | null): boolean => enabled !== false;

/**
 * How photos and videos in a post are shown, in the order offered on screen (most to least
 * shown).
 *
 * `show` is X Pro's own display, held as a value so a lower tier can undo an upper one's
 * set. `caption` leaves the picture and writes the author's description underneath;
 * `text` puts that description into the post as a line and drops the picture; `mark`
 * removes it from the timeline but leaves a character-cost mark where it was
 * (`appearance/apply.ts`); `hidden` removes it with no trace. Where no description exists,
 * `text` falls back to the mark alone; `caption` still shows as much without giving the
 * picture up — the only way to read a description with no pointer, since a tooltip is
 * unreachable on a touchscreen.
 *
 * The cards have four ways of their own (`ATTACHMENT_STYLES`), listed apart since the two
 * settings may need different sets.
 */
export const MEDIA_STYLES = ['show', 'caption', 'text', 'mark', 'hidden'] as const;
export type MediaStyle = (typeof MEDIA_STYLES)[number];

const isMediaStyle = (v: unknown): v is MediaStyle => MEDIA_STYLES.includes(v as MediaStyle);

export const mediaStyleOf = (value: MediaStyle | null): MediaStyle => value ?? 'show';

/**
 * Whether photos/videos are off the timeline, marked or not — `caption` is excluded, since
 * it leaves the picture in place and only writes underneath; reading it as hidden would drop
 * the height limit still applied to the pictures it shows (`appearance/frame.ts`).
 */
export const mediaHidden = (value: MediaStyle | null): boolean => {
  const style = mediaStyleOf(value);
  return style !== 'show' && style !== 'caption';
};

/** Whether posts are packed tight (padding, avatar, the reply/repost button row). Opt-in — left alone, X Pro's own spacing stays */
export const isCompact = (compact: boolean | null): boolean => compact === true;

/**
 * Whether line breaks in a post are dropped, running the body into one paragraph. Kept
 * apart from `compact`, which changes how much room a post takes rather than how it reads —
 * a post using line breaks to mean something (a list, a couplet) loses that meaning here.
 */
export const collapsesNewlines = (collapse: boolean | null): boolean => collapse === true;

/**
 * Whether a rounded reaction count ("22万", "221.3K") is shown as the exact number instead.
 * X always writes the full number into the button's label regardless of what it shows
 * beside the icon, so it only needs reading from there, not counting (`appearance/counts.ts`).
 */
export const showsRawCounts = (raw: boolean | null): boolean => raw === true;

/** Default is the opposite of the other switches: unreadable colours are an accident nobody asked for, so left alone it fixes itself */
export const adjustsContrast = (autoContrast: boolean | null): boolean => autoContrast !== false;

/**
 * What a highlight colour is laid over — a translucent colour needs a backdrop. `column`
 * lets CSS blend it with the column background as-is. `theme` skips just the column
 * background, but CSS cannot skip exactly one ancestor's background, so the extension
 * composites an opaque colour itself and hands that over.
 */
export const HIGHLIGHT_BASES = ['column', 'theme'] as const;
export type HighlightBase = (typeof HIGHLIGHT_BASES)[number];

const isHighlightBase = (v: unknown): v is HighlightBase =>
  HIGHLIGHT_BASES.includes(v as HighlightBase);

export const highlightBaseOf = (value: HighlightBase | null): HighlightBase => value ?? 'column';

/**
 * How a post's time is shown. `relative` is X's own display (extension does nothing) — same
 * result as unset, but held as a value so a lower tier can undo an upper tier's `absolute`.
 */
export const TIME_FORMATS = ['relative', 'absolute', 'both'] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

const isTimeFormat = (v: unknown): v is TimeFormat => TIME_FORMATS.includes(v as TimeFormat);

export const timeFormatOf = (value: TimeFormat | null): TimeFormat => value ?? 'relative';

/**
 * How link cards and articles hanging off a post are shown. `show` is X Pro's own display,
 * held as a value for the same undo reason as `relative`.
 *
 * Cards and articles share one setting: a framed box with a picture and headline, between
 * body and buttons. Quotes have their own setting (`quoteStyleOf`) and photos another
 * (`MEDIA_STYLES`, which also holds their own mark). `text` puts the card into the post as a
 * line — headline and domain, still a link — and removes the card; it reads like the URL X
 * strips from the body when building a card, and suits packed posts, where a card takes
 * more room than the post it hangs off. Only the domain shows because a card's link is a
 * `t.co` short URL and the written URL is already gone from the body. `mark` drops the words
 * too, leaving just the mark. A post with no body — an article, a standalone photo — takes
 * the line where the card was instead, so nothing disappears without a trace.
 */
export const ATTACHMENT_STYLES = ['show', 'text', 'mark', 'hidden'] as const;
export type AttachmentStyle = (typeof ATTACHMENT_STYLES)[number];

const isAttachmentStyle = (v: unknown): v is AttachmentStyle =>
  ATTACHMENT_STYLES.includes(v as AttachmentStyle);

export const cardStyleOf = (value: AttachmentStyle | null): AttachmentStyle => value ?? 'show';

/**
 * How a quoted post is shown — the same four ways as a card, but a setting of its own: a
 * quote is somebody's words, not a link preview, so folding cards away need not fold quotes
 * too. Its `text` line gives the quote's words and author, with no link — X Pro writes no
 * address on the frame, and the quoted post is reached by opening the post.
 */
export const quoteStyleOf = (value: AttachmentStyle | null): AttachmentStyle => value ?? 'show';

export const appearanceApplies = (enabled: boolean | null): boolean => enabled !== false;

/** Reposter and reply-target are user IDs only, since their display names are either off-screen or run together with boilerplate, and pulling them out would assume a UI language */
export const MATCH_TARGETS = [
  'text',
  'quotedText',
  'screenName',
  'displayName',
  'repostedBy',
  'quotedScreenName',
  'quotedDisplayName',
  'replyTo',
  'pollChoice',
  'cardDomain',
  'cardTitle',
  'spaceName',
  'articleText',
  'language',
  'altText',
] as const;
export type MatchTarget = (typeof MATCH_TARGETS)[number];

/** The targets that look at a user ID. X itself does not distinguish case, so that setting is ignored for them */
export const isScreenNameTarget = (target: MatchTarget): boolean =>
  target === 'screenName' ||
  target === 'repostedBy' ||
  target === 'quotedScreenName' ||
  target === 'replyTo';

/**
 * Targets emphasis can paint: only ones written on screen as text. Judging, painting and
 * save-validation all consult this one list, so none can paint where no match was made.
 */
export const EMPHASIZABLE_TARGETS = [
  'text',
  'quotedText',
  'screenName',
  'displayName',
  'quotedScreenName',
  'quotedDisplayName',
  'replyTo',
] as const satisfies readonly MatchTarget[];

export const canEmphasize = (target: MatchTarget): boolean =>
  (EMPHASIZABLE_TARGETS as readonly string[]).includes(target);

/** Every post always has these four places */
export const COMMON_TARGETS = [
  'text',
  'screenName',
  'displayName',
  'language',
] as const satisfies readonly MatchTarget[];

/**
 * Targets that exist only by virtue of that trait, used by the settings screen to show the
 * matching input boxes. Traits with an empty list (Community Note, ad, media) are
 * properties of the post itself, with no targets of their own.
 */
export const TARGETS_BY_TRAIT = {
  repost: ['repostedBy'],
  quote: ['quotedText', 'quotedScreenName', 'quotedDisplayName'],
  reply: ['replyTo'],
  communityNote: [],
  communityNoteRating: [],
  pollOpen: ['pollChoice'],
  pollClosed: ['pollChoice'],
  linkCard: ['cardDomain', 'cardTitle'],
  space: ['spaceName'],
  article: ['articleText'],
  ad: [],
  media: ['altText'],
  // The pictures are there by definition, so their descriptions can be asked about
  mediaWithoutAlt: ['altText'],
  verified: [],
  link: [],
} as const satisfies Record<TraitKey, readonly MatchTarget[]>;

export const targetsFor = (trait: TraitKey | null): readonly MatchTarget[] =>
  trait ? [...COMMON_TARGETS, ...TARGETS_BY_TRAIT[trait]] : COMMON_TARGETS;

export const MATCH_MODES = ['contains', 'exact', 'regex', 'self'] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

/** It compares against the author, so it carries no pattern (the settings screen removes the input box) */
export const isSelfMode = (mode: MatchMode): boolean => mode === 'self';

/** The author is excluded: compared against `screenName` it is always true and means nothing */
export const canCompareToSelf = (target: MatchTarget): boolean =>
  isScreenNameTarget(target) && target !== 'screenName';

export const AGE_UNITS = ['minutes', 'hours', 'days'] as const;
export type AgeUnit = (typeof AGE_UNITS)[number];

const MINUTES_IN: Record<AgeUnit, number> = { minutes: 1, hours: 60, days: 60 * 24 };

/** Converts to minutes. Storage holds this form alone (no two ways of writing the same span) */
export const minutesOf = (value: number, unit: AgeUnit): number => value * MINUTES_IN[unit];

/** Converts back to a unit for display, using the largest unit it divides evenly into — 2880 minutes becomes "2 days", 90 stays "90 minutes" */
export const splitDuration = (minutes: number): { value: number; unit: AgeUnit } => {
  for (const unit of ['days', 'hours'] as const) {
    const size = MINUTES_IN[unit];
    if (minutes % size === 0) return { value: minutes / size, unit };
  }
  return { value: minutes, unit: 'minutes' };
};

/**
 * What there is to count about a post: option names on the settings screen, also used in a
 * condition's description. The first four are reactions X shows under a post; the rest are
 * counted in the body. Both answer "how many", so they share one condition.
 */
export const COUNT_METRICS = [
  'reply',
  'repost',
  'like',
  'view',
  'textLength',
  'hashtag',
  'mention',
] as const;
export type CountMetric = (typeof COUNT_METRICS)[number];

/**
 * Which side of the number matches: unlike age, count comparison is inclusive — "100 likes
 * or more" is how a count is read, and at a whole number that difference is visible.
 */
export const COUNT_DIRECTIONS = ['atLeast', 'atMost'] as const;
export type CountDirection = (typeof COUNT_DIRECTIONS)[number];

/**
 * `negate` inverts that condition's result. A post without the target's value matches no
 * text condition, so negating makes it match ("the body does not contain ●●" holds for a
 * post with no body too).
 */
export type Condition =
  | {
      kind: 'text';
      target: MatchTarget;
      mode: MatchMode;
      pattern: string;
      /** Whether case matters. Ignored, even when set, for targets that look at a user ID */
      caseSensitive: boolean;
      negate: boolean;
    }
  | { kind: 'trait'; trait: TraitKey; negate: boolean }
  /**
   * How old a post is: older than this many minutes when read. An ad has no time and never
   * matches. Only one side exists, with no `negate` — "newer than an hour" cannot mean what it
   * says, since a post is judged once on arrival and stays newer than any span worth naming
   * for its whole time on the timeline (see `ageMatcher`).
   */
  | { kind: 'age'; minutes: number }
  /**
   * How many reactions of one kind a post carries. A post whose count cannot be read matches
   * no count condition, like a post with no time and an age condition. No `negate` here
   * either: "at least" and "at most" already cover both sides, and negating would only add
   * "also matches an unreadable count" — not worth a fourth combination on screen.
   */
  | { kind: 'count'; metric: CountMetric; direction: CountDirection; count: number };

export type TextCondition = Extract<Condition, { kind: 'text' }>;

export type AgeCondition = Extract<Condition, { kind: 'age' }>;

export type CountCondition = Extract<Condition, { kind: 'count' }>;

/**
 * Whether this condition determines somewhere to paint. Save-validation and judging both
 * consult it, so a new condition kind cannot slip through only one and produce "it saves
 * but nothing gets painted".
 */
export const canEmphasizeWith = (condition: Condition): condition is TextCondition =>
  condition.kind === 'text' &&
  !condition.negate &&
  canEmphasize(condition.target) &&
  !isSelfMode(condition.mode);

export type Rule = {
  id: string;
  /** Matches only when all of them hold (AND). A rule with none is not saved */
  conditions: Condition[];
  action: Action;
  color: string | null;
  /** The name shown in the list. When empty, the conditions are listed instead */
  label: string;
  /** A switch for stopping a rule temporarily rather than deleting it. A disabled rule takes no part in judging */
  enabled: boolean;
};

/** The description of one condition. The phrasing changes with the language, so the assembly lives in the dictionaries */
export const describeCondition = (condition: Condition, m: Messages): string => {
  if (condition.kind === 'trait') return m.conditions.trait(m.traits[condition.trait], condition.negate);
  if (condition.kind === 'age') {
    const { value, unit } = splitDuration(condition.minutes);
    return m.conditions.age(value, unit);
  }
  if (condition.kind === 'count') {
    return m.conditions.count(m.countMetrics[condition.metric], condition.count, condition.direction);
  }
  return m.conditions.text(
    m.rules.targets[condition.target],
    condition.pattern,
    condition.mode,
    condition.negate
  );
};

export const ruleName = (rule: Rule, m: Messages): string =>
  rule.label || rule.conditions.map((c) => describeCondition(c, m)).join(m.conditions.and);

export type FilterNode = {
  /** Whether filtering applies in this column. With an effective value of false, the upper tiers' rules do not apply either */
  enabled: boolean | null;
  rules: Rule[];
  /** The order this tier's rules are read in; after normalization it holds every rule's id in this tier exactly once */
  order: string[];
};

/**
 * Items a lower tier can put back to "as X shows it", named by where they sit in the
 * appearance. Only sizes and colours are listed: a choice-valued item already has X's own
 * display as one of its choices (`show`, `relative`), and a switch has an explicit "no", so
 * both can already cancel an upper tier's set. A size or colour has no such value — `null`
 * there means "not set", the thing that inherits — so cancelling needs saying separately.
 *
 * Held as a list on the tier rather than a third state on each item's type: fifteen items
 * would each become `T | null | Cleared`, and every reader of the appearance (merging,
 * stylesheet, each settings-screen field) would have to handle it. As a list, the idea
 * stays inside `inherit` (`resolve.ts`).
 */
export const CLEARABLE_ITEMS = [
  'columnWidth',
  'fontSize',
  'maxLines',
  'wordsShown',
  'media.maxThumbHeight',
  'colors.background',
  'colors.text',
  'colors.name',
  'colors.meta',
  'colors.link',
  'colors.border',
  'colors.columnTitle',
  'colors.columnHeader',
  'colors.composeBackground',
  'colors.pageBackground',
] as const;

export type ClearableItem = (typeof CLEARABLE_ITEMS)[number];

/**
 * The name of one colour's item. Colours are listed in several places (settings screen,
 * "what is in effect"); this turns a key from that list into the name used here, keeping
 * the two from drifting apart by hand.
 *
 * Returned as the literal type rather than `ClearableItem`, so a colour added to the
 * appearance without a `CLEARABLE_ITEMS` entry is refused at the call site. Typed as
 * `ClearableItem` it would need an unverifiable cast, pass through quietly, and never be
 * cancellable — the settings-screen field would offer to clear it and nothing would happen.
 */
export const colorItem = <K extends keyof AppearanceNode['colors']>(key: K): `colors.${K}` =>
  `colors.${key}`;

/** For the appearance, null means "not set": what a lower tier leaves unset is inherited from above */
export type AppearanceNode = {
  /** Whether the appearance applies here. With false, nothing applies, the upper tiers' settings included */
  enabled: boolean | null;
  columnWidth: number | null;
  /** Packs the posts: the padding around them, the avatar, and the row of reply and repost buttons */
  compact: boolean | null;
  fontSize: number | null;
  /** Cuts the body at this many lines, with the rest opened by "Show more". Lines as wrapped on screen */
  maxLines: number | null;
  /**
   * How many characters of extension-written text (a picture's description, a quoted post's
   * text, a card's headline) go on screen before "Show more"; one setting for both the
   * caption and the inserted body line, so they match. Unset takes the default (`WORDS_SHOWN`).
   */
  wordsShown: number | null;
  /** Drops the line breaks written into the body, turning each into a single space */
  collapseNewlines: boolean | null;
  /** Shows a rounded reaction count ("22万") as the number it is. Unset keeps X's own */
  rawCounts: boolean | null;
  colors: {
    background: string | null;
    text: string | null;
    name: string | null;
    /** Times, counts, reply targets: the text X shows dimly in gray */
    meta: string | null;
    link: string | null;
    border: string | null;
    columnTitle: string | null;
    /** The background of the bar carrying the column name itself */
    columnHeader: string | null;
    /** Background of the compose form. Answered by the posting account rather than the on-screen scope — the form belongs to no column or view (`ACCOUNT_COLORS`) */
    composeBackground: string | null;
    /**
     * Background of x.com's page outside the timeline (left nav, rail, margins). The timeline
     * paints over this — x.com draws it opaque (measured) — so the middle of the page stays
     * as X has it unless `background` is also set.
     */
    pageBackground: string | null;
  };
  media: { maxThumbHeight: number | null; style: MediaStyle | null };
  /** Whether to fix unreadable colors automatically. Unset means "yes", the opposite default from the other items */
  autoContrast: boolean | null;
  /** What a highlight color is laid over. Unset means over the column background */
  highlightBase: HighlightBase | null;
  /** Unset keeps X's own display */
  timeFormat: TimeFormat | null;
  /** How link cards and articles are shown. Unset keeps X Pro's own */
  cardStyle: AttachmentStyle | null;
  /** How a quoted post is shown. Unset keeps X Pro's own */
  quoteStyle: AttachmentStyle | null;
  /**
   * Items this tier puts back to "as X shows it", overriding whatever an upper tier set
   * (`CLEARABLE_ITEMS`). Empty when nothing is cancelled. Different from leaving an item
   * unset: unset means "whatever comes from above", this means "nothing, stop looking".
   */
  cleared: ClearableItem[];
};

export type SettingsNode = { filter: FilterNode; appearance: AppearanceNode };

/**
 * What the compose form does after a post goes out. Not held per tier: it belongs to
 * neither a column nor an account, and putting it under a tier would drag it through the
 * merging (resolve.ts) and "is this tier empty" judgements with nothing to say. Plain
 * booleans, not the tiers' `boolean | null` — with no tier above, "not set" would mean the same as false.
 */
export type ComposeSettings = {
  /** Open the compose form again after a post, instead of letting X Pro close it */
  reopen: boolean;
  /** Puts the hashtags that were written back into the emptied box. Only read while `reopen` is on — with the form closed there is nowhere to put them */
  keepHashtags: boolean;
};

/**
 * Whether the hashtags are put back. Does not depend on the form reopening: with the form
 * left closed, tags are kept until the next compose form is opened by hand and go in there
 * instead — two separate questions. Lives here with the other "nothing was set" answers, so
 * the settings screen and compose form cannot disagree about it.
 */
export const restoresHashtags = (compose: ComposeSettings): boolean => compose.keepHashtags;

/**
 * The blocks X stacks in the rail beside the timeline, in the order it stacks them.
 *
 * The search box is excluded: removing every block would leave a 350px column with only
 * the search box, and removing that too would empty rather than remove it — that is what
 * `wideTimeline` is for. The suggested-accounts block is excluded too, though X stacks it
 * here: it is X injecting content, not page furniture; it appears on both sites and is
 * answered once for the whole site (`InjectedSettings`) wherever X draws it.
 */
export const X_RAIL_KEYS = ['premium', 'news', 'trends', 'relevantPeople', 'footer'] as const;
export type XRailKey = (typeof X_RAIL_KEYS)[number];

/** true takes that block out of the rail */
export type XRailSettings = Record<XRailKey, boolean>;

/**
 * Items down the left of x.com that can be taken away, in the order X shows them.
 *
 * A fixed list rather than whatever the page holds: which items X shows varies by account,
 * and a reshaping settings screen would be worse than one offering an item that never
 * appears — it simply matches nothing. "More" is excluded and cannot be included: on x.com
 * that menu is the way into these settings (`surface/x.ts`), so hiding it would shut the
 * door from inside. Home and notifications are excluded too, being what navigation is for.
 */
export const X_NAV_KEYS = [
  'explore',
  'follow',
  'messages',
  'grok',
  'history',
  'creatorStudio',
  'articles',
  'premium',
  'profile',
  'postButton',
] as const;
export type XNavKey = (typeof X_NAV_KEYS)[number];

/** true takes that item off the navigation */
export type XNavSettings = Record<XNavKey, boolean>;

/**
 * Items inside the "More" menu that can be taken away, in the order X lists them.
 *
 * The menu itself stays — it is the way into these settings — but what fills it is another
 * matter; someone who never opens a Space or writes a Community Note reads past those every
 * time it opens. The extension's own entry is excluded and cannot be included: it is added by
 * `panel/x-menu.ts` and carries no address, while every item here is named by where it
 * leads, so nothing that hides an item can reach it.
 */
export const X_MENU_KEYS = [
  'lists',
  'communities',
  'communityNotes',
  'business',
  'ads',
  'spaces',
  'mutedKeyword',
  'settings',
] as const;
export type XMenuKey = (typeof X_MENU_KEYS)[number];

/** true takes that item out of the "More" menu */
export type XMenuSettings = Record<XMenuKey, boolean>;

/**
 * What of x.com's own furniture is taken away: the rail beside the timeline, the items down
 * the left, the post-writing box, the bar announcing new posts.
 *
 * Not held per tier, for the same reason as `ComposeSettings`: furniture belongs to the page
 * rather than the view, and "hide the rail on home but show it on a profile" means nothing.
 * x.com only — X Pro's deck has none of this (`appearance/apply.ts` decides that). Plain
 * booleans rather than the tiers' `boolean | null`, for the reason `ComposeSettings` gives.
 */
export type XChromeSettings = {
  /**
   * Takes the whole rail away and gives the timeline the room it used. The two are not asked
   * separately: widening with the rail still on screen pushes it out of the window (measured),
   * so it stands above `rail` — with it on, every block below is gone regardless of its own
   * setting.
   */
  wideTimeline: boolean;
  /*
   * What of the page is on screen: **true means it is there**, matching what the settings
   * screen ticks and unticks. Written this way round because the screen lists names of things
   * on the page, and an unticked box would otherwise read as "none of these are here".
   */
  rail: XRailSettings;
  nav: XNavSettings;
  menu: XMenuSettings;
  /** The two bars X floats in the bottom-right corner, one for Grok and one for chat */
  grokDrawer: boolean;
  chatDrawer: boolean;
  /** The box for writing a post at the head of the timeline. The reply box on a post's own page is the same X element, and stays either way */
  composeBox: boolean;
  /**
   * Presses the bar X floats over the timeline announcing new posts, as soon as it appears,
   * so the timeline fills itself. The one item here that adds rather than removes, and the
   * only one needing more than a stylesheet (`timeline/new-posts.ts`); it sits with the rest
   * because it answers the same question — what x.com does around the timeline.
   */
  autoNewPosts: boolean;
};

/**
 * Whether anything on this page differs from what x.com draws on its own. Lives here,
 * beside the shape, so the settings screen's "this has something in it" mark cannot drift
 * from what actually happens.
 *
 * Widening the timeline counts (it removes the rail to make room), as does auto-loading new
 * posts — the mark says "something is set", not just "something is gone".
 */
export const changesAnyChrome = (chrome: XChromeSettings): boolean =>
  chrome.wideTimeline ||
  chrome.autoNewPosts ||
  !chrome.composeBox ||
  !chrome.grokDrawer ||
  !chrome.chatDrawer ||
  X_RAIL_KEYS.some((key) => !chrome.rail[key]) ||
  X_NAV_KEYS.some((key) => !chrome.nav[key]) ||
  X_MENU_KEYS.some((key) => !chrome.menu[key]);

/**
 * What X slips into a timeline that is not a post: suggested accounts to follow, and posts
 * appended under a conversation as "Discover more".
 *
 * Held per site rather than per tier: both sites draw both blocks, and it is X deciding
 * where they go, not the reader, so a tier would drag them through the merging
 * (`resolve.ts`) and "is this tier empty" judgements with nothing to say. Plain booleans
 * for the reason `ComposeSettings` gives.
 */
export type InjectedSettings = {
  /** true means the block is left where X puts it; false takes it away (as in `XChromeSettings`) */
  whoToFollow: boolean;
  discoverMore: boolean;
};

/** Whether either block is being taken away. Beside the shape, like `changesAnyChrome` */
export const changesAnyInjected = (injected: InjectedSettings): boolean =>
  !injected.whoToFollow || !injected.discoverMore;

/**
 * Whether the detailed search form is put into x.com's rail.
 *
 * Not part of `XChromeSettings`, though shown beside it and governed by the same
 * `wideTimeline`: that type lists things **x.com draws**, each switch saying whether it
 * stays, while this is something **the extension adds** — including it there would make
 * name and contents disagree. Plain boolean, not a tier's `boolean | null`, for the reason
 * `ComposeSettings` gives.
 *
 * **Starts off**, unlike the rest of x.com's page: this adds something never asked for, and
 * the rail is not ours to fill uninvited (the two posting switches start off for the same reason).
 */
export type SearchSettings = {
  /** true puts the form in the rail. Read only on x.com; X Pro has no rail */
  form: boolean;
};

/**
 * Whether anything about the search has been asked for. Beside the shape, like
 * `changesAnyChrome` and `changesAnyInjected`, so the settings screen's "all of x.com" mark
 * cannot drift from what is actually set. A predicate rather than a field read at the call
 * site, so a second item added here need not also be remembered in the screen.
 */
export const changesAnySearch = (search: SearchSettings): boolean => search.form;

export type Settings = {
  version: number;
  /** The language of the text the extension shows. Not per tier: one for the whole extension */
  language: Language;
  /** What the compose form does after a post. One for the whole extension, like `language` */
  compose: ComposeSettings;
  /** What of x.com's own furniture is taken off the page. One for the whole site */
  xChrome: XChromeSettings;
  /** What the extension adds to x.com's search. One for the whole site, like `xChrome` */
  search: SearchSettings;
  /** What X slips into a timeline, one answer per site — the two are read in different frames of mind, so what is unwanted on one may be wanted on the other */
  injected: { pro: InjectedSettings; x: InjectedSettings };
  /**
   * X's own words for a picture nobody described ("Image", 「画像」), never passed on as a
   * description (`appearance/alt.ts`).
   *
   * The words are X's, in X's interface language, so they cannot be listed in advance —
   * they're learned from pages read and written back here, where they can be corrected. The
   * learning only ever adds (a hand-written word is never rewritten or dropped) and never
   * stops, since X uses a different word for a photo and a video, and even changes it over
   * time. One for the whole extension, like `language`: it follows the language X is shown
   * in, per account rather than per column.
   */
  genericAlts: string[];
  global: SettingsNode;
  /** Screen name → settings, the screen name being all that can be obtained from the DOM */
  accounts: Record<string, SettingsNode>;
  /**
   * One tier per site: applies while that site is read, whichever account and column/view.
   * Sits below the account and above the column (`tiersFor` in resolve.ts), so a site's say
   * wins over an account's.
   *
   * That order makes both directions expressible: an account's tier reaches both sites — the
   * compose form's colour follows the account wherever it posts — and where that is unwanted
   * the site is where it is taken back, since only a winning tier can take something back. A
   * tier like the other three, so unlike `injected` or `xChrome` it goes through the merging
   * and the "is this tier empty" judgements.
   */
  surfaces: { pro: SettingsNode; x: SettingsNode };
  /**
   * Per site, per account: applies while that account is read on that site. Sits below the
   * site and above the column, winning over both tiers it is made of — the more particular
   * answer is the one worth having.
   *
   * The account and site each reach further than they can say alone: an account's tier
   * reaches both sites, a site's tier every account, so "keep this account's colour off X
   * Pro but leave the other account alone" had nowhere to live. This is that intersection,
   * and nothing else belongs in it — what holds for an account everywhere stays on the
   * account, only the exception comes here. Screen name → settings, same shape as
   * `accounts`, same reason.
   */
  surfaceAccounts: { pro: Record<string, SettingsNode>; x: Record<string, SettingsNode> };
  /** columnId → settings. Never deleted for lacking a matching column — "not found" often just means pro.x.com is not open, and treating that as a state would be a lie */
  columns: Record<string, SettingsNode>;
};

// --- Normalizing stored values ---
//
// Input arrives as unknown from storage or a JSON import, so an unexpected type falls back
// to "not set" — one item reverting to default beats one broken value making everything unreadable.

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const rec = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
/**
 * A size in px or in lines. Only positive integers are accepted: a 0 or a negative number
 * reaching `buildCss` would make the column zero-wide and it would vanish from the screen.
 */
const size = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;

const isAction = (v: unknown): v is Action =>
  (Object.values(ACTIONS) as unknown[]).includes(v);

/** Also used by the settings screen's input validation */
export const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** The settings screen writes #rrggbb, so anything else counts as not set */
const hexColor = (v: unknown): string | null =>
  typeof v === 'string' && HEX_COLOR_PATTERN.test(v) ? v.toLowerCase() : null;

const isTarget = (v: unknown): v is MatchTarget => MATCH_TARGETS.includes(v as MatchTarget);
const isMode = (v: unknown): v is MatchMode => MATCH_MODES.includes(v as MatchMode);
const isTraitKey = (v: unknown): v is TraitKey => TRAIT_KEYS.includes(v as TraitKey);
const isCountMetric = (v: unknown): v is CountMetric => COUNT_METRICS.includes(v as CountMetric);

/** Reads a condition. Text conditions that lost their pattern, and conditions on unknown traits, are dropped */
const condition = (v: unknown): Condition | null => {
  const o = rec(v);
  const negate = bool(o.negate) ?? false;

  if (o.kind === 'trait') {
    return isTraitKey(o.trait) ? { kind: 'trait', trait: o.trait, negate } : null;
  }
  // Letting a 0 or a negative number through would make "older than 0 minutes" = every post
  if (o.kind === 'age') {
    const minutes = o.minutes;
    if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes <= 0) return null;
    return { kind: 'age', minutes };
  }
  // 0 is kept, unlike the age above: "0 or fewer likes" is worth writing, while "older
  // than 0 minutes" would mean every post
  if (o.kind === 'count') {
    const count = o.count;
    if (!isCountMetric(o.metric)) return null;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return null;
    const direction: CountDirection = o.direction === 'atMost' ? 'atMost' : 'atLeast';
    return { kind: 'count', metric: o.metric, direction, count };
  }
  if (o.kind !== 'text') return null;

  const target = isTarget(o.target) ? o.target : 'text';
  const mode = isMode(o.mode) ? o.mode : 'contains';

  // "Is the author" on a target that cannot offer it is discarded, so judging never
  // applies something the screen does not show
  if (isSelfMode(mode)) {
    return canCompareToSelf(target) ? { kind: 'text', target, mode, pattern: '', caseSensitive: false, negate } : null;
  }

  const pattern = str(o.pattern);
  if (!pattern) return null;

  return {
    kind: 'text',
    target,
    mode,
    pattern,
    caseSensitive: bool(o.caseSensitive) ?? false,
    negate,
  };
};

/**
 * Whether a stored condition expresses something no longer possible: an age on the young
 * side, written as "newer than an hour" or "not older than an hour" — both gone (see
 * `Condition`). The whole rule is dropped: reading it as "older" would invert the rule, and
 * dropping just the condition would remove an AND term and widen the match — a hiding rule
 * would start hiding what it never touched. Dropping the whole rule is the only outcome that
 * takes nothing off screen the reader did not ask to lose.
 */
const saysYoungerThan = (v: unknown): boolean => {
  const o = rec(v);
  if (o.kind !== 'age') return false;
  return o.direction === 'newer' ? o.negate !== true : o.negate === true;
};

/** Reads a rule. A rule with no conditions matches every post and is discarded */
const rule = (v: unknown): Rule | null => {
  const o = rec(v);
  if (arr(o.conditions).some(saysYoungerThan)) return null;
  const conditions = arr(o.conditions).map(condition).filter(isPresent);
  if (conditions.length === 0) return null;

  return {
    id: str(o.id) ?? newRuleId(),
    conditions,
    action: isAction(o.action) ? o.action : ACTIONS.COLLAPSE,
    color: hexColor(o.color),
    label: str(o.label) ?? '',
    // No stored on/off means never meant to be stopped, so it is enabled
    enabled: bool(o.enabled) ?? true,
  };
};

export const defaultOrder = (filter: Omit<FilterNode, 'order'>): string[] =>
  filter.rules.map((rule) => rule.id);

/**
 * Brings the order into exact correspondence with the rules that exist: unknown ids are
 * dropped, and rules missing from the order are appended at the end. Used both when reading
 * stored values and when the settings screen adds or removes a rule — without this, an added
 * rule could be saved without entering the order and never reach the judging.
 */
export const syncOrder = (order: unknown, rules: Rule[]): string[] => {
  const ids = new Set(rules.map((rule) => rule.id));

  const kept: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr(order)) {
    const id = str(raw);
    if (!id || !ids.has(id) || seen.has(id)) continue;
    seen.add(id);
    kept.push(id);
  }

  return [...kept, ...rules.map((rule) => rule.id).filter((id) => !seen.has(id))];
};

const isPresent = <T>(v: T | null): v is T => v !== null;

const isClearableItem = (v: unknown): v is ClearableItem =>
  (CLEARABLE_ITEMS as readonly unknown[]).includes(v);

/**
 * The list of items put back to "as X shows it". An unknown name is dropped, and the same
 * name twice counts once. Order is not meaningful (only ever asked "is this item in you") but
 * is left as written rather than sorted, so a stored file reads the way it was saved.
 */
const fillCleared = (v: unknown): ClearableItem[] => [
  ...new Set(arr(v).filter(isClearableItem)),
];

/** Fills in defaults so that missing keys or unexpected types in the stored values do not break anything */
export const fillNode = (v: unknown): SettingsNode => {
  const node = rec(v);
  const filter = rec(node.filter);
  const appearance = rec(node.appearance);
  const colors = rec(appearance.colors);
  const media = rec(appearance.media);

  // Order depends on which rules exist, so it is assembled after the other items are filled
  const rules = {
    enabled: bool(filter.enabled),
    rules: arr(filter.rules).map(rule).filter(isPresent),
  };

  return {
    filter: { ...rules, order: syncOrder(filter.order, rules.rules) },
    appearance: {
      enabled: bool(appearance.enabled),
      columnWidth: size(appearance.columnWidth),
      compact: bool(appearance.compact),
      fontSize: size(appearance.fontSize),
      maxLines: size(appearance.maxLines),
      wordsShown: size(appearance.wordsShown),
      collapseNewlines: bool(appearance.collapseNewlines),
      rawCounts: bool(appearance.rawCounts),
      colors: {
        background: hexColor(colors.background),
        text: hexColor(colors.text),
        name: hexColor(colors.name),
        meta: hexColor(colors.meta),
        link: hexColor(colors.link),
        border: hexColor(colors.border),
        columnTitle: hexColor(colors.columnTitle),
        columnHeader: hexColor(colors.columnHeader),
        composeBackground: hexColor(colors.composeBackground),
        pageBackground: hexColor(colors.pageBackground),
      },
      media: {
        maxThumbHeight: size(media.maxThumbHeight),
        /*
         * `collapse` is what this was before the mark was added — a hide switch. Read here
         * so old settings keep hiding instead of reappearing, and written back in the new
         * shape so it is read once
         */
        style: isMediaStyle(media.style) ? media.style : media.collapse === true ? 'hidden' : null,
      },
      timeFormat: isTimeFormat(appearance.timeFormat) ? appearance.timeFormat : null,
      cardStyle: isAttachmentStyle(appearance.cardStyle) ? appearance.cardStyle : null,
      quoteStyle: isAttachmentStyle(appearance.quoteStyle) ? appearance.quoteStyle : null,
      autoContrast: bool(appearance.autoContrast),
      highlightBase: isHighlightBase(appearance.highlightBase) ? appearance.highlightBase : null,
      cleared: fillCleared(appearance.cleared),
    },
  };
};

const nodeMap = (v: unknown): Record<string, SettingsNode> =>
  Object.fromEntries(Object.entries(rec(v)).map(([key, node]) => [key, fillNode(node)]));

/** A stored value that is not `true` becomes false — no third state, so a missing key and a broken one both land on what X Pro does on its own */
const fillCompose = (v: unknown): ComposeSettings => {
  const compose = rec(v);
  return { reopen: compose.reopen === true, keepHashtags: compose.keepHashtags === true };
};

/**
 * Default is off, so only an explicit `true` puts the form on the page — opposite of
 * `fillChrome` below, for the opposite reason: this adds something rather than leaving what X drew.
 */
const fillSearch = (v: unknown): SearchSettings => ({ form: rec(v).form === true });

/**
 * An item missing from the stored value stays where X put it, as does one stored as
 * something odd — default is `true` (on the page), and only an explicit `false` removes it.
 */
const fillItems = <K extends string>(v: unknown, keys: readonly K[]): Record<K, boolean> => {
  const stored = rec(v);
  return Object.fromEntries(keys.map((key) => [key, stored[key] !== false])) as Record<K, boolean>;
};

const fillOneInjected = (v: unknown): InjectedSettings => {
  const injected = rec(v);
  return {
    whoToFollow: injected.whoToFollow !== false,
    discoverMore: injected.discoverMore !== false,
  };
};

const fillInjected = (v: unknown): { pro: InjectedSettings; x: InjectedSettings } => {
  const injected = rec(v);
  return { pro: fillOneInjected(injected.pro), x: fillOneInjected(injected.x) };
};

/**
 * Both sites always have a tier, empty until written into. Kept rather than dropped when
 * empty, unlike accounts and columns: there are exactly two sites always, so no key to tidy up.
 */
const fillSurfaces = (v: unknown): { pro: SettingsNode; x: SettingsNode } => {
  const surfaces = rec(v);
  return { pro: fillNode(surfaces.pro), x: fillNode(surfaces.x) };
};

/** The two sites are always there, as in `fillSurfaces`, but what hangs off each is a map that empties out with the accounts, as in `nodeMap` */
const fillSurfaceAccounts = (
  v: unknown
): { pro: Record<string, SettingsNode>; x: Record<string, SettingsNode> } => {
  const surfaces = rec(v);
  return { pro: nodeMap(surfaces.pro), x: nodeMap(surfaces.x) };
};

/** Anything unreadable falls to "as x.com shows it", the same side a missing key lands on */
const fillChrome = (v: unknown): XChromeSettings => {
  const chrome = rec(v);
  return {
    wideTimeline: chrome.wideTimeline === true,
    rail: fillItems(chrome.rail, X_RAIL_KEYS),
    nav: fillItems(chrome.nav, X_NAV_KEYS),
    menu: fillItems(chrome.menu, X_MENU_KEYS),
    composeBox: chrome.composeBox !== false,
    autoNewPosts: chrome.autoNewPosts === true,
    grokDrawer: chrome.grokDrawer !== false,
    chatDrawer: chrome.chatDrawer !== false,
  };
};

/**
 * Words are kept as written, only tidied: blank lines dropped, duplicates counted once. A
 * word is compared against what X wrote into a picture, so trimming anything else would
 * stop it matching. Exported because the settings screen tidies typed input with the same
 * rule — written twice, the box and the stored list could disagree.
 */
export const tidyGenericAlts = (words: readonly string[]): string[] => [
  ...new Set(words.filter((word) => word.trim() !== '')),
];

const fillGenericAlts = (v: unknown): string[] =>
  tidyGenericAlts(arr(v).map(str).filter(isPresent));

export const fillAll = (v: unknown): Settings => {
  const stored = rec(v);
  return {
    version: SCHEMA_VERSION,
    language: isLanguage(stored.language) ? stored.language : 'auto',
    compose: fillCompose(stored.compose),
    xChrome: fillChrome(stored.xChrome),
    search: fillSearch(stored.search),
    injected: fillInjected(stored.injected),
    genericAlts: fillGenericAlts(stored.genericAlts),
    global: fillNode(stored.global),
    accounts: nodeMap(stored.accounts),
    surfaces: fillSurfaces(stored.surfaces),
    surfaceAccounts: fillSurfaceAccounts(stored.surfaceAccounts),
    columns: nodeMap(stored.columns),
  };
};

/** The state with nothing set. Built by running an empty input through the normalization, so the defaults are not written twice */
export const emptyNode = (): SettingsNode => fillNode(undefined);

/** Nothing taken off the page. Built the same way as `emptyNode`, for the same reason */
export const emptyChrome = (): XChromeSettings => fillChrome(undefined);

/**
 * Colours that only mean something where a scope is a column of its own. Named here, beside
 * the shape they belong to, because two sides must agree: the applying side drops them where
 * a surface has no columns, and the settings screen leaves them off that surface's tabs —
 * split apart, one side would be forgotten when an item is added.
 */
export const COLUMN_COLORS: readonly (keyof AppearanceNode['colors'])[] = [
  'columnTitle',
  'columnHeader',
];

/**
 * Colours answered by the account rather than the on-screen scope. The compose form belongs
 * to no column or view — X Pro shows it beside the deck, x.com opens it over the page — but
 * belongs to the posting account, carried in its own avatar. The applying side resolves it
 * with the column tier left out (`resolve.ts`'s `tiersFor`, for a scope with no `columnId`),
 * and the settings screen offers it only where a scope covers whole accounts. Named here
 * beside the shape for the reason `COLUMN_COLORS` is.
 */
export const ACCOUNT_COLORS: readonly (keyof AppearanceNode['colors'])[] = ['composeBackground'];

/**
 * Colours that only mean something on x.com — X Pro's deck has no page behind the columns to
 * paint; what is behind them is the deck itself, a different setting from coloring a column.
 */
export const X_ONLY_COLORS: readonly (keyof AppearanceNode['colors'])[] = ['pageBackground'];

/**
 * The same appearance with column-only items cleared: width, name, and the bar behind it.
 * x.com has one timeline filling the page's middle — no width of its own, and its name is
 * in the page's own header rather than a view's bar. Cleared rather than left unset:
 * `columnWidth` is written onto the scope itself, so on a surface with no columns it would
 * resize the timeline instead, a setting of its own.
 */
export const withoutColumnItems = (appearance: AppearanceNode): AppearanceNode => ({
  ...appearance,
  columnWidth: null,
  // Written out by name — via `COLUMN_COLORS` the keys would go through an index
  // signature, and a misspelt one would be added rather than refused
  colors: { ...appearance.colors, columnTitle: null, columnHeader: null },
});

/**
 * What of an appearance decides how a post is *drawn*, as one string. Two appearances that
 * agree here lay a post out the same way, and it is what the extension's own measurements are
 * remembered against (`appearance/apply.ts`): a colour picked or a mark reworded leaves every
 * height and line count where it was, and a column arriving beside others leaves theirs
 * alone. Items are named one by one, not taken wholesale, because "changes the layout" is a
 * judgement per item: colours do not, widths and sizes do, and so does anything that adds or
 * removes words from a post. An item added to the appearance and forgotten here shows up as
 * a measurement outliving a setting, which rights itself on the next redraw or resize.
 */
export const layoutKey = (appearance: AppearanceNode): string =>
  [
    appearance.columnWidth,
    appearance.compact,
    appearance.fontSize,
    appearance.maxLines,
    appearance.wordsShown,
    appearance.collapseNewlines,
    // The number takes more room than the rounded form it replaces, so a post can wrap differently
    appearance.rawCounts,
    appearance.timeFormat,
    appearance.cardStyle,
    appearance.quoteStyle,
    appearance.media.style,
    appearance.media.maxThumbHeight,
  ].join('|');

/**
 * What of an appearance decides the colours a post is drawn over, as one string. Companion
 * to `layoutKey`, for the other thing the extension measures: what is behind a post, which a
 * translucent highlight is composited over. Measuring means walking up from the post asking
 * every ancestor what it is painted in, so the answer is cached while this stays the same
 * (`filter/apply.ts`). Every colour goes in; excluded is everything about *other* scopes — a
 * column arriving beside this one changes the stylesheet without changing what is behind
 * anything already on screen.
 */
export const paintKey = (appearance: AppearanceNode): string =>
  Object.values(appearance.colors).join('|');

/** The appearance's contents. The switch for whether it applies (`enabled`) is not included */
const hasAppearanceValues = (appearance: AppearanceNode): boolean =>
  appearance.columnWidth !== null ||
  appearance.compact !== null ||
  appearance.fontSize !== null ||
  appearance.maxLines !== null ||
  appearance.wordsShown !== null ||
  appearance.collapseNewlines !== null ||
  appearance.rawCounts !== null ||
  appearance.timeFormat !== null ||
  appearance.cardStyle !== null ||
  appearance.quoteStyle !== null ||
  appearance.autoContrast !== null ||
  appearance.highlightBase !== null ||
  // Putting an item back to "as X shows it" is a setting too — overlooked here, a tier
  // doing only that would count empty and be dropped on save
  appearance.cleared.length > 0 ||
  Object.values(appearance.colors).some((value) => value !== null) ||
  Object.values(appearance.media).some((value) => value !== null);

const hasAppearanceSettings = (appearance: AppearanceNode): boolean =>
  // "Whether the appearance applies" is a setting too — overlooking it would treat a
  // tier holding only that as empty and discard it
  appearance.enabled !== null || hasAppearanceValues(appearance);

/**
 * Whether that tier holds any content, used by the settings screen to mark the list. The
 * "does it apply" switch is not counted, or a merely-switched tier would read as "a mark
 * but no rules".
 */
export const hasContent = (node: SettingsNode | undefined): boolean =>
  !!node && (node.filter.rules.length > 0 || hasAppearanceValues(node.appearance));

/**
 * Whether that tier sets nothing at all, used to drop emptied tiers from storage — kept
 * around, it would show up as a contentless "unassigned" entry once its column disappeared.
 */
export const isEmptyNode = (node: SettingsNode | undefined): boolean => {
  if (!node) return true;
  const { filter, appearance } = node;
  const hasFilter = filter.enabled !== null || filter.rules.length > 0;
  return !hasFilter && !hasAppearanceSettings(appearance);
};

export const emptySettings = (): Settings => fillAll(undefined);

/** A rule's identifier. Random because colliding ids from different devices or tiers would, on merging, drop one from the order and leave it unjudged */
export const newRuleId = (): string => crypto.randomUUID();
