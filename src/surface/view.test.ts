import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewKeyOf, viewNameFrom } from './view.ts';

test('設定を持てるビューは、パスから決まる', () => {
  assert.equal(viewKeyOf('/home'), 'view:home');
  assert.equal(viewKeyOf('/notifications'), 'view:notifications');
  assert.equal(viewKeyOf('/i/bookmarks'), 'view:bookmarks');
  assert.equal(viewKeyOf('/i/lists/1234567890'), 'view:list:1234567890');
});

test('通知のタブは通知にまとめる', () => {
  assert.equal(viewKeyOf('/notifications/mentions'), 'view:notifications');
});

test('リストは id ごとに分かれる', () => {
  assert.notEqual(viewKeyOf('/i/lists/1'), viewKeyOf('/i/lists/2'));
  // メンバー一覧なども、そのリストの設定に含める
  assert.equal(viewKeyOf('/i/lists/1/members'), 'view:list:1');
});

test('プロフィールは人ごとに分かれる', () => {
  assert.equal(viewKeyOf('/alice'), 'view:profile:alice');
  assert.notEqual(viewKeyOf('/alice'), viewKeyOf('/bob'));
  // X は大文字小文字を区別しない。2 つの入口を作らない
  assert.equal(viewKeyOf('/Alice'), viewKeyOf('/alice'));
});

test('ハッシュタグのページは、そのタグの検索と同じ扱い', () => {
  // 同じ結果を見せる 2 つの入口。どちらに書いても効くように、キーを揃える
  assert.equal(viewKeyOf('/hashtag/conference'), 'view:search:#conference');
  assert.equal(viewKeyOf('/search', '?q=%23conference'), viewKeyOf('/hashtag/conference'));
  // 日本語のタグも読める形で持つ
  assert.equal(viewKeyOf('/hashtag/%E6%8A%80%E8%A1%93'), 'view:search:#技術');
  assert.equal(viewKeyOf('/hashtag/'), null);
});

test('検索は検索語ごとに分かれる', () => {
  assert.equal(viewKeyOf('/search', '?q=rust&src=typed_query'), 'view:search:rust');
  assert.notEqual(viewKeyOf('/search', '?q=rust'), viewKeyOf('/search', '?q=go'));
  // 記号や空白も、そのまま鍵にする（読める形で持つ）
  assert.equal(viewKeyOf('/search', '?q=rust+lang'), 'view:search:rust lang');
  // 検索語が無いのは検索の入口。判定する投稿が無い
  assert.equal(viewKeyOf('/search'), null);
  assert.equal(viewKeyOf('/search', '?q=%20'), null);
});

test('X 自身のページをプロフィールと取り違えない', () => {
  for (const path of ['/explore', '/messages', '/settings', '/i/grok', '/compose/post', '/jobs']) {
    assert.notEqual(viewKeyOf(path), 'view:profile', path);
  }
});

test('設定を持たない場所では null。global とアカウントだけが効く', () => {
  // 投稿の詳細。ビューとしては持たない
  assert.equal(viewKeyOf('/alice/status/1234567890123456789'), null);
  assert.equal(viewKeyOf('/i/grok'), null);
  assert.equal(viewKeyOf('/'), null);
  assert.equal(viewKeyOf(''), null);
});

test('末尾のスラッシュがあってもなくても同じ', () => {
  assert.equal(viewKeyOf('/home/'), viewKeyOf('/home'));
  assert.equal(viewKeyOf('/alice/'), viewKeyOf('/alice'));
});

test('ビューの名前は、X が付けたページタイトルから取る', () => {
  assert.equal(viewNameFrom('ホーム / X'), 'ホーム');
  assert.equal(viewNameFrom('ブックマーク / X'), 'ブックマーク');
  // リストは、その名前がここでしか手に入らない
  assert.equal(viewNameFrom('勉強会 / X'), '勉強会');
});

test('未読件数は名前ではない', () => {
  assert.equal(viewNameFrom('(2) ホーム / X'), 'ホーム');
  assert.equal(viewNameFrom('(12) 通知 / X'), '通知');
});

test('プロフィールと検索も、そのまま名前として使う', () => {
  // 人ごと・検索語ごとにキーが分かれているので、名前が入れ替わることがない
  assert.equal(viewNameFrom('アリス (@alice) / X'), 'アリス (@alice)');
  assert.equal(viewNameFrom('「rust」の検索結果 / X'), '「rust」の検索結果');
});

test('名前が入る前のタイトルは受け取らない', () => {
  assert.equal(viewNameFrom('X'), null);
  assert.equal(viewNameFrom(''), null);
  assert.equal(viewNameFrom('  /  X'), null);
});
