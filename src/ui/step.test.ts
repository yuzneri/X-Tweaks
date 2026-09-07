import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepped } from './step.ts';

test('1ずつ動く', () => {
  assert.equal(stepped('5', 1), '6');
  assert.equal(stepped('5', -1), '4');
  assert.equal(stepped('1', 1), '2');
});

test('1を下回ると欄が空になる（＝すべて）', () => {
  // 0 は、欄が始まる向き（以上）では「数を読めた投稿すべて」に当たってしまう。
  // ボタン1回でそれを作らないよう、空に戻す
  assert.equal(stepped('1', -1), '');
  assert.equal(stepped('0', -1), '');
  assert.equal(stepped('', -1), '');
});

test('空の欄を上げると1から始まる', () => {
  assert.equal(stepped('', 1), '1');
  assert.equal(stepped('   ', 1), '1');
  assert.equal(stepped('0', 1), '1');
});

test('数として読めない欄は、押した時点で数になる', () => {
  // ボタンは数を得るために押されている。打ち間違いを抱えたままにしない
  assert.equal(stepped('あ', 1), '1');
  assert.equal(stepped('1.5', 1), '1');
  assert.equal(stepped('-3', 1), '1');
  assert.equal(stepped('あ', -1), '');
});
