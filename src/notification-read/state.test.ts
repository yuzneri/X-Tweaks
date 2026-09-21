import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PendingReads, type PendingRead } from './state.ts';

const read = (accountKey: string, cursor: string): PendingRead => ({
  columnSetKey: 'deck-a',
  accountKey,
  cursor,
  apiOrigin: 'https://pro.x.com',
  headers: new Headers(),
});

test('アカウントごとに最新カーソルを分離する', () => {
  const state = new PendingReads();
  state.observe(read('1', 'a'));
  state.observe(read('2', 'b'));
  assert.deepEqual(state.pendingAccountKeys('deck-a'), ['1', '2']);
  assert.equal(state.begin('deck-a', '1')?.cursor, 'a');
  assert.equal(state.begin('deck-a', '2')?.cursor, 'b');
});

test('同じ世代の重複送信を抑止し、失敗後は次の操作で再試行する', () => {
  const state = new PendingReads();
  state.observe(read('1', 'a'));
  const first = state.begin('deck-a', '1')!;
  assert.equal(state.begin('deck-a', '1'), null);
  state.finish(first, false);
  assert.equal(state.begin('deck-a', '1')?.cursor, 'a');
});

test('成功した世代だけを完了し、送信中に届いた新着を残す', () => {
  const state = new PendingReads();
  state.observe(read('1', 'old'));
  const old = state.begin('deck-a', '1')!;
  state.observe(read('1', 'new'));
  state.finish(old, true);
  const next = state.begin('deck-a', '1');
  assert.equal(next?.cursor, 'new');
  state.finish(next!, true);
  assert.equal(state.begin('deck-a', '1'), null);
});

test('新しい世代の成功後に古い送信が完了しても既読状態を巻き戻さない', () => {
  const state = new PendingReads();
  state.observe(read('1', 'old'));
  const old = state.begin('deck-a', '1')!;
  state.observe(read('1', 'new'));
  const current = state.begin('deck-a', '1')!;
  state.finish(current, true);
  state.finish(old, true);
  assert.equal(state.begin('deck-a', '1'), null);
});

test('同じカーソルの再観測は世代を進めず、認証文脈だけ更新する', () => {
  const state = new PendingReads();
  state.observe(read('1', 'same'));
  const first = state.begin('deck-a', '1')!;
  state.finish(first, false);
  state.observe({ ...read('1', 'same'), apiOrigin: 'https://api.x.com' });
  const retry = state.begin('deck-a', '1')!;
  assert.equal(retry.generation, first.generation);
  assert.equal(retry.apiOrigin, 'https://api.x.com');
});

test('完了済みのアカウントを未割当候補へ残さない', () => {
  const state = new PendingReads();
  state.observe(read('1', 'done'));
  state.observe(read('2', 'pending'));
  const done = state.begin('deck-a', '1')!;
  state.finish(done, true);
  assert.deepEqual(state.pendingAccountKeys('deck-a'), ['2']);
});

test('別のカラム集合の保留状態を候補にせず、切替時に破棄する', () => {
  const state = new PendingReads();
  state.observe(read('1', 'old-deck'));
  state.observe({ ...read('2', 'current-deck'), columnSetKey: 'deck-b' });

  assert.deepEqual(state.pendingAccountKeys('deck-a'), ['1']);
  assert.deepEqual(state.pendingAccountKeys('deck-b'), ['2']);
  assert.equal(state.begin('deck-b', '1'), null);

  state.retainColumnSet('deck-b');
  assert.deepEqual(state.pendingAccountKeys('deck-a'), []);
  assert.deepEqual(state.pendingAccountKeys('deck-b'), ['2']);
});
