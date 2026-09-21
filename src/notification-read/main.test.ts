import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installNotificationReadMain, type MainRuntime } from './main.ts';
import { READ_ENABLED, READ_REQUEST, READ_RESPONSE } from './protocol.ts';

type FetchCall = { input: RequestInfo | URL; init?: RequestInit };
type XhrObserver = Parameters<MainRuntime['observeXhr']>[0];

class FakeWindow {
  fetch: typeof fetch;
  readonly location = { origin: 'https://pro.x.com' };
  readonly posted: unknown[] = [];
  private readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();

  constructor(fetcher: typeof fetch) {
    this.fetch = fetcher;
  }

  addEventListener(
    _type: 'message',
    listener: (event: MessageEvent<unknown>) => void
  ): void {
    this.listeners.add(listener);
  }

  removeEventListener(
    _type: 'message',
    listener: (event: MessageEvent<unknown>) => void
  ): void {
    this.listeners.delete(listener);
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  dispatch(data: unknown): void {
    const event = { source: this, data } as unknown as MessageEvent<unknown>;
    for (const listener of this.listeners) listener(event);
  }
}

const cursorPayload = (cursor: string): unknown => ({
  timeline: { entryId: `cursor-top-${cursor}`, content: { value: cursor } },
});

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const harness = (fetcher: typeof fetch) => {
  const target = new FakeWindow(fetcher);
  let currentColumnSet = 'deck-a';
  let xhrObserver: XhrObserver | null = null;
  let xhrColumnSetKey: (() => string | null) | null = null;
  const seenAccounts: string[][] = [];
  const runtime: MainRuntime = {
    target,
    cookie: () => 'twid=u%3D123',
    observeXhr: (observer, columnSetKeyAtRequest) => {
      xhrObserver = observer;
      xhrColumnSetKey = columnSetKeyAtRequest;
      return () => {
        xhrObserver = null;
        xhrColumnSetKey = null;
      };
    },
  };
  const stop = installNotificationReadMain({
    runtime,
    columnSetKey: () => currentColumnSet,
    accountForColumn: (_columnId, accounts) => {
      seenAccounts.push([...accounts]);
      return accounts.length === 1 ? accounts[0]! : null;
    },
  });
  return {
    target,
    seenAccounts,
    stop,
    setColumnSet: (value: string) => {
      currentColumnSet = value;
    },
    captureXhrColumnSet: () => xhrColumnSetKey!(),
    emitXhr: (columnSetKey: string | null, accountId: string, cursor: string) => {
      const headers = new Headers({ 'x-act-as-user-id': accountId, 'x-csrf-token': 'csrf' });
      xhrObserver!({
        apiOrigin: 'https://pro.x.com',
        columnSetKey,
        headers,
        payload: cursorPayload(cursor),
      });
    },
  };
};

test('設定OFFでは送信せず、ONでは観測したアカウントとカーソルをPOSTする', async () => {
  const calls: FetchCall[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    if (init?.method === 'POST') return new Response('', { status: 200 });
    return Response.json(cursorPayload('cursor-a'));
  };
  const { target, seenAccounts, stop } = harness(fetcher);
  const request = new Request('https://pro.x.com/i/api/2/notifications/all.json', {
    headers: { 'x-act-as-user-id': '456', 'x-csrf-token': 'csrf' },
  });
  await target.fetch(request);
  await flush();

  target.dispatch({ type: READ_REQUEST, requestId: 1, columnId: 'column-a' });
  assert.equal(calls.filter((call) => call.init?.method === 'POST').length, 0);

  target.dispatch({ type: READ_ENABLED, enabled: true });
  target.dispatch({ type: READ_REQUEST, requestId: 2, columnId: 'column-a' });
  await flush();

  assert.deepEqual(seenAccounts, [['456']]);
  const post = calls.find((call) => call.init?.method === 'POST');
  assert.equal(post?.input, 'https://pro.x.com/i/api/2/notifications/all/last_seen_cursor.json');
  assert.equal(String(post?.init?.body), 'cursor=cursor-a');
  assert.equal(new Headers(post?.init?.headers).get('x-csrf-token'), 'csrf');
  assert.deepEqual(target.posted, [
    { type: READ_RESPONSE, requestId: 2, status: 'marked' },
  ]);
  stop();
});

test('本文付きRequestを観測しても元のbodyを使用済みにしない', async () => {
  let bodyUsedAtFetch: boolean | null = null;
  const fetcher: typeof fetch = async (input) => {
    bodyUsedAtFetch = input instanceof Request ? input.bodyUsed : null;
    return new Response(null, { status: 204 });
  };
  const { target, stop } = harness(fetcher);
  const request = new Request('https://pro.x.com/i/api/example', {
    method: 'POST',
    body: 'payload',
  });

  await target.fetch(request);

  assert.equal(bodyUsedAtFetch, false);
  assert.equal(request.bodyUsed, false);
  assert.equal(await request.text(), 'payload');
  stop();
});

test('前のデッキの保留状態と遅延レスポンスを現在のカラムへ割り当てない', async () => {
  const calls: FetchCall[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response('', { status: 200 });
  };
  const controls = harness(fetcher);
  const oldColumnSet = controls.captureXhrColumnSet();
  controls.emitXhr(oldColumnSet, '456', 'pending-before-switch');
  const delayedColumnSet = controls.captureXhrColumnSet();
  controls.setColumnSet('deck-b');
  controls.emitXhr(delayedColumnSet, '456', 'delayed-after-switch');
  controls.target.dispatch({ type: READ_ENABLED, enabled: true });
  controls.target.dispatch({ type: READ_REQUEST, requestId: 3, columnId: 'column-b' });
  await flush();

  assert.deepEqual(controls.seenAccounts, [[]]);
  assert.equal(calls.length, 0);
  assert.deepEqual(controls.target.posted, [
    { type: READ_RESPONSE, requestId: 3, status: 'mismatch' },
  ]);
  controls.stop();
});

test('HTTP失敗を返し、同じ保留カーソルを次の操作で再試行する', async () => {
  const calls: FetchCall[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response('', { status: 403 });
  };
  const controls = harness(fetcher);
  const columnSet = controls.captureXhrColumnSet();
  controls.emitXhr(columnSet, '456', 'retry-cursor');
  controls.target.dispatch({ type: READ_ENABLED, enabled: true });
  controls.target.dispatch({ type: READ_REQUEST, requestId: 4, columnId: 'column-a' });
  await flush();
  controls.target.dispatch({ type: READ_REQUEST, requestId: 5, columnId: 'column-a' });
  await flush();

  assert.equal(calls.length, 2);
  assert.deepEqual(controls.target.posted, [
    { type: READ_RESPONSE, requestId: 4, status: 'failed' },
    { type: READ_RESPONSE, requestId: 5, status: 'failed' },
  ]);
  controls.stop();
});
