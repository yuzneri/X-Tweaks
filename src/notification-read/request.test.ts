import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountIdOfRequest,
  notificationRequestOf,
  readEndpoint,
  readHeadersFrom,
  topCursorOf,
  userIdFromCookies,
} from './request.ts';

test('すべての通知を取得するRESTとGraphQLだけを分類する', () => {
  assert.deepEqual(
    notificationRequestOf('https://pro.x.com/i/api/2/notifications/all.json?count=40'),
    { apiOrigin: 'https://pro.x.com', kind: 'rest' }
  );
  const variables = encodeURIComponent(JSON.stringify({ timeline_type: 'All' }));
  assert.deepEqual(
    notificationRequestOf(`https://x.com/i/api/graphql/hash/NotificationsTimeline?variables=${variables}`),
    { apiOrigin: 'https://x.com', kind: 'graphql' }
  );
  assert.deepEqual(
    notificationRequestOf(`https://api.x.com/graphql/hash/NotificationsTimeline?variables=${variables}`),
    { apiOrigin: 'https://api.x.com', kind: 'graphql' }
  );
  assert.equal(
    notificationRequestOf('https://pro.x.com/i/api/2/notifications/mentions.json'),
    null
  );
  assert.equal(
    notificationRequestOf(
      `https://x.com/i/api/graphql/hash/NotificationsTimeline?variables=${encodeURIComponent(
        JSON.stringify({ timeline_type: 'Mentions' })
      )}`
    ),
    null
  );
  assert.equal(
    notificationRequestOf('https://evil.example/i/api/2/notifications/all.json'),
    null
  );
  assert.equal(
    notificationRequestOf('https://pro.x.com/i/api/2/notifications/all.json', 'POST'),
    null
  );
});

test('URTのtop cursorだけを不透明な値として読む', () => {
  const payload = {
    data: {
      timeline: {
        instructions: [
          { entries: [{ entryId: 'cursor-bottom-1', content: { value: 'bottom' } }] },
          { entries: [{ entryId: 'cursor-top-2', content: { value: 'opaque+/=' } }] },
        ],
      },
    },
  };
  assert.equal(topCursorOf(payload), 'opaque+/=');
  assert.equal(topCursorOf({ entryId: 'cursor-top-empty', content: { value: '' } }), null);
  assert.equal(topCursorOf({ entryId: 'cursor-bottom-1', content: { value: 'bottom' } }), null);
});

test('本人IDはtwid、代理IDは明示ヘッダーから読む', () => {
  assert.equal(userIdFromCookies('a=b; twid=u%3D123456; lang=ja'), '123456');
  assert.equal(userIdFromCookies('twid=not-an-id'), null);
  assert.equal(accountIdOfRequest(new Headers(), 'twid=u%3D123'), '123');
  assert.equal(
    accountIdOfRequest(new Headers({ 'x-act-as-user-id': '456' }), 'twid=u%3D123'),
    '456'
  );
  assert.equal(
    accountIdOfRequest(new Headers({ 'x-act-as-user-id': 'invalid' }), 'twid=u%3D123'),
    null
  );
});

test('既読送信先と引き継ぐヘッダーを固定する', () => {
  assert.equal(
    readEndpoint('https://pro.x.com'),
    'https://pro.x.com/i/api/2/notifications/all/last_seen_cursor.json'
  );
  assert.equal(
    readEndpoint('https://api.x.com'),
    'https://api.x.com/2/notifications/all/last_seen_cursor.json'
  );
  assert.equal(readEndpoint('https://evil.example'), null);
  const copied = readHeadersFrom(
    new Headers({ authorization: 'Bearer secret', cookie: 'secret', 'x-csrf-token': 'csrf' })
  );
  assert.equal(copied.get('authorization'), 'Bearer secret');
  assert.equal(copied.get('x-csrf-token'), 'csrf');
  assert.equal(copied.get('cookie'), null);
  assert.equal(copied.get('content-type'), 'application/x-www-form-urlencoded;charset=UTF-8');
});
