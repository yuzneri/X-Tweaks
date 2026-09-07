import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cappedPadding, marksFrames, percentageIn, setsHeight, slack, wrapsBox } from './frame.ts';
import { fillAll, type AppearanceNode } from '../settings/schema.ts';

const appearance = (media: Partial<AppearanceNode['media']>): AppearanceNode =>
  fillAll({ global: { appearance: { media } } }).global.appearance;

test('外枠の許容幅は、割合と最低値の大きいほう', () => {
  // Small media still gets 10px; large media gets 5%
  assert.equal(slack(100), 10);
  assert.equal(slack(1000), 50);
  assert.equal(slack(0), 10);
});

test('箱と同じ高さのまま包んでいる祖先は外枠の候補', () => {
  assert.equal(wrapsBox(200, 200), true);
  // 1px shorter passes, to allow for rounding
  assert.equal(wrapsBox(200, 199), true);
  // Larger by the frame's padding passes too (up to +10 at 200)
  assert.equal(wrapsBox(200, 210), true);
});

test('箱より明らかに低いか、余白を超えて大きい祖先で打ち切る', () => {
  assert.equal(wrapsBox(200, 198), false);
  assert.equal(wrapsBox(200, 211), false);
  // The allowance grows with larger media (up to +50 at 1000)
  assert.equal(wrapsBox(1000, 1050), true);
  assert.equal(wrapsBox(1000, 1051), false);
});

test('aspect-ratio を持つ要素は高さを決めている', () => {
  assert.equal(setsHeight('16 / 9', '0px', 200), true);
  assert.equal(setsHeight('auto', '0px', 200), false);
});

test('箱の高さの半分以上の余白も、高さを決めているとみなす', () => {
  assert.equal(setsHeight('auto', '100px', 200), true);
  assert.equal(setsHeight('auto', '99px', 200), false);
});

test('余白が読めない値でも、高さを決めているとは言わない', () => {
  assert.equal(setsHeight('auto', '', 200), false);
  assert.equal(setsHeight('auto', 'auto', 200), false);
});

test('メディアを表示しない指定は、上限が無くても外枠に印が要る', () => {
  // Hiding the box alone leaves the frame holding the space
  assert.equal(marksFrames(appearance({ style: 'hidden', maxThumbHeight: null })), true);
  assert.equal(marksFrames(appearance({ style: 'text', maxThumbHeight: null })), true);
});

test('上限だけを指定していても、外枠に印が要る', () => {
  assert.equal(marksFrames(appearance({ style: 'show', maxThumbHeight: 120 })), true);
});

test('説明つきの指定でも、画像は出ているので上限はそのまま効く', () => {
  // It reads like `text` in the list, but the picture stays
  assert.equal(marksFrames(appearance({ style: 'caption', maxThumbHeight: 120 })), true);
  assert.equal(marksFrames(appearance({ style: 'caption', maxThumbHeight: null })), false);
});

test('どちらも指定していなければ、印は要らない', () => {
  assert.equal(marksFrames(appearance({})), false);
});

test('X が書く2つの形から、幅に対する割合を読む', () => {
  assert.equal(percentageIn('56.25%'), 56.25);
  // A row of pictures with gaps between them: most of the frames holding more than one
  assert.equal(percentageIn('calc(79.8223% - 3.193px)'), 79.8223);
  assert.equal(percentageIn('calc(20% - 3px)'), 20);
});

test('割合で決まっていない高さは、割合ではないと答える', () => {
  assert.equal(percentageIn('168px'), null);
  assert.equal(percentageIn(''), null);
  assert.equal(percentageIn('auto'), null);
  assert.equal(percentageIn('0%'), null);
});

test('割合の余白は、X が書いたものを包んで上限を足す', () => {
  assert.equal(cappedPadding('56.25%', 200), 'min(56.25%, 200px)');
  // What X asked for is kept whole, so the browser goes on resolving it against the width
  assert.equal(
    cappedPadding('calc(79.8223% - 3.193px)', 200),
    'min(calc(79.8223% - 3.193px), 200px)'
  );
});

test('長さで書かれた余白には何もしない。max-height が押さえる側', () => {
  assert.equal(cappedPadding('168px', 200), null);
  assert.equal(cappedPadding('', 200), null);
});
