import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitFor, needsFrame, setsHeight, slack, wrapsBox } from './frame.ts';
import { fillAll, type AppearanceNode } from '../settings/schema.ts';

const appearance = (media: Partial<AppearanceNode['media']>): AppearanceNode =>
  fillAll({ global: { appearance: { media } } }).global.appearance;

test('上限より高いメディアにだけ外枠の印が要る', () => {
  assert.equal(needsFrame(200, 100), true);
  assert.equal(needsFrame(101, 100), true);
});

test('上限と同じか、それより低ければ印を付けない', () => {
  // `height` is applied to the frame, so marking one would stretch shorter media out
  assert.equal(needsFrame(100, 100), false);
  assert.equal(needsFrame(50, 100), false);
});

test('高さ 0 は「まだ描かれていない」。畳むときでも印を付けない', () => {
  // It stays 0 until the image has finished loading
  assert.equal(needsFrame(0, 0), false);
  assert.equal(needsFrame(0, 100), false);
});

test('畳むとき（上限 0）は、高さのあるメディアすべてに印が要る', () => {
  assert.equal(needsFrame(1, 0), true);
  assert.equal(needsFrame(300, 0), true);
});

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

test('メディアを表示しない指定は、上限 0（すべての外枠が対象）', () => {
  assert.equal(limitFor(appearance({ style: 'hidden', maxThumbHeight: 120 })), 0);
});

test('上限だけを指定していれば、その値', () => {
  assert.equal(limitFor(appearance({ style: 'show', maxThumbHeight: 120 })), 120);
});

test('説明つきの指定でも、画像は出ているので上限はそのまま効く', () => {
  // It reads like `text` in the list, but the picture stays. Taken for hidden, the
  // height limit would come off the very pictures it is still showing
  assert.equal(limitFor(appearance({ style: 'caption', maxThumbHeight: 120 })), 120);
});

test('どちらも指定していなければ、印は要らない', () => {
  assert.equal(limitFor(appearance({})), null);
});
