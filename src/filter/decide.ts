/** Decides how one post is treated. It never touches the DOM, only what post.ts read and the settings */
import {
  ACTIONS,
  type Action,
  canEmphasizeWith,
  type TextCondition,
  type AgeCondition,
  type CountCondition,
  type CountMetric,
  defaultColorFor,
  filterApplies,
  isScreenNameTarget,
  isSelfMode,
  ruleName,
  type Condition,
  type FilterNode,
  type MatchTarget,
  type Rule,
  type TraitKey,
} from '../settings/schema.ts';
import type { Messages } from '../i18n/index.ts';

/**
 * One post's worth of information, as the judgement sees it. Items without the marker it
 * needs (notifications in a notification column, say) never get this far.
 */
export type Post = {
  /**
   * The strings per target, all lists because treating "several" and "one" separately would
   * split the matching in two. An empty list means the post has no such value.
   */
  values: Record<MatchTarget, string[]>;
  isRepost: boolean;
  isQuote: boolean;
  isReply: boolean;
  hasMedia: boolean;
  /** A Community Note's state: `added` is shown, `rating` not shown yet and a rating being asked for */
  communityNote: 'added' | 'rating' | null;
  /** The state of a poll. `open` means voting is still possible, `closed` that the results are out */
  poll: 'open' | 'closed' | null;
  hasSpace: boolean;
  hasArticle: boolean;
  /** The preview shown for an ordinary pasted URL */
  hasLinkCard: boolean;
  isAd: boolean;
  /** Whether X's verified badge stands beside the author's name */
  isVerified: boolean;
  /** Whether a picture of the post's own stands there with nothing written about it */
  hasUndescribedMedia: boolean;
  /** Whether the text holds a pasted URL, whether or not X drew a card under it */
  hasBodyLink: boolean;
  /**
   * When it was posted (epoch milliseconds), null when unreadable. The post's own time
   * rather than the quoted post's, and on a repost the original post's.
   */
  postedAt: number | null;
  /**
   * What there is to count. null where the number is not on the post at all, which is not
   * zero — X shows none for some posts' views, while replies, reposts and likes say "0".
   * In-body counts (the characters, the hashtags, the mentions) are never null: an empty body is 0
   */
  counts: Record<CountMetric, number | null>;
};

/** A range to paint. Positions within a string, where `end` points just past the last character */
export type MarkRange = { start: number; end: number };

/**
 * How emphasis is decided: pass a string to `ranges` for the ranges to paint within it, in
 * order. Which element's string to pass is the DOM side's to decide from `target` (filter/apply.ts).
 */
export type Emphasis = {
  target: MatchTarget;
  ranges: (value: string) => MarkRange[];
  color: string;
};

/** How one post is treated. The shapes are split by action, making "collapsed but has a color" inexpressible */
export type Decision =
  | { action: typeof ACTIONS.COLLAPSE; label: string }
  | { action: typeof ACTIONS.HIDE; label: string }
  | {
      action: typeof ACTIONS.HIGHLIGHT;
      /** The default color, when the rule specifies none */
      color: string;
      label: string;
    };

/**
 * The result of judging one post. Only the first matching action deciding how the post is
 * shown takes effect, but emphasis neither collapses nor hides, so every match applies.
 */
export type Verdict = {
  decision: Decision | null;
  /** In list order. Where two overlap on the same characters, the earlier one takes it */
  emphases: Emphasis[];
};

type CompiledRule = {
  matches: (post: Post) => boolean;
  action: Action;
  color: string;
  label: string;
  /**
   * Where to paint, one entry per text condition of that rule; empty unless the action is
   * emphasis. Conditions with nothing to paint (negated ones, unpaintable targets) are left out.
   */
  emphases: Emphasis[];
};

export type CompiledFilter = {
  enabled: boolean;
  /** In the configured order. Judging is just walking it in that order */
  rules: CompiledRule[];
};

/**
 * For targets that look at a user ID, the setting is ignored, since X itself does not
 * distinguish case. The same rule is used both for judging and for where emphasis paints.
 */
const caseSensitivityOf = (condition: TextCondition): boolean =>
  isScreenNameTarget(condition.target) ? false : condition.caseSensitive;

/** A match when any of the target's values matches the pattern. A post with no such value (an empty list) matches none */
const textMatcher = (condition: TextCondition): ((post: Post) => boolean) => {
  const caseSensitive = caseSensitivityOf(condition);

  // Self-threads are already read as "reply target = author" by `readPost`, so looking
  // at the target's values is enough
  if (isSelfMode(condition.mode)) {
    return (post) => {
      const me = post.values.screenName[0];
      return post.values[condition.target].some((value) => sameUser(value, me));
    };
  }

  if (condition.mode === 'regex') {
    let regex: RegExp;
    try {
      // No g flag: lastIndex would persist and throw off later judgements with the same pattern
      regex = new RegExp(condition.pattern, caseSensitive ? 'u' : 'iu');
    } catch {
      // Normally impossible (patterns are validated when saved), but reading a broken setting must not throw: match nothing
      return () => false;
    }
    return (post) => post.values[condition.target].some((value) => regex.test(value));
  }

  const needle = caseSensitive ? condition.pattern : condition.pattern.toLowerCase();
  return (post) =>
    post.values[condition.target].some((raw) => {
      const value = caseSensitive ? raw : raw.toLowerCase();
      return condition.mode === 'exact' ? value === needle : value.includes(needle);
    });
};

/** Makes characters meaningful in a regular expression be treated as plain characters */
const escapeRegex = (pattern: string): string => pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds the function returning where the matches are; both "contains" and regular
 * expressions search with one. Counting positions in a `toLowerCase()`d string would shift
 * them for characters whose length changes when lowercased (`ß` and the like), so when case
 * is ignored the `i` flag is used and positions are counted in the original string.
 */
const rangeFinder = (
  rule: TextCondition,
  caseSensitive: boolean
): ((value: string) => MarkRange[]) => {
  if (rule.mode === 'exact') {
    const needle = caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
    // An exact match asks whether that element's string itself matches
    return (value) => {
      const target = caseSensitive ? value : value.toLowerCase();
      return target === needle && value.length > 0 ? [{ start: 0, end: value.length }] : [];
    };
  }

  const source = rule.mode === 'regex' ? rule.pattern : escapeRegex(rule.pattern);
  let regex: RegExp;
  try {
    regex = new RegExp(source, caseSensitive ? 'gu' : 'giu');
  } catch {
    // The same treatment as on the judging side: a broken setting must not throw, and nothing is painted
    return () => [];
  }
  return (value) =>
    [...value.matchAll(regex)]
      .filter((match) => match[0].length > 0)
      .map((match) => ({ start: match.index, end: match.index + match[0].length }));
};

/** Whether it is the same user. Matches X itself, which does not distinguish case in user IDs */
const sameUser = (a: string, b: string | undefined): boolean =>
  b !== undefined && a.toLowerCase() === b.toLowerCase();

const TRAIT_MATCHERS: Record<TraitKey, (post: Post) => boolean> = {
  repost: (post) => post.isRepost,
  quote: (post) => post.isQuote,
  reply: (post) => post.isReply,
  communityNote: (post) => post.communityNote === 'added',
  communityNoteRating: (post) => post.communityNote === 'rating',
  pollOpen: (post) => post.poll === 'open',
  pollClosed: (post) => post.poll === 'closed',
  space: (post) => post.hasSpace,
  article: (post) => post.hasArticle,
  linkCard: (post) => post.hasLinkCard,
  ad: (post) => post.isAd,
  media: (post) => post.hasMedia,
  mediaWithoutAlt: (post) => post.hasUndescribedMedia,
  verified: (post) => post.isVerified,
  link: (post) => post.hasBodyLink,
};

/**
 * How old a post is. `Date.now()` is called on every match, not at compile time, which would
 * freeze the age until the settings change. The answer still reflects when the post was
 * read — it is not rejudged as it ages (`filter/engine.ts`) — so only the old side is offered:
 * "newer than" would be true of every post as it arrived, and stay true.
 */
const ageMatcher = (condition: AgeCondition): ((post: Post) => boolean) => {
  const limit = condition.minutes * 60_000;
  return (post) => post.postedAt !== null && Date.now() - post.postedAt > limit;
};

/**
 * How many reactions the post carries, as it showed when read — not rejudged as counts climb
 * (the same standing answer `ageMatcher` gives). A count that could not be read matches
 * nothing, and with no negation to turn that round, it matches nothing either way.
 */
const countMatcher = (condition: CountCondition): ((post: Post) => boolean) => {
  const atLeast = condition.direction === 'atLeast';
  return (post) => {
    const count = post.counts[condition.metric];
    if (count === null) return false;
    return atLeast ? count >= condition.count : count <= condition.count;
  };
};

const conditionMatcher = (condition: Condition): ((post: Post) => boolean) => {
  // Neither a count nor an age carries a negation to apply (see `Condition` in schema.ts)
  if (condition.kind === 'count') return countMatcher(condition);
  if (condition.kind === 'age') return ageMatcher(condition);
  const test =
    condition.kind === 'trait' ? TRAIT_MATCHERS[condition.trait] : textMatcher(condition);
  return condition.negate ? (post) => !test(post) : test;
};

const ruleMatcher = (rule: Rule): ((post: Post) => boolean) => {
  const tests = rule.conditions.map(conditionMatcher);
  return (post) => tests.every((test) => test(post));
};

/**
 * Where emphasis paints. Every text condition of that rule is painted, so "body contains ●●
 * and the user ID is ▲▲" colors both. The order stays the conditions' order; avoiding
 * overlaps is the painting side's job (filter/emphasis.ts).
 */
const emphasesOf = (rule: Rule, color: string): Emphasis[] =>
  rule.conditions.flatMap((c) =>
    canEmphasizeWith(c)
      ? [{ target: c.target, ranges: rangeFinder(c, caseSensitivityOf(c)), color }]
      : []
  );

const isPresent = <T>(v: T | null | undefined): v is T => v !== null && v !== undefined;

/** Once the share judged as ads goes above this, the ad detection counts as broken */
const AD_LIMIT = 0.5;

/**
 * How many to see before deciding. Right after a column opens there are only a few posts,
 * and ads happening to sit among them send the share soaring even when everything works.
 */
const AD_SAMPLE = 20;

export const adJudgementBroken = (judged: number, ads: number): boolean =>
  judged >= AD_SAMPLE && ads / judged > AD_LIMIT;

/** The targets read from the body-text marker. When it breaks, conditions on these become unreliable */
const TEXT_TARGETS = new Set<MatchTarget>(['text', 'quotedText']);

/** Whether the rule has a condition looking at the body text. What gets dropped when the body marker breaks */
const readsText = (rule: Rule): boolean =>
  rule.conditions.some((condition) => condition.kind === 'text' && TEXT_TARGETS.has(condition.target));

export type CompileOptions = {
  /**
   * Drop the rules that look at the body text: with the body unreadable, "the body does not
   * contain ○○" matches every post and the whole timeline disappears.
   */
  withoutText?: boolean;
};

/**
 * Turns the rules into a judgeable form, with regular expressions compiled once here rather
 * than per post. Match-reason names change with the language, so the dictionary is passed
 * in; on a language change the caller discards the cache and rebuilds.
 */
export const compileFilter = (
  filter: FilterNode,
  messages: Messages,
  options: CompileOptions = {}
): CompiledFilter => {
  // The order is expressed by ids, so the compiled rules are made reachable by id
  const byId = new Map<string, CompiledRule>();

  for (const rule of filter.rules) {
    // That switch is for stopping a rule temporarily rather than deleting it
    if (!rule.enabled) continue;
    if (options.withoutText && readsText(rule)) continue;
    const color = rule.color ?? defaultColorFor(rule.action);
    byId.set(rule.id, {
      matches: ruleMatcher(rule),
      action: rule.action,
      color,
      label: ruleName(rule, messages),
      emphases: rule.action === ACTIONS.EMPHASIZE ? emphasesOf(rule, color) : [],
    });
  }

  return {
    enabled: filterApplies(filter.enabled),
    // Normalization already matched the order against the rules that exist: an id missing here was disabled
    rules: filter.order.map((id) => byId.get(id)).filter(isPresent),
  };
};

/**
 * Decides how one post is treated, walking the rules top to bottom in `compileFilter`'s
 * order. Matching a "do nothing" rule ends the judgement there and discards the emphases
 * collected so far — how an upper tier's settings get cancelled.
 */
export const decide = (post: Post, filter: CompiledFilter): Verdict => {
  const verdict: Verdict = { decision: null, emphases: [] };
  if (!filter.enabled) return verdict;

  for (const rule of filter.rules) {
    if (!rule.matches(post)) continue;

    if (rule.action === ACTIONS.NOTHING) return { decision: null, emphases: [] };

    if (rule.action === ACTIONS.EMPHASIZE) {
      verdict.emphases.push(...rule.emphases);
      continue;
    }

    // How it is shown has already been decided
    if (verdict.decision) continue;

    switch (rule.action) {
      case ACTIONS.COLLAPSE:
        verdict.decision = { action: ACTIONS.COLLAPSE, label: rule.label };
        break;
      case ACTIONS.HIDE:
        verdict.decision = { action: ACTIONS.HIDE, label: rule.label };
        break;
      case ACTIONS.HIGHLIGHT:
        verdict.decision = { action: ACTIONS.HIGHLIGHT, color: rule.color, label: rule.label };
        break;
    }
  }
  return verdict;
};
