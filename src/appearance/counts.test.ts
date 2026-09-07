import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupDigits, rawCountFor } from './counts.ts';

test('3桁ごとに区切る', () => {
  assert.equal(groupDigits(0), '0');
  assert.equal(groupDigits(317), '317');
  assert.equal(groupDigits(1000), '1,000');
  assert.equal(groupDigits(221250), '221,250');
  assert.equal(groupDigits(1234567), '1,234,567');
});

test('Xが丸めているときだけ差し替える', () => {
  // 「22万」の裏に221250がある、というのがこの設定の目的
  assert.equal(rawCountFor('22万', 221250), '221,250');
  assert.equal(rawCountFor('221.3K', 221250), '221,250');
});

test('Xの表示が既に正確なら触らない', () => {
  // Xは1万未満を正確に出す。ここで差し替えると、大半の投稿に無駄な書き込みが出る
  assert.equal(rawCountFor('317', 317), null);
  assert.equal(rawCountFor('2,161', 2161), null);
  // 区切り文字は X の UI 言語のもの。数字が揃っていれば直す理由は無い
  assert.equal(rawCountFor('3.400', 3400), null);
  assert.equal(rawCountFor('3 400', 3400), null);
});

test('Xが何も出していない投稿には、何も足さない', () => {
  // 0件のとき X は数字を出さない。ここで「0」を出すと、タイムラインに0が並ぶ
  assert.equal(rawCountFor('', 0), null);
  assert.equal(rawCountFor('  ', 12), null);
});

test('件数を読めなければ何もしない', () => {
  assert.equal(rawCountFor('22万', null), null);
});
