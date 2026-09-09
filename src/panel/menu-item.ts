/**
 * The part of "put a way into the settings in X's menu" that is the same wherever the menu
 * is. X draws its items alike on both sites, so the item is built and the press received
 * in one place; which menu is the right one and what its items are made of is each
 * surface's menu module (`menu.ts`, `x-menu.ts`).
 */

/** The container X gives a menu, on both sites */
export const MENU = '[role="menu"]';

/** The mark on an inserted item. Checked so nothing is inserted twice into the same menu */
export const MARK = 'data-xpro-menu-item';

/**
 * Builds one item by cloning an existing one: the class names are obfuscated and cannot be
 * guessed, so the only way to look like the rest is to be one of them. The template's icon
 * (`svg`) depicts another feature and is removed; the wrapping elements are kept, so the
 * text lines up with the items around it.
 */
export const buildItem = (template: Element, label: string): HTMLElement => {
  const item = template.cloneNode(true) as HTMLElement;
  item.setAttribute(MARK, '');
  // The address goes, wherever it sits — the item is the link itself on one site and the
  // link is wrapped in a row on the other — since a live one would navigate away on the
  // press this item is meant to answer
  for (const el of [item, ...item.querySelectorAll('[href]')]) el.removeAttribute('href');
  for (const svg of item.querySelectorAll('svg')) svg.remove();

  // Finds the innermost element holding text and replaces it. Failing that, the text goes on the item itself
  const text = Array.from(item.querySelectorAll('span')).at(-1) ?? item;
  text.textContent = label;

  return item;
};

/**
 * Receives clicks on an inserted item through a capturing listener on document. One on the
 * item itself would not arrive when X stops the click further up in its own capture.
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
          '%c[X Tweaks]%c Failed to open the settings panel',
          'color:#1d9bf0;font-weight:bold',
          'color:#ef4444',
          error
        );
      }
    },
    true
  );
};
