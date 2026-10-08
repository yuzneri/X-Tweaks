/**
 * Where the search form goes when x.com's rail is not on screen: a button in the navigation
 * on the left, and a popover it opens. `insert.tsx` decides which home the form has and moves
 * the one form between them; this keeps the button and the popover standing.
 *
 * The popover is the browser's own (`popover="auto"`): it draws above everything X stacks,
 * and closing on Escape or a press outside is the browser's to do.
 */
import { layersWithin } from '../appearance/background.ts';
import type { Rgba } from '../appearance/contrast.ts';
import type { Messages } from '../i18n/index.ts';

/** The mark on the button, so it is inserted once and its presses can be told apart */
const BUTTON = 'data-xpro-search-nav';

/** The mark on the popover, so it can be found again to take away */
const POPOVER = 'data-xpro-search-popover';

const SIDE_NAV = 'header[role="banner"] nav[role="navigation"]';

/**
 * The item the button is cloned from and put after. Explore, being the search's own place;
 * failing that any item, since all that is taken from it is X's look.
 */
const TEMPLATE = 'a[data-testid="AppTabBar_Explore_Link"]';

/**
 * A magnifier with a plus beside it, drawn in X's own 24-unit box so it takes the place of
 * the template's icon at the template's size. Built element by element rather than written
 * as markup: assigning markup is what the add-on review flags.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON: [tag: string, attributes: Record<string, string>][] = [
  ['circle', { cx: '9.5', cy: '9.5', r: '6' }],
  ['path', { d: 'M14 14l5 5M17 4h4M19 2v4' }],
];

const drawIcon = (svg: SVGElement): void => {
  const group = document.createElementNS(SVG_NS, 'g');
  for (const [name, value] of Object.entries({
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
  })) {
    group.setAttribute(name, value);
  }
  for (const [tag, attributes] of ICON) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, value);
    group.append(shape);
  }
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.replaceChildren(group);
};

/** Space kept between the popover and the window's edges, and between it and the button */
const GAP = 8;

let popover: HTMLElement | null = null;

/**
 * Whether the popover was open when the press that is now a click began. Pressing the
 * button while it is open closes it by light dismiss before the click arrives, so the
 * click on its own cannot tell "open it" from "it was just closed by this press".
 * null when the click did not start with a pointer press (Enter on the focused button).
 */
let openAtPress: boolean | null = null;

/** The address the popover was opened at, so a search started from it closes it */
let openedAt: string | null = null;

let watching = false;

const isOpen = (): boolean => popover?.matches(':popover-open') === true;

/**
 * Clones the template so the button takes X's look, including showing only the icon where
 * X shows only icons. What would make it act as the template is taken off: the address (a
 * press would navigate), the test id (rules hiding Explore, X's own and this extension's,
 * would reach it), and the "this is the current page" state.
 */
const buildButton = (template: Element, messages: Messages): HTMLElement => {
  const button = template.cloneNode(true) as HTMLElement;
  for (const el of [button, ...button.querySelectorAll('*')]) {
    el.removeAttribute('href');
    el.removeAttribute('data-testid');
    el.removeAttribute('aria-current');
  }
  button.setAttribute(BUTTON, '');
  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');
  button.setAttribute('aria-label', messages.search.open);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', String(isOpen()));

  // The template's own svg is kept for its size and class names; only what it draws changes
  const svg = button.querySelector('svg');
  if (svg) drawIcon(svg);
  // The first span holding words: X follows the label with a span holding only a space
  const text = Array.from(button.querySelectorAll('span')).find(
    (span) => (span.textContent ?? '').trim() !== ''
  );
  if (text) text.textContent = messages.search.open;
  return button;
};

const findButton = (): HTMLElement | null => document.querySelector<HTMLElement>(`[${BUTTON}]`);

const css = ({ r, g, b, a }: Rgba): string => `rgba(${r}, ${g}, ${b}, ${a})`;

/**
 * Paints the popover with what is painted behind the button, read the way the highlight's
 * contrast reads it (`appearance/background.ts`): X paints its theme on `body`, and so does
 * the page background setting (`appearance/css.ts`), which may be see-through. Copying a
 * see-through color alone would leave the popover see-through over the timeline, so the
 * layers go over the browser's own popover background, which follows the page's
 * `color-scheme` the way the window behind `body` does.
 */
const paint = (button: Element): void => {
  if (!popover) return;
  const found = layersWithin(button, document.documentElement);
  if ('opaque' in found) {
    const { r, g, b } = found.opaque;
    popover.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    popover.style.removeProperty('background-image');
    return;
  }
  popover.style.removeProperty('background-color');
  // One flat gradient per layer, the front one first as `background-image` stacks them
  const layers = found.layers.map((color) => `linear-gradient(${css(color)}, ${css(color)})`);
  if (layers.length > 0) popover.style.backgroundImage = layers.join(', ');
  else popover.style.removeProperty('background-image');
};

/**
 * Places the popover beside the button and inside the window. Done on opening only: what it
 * reads (the button's position, the page's colors) is read once per press, not per settling.
 */
const place = (button: Element): void => {
  if (!popover) return;
  /*
   * The popover sits outside X's tree, where nothing paints a background under it and X's
   * colors and type are not inherited. They are taken from X as it is drawn now, so the
   * popover follows the theme the reader is in.
   */
  paint(button);
  const item = getComputedStyle(button);
  popover.style.color = item.color;
  popover.style.fontFamily = item.fontFamily;

  const rect = button.getBoundingClientRect();
  const left = Math.min(rect.right + GAP, window.innerWidth - popover.offsetWidth - GAP);
  const top = Math.min(rect.top, window.innerHeight - popover.offsetHeight - GAP);
  popover.style.left = `${Math.max(GAP, left)}px`;
  popover.style.top = `${Math.max(GAP, top)}px`;
};

const open = (button: Element): void => {
  if (!popover) return;
  popover.showPopover();
  place(button);
  openedAt = location.href;
};

const close = (): void => {
  if (isOpen()) popover?.hidePopover();
};

/**
 * Receives presses on the button through capturing listeners on document, for the reason
 * `panel/menu-item.ts` gives: one on the button itself would not hear a click X stops on the
 * way down.
 */
const watch = (): void => {
  if (watching) return;
  watching = true;
  document.addEventListener(
    'pointerdown',
    (event) => {
      openAtPress =
        event.target instanceof Element && event.target.closest(`[${BUTTON}]`) ? isOpen() : null;
    },
    true
  );
  document.addEventListener(
    'click',
    (event) => {
      const button = event.target instanceof Element ? event.target.closest(`[${BUTTON}]`) : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const wasOpen = openAtPress ?? isOpen();
      openAtPress = null;
      if (wasOpen) close();
      else open(button);
    },
    true
  );
  // A link without an address answers no key, so both of a button's keys are given it here
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const button = event.target instanceof Element ? event.target.closest(`[${BUTTON}]`) : null;
      if (!(button instanceof HTMLElement)) return;
      event.preventDefault();
      // Held down, the key would open and close it over and over
      if (event.repeat) return;
      // Not the end of a press: one begun on the button and let go elsewhere left its answer
      openAtPress = null;
      button.click();
    },
    true
  );
};

const buildPopover = (messages: Messages): HTMLElement => {
  const element = document.createElement('div');
  element.className = 'xpro-search-popover';
  element.setAttribute(POPOVER, '');
  element.setAttribute('popover', 'auto');
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', messages.search.label);
  element.addEventListener('toggle', (event) => {
    const opened = (event as ToggleEvent).newState === 'open';
    findButton()?.setAttribute('aria-expanded', String(opened));
    if (opened) return;
    openedAt = null;
    // The browser hands focus back only to a `popovertarget` button, which this is not
    if (element.contains(document.activeElement)) findButton()?.focus();
  });
  return element;
};

/**
 * Puts the button in the navigation and the popover in the page, returning the popover for
 * the form to go into, or null while the navigation is not there to hold the button. Safe to
 * call on every settling: what stands is left as it is, and a button X's redraw threw away is
 * put back.
 */
export const ensure = (messages: Messages): HTMLElement | null => {
  const nav = document.querySelector(SIDE_NAV);
  if (!nav) return null;

  if (!nav.querySelector(`[${BUTTON}]`)) {
    const template = nav.querySelector(TEMPLATE) ?? nav.querySelector('a');
    if (!template) return null;
    template.after(buildButton(template, messages));
  }

  if (!popover?.isConnected) {
    popover = buildPopover(messages);
    document.body.append(popover);
  }
  watch();

  // A search run from inside — the form's own link, a saved or past search — moves to its
  // results, which the popover would otherwise stand over
  if (openedAt !== null && openedAt !== location.href) close();
  return popover;
};

/**
 * Takes the button and the popover away. What is inside the popover goes with it, so the
 * caller moves or discards the form first. Asked on every settling while the rail is on
 * screen, so it returns at once when there is nothing: the two are put up together.
 */
export const remove = (): void => {
  if (!popover) return;
  close();
  findButton()?.remove();
  popover?.remove();
  popover = null;
  openedAt = null;
};
