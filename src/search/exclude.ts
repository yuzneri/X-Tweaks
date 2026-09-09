/**
 * The ways of putting a post out of sight that X has no operator for.
 *
 * X's search cannot say "no reposts", "nothing with three hashtags in it", "nothing with a
 * thousand likes", or "not the ones that only matched somebody's name". These are decided
 * here, after the results arrive, by looking at what is on screen.
 *
 * **None of this is saved.** What is asked for is carried no further than the tab it was
 * asked in (`state.ts`): running a search takes the reader to a new page, and arriving with
 * the boxes cleared would mean filling them in after every search. That is what keeps this
 * from becoming a second filter feature — the extension already has one, held per column and
 * per view, for what is meant to last.
 */

/**
 * What is counted, and the number at which a post is left out: a post with that many or
 * more goes. All of them are the side X has no operator for — its search asks for a *least*
 * (the "How much it got" fields build `min_faves` and the rest) and cannot ask for a most,
 * so that is what these say, and the two together bound a post from both sides. Views X
 * will not count at all, so this is the only way to say anything about them.
 */
export const THRESHOLDS = ['hashtag', 'reply', 'repost', 'like', 'view'] as const;
export type Threshold = (typeof THRESHOLDS)[number];

/** What the reader asked to leave out. Everything starts off, the numbers as `null` */
export type Exclusions = {
  /** Posts somebody reposted rather than wrote */
  reposts: boolean;
  /** Posts where the words searched for appear only in the author's display name */
  nameOnly: boolean;
  /** The same, for the author's @name */
  handleOnly: boolean;
  /** How many is too many, per thing counted. `null` leaves that one alone */
  atLeast: Record<Threshold, number | null>;
};

export const noExclusions = (): Exclusions => ({
  reposts: false,
  nameOnly: false,
  handleOnly: false,
  atLeast: { hashtag: null, reply: null, repost: null, like: null, view: null },
});

export const excludesAnything = (exclusions: Exclusions): boolean =>
  exclusions.reposts ||
  exclusions.nameOnly ||
  exclusions.handleOnly ||
  THRESHOLDS.some((name) => exclusions.atLeast[name] !== null);

/** The switches, named. The names are what is written down and read back (`namedExclusions`) */
const NAMES = ['reposts', 'nameOnly', 'handleOnly'] as const;

/**
 * What was asked for, written as names, a number after the ones that carry one
 * ("reposts like:1000"). Not JSON, because of what reads it back: the text is kept where
 * the page itself can reach it (`state.ts`), so whatever comes back is not to be trusted,
 * and names and whole numbers have nothing to go wrong with.
 */
export const namedExclusions = (exclusions: Exclusions): string =>
  [
    ...NAMES.filter((name) => exclusions[name]),
    ...THRESHOLDS.flatMap((name) => {
      const least = exclusions.atLeast[name];
      return least === null ? [] : [`${name}:${least}`];
    }),
  ].join(' ');

/**
 * Reads back what `namedExclusions` wrote, and refuses everything else. Nothing here can
 * throw and nothing can be surprised: anything that is not one of these names leaves that
 * one off, and text of any shape at all — empty, absent, something else's — gives
 * everything turned off.
 */
export const exclusionsFrom = (text: string | null): Exclusions => {
  const named = new Set((text ?? '').split(/\s+/));
  const exclusions = noExclusions();
  for (const name of NAMES) {
    if (named.has(name)) exclusions[name] = true;
  }
  for (const name of THRESHOLDS) {
    /*
     * The hashtags were a switch before they were a number, written as `hashtags`. A tab
     * left open across the change carries that word; read as "one or more", what was ticked
     * stays ticked rather than those posts quietly coming back
     */
    if (name === 'hashtag' && named.has('hashtags')) exclusions.atLeast.hashtag = 1;
    const written = [...named].find((word) => word.startsWith(`${name}:`))?.slice(name.length + 1);
    const least = Number(written);
    if (written !== undefined && written !== '' && Number.isInteger(least) && least >= 1) {
      exclusions.atLeast[name] = least;
    }
  }
  return exclusions;
};

/**
 * One post, as this judgement sees it. Reading it off the page is `apply.ts`'s work; what
 * is here decides, and can be checked without a browser.
 */
export type Result = {
  isRepost: boolean;
  /** The post's own words. The quoted post's are not among them */
  text: string;
  displayName: string;
  /** Without the `@` */
  handle: string;
  /**
   * What there is to count about the post, as `filter/post.ts` read it. `null` where X shows
   * no number for it, which is not none: a post whose views are not shown is left where it
   * is rather than judged as though it had none
   */
  counts: Record<Threshold, number | null>;
};

/**
 * The words the reader is looking for, as far as they can be known. Empty where the search
 * did not come from this form — a trend pressed, a link shared, a page reloaded: the form
 * holds what was typed only while the page is open (`state.ts`), and reading it back out of
 * the address is the reverse parsing this feature deliberately does not do.
 */
export type Terms = {
  /** The words to look for in the post */
  words: string[];
  /**
   * The names the query names outright, through `from:`, `to:` or `@`. A search for
   * `from:alice` is a search for alice, so a post of hers matching on her name alone is the
   * hit, not a false one.
   */
  named: string[];
};

export const noTerms = (): Terms => ({ words: [], named: [] });

/** Case and surrounding space are not what tells two words apart here */
const norm = (value: string): string => value.trim().toLowerCase();

/**
 * Whether the post has as many of something as the reader said was too many. A count X does
 * not show (the views of some posts) leaves the post alone: "not shown" is not "none", and
 * a post is only put out of sight on something actually read.
 */
const tooMany = (post: Result, name: Threshold, least: number | null): boolean => {
  const count = post.counts[name];
  return least !== null && count !== null && count >= least;
};

/**
 * Whether every word searched for is missing from the post's own text. This is what makes a
 * match "only in the name": the words are somewhere in the cell, or X would not have
 * returned it, and they are not in what the author wrote.
 */
const missingFromText = (post: Result, words: string[]): boolean => {
  const text = norm(post.text);
  return words.every((word) => !text.includes(word));
};

/**
 * Whether the query names this account outright, in which case a match on the name is the
 * answer to the question rather than a stray hit.
 */
const isNamed = (value: string, named: string[]): boolean =>
  value !== '' && named.includes(value);

/**
 * Whether this post should be put out of sight. The two name rules need to know what was
 * searched for and do nothing without it; the rest do not, and hold whatever the search was.
 */
export const isExcluded = (post: Result, exclusions: Exclusions, terms: Terms): boolean => {
  if (exclusions.reposts && post.isRepost) return true;
  if (THRESHOLDS.some((name) => tooMany(post, name, exclusions.atLeast[name]))) return true;

  const words = terms.words.map(norm).filter((word) => word !== '');
  if (words.length === 0) return false;

  if (exclusions.nameOnly) {
    const name = norm(post.displayName);
    const inName = words.some((word) => name.includes(word));
    if (inName && missingFromText(post, words) && !isNamed(norm(post.handle), terms.named)) {
      return true;
    }
  }

  if (exclusions.handleOnly) {
    const handle = norm(post.handle);
    const inHandle = words.some((word) => handle.includes(word));
    if (inHandle && missingFromText(post, words) && !isNamed(handle, terms.named)) return true;
  }

  return false;
};

/**
 * The words and names a search was for, taken from what the form holds. The words come from
 * the fields that put plain words into the query, not from the operators: a post matching
 * `filter:images` does not "contain" anything to be found in a name. Quotes are stripped —
 * what is searched for is the words, not the punctuation that grouped them.
 */
export const termsOf = (form: {
  all: string;
  exact: string;
  any: string;
  from: { names: string };
  to: { names: string };
  mentioning: { names: string };
}): Terms => {
  const split = (value: string): string[] =>
    value
      .replaceAll('"', ' ')
      .split(/\s+/)
      .map(norm)
      .filter((word) => word !== '');
  const names = (value: string): string[] =>
    split(value).map((name) => name.replace(/^@+/, '')).filter((name) => name !== '');
  return {
    words: [...split(form.all), ...split(form.exact), ...split(form.any)],
    named: [...names(form.from.names), ...names(form.to.names), ...names(form.mentioning.names)],
  };
};
