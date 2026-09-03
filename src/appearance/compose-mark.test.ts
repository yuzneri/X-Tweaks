import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markFor, paintsColor } from './compose-mark.ts';

test('読めた名前はそのまま印になる', () => {
  assert.equal(markFor('yuzneri'), 'yuzneri');
});

test('アバターが読めなければ印は打たない', () => {
  assert.equal(markFor(null), null);
});

test('X が「誰か分からない」と書いたアバターは名前として扱わない', () => {
  // X writes this on the avatars in the chat and Grok drawers. Taken as a name it would
  // make an account nobody has, and every form on the page would share one color
  assert.equal(markFor('unknown'), null);
});

test('属性セレクタを壊す字は落とす', () => {
  // The value is written into `[data-xpro-compose="…"]`, so a quote or a backslash would
  // end the string early and take the rest of the stylesheet with it
  assert.equal(markFor('yu"z\\neri'), 'yuzneri');
});

test('落とした結果が空になるなら、印は打たない', () => {
  // A mark of "" would match every form that carries the attribute at all
  assert.equal(markFor('"'), null);
  assert.equal(markFor(''), null);
});

test('色が付いている面だけを「塗っている」と数える', () => {
  assert.equal(paintsColor('rgb(20, 20, 20)'), true);
  assert.equal(paintsColor('rgba(120, 86, 255, 0.15)'), true);
});

test('透明なものは、色の名前が何であれ塗っていない', () => {
  // X writes a fully clear white over the box being typed in. Taken for paint, it marks
  // a surface that shows nothing and puts a second layer of colour on the form
  assert.equal(paintsColor('rgba(255, 255, 255, 0)'), false);
  assert.equal(paintsColor('rgba(0, 0, 0, 0)'), false);
  assert.equal(paintsColor('transparent'), false);
  assert.equal(paintsColor(''), false);
});
