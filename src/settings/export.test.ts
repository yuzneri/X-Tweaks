import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, exportFileName, EXPORT_APP } from './export.ts';
import { emptySettings, fillAll, SCHEMA_VERSION } from './schema.ts';
import type { DetectedGroup } from './storage.ts';

/** Built in local time. The file name uses the device's date, so this form is not swayed by region */
const at = new Date(2026, 7, 24, 10, 30, 0);

const decks: DetectedGroup[] = [
  {
    surface: 'pro',
    id: 'd1',
    name: '技術',
    scopes: [
      { key: 'col-1', account: 'alice', title: 'ホーム' },
      { key: 'col-2', account: 'alice', title: '検索' },
    ],
  },
  {
    surface: 'pro',
    id: 'd2',
    name: null,
    scopes: [{ key: 'col-3', account: 'bob', title: '通知' }],
  },
];

/** col-1 にだけ設定がある状態 */
const configured = fillAll({ columns: { 'col-1': { appearance: { columnWidth: 400 } } } });

/**
 * 絞り込み・外観の全項目に値が入った階層。
 *
 * 書き出しが落としてよいのは「未設定」だけなので、値の入った項目を一つでも落としていな
 * いかは、項目を全部埋めた土台でしか見られない。項目を足したらここにも足す。
 */
const fullNode = () => ({
  filter: {
    enabled: false,
    rules: [
      {
        id: 'r1',
        conditions: [{ kind: 'text', target: 'text', mode: 'contains', pattern: '宣伝', caseSensitive: true }],
        action: 'highlight',
        color: '#f9188026',
        label: '宣伝',
        enabled: false,
      },
      {
        id: 'r2',
        conditions: [
          { kind: 'trait', trait: 'repost', negate: true },
          { kind: 'age', direction: 'newer', minutes: 90 },
        ],
        action: 'hide',
      },
    ],
    // 作られた順とは違う並びにして、並びが保たれることも見る
    order: ['r2', 'r1'],
  },
  appearance: {
    enabled: false,
    columnWidth: 400,
    compact: true,
    fontSize: 15,
    maxLines: 8,
    wordsShown: 120,
    collapseNewlines: true,
    colors: {
      background: '#001122',
      text: '#eeeeee',
      name: '#ffffff',
      meta: '#888888',
      link: '#1d9bf0',
      border: '#333333',
      columnTitle: '#cccccc',
      columnHeader: '#222222',
      composeBackground: '#101010',
      pageBackground: '#050505',
    },
    media: { maxThumbHeight: 200, style: 'caption' },
    autoContrast: false,
    highlightBase: 'theme',
    timeFormat: 'both',
    cardStyle: 'text',
    quoteStyle: 'mark',
    cleared: ['fontSize', 'colors.background'],
  },
});

/** 全項目に値が入った設定。書き出しで何も落ちないことを見るための土台 */
const full = fillAll({
  version: 3,
  language: 'ja',
  compose: { reopen: true, keepHashtags: true },
  xChrome: {
    wideTimeline: true,
    composeBox: false,
    autoNewPosts: true,
    grokDrawer: false,
    chatDrawer: false,
    rail: { trends: false },
    nav: { grok: false },
    menu: { spaces: false },
  },
  search: { form: true },
  injected: { pro: { discoverMore: false }, x: { whoToFollow: false } },
  genericAlts: ['画像', '動画'],
  global: fullNode(),
  accounts: { alice: fullNode() },
  surfaces: { pro: fullNode(), x: fullNode() },
  surfaceAccounts: { pro: { alice: fullNode() }, x: { bob: fullNode() } },
  columns: { 'col-1': fullNode(), 'view:home': fullNode() },
});

/** 一部にしか値が入っていない設定。何が落ちるかを見るための土台 */
const sparse = fillAll({
  accounts: { alice: { appearance: { cleared: ['fontSize'] } } },
  surfaces: { pro: { appearance: { colors: { background: '#001122' } } } },
  columns: { 'col-1': { appearance: { compact: true } } },
});

test('書き出した JSON は、保存されている設定をそのまま含む', () => {
  const parsed = JSON.parse(buildExport(full, [], at));

  assert.equal(parsed.app, EXPORT_APP);
  // 未設定の項目は書かれないので、読み込みと同じ道（fillAll）を通してから比べる
  assert.deepEqual(fillAll(parsed.settings), full);
});

test('未設定の項目は書き出さない（null・空リスト・空になった入れ物）', () => {
  const parsed = JSON.parse(buildExport(sparse, [], at));
  const column = parsed.settings.columns['col-1'];

  // 値のない色は項目ごと、色が全部そうなら colors ごと消える。空の cleared も同じ
  assert.deepEqual(Object.keys(column.appearance), ['compact']);
  // 規則が空、並びも空、入切も未指定なら filter ごと消える
  assert.deepEqual(Object.keys(column), ['appearance']);
  // 中身のあるリストは残る
  assert.deepEqual(parsed.settings.accounts.alice.appearance.cleared, ['fontSize']);
  // 何も入っていない階層は、キーごと消える（x.com のサイト階層は触っていない）
  assert.deepEqual(Object.keys(parsed.settings.surfaces), ['pro']);
});

test('false は書き出す（未指定とは意味が違う）', () => {
  const parsed = JSON.parse(buildExport(full, [], at));

  // 「この階層では絞り込まない」と「未指定」は別物
  assert.equal(parsed.settings.global.filter.enabled, false);
  // x.com の項目は未指定なら「出したまま」なので、消すには false が要る
  assert.equal(parsed.settings.xChrome.composeBox, false);
  assert.equal(parsed.settings.xChrome.rail.trends, false);
  assert.equal(parsed.settings.injected.x.whoToFollow, false);
  // 規則の入切も同じ。止めてある規則が、書き出しを経て動き出してはいけない
  assert.equal(parsed.settings.global.filter.rules[0].enabled, false);
});

test('何も設定していなければ、階層は一つも書き出されない', () => {
  const parsed = JSON.parse(buildExport(emptySettings(), [], at));

  // 残るのは真偽値で持つもの（未指定という状態がないので、既定値でも値は値）と版・言語
  assert.deepEqual(Object.keys(parsed.settings).sort(), [
    'compose',
    'injected',
    'language',
    'search',
    'version',
    'xChrome',
  ]);
  // 読み込み側は版を見て弾くので、これは落ちてはいけない
  assert.equal(parsed.settings.version, SCHEMA_VERSION);
  assert.deepEqual(fillAll(parsed.settings), emptySettings());
});

test('中身が空の階層は、キーごと落ちる（設定画面で空にしたものと同じ扱い）', () => {
  const settings = fillAll({ columns: { 'col-1': {}, 'col-2': { appearance: { compact: true } } } });
  const parsed = JSON.parse(buildExport(settings, [], at));

  assert.deepEqual(Object.keys(parsed.settings.columns), ['col-2']);
});

test('順序のあるリストは、要素を抜かない', () => {
  const settings = fillAll({
    global: {
      filter: {
        rules: [
          { id: 'r1', conditions: [{ kind: 'trait', trait: 'ad' }], action: 'hide' },
          { id: 'r2', conditions: [{ kind: 'trait', trait: 'repost' }], action: 'hide' },
        ],
        order: ['r2', 'r1'],
      },
    },
  });
  const parsed = JSON.parse(buildExport(settings, [], at));

  assert.deepEqual(parsed.settings.global.filter.order, ['r2', 'r1']);
  assert.equal(parsed.settings.global.filter.rules.length, 2);
});

test('設定のあるカラムに名前を添える（columnId だけでは何のカラムか読めない）', () => {
  const parsed = JSON.parse(buildExport(configured, decks, at));
  assert.deepEqual(parsed.detectedDecks, [
    {
      surface: 'pro',
      id: 'd1',
      name: '技術',
      scopes: [{ key: 'col-1', account: 'alice', title: 'ホーム' }],
    },
  ]);
});

test('見つからなくなったカラムこそ名前を添える（印も残す）', () => {
  const gone: DetectedGroup[] = [
    {
      surface: 'pro',
      id: 'd1',
      name: '技術',
      scopes: [
        { key: 'col-1', account: 'alice', title: 'ホーム', missing: true },
        { key: 'col-2', account: 'alice', title: '検索', missing: true },
      ],
    },
  ];
  const parsed = JSON.parse(buildExport(configured, gone, at));

  // columnId しか手がかりのない設定なので、名前が要るのはむしろこちら
  assert.deepEqual(parsed.detectedDecks[0].scopes, [
    { key: 'col-1', account: 'alice', title: 'ホーム', missing: true },
  ]);
});

test('設定のないカラムしかないデッキは、デッキごと落とす', () => {
  const parsed = JSON.parse(buildExport(configured, decks, at));
  assert.deepEqual(
    parsed.detectedDecks.map((deck: DetectedGroup) => deck.id),
    ['d1']
  );
});

test('キーはあっても中身が空なら添えない（読み込んだ設定に残りうる）', () => {
  const settings = fillAll({ columns: { 'col-1': {} } });
  const parsed = JSON.parse(buildExport(settings, decks, at));
  assert.ok(!('detectedDecks' in parsed));
});

test('設定がどれにも無ければ、デッキの項目ごと書かれない', () => {
  const parsed = JSON.parse(buildExport(emptySettings(), decks, at));
  assert.ok(!('detectedDecks' in parsed));
});

test('pro.x.com を開いていなければ、デッキの項目ごと書かれない', () => {
  const parsed = JSON.parse(buildExport(configured, [], at));
  assert.ok(!('detectedDecks' in parsed));
});

test('書き出した時刻は UTC の ISO で入る', () => {
  const parsed = JSON.parse(buildExport(emptySettings(), [], new Date(Date.UTC(2026, 7, 24, 1, 30))));
  assert.equal(parsed.exportedAt, '2026-08-24T01:30:00.000Z');
});

test('人が読めるように字下げしてある', () => {
  const text = buildExport(emptySettings(), [], at);
  assert.ok(text.includes('\n  "app": "x-pro-tweaks"'));
  // It can be read back into the same shape
  assert.deepEqual(fillAll(JSON.parse(text).settings), emptySettings());
});

test('ファイル名は端末の日付で付く', () => {
  assert.equal(exportFileName(at), 'x-pro-tweaks-2026-08-24.json');
  // The month and the day are padded to two digits
  assert.equal(exportFileName(new Date(2026, 0, 5)), 'x-pro-tweaks-2026-01-05.json');
});
