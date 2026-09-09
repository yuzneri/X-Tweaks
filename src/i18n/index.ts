/**
 * Resolving the display language. The platform's own facility (`_locales` and `browser.i18n`) is
 * tied to the browser's UI language and gives the user no choice, so it is not used.
 */
import { en, type Messages } from './en.ts';
import { ja } from './ja.ts';

export type { Messages };

/** The languages messages are actually shown in */
export const LOCALES = ['ja', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** The value stored in the settings. `auto` follows the browser */
export const LANGUAGES = ['auto', ...LOCALES] as const;
export type Language = (typeof LANGUAGES)[number];

export const isLanguage = (v: unknown): v is Language =>
  (LANGUAGES as readonly unknown[]).includes(v);

const MESSAGES: Record<Locale, Messages> = { ja, en };

export const messagesFor = (locale: Locale): Messages => MESSAGES[locale];

/**
 * Decides the language. On automatic, Japanese when the browser's is Japanese and English
 * otherwise; `navigator.language` has shapes like `ja` and `ja-JP`, so it is matched by prefix.
 */
export const resolveLocale = (language: Language, browserLanguage: string): Locale => {
  if (language !== 'auto') return language;
  return browserLanguage.toLowerCase().startsWith('ja') ? 'ja' : 'en';
};

/** Resolves against the browser's language. The entry point called from the screens */
export const localeOf = (language: Language): Locale =>
  resolveLocale(language, navigator.language);
