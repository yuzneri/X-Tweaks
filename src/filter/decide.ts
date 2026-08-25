/** Decides how one post is treated. It never touches the DOM, only what post.ts read and the settings */
import {
  ACTIONS,
  type Action,
  canEmphasizeWith,
  type TextCondition,
  type AgeCondition,
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
 * One post's worth of information, as the judgement sees it.
 * Items without the marker the judgement needs (notifications in a notification
 * column, say) never get this far.
 */
export type Post = {
  /**
   * The strings per target. All of them are lists because treating "several" and
   * "one" separately would split the matching in two. An empty list means the post
   * has no such value.
   */
  values: Record<MatchTarget, string[]>;
  isRepost: boolean;
  isQuote: boolean;
  isReply: boolean;
  hasMedia: boolean;
  /**
   * The state of a Community Note.
   * `added` means it is shown, `rating` that it is not shown yet and a rating is being asked for
   */
  communityNote: 'added' | 'rating' | null;
  /** The state of a poll. `open` means voting is still possible, `closed` that the results are out */
  poll: 'open' | 'closed' | null;
  hasSpace: boolean;
  hasArticle: boolean;
  /** The preview shown for an ordinary pasted URL */
  hasLinkCard: boolean;
  isAd: boolean;
  /**
   * When it was posted (epoch milliseconds). null when unreadable.
   * It is the post's own time rather than the quoted post's, and on a repost it is the
   * original post's time.
   */
  postedAt: number | null;
};

/** A range to paint. Positions within a string, where `end` points just past the last character */
export type MarkRange = { start: number; end: number };

/**
 * How emphasis is decided. Pass a string to `ranges` and it returns the ranges to
 * paint within it, in order. Which element's string to pass is decided by the side
 * that looks at the DOM (filter/apply.ts), based on `target`.
 */
export type Emphasis = {
  target: MatchTarget;
  ranges: (value: string) => MarkRange[];
  color: string;
};

/**
 * How one post is treated. The shapes are split by action, which makes "collapsed but
 * has a color" impossible to express.
 */
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
 * The result of judging one post. Only the first matching action that decides how the
 * post is shown takes effect, but emphasis neither collapses nor hides a post, so
 * every match applies.
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
   * Where to paint, one entry per text condition of that rule.
   * Empty unless the action is emphasis. Conditions with nothing to paint (negated
   * ones, unpaintable targets) are left out.
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

/**
 * A match when any one of the target's values matches the pattern.
 * A post with no such value (an empty list) matches no text condition.
 */
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
      // No g flag: lastIndex would persist and throw off the second and later judgements
      // with the same regular expression
      regex = new RegExp(condition.pattern, caseSensitive ? 'u' : 'iu');
    } catch {
      // Normally impossible, since patterns are validated when saved.
      // Reading a broken setting must not throw, so treat it as matching nothing
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
 * Builds the function returning where the matches are. Both "contains" and regular
 * expressions search with a regular expression.
 * Counting positions in a `toLowerCase()`d string would shift them for characters
 * whose length changes when lowercased (`ß` and the like), so when case is ignored the
 * `i` flag is used and positions are counted in the original string.
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
};

/**
 * How old a post is. `Date.now()` is called on every match rather than at compile time:
 * fixing it at compile time would freeze the age until the settings change.
 */
const ageMatcher = (condition: AgeCondition): ((post: Post) => boolean) => {
  const limit = condition.minutes * 60_000;
  const older = condition.direction === 'older';
  return (post) => {
    if (post.postedAt === null) return false;
    const age = Date.now() - post.postedAt;
    return older ? age > limit : age < limit;
  };
};

/** Negation simply inverts the result of the evaluation */
const conditionMatcher = (condition: Condition): ((post: Post) => boolean) => {
  const test =
    condition.kind === 'trait'
      ? TRAIT_MATCHERS[condition.trait]
      : condition.kind === 'age'
        ? ageMatcher(condition)
        : textMatcher(condition);
  return condition.negate ? (post) => !test(post) : test;
};

/** A rule matches only when every one of its conditions holds (AND) */
const ruleMatcher = (rule: Rule): ((post: Post) => boolean) => {
  const tests = rule.conditions.map(conditionMatcher);
  return (post) => tests.every((test) => test(post));
};

/**
 * Where emphasis paints. Every text condition of that rule is painted, so
 * "body contains ●● and the user ID is ▲▲" colors both.
 * The order stays the order of the conditions; avoiding overlaps is the painting
 * side's job (filter/emphasis.ts).
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
 * How many to see before deciding. Right after a column opens there are only a few
 * posts, and ads happening to sit among them send the share soaring even when
 * everything works.
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
   * Drop the rules that look at the body text. With the body unreadable, "the body
   * does not contain ○○" matches every post and the whole timeline disappears.
   */
  withoutText?: boolean;
};

/**
 * Turns the rules into a judgeable form. Regular expressions are compiled once here
 * rather than per post.
 * The names shown as match reasons change with the language, so the dictionary is
 * passed in; when the language changes, the caller throws the cache away and rebuilds.
 */
export const compileFilter = (
  filter: FilterNode,
  messages: Messages,
  options: CompileOptions = {}
): CompiledFilter => {
  // The order is expressed by ids, so the compiled rules are made reachable by id
  const byId = new Map<string, CompiledRule>();

  for (const rule of filter.rules) {
    // Disabled rules take no part in judging. That switch is for stopping a rule temporarily rather than deleting it
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
    // Normalization has already matched the order against the rules that exist. An id
    // missing here belongs to a rule that was disabled
    rules: filter.order.map((id) => byId.get(id)).filter(isPresent),
  };
};

/**
 * Decides how one post is treated. The rules are simply walked from the top, in the
 * order compileFilter established.
 * Matching a "do nothing" rule ends the judgement there and throws away the emphases
 * collected so far, which is how an upper tier's settings can be cancelled.
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
