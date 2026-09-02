import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messagesFor } from '../i18n/index.ts';
import {
  colorInStyle,
  lineFrom,
  lineTextFrom,
  moreThanShown,
  partFor,
  shortLineFrom,
  WORDS_SHOWN,
} from './card.ts';

/** What a line shows on a post being read as it stands, and on one shown cut short */
const SHOWN = { marksOnly: false, full: false };
const MARKS = { marksOnly: true, full: false };
const FULL = { marksOnly: false, full: true };

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
  assert.equal(lineFrom([partFor('link', '見出し（note.com）', null)], SHOWN), '🔗 見出し（note.com）');
  // The mark-only style, and a photo, which has no words of its own
  assert.equal(lineFrom([partFor('link', null, null)], SHOWN), '🔗');
  assert.equal(lineFrom([partFor('photo', null, null)], SHOWN), '📷');
  // Nothing but spaces is the same as nothing
  assert.equal(lineFrom([partFor('article', '  ', null)], SHOWN), '📄');
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

test('画像ごとにマークを置き、その右にその画像の説明を入れる', () => {
  // Four photos where the second and the fourth were described. Which words belong to
  // which picture is read from where they sit, so nothing has to be numbered
  const parts = [
    partFor('photo', null, null),
    partFor('photo', '桜の木の下で', '桜の木の下で撮った集合写真'),
    partFor('photo', null, null),
    partFor('photo', '校舎の前で', '校舎の前で撮った集合写真'),
  ];
  assert.equal(lineFrom(parts, SHOWN), '📷 📷 桜の木の下で 📷 📷 校舎の前で');
});

test('省略されているときは、マークだけを続けて並べる', () => {
  // Room for nothing else, so the marks run together and the tooltips carry the rest.
  // Four photos still read as four
  const parts = Array.from({ length: 4 }, () => partFor('photo', '説明', '説明'));
  assert.equal(lineFrom(parts, MARKS), '📷📷📷📷');
  assert.equal(lineFrom([partFor('video', null, null)], MARKS), '🎬');
});

test('何も無ければ空になる', () => {
  assert.equal(lineFrom([], SHOWN), '');
  assert.equal(lineFrom([], MARKS), '');
});

test('「さらに表示」で開いたら、切らずに書かれたとおり出す', () => {
  // 80 characters is what a line has room for while the post is being skimmed. Once the
  // post is opened there is nothing left to save room for, so the whole of it goes in
  const long = 'あ'.repeat(200);
  const part = partFor('photo', shortLineFrom({ words: long, source: null }, ja), long);
  assert.equal(lineFrom([part], SHOWN), `📷 ${'あ'.repeat(80)}…`);
  assert.equal(lineFrom([part], FULL), `📷 ${long}`);
  // Nothing was written for it, so there is nothing to open out either
  const bare = partFor('photo', null, null);
  assert.equal(lineFrom([bare], FULL), '📷');
});

test('出し切っていないときだけ、まだ言うことがあるとみなす', () => {
  // Cut to the length a line has room for: the rest is still to come, and on a post
  // nothing else cut short there is no "Show more" to reach for
  const long = 'あ'.repeat(200);
  const cut = partFor('photo', shortLineFrom({ words: long, source: null }, ja), long);
  assert.equal(moreThanShown(cut, SHOWN), true);
  assert.equal(moreThanShown(cut, MARKS), true);
  // Once it is all out there is nothing left to open, and a tooltip would only repeat
  assert.equal(moreThanShown(cut, FULL), false);

  // Short enough to go in whole the first time
  const whole = partFor('photo', shortLineFrom({ words: '桜の写真', source: null }, ja), '桜の写真');
  assert.equal(moreThanShown(whole, SHOWN), false);
  // The mark alone still hides it, so there it does have more to say
  assert.equal(moreThanShown(whole, MARKS), true);

  // Nobody wrote anything, so there is nothing to open however it is shown
  const bare = partFor('photo', null, null);
  assert.equal(moreThanShown(bare, SHOWN), false);
  assert.equal(moreThanShown(bare, MARKS), false);
});

test('出す文字数は、列の指定に従う。未指定なら既定の80字', () => {
  const parts = { words: 'あ'.repeat(200), source: null };
  assert.equal(shortLineFrom(parts, ja, 20), `${'あ'.repeat(20)}…`);
  assert.equal(shortLineFrom(parts, ja, null), `${'あ'.repeat(WORDS_SHOWN)}…`);
  assert.equal(shortLineFrom(parts, ja), `${'あ'.repeat(WORDS_SHOWN)}…`);
  // Short enough for the limit given, and nothing is cut
  assert.equal(shortLineFrom({ words: '短い', source: null }, ja, 20), '短い');
});
