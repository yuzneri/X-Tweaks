/** Injects the styles the filter's display uses. The appearance styles go into a separate `<style>` */
import css from './styles.css';

const STYLE_ID = 'xpro-tweaks-filter-style';

export const injectStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.append(style);
};
