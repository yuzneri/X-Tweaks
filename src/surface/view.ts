/**
 * Which view of x.com a URL points at. x.com has no columns, so the tier below the account
 * is the view being looked at, read from the path alone: nothing in the DOM names a view,
 * and the path is the one thing X keeps stable across languages and redesigns.
 */

/**
 * The prefix every view key carries. X Pro's `columnId` is an alphanumeric string X
 * hands out, so a prefixed key can never collide with one, and both can share the same
 * map in the settings.
 */
export const VIEW_PREFIX = 'view:';

/**
 * First path segments that are X's own pages rather than someone's screen name. Best effort,
 * and deliberately so: a profile is "one segment that is not one of these", so a page X adds
 * later would be taken for a profile until this list catches up. The cost of that is the
 * profile settings applying somewhere they were not meant to; the cost of the opposite —
 * listing screen names — is not being able to have profile settings at all.
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
  // Has a page of its own, handled above. Without it here, `/hashtag` alone reads as a profile
  'hashtag',
  'topics',
  'bookmarks',
]);

/** A list's id is the digits X puts in the path */
const LIST = /^\/i\/lists\/(\d+)/;
/** A hashtag has a page of its own, showing the same results as searching for it */
const HASHTAG = /^\/hashtag\/([^/]+)/;

/**
 * The view key for that URL, or null where it is not one of the views settings can be held
 * for. null means the post runs on the global and account settings alone, which is a normal
 * state rather than a failure — a post's detail page is one.
 *
 * A profile and a search are held one per person and one per query: lumping them into a key
 * each would be tidier to list, but would mean a rule written for one person's profile
 * applying to everybody's. A screen name is folded to lower case, X treating `/Alice` and
 * `/alice` as the same person and two entries for one profile being two places to look for
 * the setting.
 */
export const viewKeyOf = (pathname: string, search = ''): string | null => {
  const path = pathname.replace(/\/+$/, '') || '/';

  const list = LIST.exec(path);
  if (list) return `${VIEW_PREFIX}list:${list[1]}`;

  if (path === '/i/bookmarks') return `${VIEW_PREFIX}bookmarks`;
  if (path === '/home') return `${VIEW_PREFIX}home`;
  if (path === '/notifications' || path.startsWith('/notifications/')) {
    return `${VIEW_PREFIX}notifications`;
  }
  if (path === '/search') {
    // Searching for nothing is the empty search page, which holds no posts to judge
    const query = new URLSearchParams(search).get('q')?.trim();
    return query ? `${VIEW_PREFIX}search:${query}` : null;
  }
  /*
   * A hashtag's own page is a search for that hashtag, and X shows the same results
   * either way. It gets the same key, so a rule written on one is in force on the other.
   */
  const hashtag = HASHTAG.exec(path);
  if (hashtag?.[1]) return `${VIEW_PREFIX}search:#${decodeURIComponent(hashtag[1])}`;

  // One segment and not one of X's own pages: somebody's profile
  const segments = path.split('/').filter((part) => part !== '');
  if (segments.length !== 1) return null;
  const [name] = segments;
  return name && !NOT_A_PROFILE.has(name.toLowerCase())
    ? `${VIEW_PREFIX}profile:${name.toLowerCase()}`
    : null;
};

/**
 * A post's own page: somebody's screen name, then `status`, then the post's id. `/web`
 * comes in between on the older form of the address, which X still redirects from.
 * What follows — the photo viewer, the list of reposts — is still that post's page.
 */
const STATUS = /^\/[^/]+(?:\/web)?\/status\/\d+(?:\/|$)/;

/**
 * Whether that path is a post opened to be read. x.com holds one timeline, so unlike X Pro
 * it cannot tell "opened to be read" from "there to be skimmed" by what is on the page: the
 * box for writing a reply is the same one it shows at the top of the home timeline. The
 * address says it instead.
 */
export const isPostPage = (pathname: string): boolean => STATUS.test(pathname);

/** What the key says the view is about: the screen name, the query, the list's id */
export const viewSubjectOf = (key: string): string | null => {
  const rest = key.slice(VIEW_PREFIX.length);
  const at = rest.indexOf(':');
  return at < 0 ? null : rest.slice(at + 1);
};

/** X puts the unread count in front of the page title and its own name after */
const UNREAD_COUNT = /^\(\d+\)\s*/;
const X_SUFFIX = /\s*\/\s*X$/;

/**
 * What X calls that view, taken from the page title. null when the title says nothing usable,
 * and the settings screen falls back to naming the view itself. The title is where X writes
 * the name it chose, a list's own name included — the one place the extension can reach it
 * without reading the page's chrome. A bare "X" is refused: that is the title before X has
 * set one for the view, and the record would otherwise be painted over with it.
 */
export const viewNameFrom = (pageTitle: string): string | null => {
  const name = pageTitle.replace(UNREAD_COUNT, '').replace(X_SUFFIX, '').trim();
  return name && name !== 'X' ? name : null;
};
