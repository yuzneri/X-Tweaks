import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTarget, type Place } from './default-tab.ts';
import type { ProfileSettings } from '../settings/schema.ts';

const at = (url: string): Place => {
  const [pathname = '', query] = url.split('?');
  return { pathname, search: query === undefined ? '' : `?${query}` };
};
const xDefault: ProfileSettings = { posts: 'posts', sort: 'recent', media: 'videos' };
const chosen: ProfileSettings = { posts: 'all', sort: 'popular', media: 'photos' };
const home = at('/home');

test('X と同じ既定なら、どこへ移っても何もしない', () => {
  for (const url of ['/alice', '/alice/all', '/alice/media', '/home']) {
    assert.equal(defaultTarget(at(url), home, xDefault), null, url);
  }
});

test('外からプロフィールを開くと、選んだ種類と並べ替えになる', () => {
  assert.equal(defaultTarget(at('/alice'), home, chosen), '/alice/all?sort=popular');
  assert.equal(
    defaultTarget(at('/alice'), home, { ...xDefault, posts: 'highlights' }),
    '/alice/highlights'
  );
  // 並べ替えだけを変えたときは、パスはそのまま
  assert.equal(defaultTarget(at('/alice'), home, { ...xDefault, sort: 'popular' }), '/alice?sort=popular');
  // 画面名の書き方はそのまま残す
  assert.equal(defaultTarget(at('/Alice/'), home, chosen), '/Alice/all?sort=popular');
});

test('初めての読み込みも、外から来たのと同じ扱い', () => {
  assert.equal(defaultTarget(at('/alice'), null, chosen), '/alice/all?sort=popular');
  assert.equal(defaultTarget(at('/alice/media'), null, chosen), '/alice/media?filter=photo');
});

test('同じタブの中で選び直したものは上書きしない', () => {
  // 「すべて」から、メニューで「ポスト」を選んだ
  assert.equal(defaultTarget(at('/alice'), at('/alice/all?sort=popular'), chosen), null);
  assert.equal(defaultTarget(at('/alice'), at('/alice/highlights'), chosen), null);
  // 画面名の大文字小文字が違っても同じ人
  assert.equal(defaultTarget(at('/alice'), at('/Alice/all'), chosen), null);
  // メディアで「動画」を選び直した
  assert.equal(defaultTarget(at('/alice/media'), at('/alice/media?filter=photo'), chosen), null);
});

test('同じ人の別のタブから戻ってきたときは、既定を当てる', () => {
  // X 自身もタブを移ると選択を忘れる。既定を当てるのが頼まれたこと
  assert.equal(defaultTarget(at('/alice'), at('/alice/media'), chosen), '/alice/all?sort=popular');
  assert.equal(defaultTarget(at('/alice/media'), at('/alice'), chosen), '/alice/media?filter=photo');
  assert.equal(defaultTarget(at('/alice'), at('/alice/with_replies'), chosen), '/alice/all?sort=popular');
  // 別の人のプロフィールから移るのも外から
  assert.equal(defaultTarget(at('/bob'), at('/alice/all'), chosen), '/bob/all?sort=popular');
});

test('アドレスが明示している選択には触らない', () => {
  // 種類が明示されていれば種類はそのまま。並べ替えが無ければ並べ替えだけ足す
  assert.equal(defaultTarget(at('/alice/highlights'), home, chosen), '/alice/highlights?sort=popular');
  assert.equal(defaultTarget(at('/alice?sort=recent'), home, chosen), '/alice/all?sort=recent');
  assert.equal(defaultTarget(at('/alice/all?sort=popular'), home, chosen), null);
  assert.equal(defaultTarget(at('/alice/media?filter=video'), home, chosen), null);
});

test('ほかのクエリは書き方ごと残す', () => {
  assert.equal(defaultTarget(at('/alice?ref=a%20b'), home, chosen), '/alice/all?ref=a%20b&sort=popular');
  assert.equal(defaultTarget(at('/alice?'), home, { ...xDefault, sort: 'popular' }), '/alice?sort=popular');
});

test('プロフィールのポストとメディアのタブ以外には触らない', () => {
  for (const url of [
    '/home',
    '/explore',
    '/alice/with_replies',
    '/alice/status/1234567890',
    '/alice/media/photo',
    '/i/bookmarks',
    '/settings',
    '/',
  ]) {
    assert.equal(defaultTarget(at(url), home, chosen), null, url);
  }
});
