/**
 * Inserts an item that opens the settings into X Pro's bottom-left menu.
 * An existing item is cloned because the class names are obfuscated and cannot be guessed.
 */
import type { Messages } from '../i18n/index.ts';
import { COLUMN_SELECTOR } from '../columns/registry.ts';

const MENU = '[role="menu"]';
/**
 * The marker X places next to the button that opens the bottom-left menu, for its
 * guided tour. It identifies this menu alone without depending on any wording.
 */
const DECK_MENU_ANCHOR = '[data-tourstep="side-nav-more-options"]';
const MENU_ITEM = '[role="menuitem"]';
/** The mark on an inserted item, checked so nothing is inserted twice into the same menu */
const MARK = 'data-xpro-menu-item';

/**
 * The element that caused a menu to open, remembered to tell the bottom-left menu apart
 * from a per-post menu. Telling them apart by the wording inside would depend on the UI
 * language, so the decision is made from where the press happened.
 */
let trigger: Element | null = null;

export const watchTrigger = (onTrigger: (target: Element | null) => void): void => {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      trigger = target instanceof Element ? target : null;
      // The column-options side uses the same trigger (rather than attaching a second listener)
      onTrigger(trigger);
    },
    true
  );
};

/**
 * Whether this is the bottom-left menu, told by whether the button that opened it was
 * that menu's. The marker sits beside the button rather than on it, so the ancestors of
 * the pressed spot are walked to see whether a container holding the marker is reached.
 */
const isDeckMenu = (menu: Element): boolean => {
  if (trigger === null || trigger.closest(COLUMN_SELECTOR) || menu.closest(COLUMN_SELECTOR)) {
    return false;
  }
  // Walking up too far reaches the sidebar as a whole and would let the top-left account
  // menu and others through. The marker is one level up from the bottom-left menu's
  // button and three levels up from the other sidebar buttons
  for (let el: Element | null = trigger, depth = 0; el && depth <= 2; el = el.parentElement, depth++) {
    if (el.querySelector(DECK_MENU_ANCHOR)) return true;
  }
  return false;
};

/**
 * Builds one item. The template's icon (`svg`) depicts another feature and is removed.
 * The wrapping elements are kept, so the text lines up with the existing items.
 */
const buildItem = (template: Element, label: string): HTMLElement => {
  const item = template.cloneNode(true) as HTMLElement;
  item.setAttribute(MARK, '');
  item.removeAttribute('href');
  for (const svg of item.querySelectorAll('svg')) svg.remove();

  // Finds the innermost element holding text and replaces it. Failing that, the text goes on the item itself
  const text = Array.from(item.querySelectorAll('span')).at(-1) ?? item;
  text.textContent = label;

  return item;
};

/**
 * Receives clicks on the inserted item through a capturing listener on document.
 * A listener on the item itself would not arrive when X stops the click in a capturing
 * listener further up.
 */
export const watch = (onClick: () => void): void => {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(`[${MARK}]`)) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        onClick();
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
 * Inserts the item into the menu currently open, returning true if it did.
 * The caller can simply call it on every settling of the DOM; double insertion is
 * prevented here.
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
