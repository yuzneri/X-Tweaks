/**
 * The settings panel that opens inside pro.x.com. It adds a single `xpro-panel-host` and
 * removes it on close. No Shadow DOM: the contents go under the `xpro-ui` class and the
 * separation is done on the CSS side.
 */
import { render } from 'preact';
import type { Locale } from '../i18n/index.ts';
import { messagesFor } from '../i18n/index.ts';
import { SettingsApp } from '../ui/SettingsApp.tsx';
import type { Scope } from '../ui/ScopeList.tsx';
import { closeColorPicker, setupColorPicker } from '../ui/color-picker.ts';
import panelCss from '../ui/panel.css';
import frameCss from './frame.css';

const STYLE_ID = 'xpro-tweaks-panel-style';

const HOST_CLASS = 'xpro-panel-host';

let host: HTMLElement | null = null;

/**
 * Closes on Esc, listening only while the panel is open. While the color picker is open it
 * keeps its hands off: stopping the event here would keep it from the picker's own Esc and
 * the panel alone would vanish, stranding the picker on the page.
 */
const onKeyDown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') return;
  if (document.querySelector('.clr-picker.clr-open')) return;
  // Esc while a rule is being dragged means "stop reordering", not "close the panel"
  if (document.querySelector('.xpro-ui .rules li.dragging')) return;
  event.stopPropagation();
  close();
};

/** Puts the components' and the frame's CSS into a single `<style>`. Not added again on each open */
const injectStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${panelCss}\n${frameCss}`;
  document.head.append(style);
};

export const isOpen = (): boolean => host !== null;

export const close = (): void => {
  if (!host) return;
  // The picker is placed outside the panel and would be stranded on the page unless closed first
  closeColorPicker();
  document.removeEventListener('keydown', onKeyDown, true);
  // Let Preact clean up, then remove the element that was added
  render(null, host);
  host.remove();
  host = null;
};

/** Where to land right after opening. Omitted, it starts from the global settings */
export type Start = Scope;

/**
 * Opens the panel. If it is already open it is reopened with a different landing spot:
 * returning early would leave the display unchanged when opened from a different column.
 */
export const open = (start?: Start): void => {
  if (host) close();
  injectStyles();

  host = document.createElement('div');
  host.className = HOST_CLASS;
  // A press outside (on the dimmed area) closes it. Interactions inside the panel are not picked up
  host.addEventListener('click', (event) => {
    if (event.target === host) close();
  });

  const panel = document.createElement('div');
  panel.className = 'xpro-ui xpro-panel';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'xpro-panel-close';
  // Its look is drawn with lines by CSS. The accessible name goes in once the language is decided
  closeButton.addEventListener('click', close);

  const app = document.createElement('div');

  panel.append(closeButton, app);
  host.append(panel);
  document.body.append(host);

  /**
   * Once the screen's language is decided, brings this surface into line with it.
   * The `document` side (`documentElement.lang`, `title`) belongs to X Pro and is not touched.
   */
  const applyLocale = (locale: Locale): void => {
    const messages = messagesFor(locale);
    panel.lang = locale;
    closeButton.setAttribute('aria-label', messages.panel.close);
    setupColorPicker(messages);
  };

  render(<SettingsApp onLocale={applyLocale} start={start} />, app);
  // X Pro has an Esc listener of its own, so an event received here is stopped
  document.addEventListener('keydown', onKeyDown, true);
};

export const toggle = (start?: Start): void => (isOpen() ? close() : open(start));
