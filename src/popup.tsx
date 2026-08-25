/**
 * The popup on the toolbar icon. On a tab showing pro.x.com it opens the panel there,
 * and otherwise it opens the options page.
 */
import { OPEN_PANEL } from './panel/message.ts';
import { localeOf, messagesFor } from './i18n/index.ts';
import { load, loadPaused, savePaused } from './settings/storage.ts';

declare const chrome: typeof browser | undefined;
const api: typeof browser = typeof browser !== 'undefined' ? browser : chrome!;

const root = document.getElementById('app');
if (!root) throw new Error('ポップアップのマウント先が見つかりません');

const button = (label: string, onClick: () => void): HTMLButtonElement => {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.addEventListener('click', onClick);
  return el;
};

const main = async (): Promise<void> => {
  const [{ settings }, startPaused] = await Promise.all([load(), loadPaused()]);
  const messages = messagesFor(localeOf(settings.language));
  document.documentElement.lang = localeOf(settings.language);
  document.title = messages.title;

  const title = document.createElement('p');
  title.className = 'popup-title';
  title.textContent = messages.title;

  // Pausing the whole extension. The current state is stated in words before the toggle.
  // A button alone does not say what the state was before pressing
  let paused = startPaused;
  const state = document.createElement('p');
  state.className = 'popup-state';
  state.setAttribute('role', 'status');
  const toggle = button('', () => void flip());

  /** The notice that saving failed. It is re-raised on every press, so it clears on success */
  const failure = document.createElement('p');
  failure.className = 'popup-failed';
  failure.setAttribute('role', 'alert');
  failure.textContent = messages.popup.saveFailed;
  failure.hidden = true;

  const show = () => {
    state.textContent = paused ? messages.popup.paused : messages.popup.running;
    state.classList.toggle('paused', paused);
    toggle.textContent = paused ? messages.popup.resume : messages.popup.pause;
  };

  /**
   * Shows the pressed state first, then saves, rolling back on failure.
   * The action is a single press, so rolling back loses nothing
   * (the settings screen does not roll back, so as not to throw away text being typed).
   */
  const flip = async () => {
    paused = !paused;
    show();
    // Disabled until the save finishes. Pressed repeatedly, the rollback below would
    // invert the value the next press set, leaving the display and what was stored in disagreement
    toggle.disabled = true;
    try {
      await savePaused(paused);
      failure.hidden = true;
    } catch {
      paused = !paused;
      show();
      failure.hidden = false;
    } finally {
      toggle.disabled = false;
    }
  };

  show();

  const openOptions = () => {
    void api.runtime.openOptionsPage();
    window.close();
  };

  /**
   * Opens the panel in the tab being viewed. Settings propagate through storage, but
   * "open it in this tab" is a tab-specific instruction and is the one thing sent directly.
   * With no receiver the send fails, and it falls back to the options page.
   */
  const openPanel = async () => {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) {
      openOptions();
      return;
    }
    try {
      await api.tabs.sendMessage(tab.id, { type: OPEN_PANEL });
      window.close();
    } catch {
      openOptions();
    }
  };

  root.append(
    title,
    state,
    toggle,
    failure,
    button(messages.popup.openPanel, () => void openPanel()),
    button(messages.popup.openOptions, openOptions)
  );
};

void main();
