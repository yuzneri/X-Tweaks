import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProFollowGuard, isScroller, scrollerAbove } from './pro-follow.ts';

const scroller = () => ({
  props: { pinToNewestWhenAtNewest: true },
  _shouldPinToNewest() { return this.props.pinToNewestWhenAtNewest && this.isAtNewest(); },
  _getAnchor() { return this._shouldPinToNewest() ? 'newest' : 'visible'; },
  newest: true,
  isAtNewest() { return this.newest; },
  scrollToNewest: () => 'manual',
});

test('先頭追従と補正省略を両方止め、手動操作を残す', () => {
  const s = scroller(), guard = new ProFollowGuard();
  const original = Object.getOwnPropertyDescriptor(s, '_shouldPinToNewest');
  const originalNewest = Object.getOwnPropertyDescriptor(s, 'isAtNewest');
  guard.sync([s]);
  assert.equal(s._getAnchor(), 'visible');
  assert.equal(s.isAtNewest(), false);
  assert.equal(s.scrollToNewest(), 'manual');
  assert.equal(s.props.pinToNewestWhenAtNewest, true);
  guard.sync([s]);
  guard.stop();
  assert.deepEqual(Object.getOwnPropertyDescriptor(s, '_shouldPinToNewest'), original);
  assert.deepEqual(Object.getOwnPropertyDescriptor(s, 'isAtNewest'), originalNewest);
  assert.equal(s._getAnchor(), 'newest');
  guard.sync([s]);
  assert.equal(s._getAnchor(), 'visible');
  guard.stop();
});

test('カラムの削除や切り替えでは古いインスタンスを復元する', () => {
  const a = scroller(), b = scroller(), guard = new ProFollowGuard();
  guard.sync([a]);
  guard.sync([b]);
  assert.equal(a._getAnchor(), 'newest');
  assert.equal(b._getAnchor(), 'visible');
  guard.sync([]);
  assert.equal(b._getAnchor(), 'newest');
});

test('Xがメソッドを置き換えた場合は停止時に上書きしない', () => {
  const s = scroller(), guard = new ProFollowGuard();
  guard.sync([s]);
  const changed = () => true;
  s._shouldPinToNewest = changed;
  guard.stop();
  assert.equal(s._shouldPinToNewest, changed);
});

test('未知の形・書き換え不可・プロトタイプのメソッドは触らない', () => {
  const guard = new ProFollowGuard();
  const fixed = scroller();
  Object.defineProperty(fixed, '_shouldPinToNewest', { configurable: false });
  const inherited = Object.create(scroller());
  guard.sync([null, {}, { _shouldPinToNewest: () => true }, fixed, inherited]);
  assert.equal(fixed._getAnchor(), 'newest');
  assert.equal(Object.hasOwn(inherited, '_shouldPinToNewest'), false);
  assert.equal(isScroller({}), false);
  guard.stop();
});

test('セルから最も近い既知のスクローラーだけを探し、循環は上限で止まる', () => {
  const s = scroller();
  assert.equal(scrollerAbove({ return: { stateNode: s } }), s);
  assert.equal(scrollerAbove(null), null);
  const cycle: { return?: typeof cycle } = {};
  cycle.return = cycle;
  assert.equal(scrollerAbove(cycle), null);
});

test('実際の先頭から30px以内だけ追従し、境界を越えると位置を保つ', () => {
  const s = scroller();
  let top: number | null = 0;
  const guard = new ProFollowGuard(() => top);
  guard.sync([s]);
  for (const position of [0, 1, 10, 29.5, 30]) {
    top = position;
    assert.equal(s._getAnchor(), 'newest');
  }
  for (const position of [30.1, 31, 50, 83, 650, -1, NaN, Infinity, null]) {
    top = position;
    assert.equal(s._getAnchor(), 'visible');
  }
  top = 0;
  s.props.pinToNewestWhenAtNewest = false;
  assert.equal(s._getAnchor(), 'visible');
  s.props.pinToNewestWhenAtNewest = true;
  s.newest = false;
  assert.equal(s._getAnchor(), 'visible');
  s.newest = true;
  top = 31;
  guard.stop();
  assert.equal(s._getAnchor(), 'newest');
});

test('ホバー中は先頭でも止め、離れると30px判定へ戻す（他カラムは独立）', () => {
  const a = scroller(), b = scroller();
  let hovered: typeof a | null = a;
  let top = 0;
  const guard = new ProFollowGuard(() => top, s => s === hovered);
  guard.sync([a, b]);
  assert.equal(a._getAnchor(), 'visible');
  assert.equal(b._getAnchor(), 'newest');
  assert.equal(a.scrollToNewest(), 'manual');
  assert.equal(a.isAtNewest(), false);
  hovered = b;
  assert.equal(a._getAnchor(), 'newest');
  assert.equal(b._getAnchor(), 'visible');
  hovered = null;
  top = 30;
  assert.equal(b._getAnchor(), 'newest');
  top = 31;
  assert.equal(b._getAnchor(), 'visible');
  hovered = a;
  guard.stop();
  assert.equal(a._getAnchor(), 'newest');
});

test('先頭追従を止めたときはXの正規化によるスクロール補正も省略させない', () => {
  const s = scroller();
  let top = 0, hover = true;
  const guard = new ProFollowGuard(() => top, () => hover);
  // X's normalization callback skips scrollBy when isAtNewest() is true.
  const update = () => ({ anchor: s._getAnchor(), correctScroll: !s.isAtNewest() });
  guard.sync([s]);
  assert.deepEqual(update(), { anchor: 'visible', correctScroll: true });
  hover = false;
  top = 31;
  assert.deepEqual(update(), { anchor: 'visible', correctScroll: true });
  top = 30;
  assert.deepEqual(update(), { anchor: 'newest', correctScroll: false });
  top = 83;
  guard.stop();
  assert.deepEqual(update(), { anchor: 'newest', correctScroll: false });
});

test('片方のメソッドが変更不可なら部分適用しない', () => {
  const s = scroller();
  Object.defineProperty(s, 'isAtNewest', { configurable: false });
  const guard = new ProFollowGuard(() => 100);
  guard.sync([s]);
  assert.equal(s._getAnchor(), 'newest');
  guard.stop();
});

test('抑制中だけ見えている投稿をアンカーにし、取得不可ならXへ戻す', () => {
  const s = scroller();
  let hover = true;
  const anchor = { itemId: 'reading', offset: 15 };
  const original = s._getAnchor;
  const guard = new ProFollowGuard(() => 0, () => hover, () => anchor);
  guard.sync([s]);
  assert.deepEqual(s._getAnchor(), anchor);
  hover = false;
  assert.equal(s._getAnchor(), 'newest');
  guard.stop();
  assert.equal(s._getAnchor, original);
});

test('通知タイムラインは通知行が仮想化で消えても投稿用補正から除外する', async () => {
  const { isNotificationTimeline } = await import('./pro-follow.ts');
  assert.equal(isNotificationTimeline({ return: { memoizedProps: { timelineId: 'notifications-all-' } } }), true);
  assert.equal(isNotificationTimeline({ memoizedProps: { timelineId: 'notifications-mentions-account' } }), true);
  assert.equal(isNotificationTimeline({ memoizedProps: { timelineId: 'home-latest-account' } }), false);
  assert.equal(isNotificationTimeline(null), false);
  const cycle: { return?: typeof cycle } = {};
  cycle.return = cycle;
  assert.equal(isNotificationTimeline(cycle), false);
});
