import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropIndex, type VerticalSpan } from './reorder.ts';

/** n rows of height 100, laid out from the top */
const spans = (n: number): VerticalSpan[] =>
  Array.from({ length: n }, (_, i) => ({ top: i * 100, bottom: (i + 1) * 100 }));

const rows = spans(5); // 0-100, 100-200, 200-300, 300-400, 400-500

test('自分の行の中にいるあいだは動かさない', () => {
  assert.equal(dropIndex(rows, 2, 200), 2); // 上端
  assert.equal(dropIndex(rows, 2, 250), 2); // 中ほど
  assert.equal(dropIndex(rows, 2, 300), 2); // 下端
});

test('下の隣に入った時点で1つ下がる（中点まで待たない）', () => {
  // Grabbing the third (200-300), just after entering the fourth (300-400)
  assert.equal(dropIndex(rows, 2, 301), 3);
  assert.equal(dropIndex(rows, 2, 350), 3);
  assert.equal(dropIndex(rows, 2, 399), 3);
});

test('上の隣に入った時点で1つ上がる', () => {
  // Grabbing the third, just after entering the second (100-200)
  assert.equal(dropIndex(rows, 2, 199), 1);
  assert.equal(dropIndex(rows, 2, 150), 1);
  assert.equal(dropIndex(rows, 2, 101), 1);
});

test('2つ先まで運べば2つ動く', () => {
  assert.equal(dropIndex(rows, 2, 450), 4); // 末尾へ
  assert.equal(dropIndex(rows, 2, 50), 0); // 先頭へ
});

test('先頭の行は上へ行けず、末尾の行は下へ行けない', () => {
  // Grabbing the first (0-100) and going past the top still gives 0
  assert.equal(dropIndex(rows, 0, -50), 0);
  // Grabbing the last (400-500) and going past the bottom still gives 4
  assert.equal(dropIndex(rows, 4, 600), 4);
});

test('行が1つしか無ければ動かしようがない', () => {
  assert.equal(dropIndex(spans(1), 0, 50), 0);
  assert.equal(dropIndex(spans(1), 0, 999), 0);
});

test('行の高さがそろっていなくても、入った行を基準にする', () => {
  // Only the second is taller (a row whose name wrapped)
  const uneven: VerticalSpan[] = [
    { top: 0, bottom: 100 },
    { top: 100, bottom: 400 },
    { top: 400, bottom: 500 },
  ];
  // Grabbing the first, the swap happens just after entering the taller second
  assert.equal(dropIndex(uneven, 0, 101), 1);
  // Carried as far as the third, it goes to the end
  assert.equal(dropIndex(uneven, 0, 401), 2);
});
