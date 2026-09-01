/**
 * Inserts an item that opens the settings into x.com's "More" menu.
 *
 * The menu is told apart by the button that opened it, the way X Pro's is: the wording
 * inside changes with the UI language, and a post's own menu carries `role="menu"` just
 * the same. Here the button is marked, so no walk up from it is needed — x.com is
 * simpler than X Pro in that one respect.
 *
 * Its items are `a[role="link"]`, not `role="menuitem"`: x.com and X Pro disagree here,
 * which is why the template selector is not shared.
 */
import type { Messages } from '../i18n/index.ts';
import { buildItem, MARK, MENU } from './menu-item.ts';
import { lastTrigger } from './trigger.ts';

/** The button that opens it. X marks this one, unlike X Pro's */
const MORE_BUTTON = '[data-testid="AppTabBar_More_Menu"]';
/** x.com writes its menu items as links. `role="menuitem"` appears nowhere in this menu */
const MENU_LINK = 'a[role="link"]';

/**
 * The rows of the menu, in the order they are drawn.
 *
 * x.com wraps every link in a row of its own, and it is the row that has to be cloned:
 * clone the link and it lands *inside* the first row, beside "Lists", drawn along the
 * row rather than under it. X Pro puts its items side by side under one parent, which
 * is why this differs.
 */
const rowsIn = (menu: Element): Element[] =>
  Array.from(menu.querySelectorAll(MENU_LINK), (link) => link.parentElement).filter(
    (row): row is HTMLElement => row !== null
  );

/** Whether the menu open now is the More menu, told by what was pressed to open it */
const isMoreMenu = (): boolean => lastTrigger()?.closest(MORE_BUTTON) != null;

/**
 * Inserts the item into the menu currently open, returning true if it did.
 * The caller can simply call it on every settling of the DOM; double insertion is
 * prevented here.
 */
export const insertInto = (messages: Messages): boolean => {
  if (!isMoreMenu()) return false;

  let inserted = false;
  for (const menu of document.querySelectorAll(MENU)) {
    if (menu.querySelector(`[${MARK}]`)) continue;

    // Placed after the last row rather than at the end of their container: the container
    // ends with a spacer of X's own, and appending would drop the item below it
    const last = rowsIn(menu).at(-1);
    if (!last) continue;

    last.after(buildItem(last, messages.title));
    inserted = true;
  }
  return inserted;
};
