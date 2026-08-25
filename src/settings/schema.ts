/**
 * The storage structure of the settings, and the normalization of stored values.
 * Merging the three tiers lives in resolve.ts, and reading and writing in storage.ts.
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

export const mediaCollapses = (collapse: boolean | null): boolean => collapse === true;

/**
 * The default is the opposite of `mediaCollapses`. Unreadable colors are an accident
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

/** For the appearance, null means "not set": what a lower tier leaves unset is inherited from above */
export type AppearanceNode = {
  /** Whether the appearance applies here. With false, nothing applies, the upper tiers' settings included */
  enabled: boolean | null;
  columnWidth: number | null;
  fontSize: number | null;
  /** Cuts the body at this many lines, with the rest opened by "Show more". Lines as wrapped on screen */
  maxLines: number | null;
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
  };
  media: { maxThumbHeight: number | null; collapse: boolean | null };
  /** Whether to fix unreadable colors automatically. Unset means "yes", the opposite default from the other items */
  autoContrast: boolean | null;
  /** What a highlight color is laid over. Unset means over the column background */
  highlightBase: HighlightBase | null;
  /** Unset keeps X's own display */
  timeFormat: TimeFormat | null;
};

export type SettingsNode = { filter: FilterNode; appearance: AppearanceNode };

export type Settings = {
  version: number;
  /** The language of the text the extension shows. Not per tier: one for the whole extension */
  language: Language;
  global: SettingsNode;
  /** Screen name → settings, the screen name being all that can be obtained from the DOM */
  accounts: Record<string, SettingsNode>;
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
      fontSize: size(appearance.fontSize),
      maxLines: size(appearance.maxLines),
      colors: {
        background: hexColor(colors.background),
        text: hexColor(colors.text),
        name: hexColor(colors.name),
        meta: hexColor(colors.meta),
        link: hexColor(colors.link),
        border: hexColor(colors.border),
        columnTitle: hexColor(colors.columnTitle),
        columnHeader: hexColor(colors.columnHeader),
      },
      media: {
        maxThumbHeight: size(media.maxThumbHeight),
        collapse: bool(media.collapse),
      },
      timeFormat: isTimeFormat(appearance.timeFormat) ? appearance.timeFormat : null,
      autoContrast: bool(appearance.autoContrast),
      highlightBase: isHighlightBase(appearance.highlightBase) ? appearance.highlightBase : null,
    },
  };
};

const nodeMap = (v: unknown): Record<string, SettingsNode> =>
  Object.fromEntries(Object.entries(rec(v)).map(([key, node]) => [key, fillNode(node)]));

export const fillAll = (v: unknown): Settings => {
  const stored = rec(v);
  return {
    version: SCHEMA_VERSION,
    language: isLanguage(stored.language) ? stored.language : 'auto',
    global: fillNode(stored.global),
    accounts: nodeMap(stored.accounts),
    columns: nodeMap(stored.columns),
  };
};

/** The state with nothing set. Built by running an empty input through the normalization, so the defaults are not written twice */
export const emptyNode = (): SettingsNode => fillNode(undefined);

/** The appearance's contents. The switch for whether it applies (`enabled`) is not included */
const hasAppearanceValues = (appearance: AppearanceNode): boolean =>
  appearance.columnWidth !== null ||
  appearance.fontSize !== null ||
  appearance.maxLines !== null ||
  appearance.timeFormat !== null ||
  appearance.autoContrast !== null ||
  appearance.highlightBase !== null ||
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
