import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewKeyOf } from './view.ts';

test('設定を持てるビューは、パスから決まる', () => {
  assert.equal(viewKeyOf('/home'), 'view:home');
  assert.equal(viewKeyOf('/notifications'), 'view:notifications');
  assert.equal(viewKeyOf('/search'), 'view:search');
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

test('プロフィールは誰のものでも 1 つのキーにまとめる', () => {
  assert.equal(viewKeyOf('/alice'), 'view:profile');
  assert.equal(viewKeyOf('/bob'), 'view:profile');
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
