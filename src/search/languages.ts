/**
 * The language codes X's search accepts, as X publishes them.
 *
 * Taken from X's own documented list rather than from a general list of languages: what
 * matters here is what X reads, and `lang:` for a code X does not know returns nothing at
 * all rather than an error a reader could act on.
 *
 * Two of them are not the codes most lists would give. **Hebrew is `iw` and Indonesian is
 * `in`** — the superseded ISO 639-1 codes — because that is what X's table says. Written
 * as X writes them, not as they "should" be.
 *
 * The names are the languages' own, so a reader picking one recognizes it without knowing
 * the language of the surrounding screen. That is why this list is not in `i18n`: it says
 * the same thing in every locale.
 */
export const LANGUAGE_CODES: { code: string; name: string }[] = [
  { code: 'am', name: 'አማርኛ' },
  { code: 'ar', name: 'العربية' },
  { code: 'hy', name: 'Հայերեն' },
  { code: 'eu', name: 'Euskara' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'bg', name: 'Български' },
  { code: 'ca', name: 'Català' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'cs', name: 'Čeština' },
  { code: 'da', name: 'Dansk' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'en', name: 'English' },
  { code: 'et', name: 'Eesti' },
  { code: 'fi', name: 'Suomi' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ka', name: 'ქართული' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'gu', name: 'ગુજરાતી' },
  // Hebrew. X's table says `iw`, the superseded code, and X is what reads the query
  { code: 'iw', name: 'עברית' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'hu', name: 'Magyar' },
  // Indonesian. `in` rather than `id`, for the same reason as Hebrew above
  { code: 'in', name: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ko', name: '한국어' },
  { code: 'lv', name: 'Latviešu' },
  { code: 'lt', name: 'Lietuvių' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'mr', name: 'मराठी' },
  { code: 'no', name: 'Norsk' },
  { code: 'fa', name: 'فارسی' },
  { code: 'pl', name: 'Polski' },
  { code: 'pt', name: 'Português' },
  { code: 'ro', name: 'Română' },
  { code: 'ru', name: 'Русский' },
  { code: 'sr', name: 'Српски' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'sl', name: 'Slovenščina' },
  { code: 'es', name: 'Español' },
  { code: 'sv', name: 'Svenska' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'th', name: 'ไทย' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'uk', name: 'Українська' },
  { code: 'ur', name: 'اردو' },
  { code: 'vi', name: 'Tiếng Việt' },
];
