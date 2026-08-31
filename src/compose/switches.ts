/**
 * Puts the two posting switches into the compose form itself, in the space under its
 * toolbar.
 *
 * They are a second way in to the settings the "Posting" tab already holds, not a second
 * copy of them: a change is written to storage the usual way, and the settings screen
 * hears about it through the same subscription as any other change.
 */
import type { Messages } from '../i18n/index.ts';
import type { ComposeSettings } from '../settings/schema.ts';
import { composeDrawer } from './keep.ts';

/** The mark on what was inserted, checked so nothing is inserted twice */
const MARK = 'data-xpro-compose-switches';

/**
 * The row of buttons for photos, GIFs and the rest. What is under it is empty, which is
 * where these switches go.
 * X Pro marks it, so neither the wording nor the position has to be relied on.
 */
const TOOLBAR = '[data-testid="toolBar"]';

/** Written on each box so the handler knows which setting was changed */
const KEY_ATTR = 'data-xpro-compose-key';

/**
 * What the two switches show. Kept apart from the DOM so that the pairing with the
 * settings screen can be checked without a browser.
 * Neither switch waits on the other: with the form left to close, the tags wait for the
 * next form opened by hand instead.
 */
export type SwitchState = { key: keyof ComposeSettings; label: string; checked: boolean };

export const switchStates = (compose: ComposeSettings, m: Messages): SwitchState[] => [
  { key: 'reopen', label: m.compose.reopen.label, checked: compose.reopen },
  { key: 'keepHashtags', label: m.compose.keepHashtags.label, checked: compose.keepHashtags },
];

/** The settings as they stand. Held here so the boxes can be brought back in line on every settling */
let current: ComposeSettings = { reopen: false, keepHashtags: false };
/** Where a change is handed to. Set by `start`, since saving is the content script's job */
let onChange: ((next: ComposeSettings) => void) | null = null;

/**
 * Receives changes through a capturing listener on document.
 * A listener on the box itself is not enough: X Pro stops some events further up, and the
 * inserted node is replaced whenever X redraws the drawer, which would take its listeners
 * with it.
 */
let listening = false;
const listen = (): void => {
  if (listening) return;
  listening = true;
  document.addEventListener(
    'change',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const key = target.getAttribute(KEY_ATTR);
      if (key !== 'reopen' && key !== 'keepHashtags') return;
      const next: ComposeSettings = { ...current, [key]: target.checked };
      current = next;
      onChange?.(next);
    },
    true
  );
};

/** Builds the two switches. Plain DOM, so nothing has to be mounted or torn down */
const build = (messages: Messages): HTMLElement => {
  const box = document.createElement('div');
  box.className = 'xpro-compose-switches';
  box.setAttribute(MARK, '');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', messages.tabs.compose);

  for (const state of switchStates(current, messages)) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute(KEY_ATTR, state.key);
    input.checked = state.checked;
    const text = document.createElement('span');
    text.textContent = state.label;
    label.append(input, text);
    box.append(label);
  }
  return box;
};

/** Brings the boxes already on screen back in line with the settings */
const sync = (box: Element, messages: Messages): void => {
  for (const state of switchStates(current, messages)) {
    const input = box.querySelector(`[${KEY_ATTR}="${state.key}"]`);
    if (!(input instanceof HTMLInputElement)) continue;
    if (input.checked !== state.checked) input.checked = state.checked;
  }
};

/**
 * Inserts the switches into the compose form now open, returning how many were added.
 * Safe to call on every settling of the DOM: a form that already has them is only brought
 * back in line, and a drawer that is a reply or a quote is left alone (`composeDrawer`).
 */
export const insertInto = (messages: Messages): number => {
  const drawer = composeDrawer();
  if (!drawer) return 0;

  const existing = drawer.querySelector(`[${MARK}]`);
  if (existing) {
    sync(existing, messages);
    return 0;
  }

  // Without the toolbar there is no telling where the space under the form is, so nothing
  // is inserted. The switches are still reachable from the settings screen
  const toolbar = drawer.querySelector(TOOLBAR);
  if (!toolbar) return 0;

  toolbar.after(build(messages));
  return 1;
};

/**
 * Takes the switches back out. Used while the extension is paused: left in place they
 * would show "off" and write values nobody could see take effect.
 */
export const remove = (): void =>
  document.querySelectorAll(`[${MARK}]`).forEach((box) => box.remove());

/** The settings changed elsewhere (the settings screen, another tab) */
export const updateSettings = (next: ComposeSettings): void => {
  current = next;
};

export const start = (initial: ComposeSettings, handler: (next: ComposeSettings) => void): void => {
  current = initial;
  onChange = handler;
  listen();
};
