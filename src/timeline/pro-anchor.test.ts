import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseVisibleAnchor } from './pro-anchor.ts';

test('一部だけ見えている先頭投稿を選び、DOM位置をXの座標へ換算する', () => {
  assert.deepEqual(chooseVisibleAnchor([
    { id: 'second', top: 250, bottom: 450, cellTop: 250 },
    { id: 'first', top: 73, bottom: 250, cellTop: 73 },
  ], 100, 900, 27), { itemId: 'first', offset: 0 });
});

test('消された投稿・画面外・不正な位置を基準にしない', () => {
  assert.equal(chooseVisibleAnchor([
    { id: 'hidden', top: 0, bottom: 0, cellTop: 0 },
    { id: 'above', top: 0, bottom: 100, cellTop: 0 },
    { id: 'below', top: 900, bottom: 1000, cellTop: 900 },
    { id: 'invalid', top: NaN, bottom: 250, cellTop: 100 },
  ], 100, 900, 0), null);
});
