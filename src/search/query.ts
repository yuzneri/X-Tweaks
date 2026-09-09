/**
 * Turns the search form into a query string, and into the address of x.com's search results.
 *
 * No DOM and no clock here, so every rule can be checked without a browser. The rules are
 * X's search syntax as X publishes it — help pages, API documentation (which names the web
 * spellings where the two differ), released code; where no such source could be found the
 * operator is not used at all (see `search/README` notes in the design document).
 */

/** How one of X's `filter:` operators is asked for. `any` leaves it out of the query */
export type FilterChoice = 'any' | 'include' | 'exclude';

/**
 * What to do about replies. No third "include them as well": X documents no operator for
 * it, and inventing one would put a word in the query that may do nothing.
 */
export type ReplyChoice = 'any' | 'only' | 'exclude';

/**
 * Which of X's own result tabs to land on, carried in the address as `f`. `top` is what X
 * shows unasked, so it is written as "not set" rather than as a value (see `searchPath`).
 * X's own bundle also knows `image` and `video`, shown in place of `media` only under a
 * feature flag that differs by reader — a tab that may not exist is a broken choice, so this
 * is the five tabs X shows everybody.
 */
export type ResultTab = 'top' | 'live' | 'user' | 'media' | 'list';

/** One account field: the names typed into it, and whether they are being excluded */
export type AccountField = { names: string; exclude: boolean };

/**
 * The form's values, as strings, exactly as the fields hold them. Numbers and dates stay
 * strings: `input[type=number]` and `input[type=date]` already refuse what they refuse, an
 * empty string is how "nothing was filled in" arrives, and parsing would have to invent an
 * answer for that case and hand it back as a number.
 */
export type SearchForm = {
  /** Words that must all appear. Passed through untouched, so an operator typed by hand still works */
  all: string;
  /** The phrase that must appear as written */
  exact: string;
  /** Words of which any one will do */
  any: string;
  /** Words that must not appear */
  none: string;
  /** Hashtags, with or without the leading `#` */
  hashtags: string;
  /** A language code from X's own list, or an empty string for "any language" */
  lang: string;
  from: AccountField;
  to: AccountField;
  mentioning: AccountField;
  verified: FilterChoice;
  links: FilterChoice;
  images: FilterChoice;
  videos: FilterChoice;
  replies: ReplyChoice;
  minReplies: string;
  minFaves: string;
  minRetweets: string;
  since: Moment;
  until: Moment;
};

/**
 * One end of a span: a day, and optionally a time of day within it. Two fields rather than
 * one `datetime-local`, which holds **nothing at all** until every part of it is filled: a
 * reader naming two dates and no times gets a search with no span in it and nothing on
 * screen to say why (measured, 2026-09-03). The date is what makes the end count; an empty
 * time falls at the edge of the day, `startOfDay` for the one and `endOfDay` for the other,
 * so naming two dates means the whole of both.
 */
export type Moment = {
  /** `YYYY-MM-DD`, as `input[type=date]` holds it. Empty means this end is not asked */
  date: string;
  /** `HH:MM` or `HH:MM:SS`, as `input[type=time]` holds it. Empty means the day's edge */
  time: string;
};

export const emptyMoment = (): Moment => ({ date: '', time: '' });

/** What goes into the address beside the query itself */
export type SearchScopes = {
  tab: ResultTab;
  /** Only posts from accounts being followed (`pf=on`) */
  followedOnly: boolean;
  /** Only posts from nearby (`lf=on`) */
  nearbyOnly: boolean;
};

export const emptyAccountField = (): AccountField => ({ names: '', exclude: false });

export const emptyForm = (): SearchForm => ({
  all: '',
  exact: '',
  any: '',
  none: '',
  hashtags: '',
  lang: '',
  from: emptyAccountField(),
  to: emptyAccountField(),
  mentioning: emptyAccountField(),
  verified: 'any',
  links: 'any',
  images: 'any',
  videos: 'any',
  replies: 'any',
  minReplies: '',
  minFaves: '',
  minRetweets: '',
  since: emptyMoment(),
  until: emptyMoment(),
});

/**
 * What the form starts on, and what "Clear" puts it back to.
 *
 * The tab starts on `live` rather than X's own `top` (still choosable): somebody who's
 * named a span of days or a minimum of likes has already said what matters, and `top` would
 * then decide which answers they see. This is not what an address means, though — one with no
 * `f` is X's `top`, read by `parseScopes` as `top`; what a fresh form starts on and what an
 * arrived-at search says are two different questions.
 */
export const emptyScopes = (): SearchScopes => ({
  tab: 'live',
  followedOnly: false,
  nearbyOnly: false,
});

/**
 * Whether each of the form's folded groups holds anything. They start shut, the whole form
 * open running past the height of a window; a query can arrive from somewhere other than the
 * fields — a search's address, X's own search box — and lands inside them, so this says
 * which to open (`Group` in `Form.tsx`). Holding something is not building a term: a time of
 * day with no date puts nothing in the query, but it is still something a reader typed, and
 * folding it away would hide why the search is not the one they asked for.
 */
export type FilledGroups = {
  accounts: boolean;
  filters: boolean;
  engagement: boolean;
  dates: boolean;
};

const holdsMoment = (moment: Moment): boolean => moment.date !== '' || moment.time !== '';

/**
 * `scopes` is asked about as well as `form`: two of the things riding in the address are
 * shown among the filters, and which half of the address a narrowing travels in is the
 * query builder's concern, not the reader's. The tab is not asked about at all — it stands
 * outside every group, where nothing has to be unfolded to see it.
 */
export const filledGroups = (form: SearchForm, scopes: SearchScopes): FilledGroups => ({
  accounts: [form.from, form.to, form.mentioning].some((field) => field.names.trim() !== ''),
  filters:
    [form.verified, form.links, form.images, form.videos].some((choice) => choice !== 'any') ||
    form.replies !== 'any' ||
    form.lang !== '' ||
    scopes.followedOnly ||
    scopes.nearbyOnly,
  engagement: [form.minReplies, form.minFaves, form.minRetweets].some(
    (count) => count.trim() !== ''
  ),
  dates: holdsMoment(form.since) || holdsMoment(form.until),
});

/**
 * Splits a field into words, keeping anything inside double quotes together: `red "blue
 * green" yellow` becomes three words, the middle one still carrying its quotes. Keeping the
 * quotes lets the caller tell a phrase the reader asked for from a word that merely has a
 * space around it, which decides whether quotes go back on (`quoted` below). A quote left
 * open swallows the rest of the field, as an unbalanced quote does in X's own search;
 * repairing it would mean guessing where the reader meant the phrase to end.
 */
export const tokenize = (value: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of value) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if (!inQuotes && /\s/.test(char)) {
      if (current !== '') tokens.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current !== '') tokens.push(current);
  return tokens;
};

/**
 * Puts a token into the shape X can read as one term. Every quote is stripped first and the
 * decision made on what is left: a token the reader quoted, or one holding a space, comes
 * back quoted, anything else bare, and one with nothing left comes back empty for the caller
 * to drop — an empty phrase matches nothing and reads as a mistake. Stripping before
 * deciding stops a quote in the middle being carried through: X's search has no escape for a
 * quote inside a phrase, so left in it would end the phrase early and split the rest.
 */
export const quoted = (token: string): string => {
  const wasQuoted = token.length >= 2 && token.startsWith('"') && token.endsWith('"');
  const bare = token.replaceAll('"', '');
  // Whitespace counts as nothing left: `"  "` would otherwise reach X as a phrase of two
  // spaces
  if (bare.trim() === '') return '';
  return wasQuoted || /\s/.test(bare) ? `"${bare}"` : bare;
};

/** The terms of a field, with the empty ones dropped (see `quoted`) */
const terms = (value: string): string[] => tokenize(value).map(quoted).filter((t) => t !== '');

/**
 * The terms of a field whose every term is being excluded. A `-` the reader typed is taken
 * off first: the field is already the "none of these" one, so the mark says the same thing
 * twice — the same forgiveness the account and hashtag fields give a `@` and a `#`. It has
 * to come off *before* `quoted`, which strips the reader's quotes and puts fresh ones on: a
 * `-` still attached ends up inside the phrase, `-"hot take"` becoming `-"-hot take"` with
 * the hyphen searched for as part of the words.
 */
const excludedTerms = (value: string): string[] =>
  tokenize(value)
    .map((token) => quoted(token.replace(/^-+/, '')))
    .filter((term) => term !== '')
    .map((term) => `-${term}`);

/** The `filter:` values this form asks for. Named so a misspelling cannot reach X */
type FilterName = 'verified' | 'links' | 'images' | 'videos';

/**
 * The `filter:` term for one choice, or nothing where the reader did not ask. `is:` is not
 * used: it is X's API grammar rather than the web search's — X's own search code names
 * `verified`, `links`, `images` and the rest as `filter:` values, and no source X publishes
 * says the web search bar reads `is:` at all.
 */
const filterTerm = (choice: FilterChoice, name: FilterName): string[] => {
  if (choice === 'any') return [];
  return [choice === 'exclude' ? `-filter:${name}` : `filter:${name}`];
};

/**
 * The terms for one account field.
 *
 * Several names read as "any of these" and are grouped, except when excluded, where they
 * stand side by side: excluding has to mean "and not this one either", and X's own
 * documentation says to write `skiing -snow -day` rather than `skiing -(snow OR day)` and
 * not to negate a group. A leading `@` comes off whatever the reader typed, so both `@alice`
 * and `alice` work, and the operator puts back whichever mark it needs: `from:` and `to:` a
 * bare name, mentioning `@name` with no operator word at all.
 *
 * Quotes are stripped and what is left split again on spaces: a screen name cannot hold a
 * space, so `"alice bob"` is two names however it was quoted, and kept together it would
 * build `from:alice bob` — which X reads as "from alice, and containing bob", a different
 * search run without a word of warning.
 */
const accountTerms = (field: AccountField, operator: string): string[] => {
  const names = tokenize(field.names)
    .flatMap((token) => token.replaceAll('"', '').split(/\s+/))
    // After the split, so that every name loses its own mark rather than only the first
    .map((name) => name.replace(/^@+/, ''))
    .filter((name) => name !== '');
  const marked = names.map((name) => `${operator}${name}`);
  if (field.exclude) return marked.map((term) => `-${term}`);
  return marked.length > 1 ? [`(${marked.join(' OR ')})`] : marked;
};

/** A `name:value` term where the value was filled in, or nothing where it was left empty */
const valueTerm = (name: string, value: string): string[] => {
  const trimmed = value.trim();
  return trimmed === '' ? [] : [`${name}:${trimmed}`];
};

/** Where an end of the span falls when no time of day was named */
export type DayEdge = 'start' | 'end';

const EDGE_TIME: Record<DayEdge, string> = { start: '00:00:00', end: '23:59:59' };

/**
 * Whole seconds since the epoch for one end of the span, or null where no date was named.
 * Date and time are joined and read as the reader's own time — no zone is put on, which is
 * what makes it local, and local is what the fields mean. Seconds are floored (X counts in
 * whole seconds). A time with no seconds (`18:45`, what the field gives unless seconds were
 * asked for) is filled out to `18:45:00`, purely so what is sent can be read back and
 * recognised.
 */
export const epochSecondsOf = (moment: Moment, edge: DayEdge): number | null => {
  const date = moment.date.trim();
  if (date === '') return null;
  const time = moment.time.trim() || EDGE_TIME[edge];
  const full = time.length === 5 ? `${time}:00` : time;
  const at = new Date(`${date}T${full}`).getTime();
  return Number.isNaN(at) ? null : Math.floor(at / 1000);
};

/** A `since_time:` / `until_time:` term, or nothing where no date was named */
const momentTerm = (name: string, moment: Moment, edge: DayEdge): string[] => {
  const seconds = epochSecondsOf(moment, edge);
  return seconds === null ? [] : [`${name}:${seconds}`];
};

/**
 * Builds the query string. Nothing here is URL-encoded: that belongs to whoever puts the
 * string into an address (`searchPath`), and doing it twice would break the `#` of a
 * hashtag and the quotes of a phrase.
 */
export const buildQuery = (form: SearchForm): string => {
  const parts: string[] = [];

  // Passed through as typed: the operators a reader writes here reach X untouched
  const all = form.all.trim();
  if (all !== '') parts.push(all);

  const exact = quoted(`"${form.exact.trim()}"`);
  if (exact !== '') parts.push(exact);

  /*
   * One term needs no group: `(foo)` and `foo` ask X the same thing, and the bare form
   * leaves the query readable. A group is written only where there is a choice to hold, and
   * because X binds AND before OR — without it, `a OR b c` would reach X as `a OR (b c)`.
   */
  const anyTerms = terms(form.any);
  if (anyTerms.length > 1) parts.push(`(${anyTerms.join(' OR ')})`);
  else parts.push(...anyTerms);

  // Each excluded term stands on its own, for the same reason the excluded accounts do
  parts.push(...excludedTerms(form.none));

  // `#tag` and `tag` both mean the tag: the mark comes off and goes back on, so the field
  // takes tags written either way
  for (const token of tokenize(form.hashtags)) {
    const tag = token.replaceAll('"', '').replace(/^#+/, '');
    if (tag !== '') parts.push(`#${tag}`);
  }

  parts.push(...valueTerm('lang', form.lang));

  parts.push(...accountTerms(form.from, 'from:'));
  parts.push(...accountTerms(form.to, 'to:'));
  parts.push(...accountTerms(form.mentioning, '@'));

  parts.push(...filterTerm(form.verified, 'verified'));
  parts.push(...filterTerm(form.links, 'links'));
  parts.push(...filterTerm(form.images, 'images'));
  parts.push(...filterTerm(form.videos, 'videos'));

  if (form.replies === 'only') parts.push('filter:replies');
  else if (form.replies === 'exclude') parts.push('-filter:replies');

  parts.push(...valueTerm('min_replies', form.minReplies));
  // X's own API documentation names these two as the web search's spellings, and says
  // `min_likes:` and `min_reposts:` are the API's and are refused by the web search
  parts.push(...valueTerm('min_faves', form.minFaves));
  parts.push(...valueTerm('min_retweets', form.minRetweets));

  /*
   * The `_time` pair rather than `since:` / `until:`, which take a date and stop there,
   * leaving nowhere to say "since this morning". X publishes nothing about these two — they
   * are known from use rather than from X's own writing — so if a search comes back wrong,
   * doubt these first.
   */
  parts.push(...momentTerm('since_time', form.since, 'start'));
  parts.push(...momentTerm('until_time', form.until, 'end'));

  return parts.join(' ');
};

/**
 * The address of the search results, as a path this site can be sent to. `f`, `pf` and `lf`
 * are *not* part of the query but the address's own parameters; in `q` they would reach X as
 * words to search for. Which is which was read off the code x.com itself serves, where the
 * search address is built from `{q, src, f, pf, lf}`. `top` is left out rather than written,
 * being the tab X shows unasked, as X's own links omit it. Encoding happens here and only
 * here — `buildQuery` leaves the string raw, so a hashtag's `#` and a phrase's quotes
 * survive to be encoded exactly once.
 */
export const searchPath = (query: string, scopes: SearchScopes): string => {
  const params = new URLSearchParams({ q: query, src: 'typd' });
  if (scopes.tab !== 'top') params.set('f', scopes.tab);
  if (scopes.followedOnly) params.set('pf', 'on');
  if (scopes.nearbyOnly) params.set('lf', 'on');
  return `/search?${params.toString()}`;
};

