/**
 * Which view of x.com a URL points at.
 *
 * x.com has no columns, so the tier below the account is the view being looked at. It is
 * read from the path alone: nothing in the DOM names a view, and the path is the one
 * thing X keeps stable across languages and redesigns.
 */

/**
 * The prefix every view key carries. X Pro's `columnId` is an alphanumeric string X
 * hands out, so a prefixed key can never collide with one, and both can share the same
 * map in the settings.
 */
export const VIEW_PREFIX = 'view:';

/**
 * First path segments that are X's own pages rather than someone's screen name.
 *
 * Best effort, and deliberately so. A profile is "one segment that is not one of these",
 * which means a page X adds later would be taken for a profile until this list catches
 * up. The cost of that is the profile settings applying somewhere they were not meant
 * to; the cost of the opposite — listing screen names — is not being able to have
 * profile settings at all.
 */
const NOT_A_PROFILE = new Set([
  'home',
  'explore',
  'notifications',
  'messages',
  'search',
  'settings',
  'compose',
  'i',
  'about',
  'tos',
  'privacy',
  'login',
  'logout',
  'signup',
  'download',
  'intent',
  'account',
  'jobs',
]);

/** A list's id is the digits X puts in the path */
const LIST = /^\/i\/lists\/(\d+)/;

/**
 * The view key for that path, or null where the path is not one of the views settings
 * can be held for. null means the post runs on the global and account settings alone,
 * which is a normal state rather than a failure — a post's detail page is one.
 *
 * Every profile shares one key. Held per screen name they would pile up without limit
 * and the settings screen's list would come apart.
 */
export const viewKeyOf = (pathname: string): string | null => {
  const path = pathname.replace(/\/+$/, '') || '/';

  const list = LIST.exec(path);
  if (list) return `${VIEW_PREFIX}list:${list[1]}`;

  if (path === '/i/bookmarks') return `${VIEW_PREFIX}bookmarks`;
  if (path === '/home') return `${VIEW_PREFIX}home`;
  if (path === '/notifications' || path.startsWith('/notifications/')) {
    return `${VIEW_PREFIX}notifications`;
  }
  if (path === '/search') return `${VIEW_PREFIX}search`;

  // One segment and not one of X's own pages: somebody's profile
  const segments = path.split('/').filter((part) => part !== '');
  if (segments.length !== 1) return null;
  const [name] = segments;
  return name && !NOT_A_PROFILE.has(name.toLowerCase()) ? `${VIEW_PREFIX}profile` : null;
};
