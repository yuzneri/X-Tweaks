/**
 * Identifying columns and resolving the account each belongs to.
 *
 * `columnId` never appears in a DOM attribute and lives only in React's internal
 * state, so the MAIN world is asked to stamp it onto the elements. The account can
 * be read from the avatar in the column header.
 *
 * Columns are never addressed by their position. Switching decks replaces the
 * elements wholesale, and an assignment remembered as "the Nth from the left"
 * becomes another column's settings as it stands.
 */
import type { ColumnScope } from '../settings/resolve.ts';
import type { ScopeInfo } from '../surface/index.ts';
import { deckIdOf, deckStateFrom, UNKNOWN_DECK, type DeckState } from './deck.ts';
import { AVATAR_NAME, avatarNameOf } from '../filter/post.ts';



const REQUEST = 'xpro-tweaks:request-columns';
const RESPONSE = 'xpro-tweaks:response-columns';

export const COLUMN_SELECTOR = '[data-testid="multi-column-layout-column-content"]';
const TITLE_SELECTOR = '[data-testid="column-title-wrapper"]';


/** The marker the MAIN world stamps. That side imports nothing, so the name is kept in sync by hand */
const COLUMN_ID_ATTR = 'data-xpro-column-id';

type ColumnResponse = {
  columns: { index: number; columnId: string | null }[];
  /** Which column each open column-options drawer belongs to (matched by position) */
  drawers?: { index: number; columnId: string | null }[];
  error: string | null;
};

const EMPTY: ColumnScope = { account: null, columnId: null };

/**
 * Column element → the scope resolved for it. Kept so the DOM is not walked up again
 * for every post. It is thrown away on every re-resolve, so a result from before the
 * markers were stamped is never carried over.
 */
let resolved = new WeakMap<Element, ColumnScope>();

let sequence = 0;

/** Asks the MAIN world for the columnIds. No answer may mean the CSP blocked it */
const askMainWorld = (timeoutMs = 3000): Promise<ColumnResponse> =>
  new Promise((resolve, reject) => {
    const requestId = ++sequence;

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window) return;
      const data = event.data as ({ type?: unknown; requestId?: unknown } & ColumnResponse) | null;
      if (!data || data.type !== RESPONSE || data.requestId !== requestId) return;
      cleanup();
      resolve(data);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`MAIN world から ${timeoutMs}ms 以内に応答がない`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ type: REQUEST, requestId }, window.location.origin);
  });

/**
 * Returns the range covering one whole column: an element that holds the header and
 * the body but not the neighboring column.
 *
 * Walks up from the column body and stops at whichever comes first:
 *   - just before an ancestor comes to hold two or more column bodies (so the
 *     neighboring column is not swept in)
 *   - the moment it holds the column header (that column's header has been reached)
 *
 * With the former alone, an environment with a single column never satisfies the
 * condition and the walk runs to the root element, picking up the sidebar's account
 * avatar as the column's account. The latter is what stops that.
 * maxDepth is insurance for a structure where neither condition holds; normally it is
 * never reached.
 */
const columnScopeOf = (columnEl: Element, maxDepth = 10): Element => {
  let scope = columnEl;
  let parent = columnEl.parentElement;
  for (let depth = 0; parent && depth < maxDepth; depth++) {
    if (parent.querySelectorAll(COLUMN_SELECTOR).length > 1) break;
    scope = parent;
    if (scope.querySelector(TITLE_SELECTOR)) break;
    parent = parent.parentElement;
  }
  return scope;
};

/**
 * The account a column belongs to. The screen name is embedded in the marker of the
 * avatar in the column header. Author avatars listed in the column body carry the
 * same marker, so the body is excluded from the search.
 */
const accountOf = (columnEl: Element): string | null => {
  const scope = columnScopeOf(columnEl);
  const avatar = Array.from(scope.querySelectorAll(AVATAR_NAME)).find(
    (el) => !el.closest(COLUMN_SELECTOR)
  );
  return avatarNameOf(avatar);
};

/**
 * The column name. The range is limited so that walking up does not pick up the
 * neighboring column's header.
 *
 * An empty name means "not drawn yet", not "has no name": right after a deck switch
 * the header's box appears first and its contents arrive a few hundred ms later.
 * null is returned so the recording side can treat it as "not known".
 */
const titleOf = (columnEl: Element): string | null => {
  const title = columnScopeOf(columnEl).querySelector(TITLE_SELECTOR);
  const text = title?.textContent?.trim();
  return text ? text.slice(0, 40) : null;
};

const columnElements = (): Element[] => Array.from(document.querySelectorAll(COLUMN_SELECTOR));

/** Links on the deck rail. `manage` and `new` are mixed in, so only readable ids are taken */
const DECK_LINK = 'a[href*="/i/decks/"]';
/** "New deck". It is always on the rail, so it serves as a foothold when there is only one deck */
const DECK_NEW = /\/i\/decks\/new$/;

/** The deck on screen. It is the one thing on the rail that is not an `<a>`, so its id is read from the URL */
export const currentDeckId = (): string => deckIdOf(location.pathname) ?? UNKNOWN_DECK;

/**
 * The deck rail itself. Links to other decks are the foothold, but not the only one:
 * a user with a single deck has no link to any other deck, leaving the rail
 * unreachable. "New deck" is always on the rail, so it serves as a second foothold.
 * "Manage decks" sits in a different container and cannot be used.
 */
const railOf = (): Element | null => {
  const links = Array.from(document.querySelectorAll(DECK_LINK));
  const anchor =
    links.find((link) => deckIdOf(link.getAttribute('href') ?? '') !== null) ??
    links.find((link) => DECK_NEW.test(link.getAttribute('href') ?? ''));
  return anchor?.parentElement ?? null;
};

/**
 * Reads the deck rail. Read fresh every time rather than cached.
 * The rail is always in the DOM and lists every deck, including ones never visited,
 * so all that needs remembering is each deck's columns.
 * Deciding the state from what was read is `deckStateFrom`'s job (`deck.ts`).
 */
export const deckState = (): DeckState =>
  deckStateFrom(
    Array.from(railOf()?.children ?? []).map((child) => ({
      tagName: child.tagName,
      href: child.getAttribute('href'),
      label: child.getAttribute('aria-label'),
    })),
    currentDeckId()
  );

/**
 * A string describing the current arrangement of columns, used as the signal that it
 * changed. It looks at the sequence of markers rather than the count, so it changes
 * both on a switch to a deck with the same number of columns and on a reorder.
 * Elements without a marker yet become `?`, so "not asked yet" is a signal in itself.
 */
export const columnSignature = (): string =>
  columnElements()
    .map((el) => el.getAttribute(COLUMN_ID_ATTR) ?? '?')
    .join('\n');

/**
 * Asks the MAIN world to stamp the markers onto the column elements.
 * When none could be obtained, it waits a little and tries again: the MAIN world is
 * sometimes not ready yet, and giving up after one failure would take the whole
 * column tier out of service.
 */
const stampIds = async (attempts = 3, waitMs = 400): Promise<void> => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await askMainWorld();
      // The MAIN world does the stamping; all that matters here is whether it worked
      if (!response.error && response.columns.some((column) => column.columnId !== null)) return;
    } catch {
      // Even without a columnId, everything up to the account tier still applies
    }
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
};

/** Derives the scope from a column element. Without a marker, `columnId` is null (the column tier does not apply) */
const readScope = (column: Element): ColumnScope => ({
  columnId: column.getAttribute(COLUMN_ID_ATTR),
  account: accountOf(column),
});

const scopeOfElement = (column: Element): ColumnScope => {
  const known = resolved.get(column);
  if (known) return known;
  const scope = readScope(column);
  resolved.set(column, scope);
  return scope;
};

/**
 * Reads the columns currently in the DOM. It does not ask the MAIN world, so it can
 * be called on every settling. Names arrive late even when the set of columns is
 * unchanged, so re-reading is necessary.
 */
export const detect = (): ScopeInfo[] =>
  columnElements().map((element) => ({ ...scopeOfElement(element), title: titleOf(element) }));

/**
 * Resolves the list of columns again. Called when the arrangement of columns changes.
 * The MAIN world stamps the markers first, then they are read, and the remembered
 * scopes are thrown away.
 */
export const refresh = async (): Promise<ScopeInfo[]> => {
  if (document.querySelector(COLUMN_SELECTOR)) await stampIds();
  resolved = new WeakMap();
  return detect();
};

/**
 * Returns the scope of the column a post cell belongs to. Posts also appear in the
 * detail panel that opens outside the columns, so "belongs to no column" is a normal
 * case; there, only the global settings apply.
 */
export const scopeOf = (cell: Element): ColumnScope => {
  const column = cell.closest(COLUMN_SELECTOR);
  if (!column) return EMPTY;
  return scopeOfElement(column);
};

/**
 * Whether that cell's scope will no longer move. Inside a column it is settled once
 * the marker is stamped and the remembered scope agrees with that marker.
 *
 * Looking at the remembered one as well is the point. `scopeOf` returns the
 * remembered value first, and it is only discarded after `refresh` has waited for the
 * MAIN world's reply. Judging by the marker alone would judge a cell with the
 * previous column's settings once the same element becomes a different column.
 *
 * Use it only while the arrangement of columns is changing. Once things have settled,
 * a column whose marker cannot be obtained still applies up to the account tier, so
 * this test must not be used.
 */
export const scopeSettled = (cell: Element): boolean => {
  const column = cell.closest(COLUMN_SELECTOR);
  if (column === null) return true;
  const columnId = column.getAttribute(COLUMN_ID_ATTR);
  if (columnId === null) return false;
  const known = resolved.get(column);
  return known === undefined || known.columnId === columnId;
};

/**
 * Takes the scope from a column element itself.
 * Used to decide which column's settings an item inserted into the column options belongs to.
 */
export const scopeOfColumn = (column: Element): ColumnScope => scopeOfElement(column);
export const scopes = (): ColumnScope[] => columnElements().map(scopeOfElement);

/**
 * Asks which column each open column-options drawer belongs to.
 * The DOM holds no marker tying a drawer to a column, so it is read over the same
 * route as `columnId` (React's internal state) and matched by position.
 */
export const drawerColumnIds = async (): Promise<(string | null)[]> => {
  try {
    const response = await askMainWorld();
    if (response.error) return [];
    return (response.drawers ?? []).map((drawer) => drawer.columnId);
  } catch {
    return [];
  }
};

export const scopeElementOf = (column: Element): Element => columnScopeOf(column);
