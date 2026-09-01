/**
 * x.com as a surface.
 *
 * A scope here will be the view being looked at — home, notifications, a list — read
 * from the URL. That is not in yet: every post runs on the global settings alone, and
 * the appearance stays out. Both arrive once the settings screen can hold a tier that is
 * not a column.
 *
 * The filter itself already works: the posts are the same shape as X Pro's, so judging,
 * collapsing, hiding and highlighting need nothing from here.
 */
import type { ColumnScope } from '../settings/resolve.ts';
import type { Surface } from './index.ts';

/** Belongs to no account and no view, so only the global settings apply */
const GLOBAL_ONLY: ColumnScope = { account: null, columnId: null };

export const xSurface: Surface = {
  id: 'x',

  scopeOf: () => GLOBAL_ONLY,
  // With nothing below the global tier, a cell's scope is settled the moment it exists
  scopeSettled: () => true,

  scopes: () => [],
  detect: () => [],
  refresh: () => Promise.resolve([]),
  // Nothing that could change, so the signal never fires
  signature: () => '',
  // No deck. `deckId: null` is what tells the recording side "do not write anything down"
  state: () => ({ decks: [], deckId: null }),

  // The appearance has nowhere to apply until a view is a scope, so it is handed nothing
  scopeElements: () => [],
  scopeOfElement: () => GLOBAL_ONLY,
  rangeOf: (element) => element,
  bandOf: () => null,
  bandStillValid: () => false,
};
