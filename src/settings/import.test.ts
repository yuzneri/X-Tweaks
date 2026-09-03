import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImport } from './import.ts';
import { buildExport } from './export.ts';
import { ACTIONS, fillAll, SCHEMA_VERSION, type Rule } from './schema.ts';

const at = new Date(2026, 7, 24, 10, 0);

const rule = (id: string, pattern: string): Rule => ({
  id,
  conditions: [
    { kind: 'text', target: 'text', mode: 'contains', pattern, caseSensitive: false, negate: false },
  ],
  action: ACTIONS.COLLAPSE,
  color: null,
  label: '',
  enabled: true,
});

/** Settings with a rule in every tier, using the same id across them */
const shared = () =>
  fillAll({
    version: SCHEMA_VERSION,
    language: 'ja',
    global: { filter: { rules: [rule('same', 'あ')], order: ['same'] } },
    accounts: { alice: { filter: { rules: [rule('same', 'い')], order: ['same'] } } },
    surfaces: { x: { filter: { rules: [rule('same', 'え')], order: ['same'] } } },
    surfaceAccounts: {
      x: { alice: { filter: { rules: [rule('same', 'お')], order: ['same'] } } },
    },
    columns: { 'col-1': { filter: { rules: [rule('same', 'う')], order: ['same'] } } },
  });

const exported = (settings: unknown) => buildExport(settings as never, [], at);

test('書き出したものをそのまま読み戻せる', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    language: 'ja',
    global: { filter: { enabled: false }, appearance: { columnWidth: 400 } },
    accounts: { alice: { appearance: { colors: { text: '#ff0000' } } } },
  });

  const result = parseImport(exported(settings));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.settings.global.filter.enabled, false);
  assert.equal(result.settings.global.appearance.columnWidth, 400);
  assert.equal(result.settings.accounts.alice!.appearance.colors.text, '#ff0000');
  assert.equal(result.settings.language, 'ja');
});

test('ルールの id は読み込むときに振り直す（段をまたぐ衝突を避ける）', () => {
  const result = parseImport(exported(shared()));
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const ids = [
    result.settings.global.filter.rules[0]!.id,
    result.settings.accounts.alice!.filter.rules[0]!.id,
    result.settings.surfaces.x.filter.rules[0]!.id,
    result.settings.surfaceAccounts.x.alice!.filter.rules[0]!.id,
    result.settings.columns['col-1']!.filter.rules[0]!.id,
  ];
  // All five ended up with different ids
  assert.equal(new Set(ids).size, 5);
  // The original id is gone
  assert.ok(!ids.includes('same'));
  // The references in the order were updated too
  assert.deepEqual(result.settings.global.filter.order, [ids[0]]);
  assert.deepEqual(result.settings.accounts.alice!.filter.order, [ids[1]]);
  assert.deepEqual(result.settings.surfaces.x.filter.order, [ids[2]]);
  assert.deepEqual(result.settings.surfaceAccounts.x.alice!.filter.order, [ids[3]]);
  assert.deepEqual(result.settings.columns['col-1']!.filter.order, [ids[4]]);
});

test('並びの順は振り直しても変わらない', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    global: { filter: { rules: [rule('a', 'あ'), rule('b', 'い')], order: ['b', 'a'] } },
  });

  const result = parseImport(exported(settings));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const [first, second] = result.settings.global.filter.rules;
  // The order still has the 「い」 rule first
  assert.deepEqual(result.settings.global.filter.order, [second!.id, first!.id]);
  assert.equal(first!.conditions[0]!.kind === 'text' && first!.conditions[0]!.pattern, 'あ');
});

test('JSON として読めなければ断る（保存には手を付けない）', () => {
  const result = parseImport('{ これは JSON ではない');
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.kind, 'badJson');
  // It says what was wrong
  assert.ok(result.error.kind === 'badJson' && result.error.detail.length > 0);
});

test('この拡張が書き出したものでなければ断る', () => {
  assert.equal(parseImport('{"app":"other","settings":{}}').ok, false);
  assert.equal(parseImport('{"settings":{}}').ok, false);
  // Arrays and bare values are treated the same
  assert.equal(parseImport('[]').ok, false);
  assert.equal(parseImport('"x-pro-tweaks"').ok, false);

  const result = parseImport('{"app":"other","settings":{}}');
  if (result.ok) return;
  assert.equal(result.error.kind, 'notOurs');
});

test('保存形式の版が違えば読み替えずに断る', () => {
  const older = `{"app":"x-pro-tweaks","settings":{"version":2,"global":{}}}`;
  const newer = `{"app":"x-pro-tweaks","settings":{"version":99,"global":{}}}`;
  const missing = `{"app":"x-pro-tweaks","settings":{"global":{}}}`;

  for (const text of [older, newer, missing]) {
    const result = parseImport(text);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, 'badVersion');
  }

  // The refusal carries the version that could be read (it is shown on screen)
  const result = parseImport(older);
  if (!result.ok && result.error.kind === 'badVersion') assert.equal(result.error.version, 2);
});

test('欠けている項目や型違いは既定値に倒れる（保存を読むときと同じ経路）', () => {
  const text = `{"app":"x-pro-tweaks","settings":{"version":${SCHEMA_VERSION},
    "language":"klingon","global":{"appearance":{"columnWidth":"wide"}},"accounts":"なにか"}}`;

  const result = parseImport(text);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.settings.language, 'auto');
  assert.equal(result.settings.global.appearance.columnWidth, null);
  assert.deepEqual(result.settings.accounts, {});
});

test('投稿フォームの設定も書き出しと読み戻しを通り抜ける', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    compose: { reopen: true, keepHashtags: true },
  });

  const result = parseImport(exported(settings));

  assert.equal(result.ok, true);
  // The export carries the whole stored shape, so a new key needs no handling of its own.
  // The test is here to catch it if that ever stops being true
  assert.deepEqual(result.ok && result.settings.compose, { reopen: true, keepHashtags: true });
});

test('x.com の外枠の設定も書き出しと読み戻しを通り抜ける', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    xChrome: {
      wideTimeline: true,
      composeBox: false,
      nav: { grok: false },
    },
  });

  const result = parseImport(exported(settings));

  assert.equal(result.ok, true);
  // Here for the same reason as the compose form above: the export carries the whole
  // stored shape, and this is what notices if that ever stops being true
  assert.equal(result.ok && result.settings.xChrome.wideTimeline, true);
  assert.equal(result.ok && result.settings.xChrome.composeBox, false);
  assert.equal(result.ok && result.settings.xChrome.nav.grok, false);
  // An item nobody took away comes back as it was, not missing
  assert.equal(result.ok && result.settings.xChrome.nav.premium, true);
});

test('サイトごとの差し込みの設定も、混ざらずに書き出しと読み戻しを通り抜ける', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    injected: { x: { whoToFollow: false }, pro: { discoverMore: false } },
  });

  const result = parseImport(exported(settings));

  assert.equal(result.ok, true);
  // Two sites keeping different answers is the whole point of this setting, so what is
  // checked is that neither ends up wearing the other's
  assert.deepEqual(result.ok && result.settings.injected, {
    pro: { whoToFollow: true, discoverMore: false },
    x: { whoToFollow: false, discoverMore: true },
  });
});

test('サイト段の設定も、混ざらずに書き出しと読み戻しを通り抜ける', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    surfaces: {
      pro: { appearance: { fontSize: 15 } },
      x: { appearance: { colors: { pageBackground: '#14293d' } } },
    },
  });

  const result = parseImport(exported(settings));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  // The export carries the whole stored shape; this is what notices if a tier ever
  // stops being carried
  assert.equal(result.settings.surfaces.pro.appearance.fontSize, 15);
  assert.equal(result.settings.surfaces.x.appearance.colors.pageBackground, '#14293d');
  // Neither site is wearing the other's
  assert.equal(result.settings.surfaces.x.appearance.fontSize, null);
});

test('「X の表示のまま」に戻す指定も、書き出しと読み戻しを通り抜ける', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    surfaces: { x: { appearance: { cleared: ['colors.text', 'fontSize'] } } },
  });

  const result = parseImport(exported(settings));

  assert.equal(result.ok, true);
  // 打ち消しは値ではなく「値が無いこと」の指定なので、落ちても静かに効かなくなるだけ。
  // 書き出しが項目を選ぶ形に変わったときに気づけるようにしておく
  assert.deepEqual(result.ok && result.settings.surfaces.x.appearance.cleared, [
    'colors.text',
    'fontSize',
  ]);
});

test('X の文言も書き出しと読み戻しを通り抜ける', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    genericAlts: ['画像', '埋め込み動画'],
  });

  const result = parseImport(exported(settings));

  assert.equal(result.ok, true);
  // Carried along, so a device that has them does not have to work them out again
  assert.deepEqual(result.ok && result.settings.genericAlts, ['画像', '埋め込み動画']);
});
