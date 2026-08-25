/**
 * Inserts an item that opens that column's settings into X Pro's column options.
 * The drawer's marker (`drawerAnimatedDiv`) is shared with the compose form, so which
 * kind it is gets told apart by whether a column-options row (`OPTION_ITEM`) is inside.
 */
import {
  COLUMN_SELECTOR,
  drawerColumnIds,
  scopeElementOf,
  scopeOfColumn,
} from '../columns/registry.ts';
import type { Messages } from '../i18n/index.ts';
import type { Start } from './panel.tsx';

/** The drawer, as marked by X Pro. Not exclusive to the column options (see `OPTION_ITEM`) */
const DRAWER = '[data-testid="drawerAnimatedDiv"]';

/**
 * The marker X Pro puts on one row of the column options ("Duplicate", "Remove column"
 * and so on).
 * Inserting without telling the kinds apart would put the item into the compose form's
 * header and double up its rows, so only a drawer with this marker counts as the column
 * options.
 *
 * It is matched by prefix because the second half of the marker is the row's wording
 * (`option-icon_コピーする`) and changes per language. Whether the first half is the
 * same in other languages is unconfirmed, but being wrong only means the item is not
 * inserted, and the panel can still be opened from the bottom-left menu.
 */
const OPTION_ITEM = '[data-testid^="option-icon"]';
/** The mark on an inserted item, checked so nothing is inserted twice */
const MARK = 'data-xpro-column-options-item';

/**
 * The column whose header was pressed most recently. Drawers are drawn outside the
 * columns and several can remain open at once. Which drawer belongs to which column
 * cannot be traced from the DOM, so it is decided by what opened it.
 *
 * The insertion itself happens into every drawer found. Otherwise a drawer that is
 * already open would never get the item.
 */
let column: Element | null = null;
/**
 * The columnId at the moment of pressing. If X redraws between the press and the
 * settings opening, the remembered element becomes unusable.
 * It is not looked up again by position, which could point at a different column.
 */
let triggered: string | null = null;

/** The signal that a header was pressed. Remembered only for presses within a column's range */
export const rememberTrigger = (target: Element | null): void => {
  // A press on an inserted item itself does not overwrite it, so the header pressed just before is kept
  if (!target || target.closest(`[${MARK}]`)) return;
  const columns = Array.from(document.querySelectorAll(COLUMN_SELECTOR));
  const found = columns.find((candidate) => scopeElementOf(candidate).contains(target));
  if (!found) return;
  column = found;
  triggered = scopeOfColumn(found).columnId;
};

/**
 * Drawer element → the columnId of the column that drawer serves.
 * The fallback for when there is no record of a header press (the drawer was already
 * open when the page loaded, and so on): the DOM offers no clue, so it is read from
 * React's internal state and remembered.
 */
const drawerColumn = new WeakMap<Element, string>();
/**
 * Drawers already asked about. Remembered whether or not an answer came, so they are
 * not asked again. Without remembering, every change to the DOM would trigger another query.
 */
const asked = new WeakSet<Element>();

/** The columnId of the column currently pressed. When the element is unusable, the value from the press is used */
const triggeredColumnId = (): string | null =>
  (column?.isConnected ? scopeOfColumn(column).columnId : null) ?? triggered;

/**
 * Decides whose settings to open from the item that was pressed.
 * The mapping the drawer itself holds wins, so it does not depend on the order of presses.
 */
const columnIdFor = (item: Element): string | null => {
  const drawer = item.closest(DRAWER);
  const known = drawer ? drawerColumn.get(drawer) : undefined;
  return known ?? triggeredColumnId();
};

/** A column-options row itself. It also serves as the template, so how to find one lives in a single place */
const isOptionRow = (el: Element): boolean =>
  el.tagName === 'BUTTON' && el.querySelector(OPTION_ITEM) !== null;

/**
 * Finds the surface the items are laid out on, or null when it is not the column options.
 * The column-options rows sit under a single parent, and that parent is chosen as the
 * element with the most rows as direct children (no wording and no class is consulted).
 * A drawer with no rows yields no surface, and the caller then stops inserting.
 */
const sheetOf = (drawer: Element): Element | null => {
  let sheet: Element | null = null;
  // Also finds column options with a single row (some kinds have no clear or remove)
  let most = 0;
  for (const el of drawer.querySelectorAll('*')) {
    const rows = Array.from(el.children).filter(isOptionRow).length;
    // Counting direct children only means an outer container is never chosen first
    if (rows > most) {
      most = rows;
      sheet = el;
    }
  }
  return sheet;
};

/** What to open when pressed. Received by `watch` and used by the handler listening on document */
let onOpenPanel: ((start: Start) => void) | null = null;

/**
 * Receives clicks on the inserted item through a capturing listener on document.
 * A listener on the item itself is not enough: if X stops the same click in a
 * capturing listener further up, it never reaches the item.
 */
export const watch = (onOpen: (start: Start) => void): void => {
  onOpenPanel = onOpen;
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(`[${MARK}]`)) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        const columnId = columnIdFor(target);
        // Leaves behind what it takes to narrow down "it does not open" or "the wrong column came up"
        console.log(
          '%c[X Pro Tweaks]%c Opening column settings',
          'color:#1d9bf0;font-weight:bold',
          '',
          {
            columnId,
            fromDrawer: drawerColumn.get(target.closest(DRAWER) ?? target) ?? null,
            triggered,
            columnConnected: column?.isConnected ?? false,
          }
        );
        // With no way to identify the column there is nothing to point at, so it starts from the global settings
        onOpenPanel?.(columnId === null ? { tier: 'global' } : { tier: 'columns', key: columnId });
      } catch (error) {
        console.log(
          '%c[X Pro Tweaks]%c Failed to open the settings panel',
          'color:#1d9bf0;font-weight:bold',
          'color:#ef4444',
          error
        );
      }
    },
    true
  );
};

/**
 * Builds one item by cloning an existing button and replacing its contents.
 * Inside the template, an icon and a heading-plus-description are nested. The icon
 * depicts another feature and is removed, and only the innermost element holding text
 * is rewritten.
 */
const buildItem = (template: Element, label: string): HTMLElement => {
  const item = template.cloneNode(true) as HTMLElement;
  item.setAttribute(MARK, '');
  item.setAttribute('aria-label', label);
  for (const svg of item.querySelectorAll('svg')) svg.remove();

  const texts = Array.from(item.querySelectorAll('*')).filter(
    (el) => el.childElementCount === 0 && el.textContent?.trim()
  );
  // The first is the heading and the rest the description. The description is removed, leaving the heading
  if (texts.length > 0) texts[0]!.textContent = label;
  for (const extra of texts.slice(1)) extra.remove();

  return item;
};

/**
 * Inserts the item into the column options currently open, returning how many were added.
 * The caller can simply call it on every settling of the DOM; double insertion is
 * prevented here.
 */
export const insertInto = (messages: Messages): number => {
  const drawers = Array.from(document.querySelectorAll(DRAWER));
  // Reads which drawer belongs to which column from React's internal state and
  // remembers it. Asking is only needed when drawers come and go, so it happens here,
  // where the insertion is done
  const unasked = drawers.filter((drawer) => !asked.has(drawer));
  if (unasked.length > 0) {
    for (const drawer of unasked) asked.add(drawer);
    void drawerColumnIds().then((ids) => {
      drawers.forEach((drawer, index) => {
        const columnId = ids[index];
        if (columnId) drawerColumn.set(drawer, columnId);
      });
    });
  }

  let added = 0;
  for (const drawer of drawers) {
    if (drawer.querySelector(`[${MARK}]`)) continue;

    // A drawer that is not the column options (the compose form and the like) drops out here
    const sheet = sheetOf(drawer);
    const template = sheet && Array.from(sheet.children).find(isOptionRow);
    if (!sheet || !template) continue;

    // Which column it is gets decided at the moment of the press (`watch` receives it).
    // Drawers are sometimes reused, so the column at insertion time is not baked in
    const item = buildItem(template, messages.tiers.columnEntry);
    // Placed before the destructive actions (remove, clear) and right after the display settings
    sheet.insertBefore(item, template);
    added++;
  }
  return added;
};
