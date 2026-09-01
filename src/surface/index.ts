/**
 * The seam between the parts that judge and paint posts, and the site they are running on.
 *
 * The filter, the appearance and the settings all work in terms of a scope — "which
 * column, of which account" — and never in terms of X Pro's decks or x.com's URLs.
 * Everything that does know about those sits behind this type.
 *
 * There is one surface per page and it never changes: pro.x.com and x.com are separate
 * origins, so no navigation turns one into the other.
 */
import type { ColumnScope } from '../settings/resolve.ts';
import type { Messages } from '../i18n/index.ts';
import type { Start } from '../panel/panel.tsx';

export type SurfaceId = 'pro' | 'x';

/** A scope, with what the settings screen needs to name it */
export type ScopeInfo = ColumnScope & { title: string | null };

/**
 * Where the scopes on screen belong. X Pro groups its columns by deck; x.com has one
 * group and calls it nothing.
 *
 * An empty `groups` means "the list is unknown"; a null `groupId` means "which group is
 * on screen cannot be decided". The recording side uses that distinction to avoid
 * deleting what it does not know.
 */
export type SurfaceState = {
  groups: { id: string; name: string | null }[];
  groupId: string | null;
};

/**
 * Whether a scope that is no longer on screen may have been deleted.
 *
 * X Pro keeps columns outside the window out of the DOM, so "gone from the DOM" and
 * "merely out of sight" look the same, and the record has to be pruned when a deck is
 * reopened or deleted columns would pile up forever. x.com's views are a fixed set that
 * nothing deletes — one simply is not the view being looked at — so pruning there would
 * mark a view "not found" for the sole reason that you are somewhere else.
 */
export type Pruning = boolean;

export type Surface = {
  readonly id: SurfaceId;

  // --- Which scope a post belongs to ---

  /** The scope of the post cell. Posts outside any scope get the empty one, and run on the global settings */
  scopeOf: (cell: Element) => ColumnScope;
  /**
   * Whether that cell's scope will no longer move.
   * Only for while the arrangement is changing; once settled, a scope that could not be
   * resolved still applies as far as it goes, so this must not be used to skip it.
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
  /** Whether scopes missing from the page may have been deleted (see `Pruning`) */
  prunesMissing: Pruning;

  // --- Where the appearance applies ---

  /** One element per scope on screen. The appearance walks these to place its markers */
  scopeElements: () => Element[];
  /** The scope of one of those elements */
  scopeOfElement: (element: Element) => ColumnScope;
  /**
   * The range the appearance may paint: it holds the scope's header and its posts, but
   * not the neighbouring scope's.
   */
  rangeOf: (element: Element) => Element;
  /** The bar carrying the scope's name, painted separately. null where the surface has none */
  bandOf: (range: Element) => Element | null;
  /** Whether the element already marked as the bar is still the right one */
  bandStillValid: (marked: Element, range: Element) => boolean;

  // --- The ways into the settings ---

  /**
   * Puts the ways in where this surface keeps them. Called on every settling of the DOM,
   * because a menu has to be open before there is anything to insert into.
   * Inserting twice is the implementation's to prevent.
   */
  insertEntryPoints: (messages: Messages) => void;
  /**
   * Subscribes to presses on them. Called once at startup.
   * `toggle` opens the settings, or closes them if they are open. `openAt` opens them
   * showing one scope, and a surface with no way to point at one never calls it.
   */
  watchEntryPoints: (open: { toggle: () => void; openAt: (start: Start) => void }) => void;
};

/**
 * The surface this page is on. Set once at startup.
 *
 * Held in a module variable rather than threaded through every call: the filter, the
 * appearance and the settings would each have to pass it down through layers that have
 * nothing to say about it.
 */
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
