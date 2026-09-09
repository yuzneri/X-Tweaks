/**
 * Inserts an item that opens the settings into X Pro's bottom-left menu. Only which menu
 * that is and what its items are made of is decided here; building the item and receiving
 * the press are the same on both sites (`menu-item.ts`).
 */
import type { Messages } from '../i18n/index.ts';
import { COLUMN_SELECTOR } from '../columns/registry.ts';
import { buildItem, MARK, MENU } from './menu-item.ts';
import { lastTrigger } from './trigger.ts';

/**
 * The marker X places next to the button that opens the bottom-left menu, for its guided
 * tour. It identifies this menu alone without depending on any wording.
 */
const DECK_MENU_ANCHOR = '[data-tourstep="side-nav-more-options"]';
/** X Pro writes its menu items with the menuitem role. x.com does not (see `x-menu.ts`) */
const MENU_ITEM = '[role="menuitem"]';

/**
 * Whether this is the bottom-left menu, told by the button that opened it. The marker sits
 * beside that button rather than on it, so the pressed spot's ancestors are walked for a
 * container holding it.
 */
const isDeckMenu = (menu: Element): boolean => {
  const trigger = lastTrigger();
  if (trigger === null || trigger.closest(COLUMN_SELECTOR) || menu.closest(COLUMN_SELECTOR)) {
    return false;
  }
  // Walking up too far reaches the sidebar as a whole and would let the top-left account
  // menu and others through. The marker is one level up from this menu's button and three
  // levels up from the other sidebar buttons
  for (let el: Element | null = trigger, depth = 0; el && depth <= 2; el = el.parentElement, depth++) {
    if (el.querySelector(DECK_MENU_ANCHOR)) return true;
  }
  return false;
};

/**
 * Inserts the item into the menu currently open, returning true if it did. Safe to call on
 * every settling of the DOM: double insertion is prevented here.
 */
export const insertInto = (messages: Messages): boolean => {
  let inserted = false;
  for (const menu of document.querySelectorAll(MENU)) {
    if (menu.querySelector(`[${MARK}]`)) continue;
    if (!isDeckMenu(menu)) continue;

    const template = menu.querySelector(MENU_ITEM);
    if (!template?.parentElement) continue;

    template.parentElement.append(buildItem(template, messages.title));
    inserted = true;
  }
  return inserted;
};
