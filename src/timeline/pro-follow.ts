/** X Pro's scroller pins to the newest item near the top (measured in Firefox, 2026-09-29).
 * Follow only at the very top without hover; otherwise anchor the visible post and allow
 * the native scroll correction, repairing a mistaken window viewport when necessary.
 * Explicit scrollToNewest/refresh actions and fetching are left to X.
 */
import { visiblePostAnchor } from './pro-anchor.ts';
import { ProViewportGuard, viewportOf, type ViewportFactory, type ViewportTarget } from './pro-viewport.ts';

export const PRO_FOLLOW_ENABLED = 'xpro-tweaks:set-pro-follow-suppressed';
/** Measured from the actual column scroll origin, including its header. */
export const FOLLOW_TOP_PX = 30;

type Scroller = {
  _shouldPinToNewest: () => boolean;
  _getAnchor: (...args: never[]) => unknown;
  isAtNewest: () => boolean;
  scrollToNewest: (...args: never[]) => unknown;
  props: { pinToNewestWhenAtNewest: boolean };
};

export const isScroller = (value: unknown): value is Scroller => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Scroller>;
  return (
    typeof v._shouldPinToNewest === 'function' &&
    typeof v._getAnchor === 'function' &&
    typeof v.isAtNewest === 'function' &&
    typeof v.scrollToNewest === 'function' &&
    typeof v.props?.pinToNewestWhenAtNewest === 'boolean'
  );
};

/** Both choices must agree: X also skips normalization's scroll correction at newest.
 * Replacing only _shouldPinToNewest selects an anchor but lets that correction be skipped.
 * Own-method replacements only; stopping restores the exact descriptors.
 */
export class ProFollowGuard {
  private patched = new Map<Scroller, Array<{
    key: '_shouldPinToNewest' | 'isAtNewest' | '_getAnchor';
    descriptor: PropertyDescriptor;
    replacement: (...args: unknown[]) => unknown;
  }>>();

  private scrollTopOf: (scroller: Scroller) => number | null;
  private hovered: (scroller: Scroller) => boolean;
  private anchorOf: (scroller: Scroller, rect: unknown) => unknown;

  constructor(
    scrollTopOf: (scroller: Scroller) => number | null = () => null,
    hovered: (scroller: Scroller) => boolean = () => false,
    anchorOf: (scroller: Scroller, rect: unknown) => unknown = () => null,
  ) {
    this.scrollTopOf = scrollTopOf;
    this.hovered = hovered;
    this.anchorOf = anchorOf;
  }

  sync(scrollers: Iterable<unknown>): void {
    const live = new Set<Scroller>();
    for (const candidate of scrollers) {
      if (!isScroller(candidate)) continue;
      live.add(candidate);
      if (this.patched.has(candidate)) continue;
      const keys = ['_shouldPinToNewest', 'isAtNewest', '_getAnchor'] as const;
      const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(candidate, key));
      // Patch all or none. Unknown/accessor/prototype implementations are left alone.
      if (descriptors.some(d => !d || !d.configurable || typeof d.value !== 'function')) continue;
      const allowed = () => {
        if (this.hovered(candidate)) return false;
        const top = this.scrollTopOf(candidate);
        return top !== null && Number.isFinite(top) && top >= 0 && top <= FOLLOW_TOP_PX;
      };
      const patches = keys.map((key, index) => {
        const descriptor = descriptors[index]!;
        const original = descriptor.value as (...args: unknown[]) => unknown;
        const replacement = (...args: unknown[]) => {
          if (key === '_getAnchor') {
            if (!allowed()) {
              const anchor = this.anchorOf(candidate, args[0]);
              if (anchor != null) return anchor;
            }
            return original.apply(candidate, args);
          }
          return allowed() && original.apply(candidate, args);
        };
        Object.defineProperty(candidate, key, { ...descriptor, value: replacement });
        return { key, descriptor, replacement };
      });
      this.patched.set(candidate, patches);
    }
    for (const [scroller, patches] of this.patched) {
      if (live.has(scroller)) continue;
      for (const patch of patches) {
        // Another owner may have replaced a method since; never overwrite that change.
        if (scroller[patch.key] === patch.replacement) {
          Object.defineProperty(scroller, patch.key, patch.descriptor);
        }
      }
      this.patched.delete(scroller);
    }
  }

  stop(): void {
    this.sync([]);
  }
}

type Fiber = { stateNode?: unknown; memoizedProps?: { timelineId?: unknown }; return?: Fiber | null };

/** Require both a home timeline and its selected For you tab. Unknown layouts stay native.
 * The nearest timeline wins: a nested search must not inherit an outer home identity.
 */
export const isForYouTimeline = (root: Fiber | null, selectedTab: string | null): boolean => {
  if (!selectedTab || !/^(?:For you|おすすめ)$/i.test(selectedTab.trim())) return false;
  for (let f = root, depth = 0; f && depth < 80; f = f.return ?? null, depth++) {
    const id = f.memoizedProps?.timelineId;
    if (typeof id === 'string') return /^home(?:-|$)/.test(id) && !/^home-latest(?:-|$)/.test(id);
  }
  return false;
};

/** The cell is much closer to the scroller than the deeply nested tweet component. */
export const scrollerAbove = (root: Fiber | null): unknown => {
  for (let f = root, depth = 0; f && depth < 80; f = f.return ?? null, depth++) {
    if (isScroller(f.stateNode)) return f.stateNode;
  }
  return null;
};

export const installProFollowGuard = (): (() => void) => {
  const viewportGuard = new ProViewportGuard();
  const scrollElements = new WeakMap<Scroller, HTMLElement>();
  const hoverElements = new WeakMap<Scroller, Element>();
  const guard = new ProFollowGuard(
    scroller => scrollElements.get(scroller)?.scrollTop ?? null,
    // Read when X chooses its anchor, so moving the mouse needs no DOM mutation or timer.
    scroller => hoverElements.get(scroller)?.matches(':hover') ?? false,
    (scroller, rect) => visiblePostAnchor(scroller, scrollElements.get(scroller), rect),
  );
  let enabled = false;
  let frame: number | null = null;
  const scan = (): void => {
    frame = null;
    if (!enabled) return;
    const found: unknown[] = [];
    const targets: ViewportTarget[] = [];
    let createViewport: ViewportFactory | null = null;
    for (const column of document.querySelectorAll('[data-testid="multi-column-layout-column-content"]')) {
      const cell = column.querySelector('article[data-testid="tweet"]')?.closest('[data-testid="cellInnerDiv"]');
      if (!cell) continue;
      const key = Object.keys(cell).find(k => k.startsWith('__reactFiber$'));
      const fiber = key ? (cell as unknown as Record<string, Fiber>)[key] : null;
      const selectedTab = column.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? null;
      if (!isForYouTimeline(fiber ?? null, selectedTab)) continue;
      const scroller = scrollerAbove(fiber ?? null);
      if (!isScroller(scroller)) continue;
      hoverElements.set(scroller, column);
      // Include the column header when identifiable, without including adjacent columns.
      for (let el = column.parentElement, depth = 0; el && el !== document.body && depth < 8;
        el = el.parentElement, depth++) {
        if (el.querySelectorAll('[data-testid="multi-column-layout-column-content"]').length !== 1) break;
        if (el.querySelector('[data-testid="column-title-wrapper"]')) {
          hoverElements.set(scroller, el);
          break;
        }
      }
      scrollElements.delete(scroller);
      // X Pro's scroller is normally the column's parent. Resolve it from the cell so
      // header height and nested layout wrappers cannot widen the top threshold.
      for (let el = cell.parentElement; el && el !== document.body; el = el.parentElement) {
        if (el.querySelectorAll('[data-testid="multi-column-layout-column-content"]').length > 1) break;
        if (/^(auto|scroll|overlay)$/.test(getComputedStyle(el).overflowY)) {
          scrollElements.set(scroller, el);
          break;
        }
      }
      const element = scrollElements.get(scroller);
      if (element) {
        targets.push({ owner: scroller, element });
        const viewport = viewportOf(scroller);
        if (viewport?.getViewport() === element) {
          const View = viewport.constructor as new (element: unknown) => NonNullable<typeof viewport>;
          createViewport = element => new View(element);
        }
      }
      found.push(scroller);
    }
    guard.sync(found);
    viewportGuard.sync(targets, createViewport);
  };
  const observer = new MutationObserver(() => {
    if (frame === null) frame = requestAnimationFrame(scan);
  });
  const stop = (): void => {
    enabled = false;
    observer.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    guard.stop();
    viewportGuard.stop();
  };
  const onMessage = (event: MessageEvent<unknown>): void => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data as { type?: unknown; enabled?: unknown } | null;
    if (data?.type !== PRO_FOLLOW_ENABLED || typeof data.enabled !== 'boolean') return;
    if (enabled === data.enabled) return;
    enabled = data.enabled;
    if (enabled) {
      scan();
      observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    } else {
      stop();
    }
  };
  window.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('message', onMessage);
    stop();
  };
};
