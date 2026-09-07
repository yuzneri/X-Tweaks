import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countInLabel } from './post.ts';

/** The labels X writes, as they stand on a real page (`test/*.htm`) */
test('Xのラベルから件数を読む', () => {
  assert.equal(countInLabel('1551 件のいいね。いいねする'), 1551);
  assert.equal(countInLabel('0 件の返信。返信する'), 0);
  assert.equal(countInLabel('221250 件の表示。ポストアナリティクスを表示'), 221250);
});

test('言語が変わっても、数字の並びだけを読む', () => {
  assert.equal(countInLabel('1,551 Likes. Like'), 1551);
  assert.equal(countInLabel('1 234 J’aime'), 1234);
  assert.equal(countInLabel('1.234 Gefällt mir'), 1234);
});

test('数字が無いラベルは「読めない」', () => {
  // A post whose views X does not show
  assert.equal(countInLabel('ポストアナリティクスを表示'), null);
  assert.equal(countInLabel(null), null);
  assert.equal(countInLabel(undefined), null);
});

test('後ろに続く言葉の数字は混ぜない', () => {
  // Only the first run is read: the words around it are X's own and may carry a number
  assert.equal(countInLabel('12 件のいいね。X 2 で開く'), 12);
});
