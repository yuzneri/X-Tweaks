/**
 * Which address a profile is moved to so it opens on the chosen defaults.
 *
 * X keeps every choice on a profile in the address alone (checked against x.com's own
 * scripts, 2026-10-04): the posts tab's kind in the path (`/name`, `/name/all`,
 * `/name/highlights`), its order in `sort=popular`, the media tab's photos in
 * `filter=photo`. Nothing is remembered, so arriving on the bare form is arriving on X's
 * defaults, and moving to another address is choosing another kind.
 *
 * Pure, so the rules can be tested without a page; `main.ts` feeds it the addresses.
 */
import type { ProfileSettings } from '../settings/schema.ts';
import { isProfileName } from '../surface/view.ts';

export type Place = { pathname: string; search: string };

type Tab = 'posts' | 'media';

/** Where in a profile a path is, if anywhere this cares about */
const tabOf = (pathname: string): { name: string; tab: Tab; bare: boolean } | null => {
  const segments = pathname.split('/').filter((part) => part !== '');
  const [name, second, ...rest] = segments;
  if (name === undefined || rest.length > 0 || !isProfileName(name)) return null;
  const kind = second?.toLowerCase();
  if (kind === undefined) return { name, tab: 'posts', bare: true };
  if (kind === 'all' || kind === 'highlights') return { name, tab: 'posts', bare: false };
  if (kind === 'media') return { name, tab: 'media', bare: false };
  return null;
};

/**
 * The address to move to instead of `to`, or null to leave it.
 *
 * Only an arrival from outside the tab is touched: moving within it (choosing "Posts" from
 * the menu while on "All") is a choice made just now, and overriding it would leave the
 * menu unable to pick X's own default. `from` is null on the page's first load.
 *
 * Each choice is applied only where the address does not already make it: a bare path for
 * the kind, no `sort` for the order, no `filter` for the media. An address someone followed
 * that says otherwise (`/name/all`, a shared `?sort=popular`) is theirs to keep.
 */
export const defaultTarget = (
  to: Place,
  from: Place | null,
  profile: ProfileSettings
): string | null => {
  const here = tabOf(to.pathname);
  if (here === null) return null;
  const before = from === null ? null : tabOf(from.pathname);
  if (before?.tab === here.tab && before.name.toLowerCase() === here.name.toLowerCase()) {
    return null;
  }

  const params = new URLSearchParams(to.search);
  let path = to.pathname;
  // Added to the query as it stands rather than rebuilt from `params`, which would rewrite
  // the encoding of whatever else is there
  let search = to.search;
  const add = (key: string, value: string): void => {
    search = `${search === '' || search === '?' ? '?' : `${search}&`}${key}=${value}`;
  };
  if (here.tab === 'posts') {
    if (here.bare && profile.posts !== 'posts') path = `/${here.name}/${profile.posts}`;
    if (!params.has('sort') && profile.sort === 'popular') add('sort', 'popular');
  } else if (!params.has('filter') && profile.media === 'photos') {
    add('filter', 'photo');
  }

  return path === to.pathname && search === to.search ? null : `${path}${search}`;
};
