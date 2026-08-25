import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createsPost } from './signal.ts';

const API = 'https://pro.x.com/i/api/graphql';

test('投稿の送信を表す（実測したアドレス）', () => {
  assert.equal(createsPost(`${API}/WXTdKnLddrQOunD6MhWi3g/CreateTweet`), true);
});

test('先頭の id が変わっても当たる（X のデプロイごとに変わるため見ない）', () => {
  assert.equal(createsPost(`${API}/aaaaaaaaaaaaaaaaaaaaaa/CreateTweet`), true);
});

test('長文ポストも投稿として数える', () => {
  assert.equal(createsPost(`${API}/bbbbbbbbbbbbbbbbbbbbbb/CreateNoteTweet`), true);
});

test('別のオペレーションには当たらない', () => {
  assert.equal(createsPost(`${API}/wp06oo3fRGU4P1sK8rECqQ/HomeTimeline`), false);
  assert.equal(createsPost(`${API}/MlAbo_-7Kslvk5mojg9ttg/UpdateClientSettings`), false);
  assert.equal(createsPost(`${API}/8kmedJD_u653xqEjZIS7yA/NotificationsTimeline`), false);
});

test('名前が前方一致するだけのオペレーションには当たらない（全体で照合しているため）', () => {
  assert.equal(createsPost(`${API}/cccccccccccccccccccccc/CreateTweetSchedule`), false);
});

test('GraphQL でない取得には当たらない', () => {
  assert.equal(createsPost('https://pro.x.com/i/api/1.1/CreateTweet'), false);
  assert.equal(createsPost('https://pro.x.com/i/api/2/notifications/viewer_context.json'), false);
});

test('クエリ文字列が付いていても当たる', () => {
  assert.equal(createsPost(`${API}/WXTdKnLddrQOunD6MhWi3g/CreateTweet?variables=%7B%7D`), true);
});

test('アドレスとして読めないものは投稿ではない', () => {
  assert.equal(createsPost('CreateTweet'), false);
  assert.equal(createsPost(''), false);
});
