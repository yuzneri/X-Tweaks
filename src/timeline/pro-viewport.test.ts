import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProViewportGuard, viewportOf } from './pro-viewport.ts';

class Viewport {
  element: unknown;
  scroll = new Set<() => void>();
  programmatic = new Set<(delta: number) => void>();
  constructor(element: unknown) { this.element = element; }
  getViewport() { return this.element; }
  addScrollListener(fn: () => void) { this.scroll.add(fn); return () => { this.scroll.delete(fn); }; }
  addProgrammaticScrollListener(fn: (delta: number) => void) {
    this.programmatic.add(fn);
    return () => { this.programmatic.delete(fn); };
  }
}
const makeOwner = (viewport: Viewport) => {
  const scroll = () => {}, programmatic = () => {};
  return {
    _viewport: viewport,
    _handleScroll: scroll,
    _handleProgrammaticScroll: programmatic,
    _removeScrollHandler: viewport.addScrollListener(scroll),
    _removeProgrammaticScrollHandler: viewport.addProgrammaticScrollListener(programmatic),
  };
};

test('共有ウィンドウを変えずに対象カラムだけ直し、停止時は購読も復元する', () => {
  const shared = new Viewport(null), a = makeOwner(shared), b = makeOwner(shared);
  const element = { isConnected: true }, guard = new ProViewportGuard();
  const create = (el: unknown) => new Viewport(el);
  guard.sync([{ owner: a, element }], create);
  const replacement = a._viewport;
  assert.equal(replacement.getViewport(), element);
  assert.equal(b._viewport, shared);
  assert.equal(shared.scroll.size, 1);
  assert.equal(shared.programmatic.size, 1);
  assert.equal(replacement.scroll.size, 1);
  assert.equal(replacement.programmatic.size, 1);
  guard.sync([{ owner: a, element }], create);
  assert.equal(a._viewport, replacement);
  guard.stop();
  assert.equal(a._viewport, shared);
  assert.equal(shared.scroll.size, 2);
  assert.equal(shared.programmatic.size, 2);
  assert.equal(replacement.scroll.size, 0);
  assert.equal(replacement.programmatic.size, 0);
});

test('削除されたカラムにはウィンドウの購読を付け直さない', () => {
  const original = new Viewport(null), owner = makeOwner(original);
  const element = { isConnected: true }, guard = new ProViewportGuard();
  guard.sync([{ owner, element }], el => new Viewport(el));
  const replacement = owner._viewport;
  element.isConnected = false;
  guard.sync([], null);
  assert.equal(replacement.scroll.size, 0);
  assert.equal(original.scroll.size, 0);
  assert.equal(original.programmatic.size, 0);
});

test('Xが補正先を変更した場合には古い補正先で上書きしない', () => {
  const owner = makeOwner(new Viewport(null)), element = { isConnected: true };
  const guard = new ProViewportGuard();
  guard.sync([{ owner, element }], el => new Viewport(el));
  const replacement = owner._viewport;
  const changed = new Viewport(element);
  owner._viewport = changed;
  guard.stop();
  assert.equal(owner._viewport, changed);
  assert.equal(replacement.scroll.size, 0);
});

test('正しい要素や未知の構造を触らず、利用できる実装が無ければ何もしない', () => {
  const element = { isConnected: true }, viewport = new Viewport(element);
  const owner = makeOwner(viewport), missing = makeOwner(new Viewport(null));
  const guard = new ProViewportGuard();
  guard.sync([{ owner, element }, { owner: {}, element }, { owner: missing, element }], null);
  assert.equal(owner._viewport, viewport);
  assert.equal(missing._viewport.getViewport(), null);
  guard.sync([{ owner, element }], () => { throw new Error('must not construct'); });
  assert.equal(viewportOf({}), null);
  guard.stop();
  assert.equal(viewport.scroll.size, 1);
});
