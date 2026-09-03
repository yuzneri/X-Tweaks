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
 * The post traits usable as conditions. This order is the order on the settings screen.
 * "Has no photo or video" is expressed by negation (`negate`), so no paired entry is kept.
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
] as const;
export type TraitKey = (typeof TRAIT_KEYS)[number];

/** The default highlight color. The trailing `26` is 15% opacity, letting the background show through so the text stays readable */
export const DEFAULT_HIGHLIGHT_COLOR = '#f9188026';

/**
 * The default emphasis color: the same color at 40% opacity.
 * It paints the narrow area of a few characters, and at the highlight's 15% the match
 * would be impossible to spot.
 */
export const DEFAULT_EMPHASIS_COLOR = '#f9188066';

export const usesColor = (action: Action): boolean =>
  action === ACTIONS.HIGHLIGHT || action === ACTIONS.EMPHASIZE;

export const defaultColorFor = (action: Action): string =>
  action === ACTIONS.EMPHASIZE ? DEFAULT_EMPHASIS_COLOR : DEFAULT_HIGHLIGHT_COLOR;

/*
 * What happens when no tier sets anything. Both the judging side and the settings
 * screen consult these.
 * Scattered around, a change to a default would leave the screen alone giving the old
 * answer (with nothing broken, so nobody would notice).
 */

export const filterApplies = (enabled: boolean | null): boolean => enabled !== false;

/**
 * How the photos and videos in a post are shown.
 *
 * `show` is X Pro's own, held as a value so a lower tier can undo what an upper one set.
 * `caption` leaves the picture where it is and writes the description its author gave it
 * underneath; `text` puts that description into the post as a line and takes the picture
 * away; `mark` takes them off the timeline but says so, by putting a mark into the post
 * where they were (`appearance/apply.ts`); `hidden` takes them off and says nothing.
 * Between them: a mark tells a post with a photo from a post without one, at the cost of
 * a character; hiding outright is quieter and leaves the two looking alike. The text says
 * what the picture was of, for the posts whose author wrote it down — where nobody did,
 * there is nothing to say and the mark alone is what goes in. The caption says as much
 * without giving the picture up, and it is the one way of reading a description that asks
 * for no pointer: a tooltip is out of reach on a screen there is only a finger for.
 *
 * In the order of how much they show, which is the order they are offered in.
 * The cards have four ways of their own (`ATTACHMENT_STYLES`), listed apart from these:
 * the two are separate settings, described in their own words, and either may come to
 * hold a way the other has no use for — as this one now does.
 */
export const MEDIA_STYLES = ['show', 'caption', 'text', 'mark', 'hidden'] as const;
export type MediaStyle = (typeof MEDIA_STYLES)[number];

const isMediaStyle = (v: unknown): v is MediaStyle => MEDIA_STYLES.includes(v as MediaStyle);

export const mediaStyleOf = (value: MediaStyle | null): MediaStyle => value ?? 'show';

/**
 * Whether the photos and videos are off the timeline, marked or not.
 *
 * `caption` is not one of them, however much it looks like `text` in the list: it leaves
 * the picture where it was and only writes under it. Reading it as hidden would take the
 * height limit off the pictures it still shows (`appearance/frame.ts`).
 */
export const mediaHidden = (value: MediaStyle | null): boolean => {
  const style = mediaStyleOf(value);
  return style !== 'show' && style !== 'caption';
};

/**
 * Whether the posts are packed tight (the padding around them, the avatar, the row of
 * reply and repost buttons). Opt-in: left alone, X Pro's own spacing stays.
 */
export const isCompact = (compact: boolean | null): boolean => compact === true;

/**
 * Whether the line breaks written into a post are dropped, running the body into one
 * paragraph.
 *
 * Held apart from `compact` because the two differ in kind: packing changes how much
 * room a post takes, while this changes what the body reads like. A post that uses its
 * line breaks to mean something (a list, a couplet) loses that, so which of the two is
 * wanted is not the same question.
 */
export const collapsesNewlines = (collapse: boolean | null): boolean => collapse === true;

/**
 * The default is the opposite of the other switches. Unreadable colors are an accident
 * nobody asked for, so the default is the side that fixes itself when left alone.
 */
export const adjustsContrast = (autoContrast: boolean | null): boolean => autoContrast !== false;

/**
 * What a highlight color is laid over. A translucent color is not determined without a backdrop.
 * `column` lets CSS lay it down as it is, so it blends with the column background.
 * `theme` skips the column background alone, but CSS cannot ignore exactly one
 * ancestor's background, so the extension composites an opaque color and hands that over.
 */
export const HIGHLIGHT_BASES = ['column', 'theme'] as const;
export type HighlightBase = (typeof HIGHLIGHT_BASES)[number];

const isHighlightBase = (v: unknown): v is HighlightBase =>
  HIGHLIGHT_BASES.includes(v as HighlightBase);

export const highlightBaseOf = (value: HighlightBase | null): HighlightBase => value ?? 'column';

/**
 * How a post's time is shown. `relative` is X's own display, with the extension doing
 * nothing. That is the same result as leaving it unset, but it is held as a value so a
 * lower tier can undo an `absolute` set by an upper one.
 */
export const TIME_FORMATS = ['relative', 'absolute', 'both'] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

const isTimeFormat = (v: unknown): v is TimeFormat => TIME_FORMATS.includes(v as TimeFormat);

export const timeFormatOf = (value: TimeFormat | null): TimeFormat => value ?? 'relative';

/**
 * How the link cards and the articles hanging off a post are shown. `show` is X Pro's
 * own display, held as a value for the same reason `relative` is: a lower tier needs a
 * way to undo what an upper one set.
 *
 * The two are one setting because they are one thing on screen: a framed box with a
 * picture and a headline, standing between the body and the buttons. The quoted posts
 * have a setting of their own (`quoteStyleOf`), and the photos another (`MEDIA_STYLES`).
 * `text` puts the card into the post as a line of text at the end of the body — the
 * headline and the domain, still a link — and takes the card away. It reads like the
 * URL X strips out of the body when it makes a card, and it goes with the packed posts,
 * where a card takes more room than the post it hangs off.
 * The domain is as much of the address as there is to show: a card's link is a `t.co`
 * short URL, and the written URL is gone from the body.
 * `mark` goes further and leaves the mark alone, without the words. The photos and
 * videos have a mark of their own, under the setting that is about them (`MEDIA_STYLES`).
 * A post with no body — an article, a photo posted on its own — takes the line where the
 * card was instead, so nothing ever goes without leaving a word behind.
 */
export const ATTACHMENT_STYLES = ['show', 'text', 'mark', 'hidden'] as const;
export type AttachmentStyle = (typeof ATTACHMENT_STYLES)[number];

const isAttachmentStyle = (v: unknown): v is AttachmentStyle =>
  ATTACHMENT_STYLES.includes(v as AttachmentStyle);

export const cardStyleOf = (value: AttachmentStyle | null): AttachmentStyle => value ?? 'show';

/**
 * How a quoted post is shown. The same four ways as a card, under a setting of its own:
 * a quote is somebody's words rather than a preview of a link, and whoever wants the
 * cards folded away does not necessarily want the quotes folded away too.
 * Its line says what the quote says and who wrote it. It carries no link, X Pro writing
 * no address on the frame — the quoted post is reached by opening the post.
 */
export const quoteStyleOf = (value: AttachmentStyle | null): AttachmentStyle => value ?? 'show';

export const appearanceApplies = (enabled: boolean | null): boolean => enabled !== false;

/**
 * The reposter and the reply target are user IDs only because their display names are
 * either not on screen or run together with boilerplate, and pulling them out would
 * assume a UI language.
 */
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
] as const;
export type MatchTarget = (typeof MATCH_TARGETS)[number];

/** The targets that look at a user ID. X itself does not distinguish case, so that setting is ignored for them */
export const isScreenNameTarget = (target: MatchTarget): boolean =>
  target === 'screenName' ||
  target === 'repostedBy' ||
  target === 'quotedScreenName' ||
  target === 'replyTo';

/**
 * The targets emphasis can paint: only the ones written on screen as text.
 * Judging, painting and the validation on save all consult this one list. If any one of
 * them handled a target the others do not know, it would paint somewhere other than
 * where the match was.
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

/** Every post always has these three places */
export const COMMON_TARGETS = [
  'text',
  'screenName',
  'displayName',
] as const satisfies readonly MatchTarget[];

/**
 * The targets that only exist by virtue of that trait. The settings screen consults
 * this to show the input boxes that go with the trait picked.
 * Traits with an empty list (Community Note, ad, media) are properties of the post
 * itself and have no targets of their own.
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
  media: [],
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

/**
 * Negation (`negate`) could flip it too, but both are kept so the plainly readable form
 * can be chosen ("newer than one hour" reads better than "not older than one hour").
 */
export const AGE_DIRECTIONS = ['older', 'newer'] as const;
export type AgeDirection = (typeof AGE_DIRECTIONS)[number];

export const AGE_UNITS = ['minutes', 'hours', 'days'] as const;
export type AgeUnit = (typeof AGE_UNITS)[number];

const MINUTES_IN: Record<AgeUnit, number> = { minutes: 1, hours: 60, days: 60 * 24 };

/** Converts to minutes. Storage holds this form alone (no two ways of writing the same span) */
export const minutesOf = (value: number, unit: AgeUnit): number => value * MINUTES_IN[unit];

/**
 * Converts back to a unit for display, choosing the largest unit it divides evenly into.
 * 2880 minutes becomes "2 days" and 90 minutes stays "90 minutes".
 */
export const splitDuration = (minutes: number): { value: number; unit: AgeUnit } => {
  for (const unit of ['days', 'hours'] as const) {
    const size = MINUTES_IN[unit];
    if (minutes % size === 0) return { value: minutes / size, unit };
  }
  return { value: minutes, unit: 'minutes' };
};

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
  /** How old a post is, as minutes elapsed at the moment of judging. An ad, having no time, never matches */
  | { kind: 'age'; direction: AgeDirection; minutes: number; negate: boolean };

export type TextCondition = Extract<Condition, { kind: 'text' }>;

export type AgeCondition = Extract<Condition, { kind: 'age' }>;

/**
 * Whether this condition determines somewhere to paint.
 * The validation on save and the judging both consult this. Written separately, adding a
 * condition would let one of them slip and produce "it saves but nothing gets painted".
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
    return m.conditions.age(value, unit, condition.direction, condition.negate);
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
  /**
   * The order this tier's rules are read in. After normalization it contains the id of
   * every rule that exists in this tier, exactly once each.
   */
  order: string[];
};

/**
 * The items a lower tier can put back to "as X shows it", named by where they sit in the
 * appearance.
 *
 * Only the sizes and the colours are here, and the reason is what the other items are
 * made of. A choice-valued item already holds X's own display as one of its choices
 * (`show`, `relative`), and a switch has three states with "no" as the explicit opposite
 * — either can be set to a value that cancels what an upper tier said. A size and a
 * colour have no such value: `null` there means "not set", which is the very thing that
 * inherits, so cancelling from below needs saying separately.
 *
 * Held as a list on the tier rather than as a third state on each item's type. Fifteen
 * items would each become `T | null | Cleared`, and every reader of the appearance — the
 * merging, the stylesheet, each field on the settings screen — would have to answer for
 * the third state. As a list, the whole idea stays inside `inherit` (`resolve.ts`).
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
 * The name of one colour's item. The colours are handled as a list in several places
 * (the settings screen, "what is in effect"), and this is what turns a key from that list
 * into the name used here, so the two cannot drift apart by hand.
 *
 * The name is returned as the literal type it is rather than as `ClearableItem`, so that
 * a colour added to the appearance without an entry in `CLEARABLE_ITEMS` is refused where
 * it is passed on. Named as `ClearableItem` — which would need a cast, the compiler being
 * unable to see that every colour has an entry — that colour would go through quietly and
 * simply never be cancellable, with the field on the settings screen offering to put it
 * back and nothing happening.
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
   * How many characters of what the extension writes into a post go on screen: the
   * description given to a picture, a quoted post's text, a card's headline. The rest is
   * opened by "Show more".
   *
   * One setting for the caption under a picture and for the line put into the body, so the
   * two show the same amount. Unset takes the default (`WORDS_SHOWN`).
   */
  wordsShown: number | null;
  /** Drops the line breaks written into the body, turning each into a single space */
  collapseNewlines: boolean | null;
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
    /**
     * The background of the form a new post is written in.
     *
     * Answered by the account the form will post as rather than by the scope on screen:
     * the form belongs to nobody's column or view (`ACCOUNT_COLORS`).
     */
    composeBackground: string | null;
    /**
     * The background of x.com's page outside the timeline: the items down the left, the
     * rail beside it, and the margins either side.
     *
     * The timeline itself paints over this — x.com draws it opaque (measured) — so what
     * is in the middle of the page stays as X has it unless `background` is set too.
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
   * The items this tier puts back to "as X shows it", whatever an upper tier set
   * (`CLEARABLE_ITEMS`). Empty on a tier that cancels nothing.
   *
   * Different in kind from leaving an item unset: unset means "whatever comes down from
   * above", this means "nothing, and stop looking".
   */
  cleared: ClearableItem[];
};

export type SettingsNode = { filter: FilterNode; appearance: AppearanceNode };

/**
 * What the compose form does after a post goes out.
 *
 * Not held per tier. The compose form belongs to neither a column nor an account, and
 * putting it under a tier would drag it through the merging (resolve.ts) and the
 * "is this tier empty" judgements, where it has nothing to say.
 *
 * Both are plain booleans rather than the `boolean | null` the tiers use. With no tier
 * above to inherit from, "not set" would mean the same thing as false.
 */
export type ComposeSettings = {
  /** Open the compose form again after a post, instead of letting X Pro close it */
  reopen: boolean;
  /**
   * Put the hashtags that were written back into the emptied box.
   * Only read while `reopen` is on: with the form closed there is nowhere to put them.
   */
  keepHashtags: boolean;
};

/**
 * Whether the hashtags are put back.
 *
 * It does not depend on the form being opened again. With the form left to close, the tags
 * are kept until the next compose form is opened by hand and go in there instead, so the
 * two switches answer two separate questions.
 * It lives here, beside the other "what happens when nothing was set" answers, so that
 * the settings screen and the compose form cannot drift into disagreeing about it.
 */
export const restoresHashtags = (compose: ComposeSettings): boolean => compose.keepHashtags;

/**
 * The blocks X stacks in the rail beside the timeline, in the order it stacks them.
 *
 * The search box is not among them. Taking every block away and leaving the rail standing
 * would give a column 350px wide with a search box alone in it, and taking that away too
 * would leave the column empty rather than gone — which is what `wideTimeline` is for.
 *
 * The accounts X suggests are not on the list either, though X does stack them here. That
 * block is X slipping something in rather than furniture of the page, it appears on both
 * sites, and it is answered once for the whole site (`InjectedSettings`) — wherever X
 * draws it, in the rail or down the timeline.
 */
export const X_RAIL_KEYS = ['premium', 'news', 'trends', 'relevantPeople', 'footer'] as const;
export type XRailKey = (typeof X_RAIL_KEYS)[number];

/** true takes that block out of the rail */
export type XRailSettings = Record<XRailKey, boolean>;

/**
 * The items down the left of x.com that can be taken away, in the order X shows them.
 *
 * A fixed list rather than whatever the page happens to be holding: which items X puts
 * there differs from one account to the next, and a settings screen changing shape with
 * whatever was last seen would be worse than one offering an item that never turns up.
 * An item X is not showing simply matches nothing.
 *
 * "More" is not on it and cannot be: on x.com that menu is the way into these very
 * settings (`surface/x.ts`), so hiding it would shut the door from the inside. Home and
 * notifications are not on it either — those are what the navigation is for.
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
 * The items inside the "More" menu that can be taken away, in the order X lists them.
 *
 * The menu itself stays — on x.com it is the way into these very settings — but what X
 * fills it with is another matter, and someone who never opens a Space or writes a
 * Community Note is reading past those every time the menu opens.
 *
 * The extension's own entry is not on the list and cannot be: it is put there by
 * `panel/x-menu.ts` and carries no address, while every item here is named by where it
 * leads. Nothing that hides an item can reach it.
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
 * What of x.com's own furniture is taken away: the rail beside the timeline, the items
 * down the left, the box for writing a post, the bar announcing new ones.
 *
 * Not held per tier, for the same reason as `ComposeSettings`: the furniture belongs to
 * the page rather than to the view being looked at, and "hide the rail on home but show
 * it on a profile" is not something anyone means. x.com alone — X Pro's deck has none of
 * this, and `appearance/apply.ts` is where that is decided.
 *
 * Plain booleans rather than the tiers' `boolean | null`: with nothing above to inherit
 * from, "not set" would be saying the same as false twice.
 */
export type XChromeSettings = {
  /**
   * Takes the whole rail away and lets the timeline have the room it was using.
   *
   * The two go together rather than being asked separately: widening with the rail still
   * on screen pushes the rail out of the window (measured), so the only widening worth
   * offering is the one that clears the rail first. It stands above `rail` for that
   * reason — with it on, every block below has gone whatever each one says.
   */
  wideTimeline: boolean;
  /*
   * What of the page is on screen. **true means it is there**, which is what a reader of
   * the settings screen ticks and unticks; false takes it away.
   *
   * Written this way round because the screen is a list of names of things on the page,
   * and an empty box beside each name reads as "none of these are here" — the opposite of
   * the truth. Storing "hidden" and turning it round on the screen alone was worse: two
   * halves of one program saying opposite things about the same field (2026-09-03).
   */
  rail: XRailSettings;
  nav: XNavSettings;
  menu: XMenuSettings;
  /** The two bars X floats in the bottom-right corner, one for Grok and one for chat */
  grokDrawer: boolean;
  chatDrawer: boolean;
  /**
   * The box for writing a post at the head of the timeline. The box for writing a reply
   * on a post's own page is the same element of X's, and stays either way.
   */
  composeBox: boolean;
  /**
   * Presses the bar X floats over the timeline to say that posts have arrived, as soon
   * as it appears, so the timeline fills itself.
   *
   * The one item here that does something rather than takes something away, and the one
   * that needs more than a stylesheet (`timeline/new-posts.ts`). It sits with the rest
   * because it answers the same question they do — what x.com does around the timeline —
   * and asking it on a screen of its own would only make it harder to find.
   */
  autoNewPosts: boolean;
};

/**
 * Whether anything on this page has been asked for at all — that is, whether it differs
 * from the page x.com draws on its own.
 *
 * It lives here, beside the shape, so that the settings screen's "this has something in
 * it" mark cannot drift from what the page actually does.
 *
 * Widening the timeline counts: it takes the rail away to make the room, so it changes
 * the page on its own. So does bringing new posts in, which adds rather than takes away —
 * the mark says "something is set", not "something is gone".
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
 * What X slips into a timeline that is not a post: the accounts it suggests following,
 * and the posts it appends under a conversation as "Discover more".
 *
 * Held per site rather than per tier. Both sites draw both blocks, and neither is
 * something anyone means differently from one column to the next — X decides where they
 * go, not the reader. Put on a tier they would drag through the merging (`resolve.ts`)
 * and the "is this tier empty" judgements with nothing to say in either.
 *
 * Plain booleans for the reason `ComposeSettings` gives: with no tier above to inherit
 * from, "not set" would be saying the same as false twice.
 */
export type InjectedSettings = {
  /** true means the block is left where X puts it; false takes it away (as in `XChromeSettings`) */
  whoToFollow: boolean;
  discoverMore: boolean;
};

/** Whether either block is being taken away. Beside the shape, like `changesAnyChrome` */
export const changesAnyInjected = (injected: InjectedSettings): boolean =>
  !injected.whoToFollow || !injected.discoverMore;

export type Settings = {
  version: number;
  /** The language of the text the extension shows. Not per tier: one for the whole extension */
  language: Language;
  /** What the compose form does after a post. One for the whole extension, like `language` */
  compose: ComposeSettings;
  /** What of x.com's own furniture is taken off the page. One for the whole site */
  xChrome: XChromeSettings;
  /**
   * What X slips into a timeline, one answer per site. Kept apart by site rather than
   * shared, because the two sites are read in different frames of mind and what is
   * unwanted on one may be wanted on the other.
   */
  injected: { pro: InjectedSettings; x: InjectedSettings };
  /**
   * X's own words for a picture nobody described ("Image", 「画像」), which are never
   * passed on as a description (`appearance/alt.ts`).
   *
   * The words are X's, in X's interface language, so they cannot be listed in advance:
   * they are learned from the pages being read and written back here, where they can be
   * read and corrected. The learning only ever adds — a word written by hand is never
   * rewritten or dropped — and it never stops, X having a different word for a photo and
   * for a video and a page showing them at different times.
   *
   * One for the whole extension, like `language`: they follow the language X is shown in,
   * which is one for the account rather than one per column.
   */
  genericAlts: string[];
  global: SettingsNode;
  /** Screen name → settings, the screen name being all that can be obtained from the DOM */
  accounts: Record<string, SettingsNode>;
  /**
   * One tier per site: what applies while that site is being read, whichever account and
   * whichever column or view. It sits below the account and above the column
   * (`tiersFor` in resolve.ts), so what a site says wins over what an account says.
   *
   * That order is what makes the two directions expressible. An account's tier reaches
   * both sites, which is what it is for — the colour of the form a post is written in
   * follows the account wherever it posts from. Where that is not wanted, the site is
   * where it gets taken back, and only a tier that wins can take something back.
   *
   * A tier like the other three, so unlike `injected` or `xChrome` it does go through the
   * merging and the "is this tier empty" judgements.
   */
  surfaces: { pro: SettingsNode; x: SettingsNode };
  /**
   * Per site, per account: what applies while that account is being read on that site.
   * It sits below the site and above the column, so it wins over both of the tiers it is
   * made of — the more particular of two answers is the one worth having.
   *
   * The account and the site each reach further than they can say. An account's tier
   * reaches both sites and a site's tier reaches every account, so "keep this account's
   * colour off X Pro, but leave the other account's alone" had nowhere to be written.
   * This is that square of the multiplication, and nothing else belongs in it: what holds
   * for an account everywhere still goes on the account, and only the exception comes here.
   *
   * Screen name → settings, the same shape as `accounts` and for the same reason.
   */
  surfaceAccounts: { pro: Record<string, SettingsNode>; x: Record<string, SettingsNode> };
  /**
   * columnId → settings. Never deleted just because no matching column can be found.
   * "Not found" often only means pro.x.com is not open, and holding it as a state would be a lie.
   */
  columns: Record<string, SettingsNode>;
};

// --- Normalizing stored values ---
//
// The input arrives as unknown from storage or a JSON import, so a value of an
// unexpected type falls back to "not set".
// Better to have one item return to its default than to have one broken value make the
// whole settings unreadable.

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const rec = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
/**
 * A size in px or in lines. Only positive integers are accepted.
 * A 0 or a negative number reaching `buildCss` would make the column zero-wide and it
 * would vanish from the screen.
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
    const direction: AgeDirection = o.direction === 'newer' ? 'newer' : 'older';
    return { kind: 'age', direction, minutes, negate };
  }
  if (o.kind !== 'text') return null;

  const target = isTarget(o.target) ? o.target : 'text';
  const mode = isMode(o.mode) ? o.mode : 'contains';

  // "Is the author" attached to a target that cannot offer it is discarded, so no state
  // exists where the judging applies something the screen does not show
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

/** Reads a rule. A rule with no conditions matches every post and is discarded */
const rule = (v: unknown): Rule | null => {
  const o = rec(v);
  const conditions = arr(o.conditions).map(condition).filter(isPresent);
  if (conditions.length === 0) return null;

  return {
    id: str(o.id) ?? newRuleId(),
    conditions,
    action: isAction(o.action) ? o.action : ACTIONS.COLLAPSE,
    color: hexColor(o.color),
    label: str(o.label) ?? '',
    // Settings with no on/off are taken as never having been meant to be stopped, and are enabled
    enabled: bool(o.enabled) ?? true,
  };
};

export const defaultOrder = (filter: Omit<FilterNode, 'order'>): string[] =>
  filter.rules.map((rule) => rule.id);

/**
 * Brings the order into exact correspondence with the rules that exist.
 * Ids of rules that do not exist are dropped, and rules missing from the order are
 * appended at the end.
 *
 * Used both when reading stored values and when the settings screen adds or removes a
 * rule. Without aligning it on the screen side, an added rule would be saved without
 * entering the order and would never reach the judging.
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
 * The list of items put back to "as X shows it". A name this version does not know is
 * dropped, and the same name twice counts once.
 *
 * The order is not kept as anything meaningful — the list is only ever asked "is this
 * item in you" — but it is left as written rather than sorted, so a stored file reads the
 * way it was saved.
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

  // The order is decided by looking at the rules that exist, so it is assembled after the other items are filled
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
         * `collapse` is what this was before the mark was added: a switch for hiding.
         * Read here so that settings saved then keep hiding, instead of quietly coming
         * back on screen. Written back in the new shape, so it is read once
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

/**
 * A stored value that is not `true` becomes false. There is no third state to keep, so
 * a missing key and a broken one land on the same side: what X Pro does on its own.
 */
const fillCompose = (v: unknown): ComposeSettings => {
  const compose = rec(v);
  return { reopen: compose.reopen === true, keepHashtags: compose.keepHashtags === true };
};

/**
 * An item missing from the stored value stays where X put it, as does one stored as
 * something odd — so the default is `true` (it is on the page), and only an explicit
 * `false` takes something away.
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
 * Both sites always have a tier, empty until something is written into it. Kept rather
 * than dropped when empty, unlike the accounts and the columns: there are exactly two and
 * they never go away, so there is no key to tidy up.
 */
const fillSurfaces = (v: unknown): { pro: SettingsNode; x: SettingsNode } => {
  const surfaces = rec(v);
  return { pro: fillNode(surfaces.pro), x: fillNode(surfaces.x) };
};

/**
 * The two sites are always there, as in `fillSurfaces`, but what hangs off each of them is
 * a map that empties out with the accounts, as in `nodeMap`.
 */
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
 * The words are kept as they were written, only tidied: blank lines are dropped and the
 * same word twice counts once. A word is compared with what X wrote into a picture, so
 * trimming anything else off it would stop it matching.
 *
 * Exported because the settings screen tidies what was typed with the same rule. Written
 * twice, the box would show one thing and the stored list hold another.
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
 * The colors that only mean something where a scope is a column of its own.
 *
 * Named here, beside the shape they belong to, because two sides have to agree on them:
 * the applying side drops them where the surface has no columns, and the settings screen
 * leaves them out of that surface's tabs. Split apart, one of the two would be forgotten
 * the next time an item is added.
 */
export const COLUMN_COLORS: readonly (keyof AppearanceNode['colors'])[] = [
  'columnTitle',
  'columnHeader',
];

/**
 * The colors answered by the account rather than by the scope on screen.
 *
 * The form a new post is written in belongs to no column and no view: on X Pro it stands
 * beside the deck, on x.com it opens over the page. What it does belong to is the account
 * it will post as, which it carries in its own avatar. So the applying side resolves it
 * with the column tier left out (`resolve.ts`'s `tiersFor` does that for a scope with no
 * `columnId`), and the settings screen offers it only where a scope covers whole accounts.
 *
 * Named here beside the shape for the same reason `COLUMN_COLORS` is: two sides have to
 * agree, and split apart one of them would be forgotten.
 */
export const ACCOUNT_COLORS: readonly (keyof AppearanceNode['colors'])[] = ['composeBackground'];

/**
 * The colors that only mean something on x.com.
 *
 * X Pro's deck has no page behind the columns to paint — what is behind them is the deck
 * itself, and coloring that is a different setting from coloring a column.
 */
export const X_ONLY_COLORS: readonly (keyof AppearanceNode['colors'])[] = ['pageBackground'];

/**
 * The same appearance with the column-only items cleared: the width, the name, and the
 * bar behind it. x.com has one timeline filling the middle of the page — no width of its
 * own to set, and its name is written into the page's own header rather than a bar of the
 * view's.
 *
 * Cleared rather than left to miss: `columnWidth` is written onto the scope itself, so on
 * a surface with no columns it would resize the timeline, which is a setting of its own
 * and not this one.
 */
export const withoutColumnItems = (appearance: AppearanceNode): AppearanceNode => ({
  ...appearance,
  columnWidth: null,
  // Written out by name. Built from `COLUMN_COLORS` instead, the keys would go through an
  // index signature and a misspelt one would be added rather than refused
  colors: { ...appearance.colors, columnTitle: null, columnHeader: null },
});

/** The appearance's contents. The switch for whether it applies (`enabled`) is not included */
const hasAppearanceValues = (appearance: AppearanceNode): boolean =>
  appearance.columnWidth !== null ||
  appearance.compact !== null ||
  appearance.fontSize !== null ||
  appearance.maxLines !== null ||
  appearance.wordsShown !== null ||
  appearance.collapseNewlines !== null ||
  appearance.timeFormat !== null ||
  appearance.cardStyle !== null ||
  appearance.quoteStyle !== null ||
  appearance.autoContrast !== null ||
  appearance.highlightBase !== null ||
  // Putting an item back to "as X shows it" is a setting like any other. Overlooked here,
  // a tier that only does that would count as empty and be dropped on save
  appearance.cleared.length > 0 ||
  Object.values(appearance.colors).some((value) => value !== null) ||
  Object.values(appearance.media).some((value) => value !== null);

const hasAppearanceSettings = (appearance: AppearanceNode): boolean =>
  // "Whether the appearance applies" is a setting too. Overlooking it would treat a tier
  // holding only that as empty and discard it
  appearance.enabled !== null || hasAppearanceValues(appearance);

/**
 * Whether that tier holds any content. Used by the settings screen to mark the list.
 * The "does it apply" switch is not counted: marking a tier that was merely switched
 * would read as "there is a mark but no rules".
 */
export const hasContent = (node: SettingsNode | undefined): boolean =>
  !!node && (node.filter.rules.length > 0 || hasAppearanceValues(node.appearance));

/**
 * Whether that tier sets nothing at all. Used to drop emptied tiers from storage.
 * Kept around, such a tier would show up in the list as a contentless "unassigned" entry
 * once its column disappeared.
 */
export const isEmptyNode = (node: SettingsNode | undefined): boolean => {
  if (!node) return true;
  const { filter, appearance } = node;
  const hasFilter = filter.enabled !== null || filter.rules.length > 0;
  return !hasFilter && !hasAppearanceSettings(appearance);
};

export const emptySettings = (): Settings => fillAll(undefined);

/**
 * A rule's identifier. It is random because ids of rules created on different devices or
 * in different tiers colliding would, on merging, drop one of them from the order and
 * leave it unjudged.
 */
export const newRuleId = (): string => crypto.randomUUID();
