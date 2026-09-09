/**
 * Injects the styles the switches inside the compose form use. Kept apart from
 * `switches.ts` as `filter/styles.ts` is from the filter: the stylesheet comes in through
 * the bundler, which the test runner cannot follow, so the rules' own module stays clear.
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
