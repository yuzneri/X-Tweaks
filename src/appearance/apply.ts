/**
 * Applies the appearance settings to pro.x.com: sets the markers the CSS targets
 * and puts the built CSS into a single `<style>`. Only attributes are added, so
 * removing them restores the original.
 */
import { COLUMN_SELECTOR, scopeElementOf, scopeOfColumn } from '../columns/registry.ts';
import { CELL_SELECTOR } from '../filter/post.ts';
import { appearanceFor, type ColumnScope } from '../settings/resolve.ts';
import { timeFormatOf, type Settings } from '../settings/schema.ts';
import { timeTextFrom } from './time.ts';
import { limitFor, needsFrame, setsHeight, wrapsBox } from './frame.ts';
import type { Messages } from '../i18n/index.ts';
import {
  buildCss,
  columnKey,
  COLUMN_ATTR,
  HEADER_ATTR,
  OPENED_CLASS,
  OPENED_POST_MARK,
  MEDIA_FRAME_ATTR,
  TIME_ATTR,
  TODAY_ATTR,
  MEDIA_TARGETS,
  type ColumnAppearance,
} from './css.ts';

const STYLE_ID = 'xpro-tweaks-appearance-style';

/** The container of the column name, and the container of the timeline. Used to spot the header bar */
const TITLE_SELECTOR = '[data-testid="column-title-wrapper"]';
const CONTENT_SELECTOR = '[data-testid="multi-column-layout-column-content"]';

/** Candidates for the bar: containers that hold the column name but not the timeline */
const BAND_SELECTOR = `div:has(${TITLE_SELECTOR}):not(:has(${CONTENT_SELECTOR}))`;

/**
 * Finds the column-name bar, returning only the outermost of the candidates.
 * The candidates nest, and painting all of them makes a color with opacity
 * darker the further in you go.
 */
const headerOf = (scope: Element): Element | null => {
  const bands = [...scope.querySelectorAll(BAND_SELECTOR)];
  return bands.find((el) => !bands.some((other) => other !== el && other.contains(el))) ?? null;
};

/**
 * Whether the marker already set still points at the outermost bar.
 *
 * A check that saves calling `headerOf`. `BAND_SELECTOR` carries two `:has()`,
 * so it scans the column's whole subtree and gets heavier as posts pile up.
 * The two checks here each cost a single element's worth of matching.
 */
const stillHeader = (marked: Element, scope: Element): boolean => {
  if (!marked.matches(BAND_SELECTOR)) return false;
  for (let el = marked.parentElement; el && el !== scope; el = el.parentElement) {
    if (el.matches(BAND_SELECTOR)) return false;
  }
  return true;
};

/**
 * Marks each column and the column-name bar inside it. The marker goes on the
 * range covering one whole column; marking only the column body leaves the header
 * stranded in black.
 *
 * The marker's value is the target key, not the position in the order. Using the
 * position would carry the width and the colors straight over to the neighboring
 * column when the deck is switched.
 * The bar is not searched for again while its marker is still there: the cost of
 * searching turns into a delay in judging new posts.
 */
export const stampColumns = (): void => {
  /** The ranges enumerated this round. A marker outside them is a leftover from something that is no longer a column, so it comes off */
  const live: Element[] = [];

  document.querySelectorAll(COLUMN_SELECTOR).forEach((column) => {
    const value = columnKey(scopeOfColumn(column));
    const scope = scopeElementOf(column);
    if (scope.getAttribute(COLUMN_ATTR) !== value) scope.setAttribute(COLUMN_ATTR, value);
    live.push(scope);

    const marked = scope.querySelector(`[${HEADER_ATTR}]`);
    if (marked && stillHeader(marked, scope)) return;
    // When searching again, clear every marker in this range before setting one.
    // Two of them left in place make a color with opacity darker further in
    scope.querySelectorAll(`[${HEADER_ATTR}]`).forEach((el) => el.removeAttribute(HEADER_ATTR));
    headerOf(scope)?.setAttribute(HEADER_ATTR, '');
  });

  // Clear markers in ranges that are no longer columns. The loop above only touches
  // the ranges it enumerated, so a stranded marker would keep the bar painted
  document.querySelectorAll(`[${HEADER_ATTR}]`).forEach((el) => {
    if (!live.some((scope) => scope.contains(el))) el.removeAttribute(HEADER_ATTR);
  });
};

/** Picks up only the media inside columns. Markers are set per column, so there is no need to look outside */
const MEDIA_IN_COLUMN = MEDIA_TARGETS.map((target) => `[${COLUMN_ATTR}] ${target}`).join(', ');

/** Text in a post. Walking up past an ancestor containing this would shrink the body along with it */
const TEXT_SELECTOR = '[data-testid="tweetText"], [data-testid="User-Name"]';

/** A post's body text. What the line limit and "Show more" apply to */
const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';

/** The quote frame: the container that jumps to the original post when clicked, with the quoted content beneath it */
const QUOTE_SELECTOR = '[role="link"]';

/** X's own "Show more", shown when X itself truncates a long post */
const X_SHOW_MORE_SELECTOR = '[data-testid="tweet-text-show-more-link"]';

/** Limit on how far to walk up looking for the frame. Above this we are into the cell's own layout */
const MAX_ANCESTORS = 12;

/**
 * Finds the frame that sets the media's height.
 *
 * Among the ancestors that wrap the box at the same height, takes the outermost
 * one that sets the height, or, failing that, the outermost wrapping one.
 * The job here is walking up and measuring; deciding from the measurements is
 * `frame.ts`.
 */
const frameOf = (media: Element, limit: number): Element | null => {
  const box = media.getBoundingClientRect();
  if (!needsFrame(box.height, limit)) return null;

  let wrapper: Element | null = null;
  let decider: Element | null = null;

  let el = media.parentElement;
  for (let i = 0; el && i < MAX_ANCESTORS; el = el.parentElement, i++) {
    if (el.hasAttribute(COLUMN_ATTR) || el.matches(CELL_SELECTOR)) break;
    if (el.querySelector(TEXT_SELECTOR)) break;
    if (!wrapsBox(box.height, el.getBoundingClientRect().height)) break;
    wrapper = el;
    const style = getComputedStyle(el);
    if (setsHeight(style.aspectRatio, style.paddingBottom, box.height)) decider = el;
  }
  return decider ?? wrapper;
};

/** Takes the marking threshold from the appearance of the column this media sits in. null when none is needed */
const limitOf = (media: Element, columns: ColumnAppearance[]): number | null => {
  const key = media.closest(`[${COLUMN_ATTR}]`)?.getAttribute(COLUMN_ATTR);
  const appearance = columns.find((column) => column.key === key)?.appearance;
  return appearance ? limitFor(appearance) : null;
};

const clearMediaFrames = (): void =>
  document.querySelectorAll(`[${MEDIA_FRAME_ATTR}]`).forEach((el) => el.removeAttribute(MEDIA_FRAME_ATTR));

const clearTimes = (): void =>
  document.querySelectorAll(`[${TIME_ATTR}]`).forEach((el) => {
    el.removeAttribute(TIME_ATTR);
    el.removeAttribute(TODAY_ATTR);
  });

/**
 * Renders a post's time in absolute form and sets it as a marker on the `time`'s parent.
 * Only the marker is set; X's own text is untouched and CSS decides how it is shown.
 * A redraw by X takes the marker with it, but this runs on every settling, so it is set again.
 */
const restampTimes = (columns: ColumnAppearance[], messages: Messages): void => {
  clearTimes();
  const now = new Date();
  document.querySelectorAll(`[${COLUMN_ATTR}] time`).forEach((time) => {
    const key = time.closest(`[${COLUMN_ATTR}]`)?.getAttribute(COLUMN_ATTR);
    const appearance = columns.find((column) => column.key === key)?.appearance;
    const format = appearance ? timeFormatOf(appearance.timeFormat) : 'relative';
    if (format === 'relative') return;
    // Under "both" only the clock time is added. X already shows either a relative
    // time or a month and day, so the clock time is what is missing; adding the date
    // as well steals width from the ID and hides it in narrow columns
    const shown = timeTextFrom(time.getAttribute('datetime'), now, messages);
    // An unreadable time gets no marker. Marking it produces an empty `::after`,
    // which reads as the timestamp having vanished
    if (!shown) return;
    const parent = time.parentElement;
    if (!parent) return;
    parent.setAttribute(TIME_ATTR, shown.text);
    if (shown.today) parent.setAttribute(TODAY_ATTR, '');
  });
};

/**
 * Sets the media frame markers again. They are redone because a stale marker left
 * over from a tighter limit would keep that frame shrunk.
 */
const restampMediaFrames = (columns: ColumnAppearance[]): void => {
  clearMediaFrames();
  document.querySelectorAll(MEDIA_IN_COLUMN).forEach((media) => {
    const limit = limitOf(media, columns);
    if (limit === null) return;
    frameOf(media, limit)?.setAttribute(MEDIA_FRAME_ATTR, '');
  });
};

/** The height of one line. Estimated from the font size when `line-height` is `normal` */
const lineHeightOf = (text: Element): number => {
  const style = getComputedStyle(text);
  const lineHeight = parseFloat(style.lineHeight);
  return Number.isFinite(lineHeight) ? lineHeight : parseFloat(style.fontSize) * 1.2;
};

/** The class put on the "Show more" button. Its look lives in filter/styles.css */
const MORE_CLASS = 'xpro-more';

/**
 * Puts a "Show more" under body text cut off by the line limit.
 * Whether it is cut off can only be measured (CSS alone cannot show the button on
 * overflowing posts only). Clicking adds a class to that cell, lifting the CSS
 * limit for that cell alone.
 */
const addShowMore = (columns: ColumnAppearance[], messages: Messages): void => {
  document.querySelectorAll(`[${COLUMN_ATTR}] ${TWEET_TEXT_SELECTOR}`).forEach((text) => {
    // Body text inside a quote, and columns with a post opened, are outside the limit
    // (matching the targets in css.ts)
    if (text.closest(QUOTE_SELECTOR)) return;
    if (text.closest(`[${COLUMN_ATTR}]`)?.querySelector(OPENED_POST_MARK)) return;
    const cell = text.closest(CELL_SELECTOR);
    if (!cell || cell.classList.contains(OPENED_CLASS)) return;
    // Nothing is added to a cell that has X's own "Show more". Two side by side would
    // mean pressing both to get the full text. X sometimes brings one out later, so in
    // that case the added button is withdrawn
    if (cell.querySelector(X_SHOW_MORE_SELECTOR)) {
      if (text.nextElementSibling?.classList.contains(MORE_CLASS)) text.nextElementSibling.remove();
      return;
    }

    const key = cell.closest(`[${COLUMN_ATTR}]`)?.getAttribute(COLUMN_ATTR);
    const maxLines = columns.find((column) => column.key === key)?.appearance.maxLines ?? null;
    /*
     * Being cut off is not enough; the text must also have reached the limit.
     * Where X itself truncates the body, the text is "overflowing" as well, and a
     * 5-line limit would collapse it at 2. This also guards against the height
     * wobbling mid-render.
     */
    const lineHeight = lineHeightOf(text);
    const reachesLimit = maxLines !== null && text.clientHeight >= (maxLines - 0.5) * lineHeight;
    const clipped =
      reachesLimit && text.clientHeight > 0 && text.scrollHeight > text.clientHeight + 2;

    const exists = text.nextElementSibling?.classList.contains(MORE_CLASS) === true;
    if (!clipped) {
      if (exists) text.nextElementSibling!.remove();
      return;
    }
    if (exists) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = MORE_CLASS;
    button.textContent = messages.showMore;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      cell.classList.add(OPENED_CLASS);
      button.remove();
    });
    text.after(button);
  });
};

/**
 * When X's own "Show more" is pressed, lift our limit for that cell too.
 * X's truncation and ours overlap, so lifting only one still leaves the text short.
 * A single capturing listener on `document` is enough (it arrives even if X stops
 * the event further in).
 */
let listening = false;
const listenToXShowMore = (): void => {
  if (listening) return;
  listening = true;
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const cell = target.closest(X_SHOW_MORE_SELECTOR)?.closest(CELL_SELECTOR);
      cell?.classList.add(OPENED_CLASS);
    },
    true
  );
};

/** The per-column appearances applied most recently. Used to re-mark on every settling */
let lastColumns: ColumnAppearance[] = [];
let lastMessages: Messages | null = null;

/**
 * Sets the media frame markers again (called on every settling of the DOM).
 * It measures sizes, so it only measures when some tier sets a height limit.
 * Our own rules are switched off while measuring (with the limit still in effect,
 * only the box shrinks and its height no longer matches the frame).
 */
export const stampMediaFrames = (): void => {
  // The time markers are set again on the same occasion. When every tier says
  // "as X shows it", they are stripped so that no marker of ours is left in X's DOM
  // even though no rule targets them
  if (
    lastMessages &&
    lastColumns.some((column) => timeFormatOf(column.appearance.timeFormat) !== 'relative')
  ) {
    restampTimes(lastColumns, lastMessages);
  } else {
    clearTimes();
  }
  // Whether even one column needs markers. How the limit is derived lives in `limitFor` alone
  const needsFrames = lastColumns.some((column) => limitFor(column.appearance) !== null);
  if (needsFrames) {
    const style = styleElement();
    style.disabled = true;
    restampMediaFrames(lastColumns);
    style.disabled = false;
  } else {
    // Once every tier drops the limit, strip the markers set earlier too.
    // Turning the extension off replaces the settings with empty ones, which arrives here
    clearMediaFrames();
  }
  if (lastMessages && lastColumns.some((column) => column.appearance.maxLines !== null)) {
    listenToXShowMore();
    addShowMore(lastColumns, lastMessages);
  } else {
    // Once every tier drops the limit, remove the buttons added earlier too
    document.querySelectorAll(`.${MORE_CLASS}`).forEach((button) => button.remove());
  }
};

const styleElement = (): HTMLStyleElement => {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.append(style);
  return style;
};

/**
 * Applies the appearance again for the current arrangement of columns. Called when
 * the settings change and when columns come and go.
 * Identical content is not rewritten (rewriting makes the browser rebuild the style).
 */
export const applyAppearance = (
  settings: Settings,
  scopes: ColumnScope[],
  messages: Messages
): void => {
  stampColumns();

  // Columns sharing a key share their rules, so they are folded into one.
  // Without folding, columns of the same account standing side by side would emit
  // the same rules over and over
  const columns: ColumnAppearance[] = [];
  const seen = new Set<string>();
  for (const scope of scopes) {
    const key = columnKey(scope);
    if (seen.has(key)) continue;
    seen.add(key);
    columns.push({ key, appearance: appearanceFor(settings, scope) });
  }
  const css = buildCss(columns, messages.appearance.timeParens);

  const style = styleElement();
  if (style.textContent !== css) style.textContent = css;

  lastColumns = columns;
  lastMessages = messages;
  stampMediaFrames();
};
