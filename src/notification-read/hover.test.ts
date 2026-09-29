import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOVER_READ_MS, HoverReadTracker } from './hover.ts';

test('3秒連続ホバーで1回だけ既読にし、内部移動では待ち直さない', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const reads: string[] = [], column = {};
  const tracker = new HoverReadTracker<object>(() => true, id => reads.push(id));
  tracker.enter(column, 'a');
  t.mock.timers.tick(2_000);
  tracker.enter(column, 'a');
  t.mock.timers.tick(999);
  assert.deepEqual(reads, []);
  t.mock.timers.tick(1);
  assert.deepEqual(reads, ['a']);
  tracker.enter(column, 'a');
  t.mock.timers.tick(HOVER_READ_MS * 2);
  assert.deepEqual(reads, ['a']);
  tracker.clear();
  tracker.enter(column, 'a');
  t.mock.timers.tick(HOVER_READ_MS);
  assert.deepEqual(reads, ['a', 'a']);
});

test('カラムを離れた場合や停止・バックグラウンド化では保留を破棄する', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const reads: string[] = [];
  const tracker = new HoverReadTracker<object>(() => true, id => reads.push(id));
  tracker.enter({}, 'a');
  t.mock.timers.tick(HOVER_READ_MS - 1);
  tracker.clear();
  t.mock.timers.tick(HOVER_READ_MS);
  assert.deepEqual(reads, []);
});

test('別カラム・同じDOMの別IDへ移ったら3秒を数え直す', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const reads: string[] = [], a = {}, b = {};
  const tracker = new HoverReadTracker<object>(() => true, id => reads.push(id));
  tracker.enter(a, 'a');
  t.mock.timers.tick(2_000);
  tracker.enter(b, 'b');
  t.mock.timers.tick(2_000);
  tracker.enter(b, 'c');
  t.mock.timers.tick(2_999);
  assert.deepEqual(reads, []);
  t.mock.timers.tick(1);
  assert.deepEqual(reads, ['c']);
});

test('期限時にカラムの状態を再確認し、不適格なら送信しない', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const reads: string[] = [], column = {};
  let valid = true;
  const tracker = new HoverReadTracker<object>((c, id) => valid && c === column && id === 'a', id => reads.push(id));
  tracker.enter(column, 'a');
  valid = false;
  t.mock.timers.tick(HOVER_READ_MS);
  assert.deepEqual(reads, []);
});
