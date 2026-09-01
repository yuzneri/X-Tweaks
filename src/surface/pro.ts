/**
 * X Pro (pro.x.com) as a surface.
 *
 * A scope here is one column of the deck on screen. Resolving which column a post sits
 * in, and which account that column belongs to, is `columns/registry.ts`'s work; this
 * file only says which of it answers which question of the seam.
 *
 * The bar carrying the column name lives here rather than in the appearance, because
 * finding it is a matter of X Pro's own layout: the appearance only needs to know which
 * element to paint.
 */
import {
  columnSignature,
  COLUMN_SELECTOR,
  deckState,
  detect,
  refresh,
  scopeElementOf,
  scopeOf,
  scopeOfColumn,
  scopes,
  scopeSettled,
} from '../columns/registry.ts';
import {
  insertInto as insertColumnItem,
  watch as watchColumnItem,
} from '../panel/column-options.ts';
import { watch as watchEntry } from '../panel/menu-item.ts';
import { insertInto as insertMenuItem } from '../panel/menu.ts';
import type { Surface } from './index.ts';

/** The container of the column name, and the container of the timeline */
const TITLE_SELECTOR = '[data-testid="column-title-wrapper"]';
const CONTENT_SELECTOR = '[data-testid="multi-column-layout-column-content"]';

/** Candidates for the bar: containers that hold the column name but not the timeline */
const BAND_SELECTOR = `div:has(${TITLE_SELECTOR}):not(:has(${CONTENT_SELECTOR}))`;

/**
 * Finds the column-name bar, returning only the outermost of the candidates.
 * The candidates nest, and painting all of them makes a color with opacity darker the
 * further in you go.
 */
const bandOf = (range: Element): Element | null => {
  const bands = [...range.querySelectorAll(BAND_SELECTOR)];
  return bands.find((el) => !bands.some((other) => other !== el && other.contains(el))) ?? null;
};

/**
 * Whether the marker already set still points at the outermost bar.
 *
 * A check that saves calling `bandOf`. `BAND_SELECTOR` carries two `:has()`, so it scans
 * the column's whole subtree and gets heavier as posts pile up. The two checks here each
 * cost a single element's worth of matching.
 */
const bandStillValid = (marked: Element, range: Element): boolean => {
  if (!marked.matches(BAND_SELECTOR)) return false;
  for (let el = marked.parentElement; el && el !== range; el = el.parentElement) {
    if (el.matches(BAND_SELECTOR)) return false;
  }
  return true;
};

export const proSurface: Surface = {
  id: 'pro',

  scopeOf,
  scopeSettled,

  scopes,
  detect,
  refresh,
  signature: columnSignature,
  state: deckState,

  scopeElements: () => Array.from(document.querySelectorAll(COLUMN_SELECTOR)),
  scopeOfElement: scopeOfColumn,
  rangeOf: scopeElementOf,
  bandOf,
  bandStillValid,

  // Two ways in: the bottom-left menu opens the global settings, a column's options open that column's
  insertEntryPoints: (messages) => {
    insertMenuItem(messages);
    insertColumnItem(messages);
  },
  watchEntryPoints: ({ toggle, openAt }) => {
    watchEntry(toggle);
    watchColumnItem(openAt);
  },
};
