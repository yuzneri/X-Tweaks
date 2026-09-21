import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchNotificationXhr } from './xhr.ts';

class FakeXhr {
  status = 200;
  responseType = '';
  response: unknown = null;
  responseText = JSON.stringify({ cursor: 'opaque' });
  opened: unknown[] = [];
  sent: unknown[] = [];
  headers: [string, string][] = [];
  private listeners = new Map<string, (() => void)[]>();

  open(...args: unknown[]): void {
    this.opened.push(args);
  }
  setRequestHeader(name: string, value: string): void {
    this.headers.push([name, value]);
  }
  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  send(body?: unknown): void {
    this.sent.push(body);
    for (const listener of this.listeners.get('loadend') ?? []) listener();
  }
}

test('XのXHR通知レスポンスを観測し、元のopen・header・sendを保つ', () => {
  const seen: unknown[] = [];
  const stop = watchNotificationXhr(
    (response) => seen.push(response),
    FakeXhr as unknown as { prototype: XMLHttpRequest },
    'https://pro.x.com/i/decks/1',
    () => 'deck-a'
  );
  const xhr = new FakeXhr();
  xhr.open('GET', '/i/api/2/notifications/all.json?count=40');
  xhr.setRequestHeader('x-csrf-token', 'csrf');
  xhr.send(null);
  stop();

  assert.deepEqual(xhr.opened, [
    ['GET', '/i/api/2/notifications/all.json?count=40', true, undefined, undefined],
  ]);
  assert.deepEqual(xhr.headers, [['x-csrf-token', 'csrf']]);
  assert.deepEqual(xhr.sent, [null]);
  assert.equal(seen.length, 1);
  const response = seen[0] as {
    apiOrigin: string;
    columnSetKey: string | null;
    headers: Headers;
    payload: unknown;
  };
  assert.equal(response.apiOrigin, 'https://pro.x.com');
  assert.equal(response.columnSetKey, 'deck-a');
  assert.equal(response.headers.get('x-csrf-token'), 'csrf');
  assert.deepEqual(response.payload, { cursor: 'opaque' });
});

test('対象外URLとHTTPエラーは観測しない', () => {
  const seen: unknown[] = [];
  const stop = watchNotificationXhr(
    (response) => seen.push(response),
    FakeXhr as unknown as { prototype: XMLHttpRequest },
    'https://pro.x.com/'
  );
  const other = new FakeXhr();
  other.open('GET', '/i/api/2/notifications/mentions.json');
  other.send();
  const failed = new FakeXhr();
  failed.status = 500;
  failed.open('GET', '/i/api/2/notifications/all.json');
  failed.send();
  stop();
  assert.deepEqual(seen, []);
});
