/**
 * The four ways of putting a post out of sight that X has no operator for.
 *
 * X's search cannot say "no reposts", "nothing with a hashtag in it", or "not the ones
 * that only matched somebody's name". These are decided here, after the results arrive,
 * by looking at what is on screen.
 *
 * **None of this is stored.** It holds while the page is open and no longer: reload and
 * the four are off again. That is what was asked for, and it is also what keeps this from
 * turning into a second filter feature — the extension already has one of those, held per
 * column and per view, for what is meant to last.
 */

/** What the reader asked to leave out. All four start off */
export type Exclusions = {
  /** Posts somebody reposted rather than wrote */
  reposts: boolean;
  /** Posts with a hashtag anywhere in them */
  hashtags: boolean;
  /** Posts where the words searched for appear only in the author's display name */
  nameOnly: boolean;
  /** The same, for the author's @name */
  handleOnly: boolean;
};

export const noExclusions = (): Exclusions => ({
  reposts: false,
  hashtags: false,
  nameOnly: false,
  handleOnly: false,
});

export const excludesAnything = (exclusions: Exclusions): boolean =>
  exclusions.reposts || exclusions.hashtags || exclusions.nameOnly || exclusions.handleOnly;

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
};

/**
 * The words the reader is looking for, as far as they can be known.
 *
 * Empty where the search did not come from this form — a trend pressed, a link somebody
 * shared, a page reloaded. The form holds what was typed only while the page is open
 * (`state.ts`), and reading it back out of the address is the reverse parsing this feature
 * deliberately does not do.
 */
export type Terms = {
  /** The words to look for in the post */
  words: string[];
  /**
   * The names the query names outright, through `from:`, `to:` or `@`.
   *
   * A search for `from:alice` is a search for alice, so a post of hers matching on her
   * name alone is not a false hit — it is the hit. Without this, asking for her posts and
   * leaving out name-only matches would leave out everything.
   */
  named: string[];
};

export const noTerms = (): Terms => ({ words: [], named: [] });

/** Case and surrounding space are not what tells two words apart here */
const norm = (value: string): string => value.trim().toLowerCase();

/**
 * Whether the post carries a hashtag.
 *
 * A `#` that starts a word, which is the shape a tag takes. A bare `#` anywhere would
 * also catch `C#`, a `#1` counting something, and the fragment on the end of an address —
 * none of which a reader asking for no hashtags means.
 *
 * Read off the words rather than off X's own tag links. A tag typed in a way that did not
 * become a link is still a tag to the reader who wants none of them, and the words are
 * what has already been read (`hide.ts`).
 */
const hasHashtag = (post: Result): boolean => /(^|\s)#\S/u.test(post.text);

/**
 * Whether every word searched for is missing from the post's own text.
 *
 * This is what makes a match "only in the name": the words are somewhere in the cell, or X
 * would not have returned it, and they are not in what the author wrote.
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
 * Whether this post should be put out of sight.
 *
 * The two name rules need to know what was searched for, and do nothing without it. The
 * other two do not, and hold whatever the search was.
 */
export const isExcluded = (post: Result, exclusions: Exclusions, terms: Terms): boolean => {
  if (exclusions.reposts && post.isRepost) return true;
  if (exclusions.hashtags && hasHashtag(post)) return true;

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
 * The words and names a search was for, taken from what the form holds.
 *
 * The words come from the fields that put plain words into the query; the operators do
 * not, since a post matching `filter:images` does not "contain" anything to be found in a
 * name. Quotes are stripped: what is searched for is the words, not the punctuation that
 * grouped them.
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
