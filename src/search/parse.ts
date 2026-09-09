/**
 * Reads a query string back into the form's fields — the other direction from `buildQuery`.
 * It is for a search reached without this form (a trend pressed, a link somebody shared, a
 * page reloaded), which can then be taken up and refined rather than leaving the form empty
 * beside a page full of results it knows nothing about.
 *
 * **It cannot always be exact, and does not pretend to be.** One string comes out of several
 * fields, so taking it apart is a guess about where each piece came from: `rust` could have
 * been typed into "all of these words" or be the only word in "any of these". What is aimed
 * at is that reading a query and building it again gives the same query, not that the fields
 * come back exactly as somebody left them.
 */
import {
  emptyForm,
  type FilterChoice,
  type Moment,
  type ResultTab,
  type SearchForm,
  type SearchScopes,
  tokenize,
} from './query.ts';
import { VIEW_PREFIX, viewKeyOf } from '../surface/view.ts';

/** A term of a query, with the pieces the assembly put on it taken back off */
type Term = {
  /** What was left after any leading `-` */
  body: string;
  excluded: boolean;
};

/**
 * Splits a query into terms, keeping a group `(a OR b)` together. `tokenize` alone would
 * break a group apart at its spaces, and the group is one answer to one field. Quotes are
 * still `tokenize`'s to respect, so this walks the same way and counts brackets as well.
 */
const terms = (query: string): Term[] => {
  const out: Term[] = [];
  let current = '';
  let inQuotes = false;
  let depth = 0;
  const push = (): void => {
    if (current === '') return;
    const excluded = current.startsWith('-');
    out.push({ body: excluded ? current.slice(1) : current, excluded });
    current = '';
  };
  for (const char of query) {
    if (char === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (char === '(') depth += 1;
      else if (char === ')') depth = Math.max(0, depth - 1);
    }
    if (!inQuotes && depth === 0 && /\s/.test(char)) {
      push();
      continue;
    }
    current += char;
  }
  push();
  return out;
};

/** The names inside `(from:a OR from:b)` or a lone `from:a`, or null where it is neither */
const namesFor = (body: string, operator: string): string[] | null => {
  const inner = body.startsWith('(') && body.endsWith(')') ? body.slice(1, -1) : body;
  const parts = inner.split(/\s+OR\s+/);
  if (!parts.every((part) => part.startsWith(operator) && part.length > operator.length)) {
    return null;
  }
  return parts.map((part) => part.slice(operator.length));
};

/** `2026-01-01T09:30:00` back into the two fields the form holds it in */
const momentOf = (seconds: number): Moment => {
  const at = new Date(seconds * 1000);
  const pad = (value: number): string => `${value}`.padStart(2, '0');
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
  /*
   * A time at the edge of a day is left off, so a span of whole days comes back as the two
   * dates it was built from. Which edge belongs to which end is `buildQuery`'s rule (`start`
   * / `end`), and both are dropped: putting the wrong one back would change what the query
   * means, dropping it cannot — an empty time means that same edge on the way out.
   */
  return { date, time: time === '00:00:00' || time === '23:59:59' ? '' : time };
};

const FILTERS: { name: string; key: 'verified' | 'links' | 'images' | 'videos' }[] = [
  { name: 'verified', key: 'verified' },
  { name: 'links', key: 'links' },
  { name: 'images', key: 'images' },
  { name: 'videos', key: 'videos' },
];

/**
 * Reads a query into a form. A term nothing here recognises goes into "all of these words",
 * where it goes back out untouched: that is what keeps the reading from losing anything, an
 * operator this extension does not offer still surviving the round trip and reaching X as
 * it arrived.
 */
export const parseQuery = (query: string): SearchForm => {
  const form = emptyForm();
  const all: string[] = [];
  const any: string[] = [];
  const none: string[] = [];
  const hashtags: string[] = [];

  for (const { body, excluded } of terms(query)) {
    // --- the operators that take a value ---
    const colon = body.indexOf(':');
    const name = colon > 0 ? body.slice(0, colon) : '';
    const value = colon > 0 ? body.slice(colon + 1) : '';

    if (name === 'lang' && !excluded) {
      form.lang = value;
      continue;
    }
    if ((name === 'min_replies' || name === 'min_faves' || name === 'min_retweets') && !excluded) {
      const key = name === 'min_replies' ? 'minReplies' : name === 'min_faves' ? 'minFaves' : 'minRetweets';
      form[key] = value;
      continue;
    }
    if ((name === 'since_time' || name === 'until_time') && !excluded && /^\d+$/.test(value)) {
      form[name === 'since_time' ? 'since' : 'until'] = momentOf(Number(value));
      continue;
    }
    if (name === 'filter' && value === 'replies') {
      form.replies = excluded ? 'exclude' : 'only';
      continue;
    }
    if (name === 'filter' || name === 'is') {
      const filter = FILTERS.find((entry) => entry.name === value);
      if (filter) {
        form[filter.key] = (excluded ? 'exclude' : 'include') satisfies FilterChoice;
        continue;
      }
    }

    // --- the accounts ---
    let matched = false;
    for (const [key, operator] of [
      ['from', 'from:'],
      ['to', 'to:'],
      ['mentioning', '@'],
    ] as const) {
      const names = namesFor(body, operator);
      if (!names) continue;
      const held = form[key];
      form[key] = {
        names: [...tokenize(held.names), ...names].join(' '),
        exclude: excluded,
      };
      matched = true;
      break;
    }
    if (matched) continue;

    // --- plain words ---
    if (excluded) {
      none.push(body);
      continue;
    }
    if (body.startsWith('#') && body.length > 1) {
      hashtags.push(body.slice(1));
      continue;
    }
    if (body.startsWith('(') && body.endsWith(')') && body.includes(' OR ')) {
      any.push(...body.slice(1, -1).split(/\s+OR\s+/));
      continue;
    }
    all.push(body);
  }

  /*
   * The exact phrase is taken out of "all of these words" where there is one and only one:
   * with two, which of them the field held cannot be told, and both go back out unchanged.
   */
  const quotedWords = all.filter((word) => word.startsWith('"') && word.endsWith('"'));
  if (quotedWords.length === 1) {
    form.exact = quotedWords[0]!.slice(1, -1);
    all.splice(all.indexOf(quotedWords[0]!), 1);
  }

  form.all = all.join(' ');
  form.any = any.join(' ');
  form.none = none.join(' ');
  form.hashtags = hashtags.join(' ');
  return form;
};

/**
 * The address's own parameters, read back out of a search's address. A tab this form does
 * not offer — X shows `image` and `video` in place of `media` where a feature flag is on
 * (`ResultTab`) — comes back as `top`: carrying it through would mean widening the type to
 * hold a value no control can show, for the sake of a tab the reader would have to leave the
 * form to get back to.
 */
export const parseScopes = (search: string): SearchScopes => {
  const params = new URLSearchParams(search);
  const tab = params.get('f');
  const tabs: ResultTab[] = ['top', 'live', 'user', 'media', 'list'];
  return {
    tab: tabs.find((known) => known === tab) ?? 'top',
    followedOnly: params.get('pf') === 'on',
    nearbyOnly: params.get('lf') === 'on',
  };
};

/**
 * The query a search's address asks for, whichever of the two shapes X writes it in. A
 * search is `?q=…`, but a tag pressed inside a post is `/hashtag/<tag>` and carries no `q`
 * at all: reading only the parameters left the form empty on every hashtag page, with the
 * page plainly showing a search (measured 2026-09-04). Both shapes are read off `viewKeyOf`,
 * which already knows them — it is what decides whether this page is a search's results in
 * the first place, so the query and the judgement that there is one cannot disagree.
 */
export const queryAt = (pathname: string, search: string): string => {
  const key = viewKeyOf(pathname, search);
  const prefix = `${VIEW_PREFIX}search:`;
  return key?.startsWith(prefix) ? key.slice(prefix.length) : '';
};
