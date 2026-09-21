import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isScrollKey, UserScrollTracker } from './interaction.ts';

test('ユーザー入力が先行し、500ms以内に縦位置が変わったときだけ成立する', () => {
  const tracker = new UserScrollTracker<object, string>();
  const scroll = {};
  tracker.remember(scroll, 'notifications', 100, 1_000);
  assert.equal(tracker.moved(scroll, 100, 1_100), null);
  assert.equal(tracker.moved(scroll, 120, 1_500), 'notifications');
  assert.equal(tracker.moved(scroll, 130, 1_501), null);
});

test('入力のない自動スクロール、期限切れ、別のスクロール要素を除外する', () => {
  const tracker = new UserScrollTracker<object, string>();
  const scroll = {};
  const other = {};
  assert.equal(tracker.moved(scroll, 10, 100), null);
  tracker.remember(scroll, 'notifications', 10, 100);
  assert.equal(tracker.moved(other, 20, 200), null);
  assert.equal(tracker.moved(scroll, 20, 601), null);
});

test('一時停止時のresetで直前の入力を破棄する', () => {
  const tracker = new UserScrollTracker<object, string>();
  const scroll = {};
  tracker.remember(scroll, 'notifications', 10, 100);
  tracker.clear();
  assert.equal(tracker.moved(scroll, 20, 200), null);
});

test('縦スクロールキーだけを認める', () => {
  for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']) {
    assert.equal(isScrollKey(key), true);
  }
  for (const key of ['ArrowLeft', 'ArrowRight', 'Enter', 'a']) assert.equal(isScrollKey(key), false);
});
