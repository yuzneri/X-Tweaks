/** Some X Pro columns use the window viewport even though they scroll independently.
 * Reuse X's own element-viewport implementation, obtained from a working column. Never
 * modify the shared window viewport: several columns can be using that same object.
 */
type Viewport = {
  getViewport: () => unknown;
  addScrollListener: (listener: () => void) => () => void;
  addProgrammaticScrollListener: (listener: (delta: number) => void) => () => void;
};
type Owner = {
  _viewport: Viewport;
  _handleScroll: () => void;
  _handleProgrammaticScroll: (delta: number) => void;
  _removeScrollHandler: () => void;
  _removeProgrammaticScrollHandler: () => void;
};
export type ViewportTarget = { owner: unknown; element: { isConnected: boolean } };
export type ViewportFactory = (element: ViewportTarget['element']) => Viewport;

export const viewportOf = (value: unknown): Viewport | null => {
  if (!value || typeof value !== 'object') return null;
  const owner = value as Partial<Owner>, v = owner._viewport;
  return v && typeof v.getViewport === 'function' &&
    typeof v.addScrollListener === 'function' && typeof v.addProgrammaticScrollListener === 'function' &&
    typeof owner._handleScroll === 'function' && typeof owner._handleProgrammaticScroll === 'function' &&
    typeof owner._removeScrollHandler === 'function' && typeof owner._removeProgrammaticScrollHandler === 'function'
    ? v : null;
};

const listen = (owner: Owner, viewport: Viewport): void => {
  owner._removeScrollHandler = viewport.addScrollListener(owner._handleScroll);
  owner._removeProgrammaticScrollHandler = viewport.addProgrammaticScrollListener(owner._handleProgrammaticScroll);
};

export class ProViewportGuard {
  private patches = new Map<Owner, {
    original: Viewport; replacement: Viewport; element: ViewportTarget['element'];
    removeScroll: () => void; removeProgrammatic: () => void;
  }>();

  sync(targets: ViewportTarget[], create: ViewportFactory | null): void {
    const live = new Map(targets.map(t => [t.owner, t.element]));
    for (const [owner, patch] of this.patches) {
      if (live.get(owner) === patch.element && owner._viewport === patch.replacement) continue;
      patch.removeScroll();
      patch.removeProgrammatic();
      if (owner._viewport === patch.replacement) {
        owner._viewport = patch.original;
        // An unmounted scroller must not acquire new listeners on the shared window.
        if (patch.element.isConnected) listen(owner, patch.original);
      }
      this.patches.delete(owner);
    }
    if (!create) return;
    for (const { owner: candidate, element } of targets) {
      const original = viewportOf(candidate);
      // Only repair the observed window-viewport case, never a different element viewport.
      if (!original || original.getViewport() !== null) continue;
      const owner = candidate as Owner;
      if (this.patches.has(owner)) continue;
      const replacement = create(element);
      if (replacement.getViewport() !== element) continue;
      owner._removeScrollHandler();
      owner._removeProgrammaticScrollHandler();
      owner._viewport = replacement;
      listen(owner, replacement);
      this.patches.set(owner, {
        original, replacement, element,
        removeScroll: owner._removeScrollHandler,
        removeProgrammatic: owner._removeProgrammaticScrollHandler,
      });
    }
  }

  stop(): void { this.sync([], null); }
}
