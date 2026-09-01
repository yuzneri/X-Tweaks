import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// storage.ts resolves the extension APIs at load time, so the fake goes in before the import
type Change = { newValue?: unknown; oldValue?: unknown };
type Listener = (changes: Record<string, Change>, areaName: string) => void;

const store = new Map<string, unknown>();
const listeners: Listener[] = [];

Object.assign(globalThis, {
  browser: {
    storage: {
      local: {
        get: async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {}),
        set: async (items: Record<string, unknown>) => {
          for (const [key, newValue] of Object.entries(items)) {
            const oldValue = store.get(key);
            store.set(key, newValue);
            for (const listener of [...listeners]) listener({ [key]: { newValue, oldValue } }, 'local');
          }
        },
      },
      onChanged: {
        addListener: (listener: Listener) => listeners.push(listener),
        removeListener: (listener: Listener) => {
          const i = listeners.indexOf(listener);
          if (i >= 0) listeners.splice(i, 1);
        },
      },
    },
  },
});

const { load, loadDetected, loadPaused, save, saveDetected, savePaused, subscribe, subscribeDetected, subscribePaused } =
  await import('./storage.ts');
const { emptySettings } = await import('./schema.ts');

beforeEach(() => {
  store.clear();
  listeners.length = 0;
});

test('何も保存されていなければ既定値を返し、読めない版も無い', async () => {
  const { settings, unreadable } = await load();
  assert.equal(unreadable, null);
  assert.deepEqual(settings.global.filter.rules, []);
});

test('保存した設定を読み戻せる', async () => {
  const settings = emptySettings();
  settings.global.filter.rules.push({
    id: 'r1',
    conditions: [
      { kind: 'text', target: 'text', mode: 'contains', pattern: '宣伝', caseSensitive: false, negate: false },
    ],
    action: 'collapse',
    color: null,
    label: '',
    enabled: true,
  });
  await save(settings);

  const loaded = await load();
  assert.equal(loaded.unreadable, null);
  assert.deepEqual(loaded.settings.global.filter.rules, settings.global.filter.rules);
});

test('この拡張より新しい形式は解釈せず、既定値で起動して版を知らせる', async () => {
  const future = { version: 999, global: { filter: { rules: [{ id: 'k1', pattern: '大事' }] } } };
  store.set('settings', future);

  // It carries no explanatory text, only the stored version and whether it is newer or older
  const { settings, unreadable } = await load();
  assert.deepEqual(unreadable, { version: 999, newer: true });
  assert.deepEqual(settings.global.filter.rules, []);
  // Settings that could not be read are not overwritten. Updating the extension lets them be used again
  assert.equal(store.get('settings'), future);
});

test('古い形式も読み替えず、既定値で起動して版を知らせる', async () => {
  // A rule in format 2, incompatible with the current shape
  const old = { version: 2, global: { filter: { rules: [{ id: 'k1', pattern: '大事' }] } } };
  store.set('settings', old);

  const { settings, unreadable } = await load();
  assert.deepEqual(unreadable, { version: 2, newer: false });
  assert.deepEqual(settings.global.filter.rules, []);
  // The original data stays until it is saved over. An earlier version of the extension can be gone back to
  assert.equal(store.get('settings'), old);
});

test('変更の購読は、解除すると届かなくなる', async () => {
  const received: number[] = [];
  const unsubscribe = subscribe((next) => received.push(next.global.filter.rules.length));

  await save(emptySettings());
  assert.deepEqual(received, [0]);

  unsubscribe();
  await save(emptySettings());
  assert.deepEqual(received, [0]);
});

test('local 以外の領域や、別のキーの変更は無視する', async () => {
  const received: number[] = [];
  const unsubscribe = subscribe(() => received.push(1));

  // A change in the sync area (syncing with another device). This extension uses local only
  for (const listener of [...listeners]) listener({ settings: { newValue: {} } }, 'sync');
  // Still local, but a key used by another extension or, in future, for another purpose
  for (const listener of [...listeners]) listener({ other: { newValue: {} } }, 'local');

  assert.deepEqual(received, []);
  unsubscribe();
});

const DECKS = [
  { id: 'd1', name: '技術' },
  { id: 'd2', name: 'ニュース' },
];

/** No column has settings (the default). One that goes out of sight is not dropped */
const NONE: ReadonlySet<string> = new Set();

test('検出したカラムは、デッキごとに書いたとおりに読み戻せる', async () => {
  await saveDetected('pro', DECKS, 'd1', [{ key: 'c1', account: 'alice', title: 'ホーム' }], NONE, true);
  assert.deepEqual(await loadDetected(), {
    currentGroupId: 'd1',
    groups: [
      { surface: 'pro', id: 'd1', name: '技術', scopes: [{ key: 'c1', account: 'alice', title: 'ホーム' }] },
      // A deck that is not on screen has no columns known yet
      { surface: 'pro', id: 'd2', name: 'ニュース', scopes: [] },
    ],
  });
});

test('別のデッキへ移っても、前のデッキのカラムは残る', async () => {
  // A deck that is not on screen is not touched
  const configured = new Set(['c1']);
  await saveDetected('pro', DECKS, 'd1', [{ key: 'c1', account: 'alice', title: 'ホーム' }], configured, true);
  await saveDetected('pro', DECKS, 'd2', [{ key: 'c2', account: 'bob', title: '通知' }], configured, true);
  const found = await loadDetected();
  assert.equal(found.currentGroupId, 'd2');
  assert.deepEqual(
    found.groups.map((deck) => [deck.id, deck.scopes.map((column) => column.key)]),
    [['d1', ['c1']], ['d2', ['c2']]]
  );
});

test('検出したカラムが壊れていても、読めるものだけを返す', async () => {
  store.set('detected', {
    currentGroupId: 'd1',
    groups: [
      {
        surface: 'pro',
        id: 'd1',
        name: '技術',
        scopes: [
          { key: 'c1', account: 'alice', title: 'ホーム' },
          'これは配列の要素として不正',
          // A scope whose key cannot be read is not recorded
          { key: 42, account: '', title: undefined },
        ],
      },
      { surface: 'pro', name: 'ID の無いデッキ' },
      // Which site it belongs to has to be known, and has to be one we know
      { id: 'd3', name: 'サーフェス無し', scopes: [] },
      { surface: 'mastodon', id: 'd4', name: '知らないサーフェス', scopes: [] },
    ],
  });
  assert.deepEqual(await loadDetected(), {
    currentGroupId: 'd1',
    groups: [
      { surface: 'pro', id: 'd1', name: '技術', scopes: [{ key: 'c1', account: 'alice', title: 'ホーム' }] },
    ],
  });
});

test('何も検出していなければ空', async () => {
  assert.deepEqual(await loadDetected(), { groups: [], currentGroupId: null });
  store.set('detected', 'ごみ');
  assert.deepEqual(await loadDetected(), { groups: [], currentGroupId: null });
});

test('中身が変わらないときは書かない。設定画面の描き直しを起こさないため', async () => {
  const columns = [{ key: 'c1', account: 'alice', title: 'ホーム' }];
  const notices = [] as number[];
  const unsubscribe = subscribeDetected(() => notices.push(1));

  await saveDetected('pro', DECKS, 'd1', columns, NONE, true);
  await saveDetected('pro', DECKS, 'd1', [...columns], NONE, false);
  await saveDetected('pro', DECKS, 'd1', [{ key: 'c2', account: 'bob', title: '通知' }], NONE, false);

  assert.deepEqual(notices, [1, 1]);
  unsubscribe();
});

test('一時停止は設定とは別の鍵に置く', async () => {
  // With nothing stored, it is running
  assert.equal(await loadPaused(), false);

  await savePaused(true);
  assert.equal(await loadPaused(), true);
  // It does not go into the settings (and is not included in an export)
  assert.equal((await load()).settings.global.filter.rules.length, 0);
  assert.equal(store.has('settings'), false);

  await savePaused(false);
  assert.equal(await loadPaused(), false);
});

test('読めない値は「動いている」に倒す（止まったまま気づけないほうが困る）', async () => {
  store.set('paused', 'yes');
  assert.equal(await loadPaused(), false);
  store.set('paused', 1);
  assert.equal(await loadPaused(), false);
  store.set('paused', null);
  assert.equal(await loadPaused(), false);
});

test('一時停止の変更を購読できる', async () => {
  const seen: boolean[] = [];
  const stop = subscribePaused((paused) => seen.push(paused));

  await savePaused(true);
  await savePaused(false);
  stop();
  await savePaused(true);

  assert.deepEqual(seen, [true, false]);
});

test('設定の購読は一時停止の変更で起きない（鍵が違う）', async () => {
  const seen: number[] = [];
  const stop = subscribe((next) => seen.push(next.global.filter.rules.length));
  await savePaused(true);
  stop();
  assert.deepEqual(seen, []);
});
