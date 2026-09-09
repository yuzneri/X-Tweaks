/**
 * Injects the styles the search form uses. Kept apart from the module that owns the form,
 * the way `compose/styles.ts` is: the stylesheet is brought in through the bundler, which
 * the test runner cannot follow.
 */
import css from './styles.css';

const STYLE_ID = 'xpro-tweaks-search-style';

export const injectStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.append(style);
};
