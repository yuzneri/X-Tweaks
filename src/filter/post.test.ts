import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodyLinkKind, countInLabel } from './post.ts';

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

/* --- 本文の中のリンク --- */

test('ハッシュタグはホストが違っても拾う', () => {
  // X Pro は同じページの中で pro.x.com と x.com を書き分ける
  assert.equal(bodyLinkKind('https://x.com/hashtag/%E7%8C%AB?src=hashtag_click'), 'hashtag');
  assert.equal(bodyLinkKind('https://pro.x.com/hashtag/cats'), 'hashtag');
});

test('メンションは1階層のパス。ポストへのリンクは違う', () => {
  assert.equal(bodyLinkKind('https://x.com/alice'), 'mention');
  assert.equal(bodyLinkKind('https://pro.x.com/alice'), 'mention');
  // ポストそのものへのリンクは2階層以上ある
  assert.equal(bodyLinkKind('https://x.com/alice/status/123'), null);
  assert.equal(bodyLinkKind('https://x.com/i/spaces/abc'), null);
});

test('貼られたURLはt.coに短縮されている', () => {
  assert.equal(bodyLinkKind('https://t.co/abc123'), 'link');
  // Xのものでない住所は、短縮されていなければ数えない
  assert.equal(bodyLinkKind('https://example.com/alice'), null);
  // xを名前に含むだけの別ドメインに釣られない
  assert.equal(bodyLinkKind('https://notx.com/alice'), null);
});

test('住所として読めないものは数えない', () => {
  assert.equal(bodyLinkKind('/hashtag/cats'), null);
  assert.equal(bodyLinkKind(''), null);
});
