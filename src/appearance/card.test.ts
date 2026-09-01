import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messagesFor } from '../i18n/index.ts';
import { colorInStyle, lineTextFrom, markedLine, shortLineFrom } from './card.ts';

const ja = messagesFor('ja');
const en = messagesFor('en');

test('見出しとドメインの両方があれば、ドメインを括弧に入れて添える', () => {
  assert.equal(lineTextFrom({ words: '見出し', source: 'note.com' }, ja), '見出し（note.com）');
  // The parentheses come from the dictionary: halfwidth ones need a space in front,
  // fullwidth ones carry their own
  assert.equal(lineTextFrom({ words: 'Headline', source: 'note.com' }, en), 'Headline (note.com)');
});

test('片方しか無ければ、あるほうだけを出す', () => {
  // An ad's card carries a call to action and no domain
  assert.equal(lineTextFrom({ words: '今すぐ注文', source: null }, ja), '今すぐ注文');
  assert.equal(lineTextFrom({ words: null, source: 'note.com' }, ja), 'note.com');
});

test('文字が無ければ null。移す先が空になるくらいならカードのまま残す', () => {
  assert.equal(lineTextFrom({ words: null, source: null }, ja), null);
  // Whitespace only is the same as nothing. Reading a card mid-render lands here
  assert.equal(lineTextFrom({ words: '  ', source: '\n' }, ja), null);
});

test('前後の空白は落とす。読み取った値がそのまま本文に入るため', () => {
  assert.equal(lineTextFrom({ words: ' 見出し ', source: ' note.com ' }, ja), '見出し（note.com）');
});

test('インラインの style から色を読む。X はリンク色を各リンクに直接書くため', () => {
  assert.equal(colorInStyle('color: rgb(120, 86, 255);'), 'rgb(120, 86, 255)');
  // Written among others, and without the trailing semicolon
  assert.equal(colorInStyle('font-weight: 700; color: rgb(29, 155, 240)'), 'rgb(29, 155, 240)');
  assert.equal(colorInStyle('COLOR:  #1d9bf0 '), '#1d9bf0');
});

test('色が読めなければ null。本文の色のままにする', () => {
  assert.equal(colorInStyle(null), null);
  assert.equal(colorInStyle('font-weight: 700'), null);
  assert.equal(colorInStyle('color:'), null);
  // Not the color: a property whose name merely ends in "color"
  assert.equal(colorInStyle('background-color: rgb(0, 0, 0)'), null);
});

test('背景色も同じ読み方で取れる。投稿ボタンは色を背景に持つため', () => {
  assert.equal(
    colorInStyle('background-color: rgb(120, 86, 255); border-color: rgba(0, 0, 0, 0)', 'background-color'),
    'rgb(120, 86, 255)'
  );
  // Asking for the text color must not pick the background up
  assert.equal(colorInStyle('background-color: rgb(120, 86, 255)'), null);
  // And the other way round
  assert.equal(colorInStyle('color: rgb(120, 86, 255)', 'background-color'), null);
});

test('マークの後ろに文字を続ける。マークだけでも1行になる', () => {
  assert.equal(markedLine('link', '見出し（note.com）'), '🔗 見出し（note.com）');
  // The mark-only style, and a photo, which has no words of its own
  assert.equal(markedLine('link', null), '🔗');
  assert.equal(markedLine('photo', null), '📷');
  // Nothing but spaces is the same as nothing
  assert.equal(markedLine('article', '  '), '📄');
});

test('画面に出すぶんは1行に畳む。引用の改行がそのまま入ると行が割れるため', () => {
  const parts = { words: '一行目\n二行目', source: '@id' };
  assert.equal(shortLineFrom(parts, ja), '一行目 二行目（@id）');
  // The tooltip keeps them: there the line breaks read as they were written
  assert.equal(lineTextFrom(parts, ja), '一行目\n二行目（@id）');
});

test('画面に出すぶんは長さで切る。引用は数百字になりうるため', () => {
  const long = 'あ'.repeat(200);
  const shown = shortLineFrom({ words: long, source: '@id' }, ja)!;
  // Cut at 80 characters, with the ellipsis and the author still after it
  assert.equal(shown, `${'あ'.repeat(80)}…（@id）`);
  // The whole of it stays for the tooltip
  assert.equal(lineTextFrom({ words: long, source: '@id' }, ja), `${long}（@id）`);
  // Short enough, and nothing is added
  assert.equal(shortLineFrom({ words: '短い', source: null }, ja), '短い');
});
