/**
 * The seam between the parts that judge and paint posts, and the site they are running on.
 * The filter, the appearance and the settings all work in terms of a scope — "which column,
 * of which account" — and never in terms of X Pro's decks or x.com's URLs; everything that
 * does know about those sits behind this type. There is one surface per page and it never
 * changes: pro.x.com and x.com are separate origins, so no navigation turns one into the
 * other.
 */
import type { ColumnScope } from '../settings/resolve.ts';
import type { Messages } from '../i18n/index.ts';
import type { Start } from '../panel/panel.tsx';

export type SurfaceId = 'pro' | 'x';

/** A scope, with what the settings screen needs to name it */
export type ScopeInfo = ColumnScope & { title: string | null };

/**
 * Where the scopes on screen belong. X Pro groups its columns by deck; x.com has one group
 * and calls it nothing. An empty `groups` means "the list is unknown", a null `groupId`
 * means "which group is on screen cannot be decided" — the recording side uses that
 * distinction to avoid deleting what it does not know.
 */
export type SurfaceState = {
  groups: { id: string; name: string | null }[];
  groupId: string | null;
};

/**
 * What it means that a scope is no longer on screen.
 *
 * - `on-reopen` (X Pro): off the side of the window and deleted look the same, X Pro keeping
 *   columns outside the window out of the DOM, so nothing is dropped until the deck is
 *   reopened and a scope with settings is then kept and marked rather than lost
 * - `at-once` (x.com): you are simply looking at another view. One with nothing set is
 *   dropped straight away, or every profile ever glanced at would pile up; one with settings
 *   is kept and *not* marked, being elsewhere not being a fault to report
 */
export type Pruning = 'on-reopen' | 'at-once';

export type Surface = {
  readonly id: SurfaceId;

  // --- Which scope a post belongs to ---

  /** The scope of the post cell. Posts outside any scope get the empty one, and run on the global settings */
  scopeOf: (cell: Element) => ColumnScope;
  /**
   * Whether that cell's scope will no longer move. Only for while the arrangement is
   * changing: once settled, a scope that could not be resolved still applies as far as it
   * goes, so this must not be used to skip it.
   */
  scopeSettled: (cell: Element) => boolean;

  // --- What is on screen ---

  /** The scopes on screen. Read without asking anything, so it can be called on every settling */
  scopes: () => ColumnScope[];
  /** The same, with what the settings screen needs to name them */
  detect: () => ScopeInfo[];
  /** Resolves again after the arrangement changed. May have to ask the page, so it is async */
  refresh: () => Promise<ScopeInfo[]>;
  /** A string that changes when the arrangement does. The signal to call `refresh` */
  signature: () => string;
  /** Where the scopes on screen belong, for the record the settings screen reads */
  state: () => SurfaceState;
  /** What it means that a scope is not on screen (see `Pruning`) */
  pruning: Pruning;

  // --- Where the appearance applies ---

  /**
   * Whether a scope here is a column of its own — something standing beside others, with
   * a width and a name bar the settings can paint. The items that only mean anything
   * under that are dropped where it is false (see `withoutColumnItems`).
   */
  hasColumns: boolean;
  /** One element per scope on screen. The appearance walks these to place its markers */
  scopeElements: () => Element[];
  /**
   * The scope of one of those elements. `all` is what `scopeElements` just answered:
   * where a scope ends can be a question about where the others are (X Pro works a
   * column's range out that way), and the caller has the list in hand already
   */
  scopeOfElement: (element: Element, all: readonly Element[]) => ColumnScope;
  /**
   * The range the appearance may paint: it holds the scope's header and its posts, but
   * not the neighbouring scope's. `all` is as above.
   */
  rangeOf: (element: Element, all: readonly Element[]) => Element;
  /** The bar carrying the scope's name, painted separately. null where the surface has none */
  bandOf: (range: Element) => Element | null;
  /** Whether the element already marked as the bar is still the right one */
  bandStillValid: (marked: Element, range: Element) => boolean;
  /**
   * Whether that range holds a post opened to be read rather than a timeline to skim;
   * everything that only serves skimming stands down there (see `OPENED_ATTR`). How to tell
   * differs by surface, which is why it is asked here: X Pro has the reply box appear in the
   * one column with a post opened, while x.com shows that box at the top of the home
   * timeline as well and has to go by the address instead.
   */
  opened: (range: Element) => boolean;

  // --- The ways into the settings ---

  /**
   * Puts the ways in where this surface keeps them. Called on every settling of the DOM,
   * because a menu has to be open before there is anything to insert into. Inserting twice
   * is the implementation's to prevent.
   */
  insertEntryPoints: (messages: Messages) => void;
  /**
   * Subscribes to presses on them. Called once at startup.
   * `toggle` opens the settings, or closes them if they are open, landing on the scope it
   * is given. `openAt` always opens, showing one scope; a surface whose way in is a single
   * menu has nothing to reopen over and never calls it.
   */
  watchEntryPoints: (open: {
    toggle: (start?: Start) => void;
    openAt: (start: Start) => void;
  }) => void;
};

/** The surface this page is on. Set once at startup */
let current: Surface | null = null;

export const install = (surface: Surface): void => {
  current = surface;
};

/**
 * The installed surface. Throws when nothing was installed, which can only be a mistake
 * in the startup order rather than a state a page can be in.
 */
export const surface = (): Surface => {
  if (current === null) throw new Error('No surface installed');
  return current;
};
