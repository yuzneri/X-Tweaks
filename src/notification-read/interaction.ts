import { HoverReadTracker } from './hover.ts';
import { COLUMN_SELECTOR } from '../columns/registry.ts';

const COLUMN_ID_ATTR = 'data-xpro-column-id';
const NOTIFICATION_SELECTOR = 'article[data-testid="notification"]';
const SCROLL_WINDOW_MS = 500;

export type ReadIntent = { columnId: string };

type PendingScroll<TColumn> = {
  column: TColumn;
  top: number;
  expiresAt: number;
};

/** Correlates real movement with a preceding user input without depending on DOM events. */
export class UserScrollTracker<TScroll extends object, TColumn> {
  private pending = new WeakMap<TScroll, PendingScroll<TColumn>>();

  remember(scroll: TScroll, column: TColumn, top: number, now: number): void {
    this.pending.set(scroll, { column, top, expiresAt: now + SCROLL_WINDOW_MS });
  }

  moved(scroll: TScroll, top: number, now: number): TColumn | null {
    const pending = this.pending.get(scroll);
    if (!pending) return null;
    if (now > pending.expiresAt) {
      this.pending.delete(scroll);
      return null;
    }
    if (top === pending.top) return null;
    this.pending.delete(scroll);
    return pending.column;
  }

  clear(): void {
    this.pending = new WeakMap();
  }
}

export const isScrollKey = (key: string): boolean =>
  ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'].includes(key);

const asElement = (target: EventTarget | null): Element | null =>
  target instanceof Element ? target : null;

const contextOf = (column: Element): ReadIntent | null => {
  const columnId = column.getAttribute(COLUMN_ID_ATTR);
  return columnId ? { columnId } : null;
};

const notificationColumnOf = (target: EventTarget | null): Element | null => {
  const column = asElement(target)?.closest(COLUMN_SELECTOR);
  return column?.querySelector(NOTIFICATION_SELECTOR) ? column : null;
};

const isVerticallyScrollable = (el: Element): el is HTMLElement => {
  if (!(el instanceof HTMLElement) || el.scrollHeight <= el.clientHeight) return false;
  const style = getComputedStyle(el);
  return /^(auto|scroll|overlay)$/.test(style.overflowY || style.overflow);
};

/** Finds the nearest vertical scroller without crossing into the shared multi-column deck. */
const scrollElementOf = (target: EventTarget | null, column: Element): HTMLElement | null => {
  let el = asElement(target);
  for (let depth = 0; el && depth < 16; depth++) {
    if (isVerticallyScrollable(el)) return el;
    const parent = el.parentElement;
    if (!parent) return null;
    if (el === column && parent.querySelectorAll(COLUMN_SELECTOR).length > 1) return null;
    el = parent;
  }
  return null;
};

const isOnVerticalScrollbar = (event: PointerEvent, scroll: HTMLElement): boolean => {
  if (event.target !== scroll) return false;
  const gutter = scroll.offsetWidth - scroll.clientWidth;
  if (gutter <= 0) return false;
  const rect = scroll.getBoundingClientRect();
  return getComputedStyle(scroll).direction === 'rtl'
    ? event.clientX <= rect.left + gutter
    : event.clientX >= rect.right - gutter;
};

export type InteractionOptions = {
  paused: () => boolean;
  onIntent: (intent: ReadIntent) => void;
  now?: () => number;
};

export type InteractionWatch = { stop: () => void; reset: () => void };

/** Installs the one set of delegated listeners used by all current and future columns. */
export const watchNotificationReadInteractions = ({
  paused,
  onIntent,
  now = () => performance.now(),
}: InteractionOptions): InteractionWatch => {
  const tracker = new UserScrollTracker<HTMLElement, Element>();
  const hover = new HoverReadTracker<Element>(
    (column, columnId) => !paused() && document.visibilityState === 'visible' &&
      document.hasFocus() && column.isConnected && column.matches(':hover') &&
      contextOf(column)?.columnId === columnId && !!column.querySelector(NOTIFICATION_SELECTOR),
    columnId => onIntent({ columnId }),
  );
  const reset = (): void => {
    tracker.clear();
    hover.clear();
  };
  const onPointerOver = (event: PointerEvent): void => {
    if (!event.isTrusted || event.pointerType !== 'mouse') return;
    if (paused() || document.visibilityState !== 'visible' || !document.hasFocus()) {
      hover.clear();
      return;
    }
    const column = notificationColumnOf(event.target);
    const context = column && contextOf(column);
    if (column && context) hover.enter(column, context.columnId);
    else hover.clear();
  };
  const onPointerOut = (event: PointerEvent): void => {
    if (!event.isTrusted || event.pointerType !== 'mouse') return;
    // Child-to-child movement stays one visit; leaving the column cancels it.
    const from = asElement(event.target)?.closest(COLUMN_SELECTOR);
    const to = asElement(event.relatedTarget)?.closest(COLUMN_SELECTOR);
    if (from !== to || event.relatedTarget === null) hover.clear();
  };
  const onVisibility = (): void => {
    if (document.visibilityState !== 'visible') reset();
  };

  const remember = (target: EventTarget | null): void => {
    const column = notificationColumnOf(target);
    if (!column || !contextOf(column)) return;
    const scroll = scrollElementOf(target, column);
    if (!scroll) return;
    tracker.remember(scroll, column, scroll.scrollTop, now());
  };

  const onWheel = (event: WheelEvent): void => {
    if (!paused() && event.isTrusted && event.deltaY !== 0) remember(event.target);
  };
  const onTouchMove = (event: TouchEvent): void => {
    if (!paused() && event.isTrusted) remember(event.target);
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (paused() || !event.isTrusted) return;
    const column = notificationColumnOf(event.target);
    if (!column || !contextOf(column)) return;
    const scroll = scrollElementOf(event.target, column);
    if (scroll && isOnVerticalScrollbar(event, scroll)) {
      tracker.remember(scroll, column, scroll.scrollTop, now());
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (paused() || !event.isTrusted || !isScrollKey(event.key)) return;
    remember(document.activeElement);
  };
  const onScroll = (event: Event): void => {
    if (paused()) {
      tracker.clear();
      return;
    }
    const scroll = asElement(event.target);
    if (!(scroll instanceof HTMLElement)) return;
    const column = tracker.moved(scroll, scroll.scrollTop, now());
    if (!column) return;
    const context = contextOf(column);
    if (context) onIntent(context);
  };
  const onClick = (event: MouseEvent): void => {
    if (paused() || !event.isTrusted) return;
    const notification = asElement(event.target)?.closest(NOTIFICATION_SELECTOR);
    const column = notification?.closest(COLUMN_SELECTOR);
    if (!column) return;
    const context = contextOf(column);
    if (context) onIntent(context);
  };

  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointermove', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', reset);
  document.addEventListener('click', onClick, true);
  document.addEventListener('wheel', onWheel, true);
  document.addEventListener('touchmove', onTouchMove, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('scroll', onScroll, true);
  return {
    reset,
    stop: () => {
      reset();
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointermove', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', reset);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('scroll', onScroll, true);
    },
  };
};
