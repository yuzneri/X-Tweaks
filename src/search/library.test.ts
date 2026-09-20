import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyScopes } from './query.ts';

type Listener = (changes: Record<string, { newValue?: unknown }>, area: string) => void;
const store = new Map<string, unknown>();
const listeners = new Set<Listener>();
let failSet = false;

Object.assign(globalThis, {
  browser: {
    storage: {
      local: {
        get: async (key: string) => store.has(key) ? { [key]: store.get(key) } : {},
        set: async (items: Record<string, unknown>) => {
          if (failSet) throw new Error('storage unavailable');
          for (const [key, newValue] of Object.entries(items)) {
            store.set(key, newValue);
            for (const listener of listeners) listener({ [key]: { newValue } }, 'local');
          }
        },
      },
      onChanged: {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
      },
    },
  },
});

const {
  HISTORY_LIMIT,
  clearHistory,
  entryPath,
  loadLibrary,
  recordHistory,
  replaceSaved,
  removeSaved,
  saveSearch,
  subscribeLibrary,
} = await import('./library.ts');

const scopes = emptyScopes();
const entry = (query: string) => ({ query, scopes });

beforeEach(() => {
  store.clear();
  listeners.clear();
  failSet = false;
});

test('検索履歴は同じ条件を最新に移し、50件まで残す', async () => {
  for (let i = 0; i <= HISTORY_LIMIT; i++) {
    await recordHistory(entry(`term ${i}`), i);
  }
  let library = await loadLibrary();
  assert.equal(library.history.length, HISTORY_LIMIT);
  assert.equal(library.history[0]?.query, `term ${HISTORY_LIMIT}`);
  assert.equal(library.history.at(-1)?.query, 'term 1');

  await recordHistory(entry('term 5'), 100);
  library = await loadLibrary();
  assert.equal(library.history.length, HISTORY_LIMIT);
  assert.equal(library.history[0]?.query, 'term 5');
  assert.equal(library.history[0]?.visitedAt, 100);
  assert.equal(library.history.filter((item) => item.query === 'term 5').length, 1);
});

test('タブと絞り込みが違う検索は別の履歴として残る', async () => {
  const first = entry('cats');
  const second = { query: 'cats', scopes: { ...scopes, tab: 'user' as const, followedOnly: true } };
  await recordHistory(first, 1);
  await recordHistory(second, 2);
  assert.equal((await loadLibrary()).history.length, 2);
  assert.notEqual(entryPath(first), entryPath(second));
});

test('保存した検索は同じ条件なら名前を更新し、削除できる', async () => {
  await saveSearch(entry('cats'), ' 猫 ');
  await saveSearch(entry('dogs'), '犬');
  await saveSearch(entry('cats'), '新しい名前');
  assert.deepEqual((await loadLibrary()).saved.map((item) => item.name), ['新しい名前', '犬']);
  await removeSaved(entry('cats'));
  assert.deepEqual((await loadLibrary()).saved.map((item) => item.name), ['犬']);
});

test('履歴の消去は保存した検索を残す', async () => {
  await recordHistory(entry('cats'), 1);
  await saveSearch(entry('cats'), '猫');
  await clearHistory();
  assert.equal((await loadLibrary()).history.length, 0);
  assert.equal((await loadLibrary()).saved.length, 1);
});

test('保存した検索の置き換えは履歴を残す', async () => {
  await recordHistory(entry('cats'), 1);
  await saveSearch(entry('cats'), '猫');
  await replaceSaved([{ ...entry('dogs'), name: '犬' }]);
  const library = await loadLibrary();
  assert.equal(library.history[0]?.query, 'cats');
  assert.deepEqual(library.saved.map((item) => item.name), ['犬']);
});

test('同時に始まった履歴と保存の更新が両方残る', async () => {
  await Promise.all([
    recordHistory(entry('cats'), 1),
    saveSearch(entry('dogs'), '犬'),
  ]);
  const library = await loadLibrary();
  assert.equal(library.history[0]?.query, 'cats');
  assert.equal(library.saved[0]?.query, 'dogs');
});

test('変更は購読先に届き、解除後は届かない', async () => {
  const received: number[] = [];
  const unsubscribe = subscribeLibrary((library) => received.push(library.saved.length));
  await saveSearch(entry('cats'), '猫');
  unsubscribe();
  await saveSearch(entry('dogs'), '犬');
  assert.deepEqual(received, [1]);
});

test('失敗した保存は前のデータを壊さず、次の保存を妨げない', async () => {
  await saveSearch(entry('cats'), '猫');
  failSet = true;
  await assert.rejects(saveSearch(entry('dogs'), '犬'), /storage unavailable/);
  failSet = false;
  await saveSearch(entry('birds'), '鳥');
  assert.deepEqual((await loadLibrary()).saved.map((item) => item.name), ['鳥', '猫']);
});

test('未知の形式は上書きせずに失敗する', async () => {
  store.set('searchLibrary', { version: 99, history: [], saved: [] });
  await assert.rejects(recordHistory(entry('cats')), /Unsupported search library format/);
  assert.deepEqual(store.get('searchLibrary'), { version: 99, history: [], saved: [] });
});
