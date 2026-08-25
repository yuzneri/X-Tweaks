/**
 * なぜその挙動にしているかを書き留めるテスト。
 * X の規則そのものへの適合は hashtags.conformance.test.ts が上流の表で確かめている。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashtagsIn, restoredText } from './hashtags.ts';

// 目で見分けられない文字はエスケープで書く。合成形と分解形の違いがまさに争点になる
const ACUTE = '́';
const DAKUTEN = '゙';
const ZWNJ = '‌';
const VS16 = '️';
const KEYCAP = '⃣';

test('本文に書かれた順で取り出す', () => {
  assert.deepEqual(hashtagsIn('aaa #one bbb #two'), ['#one', '#two']);
});

test('日本語のタグも取り出す（利用者の主な用途）', () => {
  assert.deepEqual(hashtagsIn('新刊できました #コミケ #WebP本'), ['#コミケ', '#WebP本']);
});

test('全角の＃も書かれたまま扱う（打ち直させないための機能なので、書き換えない）', () => {
  assert.deepEqual(hashtagsIn('あああ ＃技術書典'), ['＃技術書典']);
});

test('同じタグは1回に落とす（スレッドの各段に同じタグを付けた場合）', () => {
  assert.deepEqual(hashtagsIn('#one aaa #one bbb #two'), ['#one', '#two']);
});

test('大文字と小文字は別のものとして残す（X では同じタグだが、打った通りを返す方が驚きが小さい）', () => {
  assert.deepEqual(hashtagsIn('#tag #Tag'), ['#tag', '#Tag']);
});

// --- タグの本体に入る文字 ---

test('中黒・波ダッシュ・独立した濁点はタグの一部（日本語のタグで実際に使われる）', () => {
  // Cutting at these would hand back a tag nobody typed
  assert.deepEqual(hashtagsIn('#ラーメン・つけ麺'), ['#ラーメン・つけ麺']);
  assert.deepEqual(hashtagsIn('#あ〜い'), ['#あ〜い']);
  assert.deepEqual(hashtagsIn('#あ～い'), ['#あ～い']);
  assert.deepEqual(hashtagsIn('#あ゛'), ['#あ゛']);
});

test('ゼロ幅接合子もタグの一部（目に見えないが、落とすと別のタグになる）', () => {
  assert.deepEqual(hashtagsIn(`#a${ZWNJ}b`), [`#a${ZWNJ}b`]);
});

test('結合文字を含むタグも切らずに取る（分解形で書かれたアクセント・濁点）', () => {
  assert.deepEqual(hashtagsIn(`#Cafe${ACUTE}`), [`#Cafe${ACUTE}`]);
  assert.deepEqual(hashtagsIn(`#タク${DAKUTEN}`), [`#タク${DAKUTEN}`]);
  // The composed form was already fine; it has to stay that way
  assert.deepEqual(hashtagsIn('#Café'), ['#Café']);
});

test('アンダースコアは本体に入るが、それだけではタグにならない', () => {
  assert.deepEqual(hashtagsIn('#a_b'), ['#a_b']);
  // A tag needs at least one letter or mark: `_` and digits are not enough on their own
  assert.deepEqual(hashtagsIn('#_'), []);
  assert.deepEqual(hashtagsIn('#___'), []);
  assert.deepEqual(hashtagsIn('#_2026'), []);
});

test('数字だけのものはタグではない（X でもリンクにならない）', () => {
  assert.deepEqual(hashtagsIn('開催は #2026 です #C108'), ['#C108']);
  assert.deepEqual(hashtagsIn('#2026年'), ['#2026年']);
});

test('数として数えるのは算用数字だけ（丸数字・ローマ数字・分数はタグを作らない）', () => {
  assert.deepEqual(hashtagsIn('#①あ'), []);
  assert.deepEqual(hashtagsIn('#Ⅷ'), []);
  assert.deepEqual(hashtagsIn('#½x'), []);
});

// --- タグの始まり方 ---

test('語の途中の # はタグを開かない', () => {
  assert.deepEqual(hashtagsIn('C#とF#の話'), []);
  assert.deepEqual(hashtagsIn('本文です#タグ'), []);
  assert.deepEqual(hashtagsIn(`カフエ${DAKUTEN}#タグ`), []);
});

test('& の直後はタグを開かない（HTML の実体参照）', () => {
  assert.deepEqual(hashtagsIn("&#39;"), []);
});

test('絵文字の異体字セレクタの直後はタグを開く', () => {
  // A tag written straight after an emoji still counts
  assert.deepEqual(hashtagsIn(`a ✌${VS16}#タグ`), ['#タグ']);
});

test('# の直後が区切りなら何も取らない', () => {
  assert.deepEqual(hashtagsIn('# だけ書いた'), []);
  assert.deepEqual(hashtagsIn('##'), []);
});

test('キーキャップの絵文字はタグではない', () => {
  assert.deepEqual(hashtagsIn(`#${VS16}${KEYCAP}`), []);
});

test('行頭・文末・改行に接したタグも取れる', () => {
  assert.deepEqual(hashtagsIn('#始まり\n途中 #改行後\n#末尾'), ['#始まり', '#改行後', '#末尾']);
});

test('句読点や括弧はタグに含めない', () => {
  assert.deepEqual(hashtagsIn('#タグ、あと #別のタグ。'), ['#タグ', '#別のタグ']);
  assert.deepEqual(hashtagsIn('(#かっこ)'), ['#かっこ']);
});

// --- タグの終わり方 ---

test('直後に # や :// が続くものはタグではない', () => {
  assert.deepEqual(hashtagsIn('#tag#tag2'), []);
  assert.deepEqual(hashtagsIn('#tag://example.com'), []);
});

test('URL の中の # はタグではない（貼った URL の断片を復元しないため）', () => {
  assert.deepEqual(hashtagsIn('https://example.com/a#b をどうぞ'), []);
  assert.deepEqual(hashtagsIn('https://example.com/#section'), []);
  assert.deepEqual(hashtagsIn('example.com/#a'), []);
  // The tag written beside a URL is still picked up
  assert.deepEqual(hashtagsIn('見て https://example.com/#section と #タグ'), ['#タグ']);
});

test('空白なしの文字列が延々と続いた先の # は、URL ではなくタグとして読む', () => {
  // A run this long without a space is not an address. Giving up on it is also what
  // keeps a long post with no spaces from costing the square of its length
  assert.deepEqual(hashtagsIn(`https://example.com/${'a/'.repeat(1500)}#tag`), ['#tag']);
  // Within reach, the address is still recognised and its fragment left alone
  assert.deepEqual(hashtagsIn(`https://example.com/${'a/'.repeat(50)}#tag`), []);
});

test('タグが無ければ空', () => {
  assert.deepEqual(hashtagsIn('ただの本文'), []);
  assert.deepEqual(hashtagsIn(''), []);
});

// --- 復元する文字列 ---

test('復元する文字列はタグの前に空白を置く（続けて本文を打っても繋がらないように）', () => {
  assert.equal(restoredText(['#one', '#two']), ' #one #two');
});

test('タグが無ければ挿し込むものは無い', () => {
  assert.equal(restoredText([]), '');
});
