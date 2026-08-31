/**
 * Injects the styles the switches inside the compose form use.
 *
 * Kept apart from `switches.ts` the way `filter/styles.ts` is kept apart from the filter:
 * the stylesheet is brought in through the bundler, which the test runner cannot follow,
 * so the module that owns the rules stays free of it.
 */
import css from './styles.css';

const STYLE_ID = 'xpro-tweaks-compose-style';

export const injectStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.append(style);
};
