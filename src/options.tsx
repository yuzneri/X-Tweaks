/** The settings page's entry point. The contents live in src/ui/; all this does is mount them */
import { render } from 'preact';
import { messagesFor, type Locale } from './i18n/index.ts';
import { SettingsApp } from './ui/SettingsApp.tsx';
import { setupColorPicker } from './ui/color-picker.ts';

const root = document.getElementById('app');
if (!root) throw new Error('設定画面のマウント先が見つかりません');

/**
 * Once the screen's language is decided, brings this surface into line with it.
 *
 * `SettingsApp` does not know where it is placed, so touching `document` and the picker
 * happens here. The picker lives outside Preact (it delegates events on `document`) and
 * cannot be handed down through a context.
 */
const applyLocale = (locale: Locale): void => {
  const messages = messagesFor(locale);
  // Used for screen readers and for line-breaking decisions, so it follows the screen's language
  document.documentElement.lang = locale;
  document.title = messages.title;
  setupColorPicker(messages);
};

// Import and export of settings are offered on this surface only
render(<SettingsApp onLocale={applyLocale} exportable />, root);
