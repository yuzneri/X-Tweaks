import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, exportFileName, EXPORT_APP } from './export.ts';
import { emptySettings, fillAll } from './schema.ts';
import type { DetectedDeck } from './storage.ts';

/** Built in local time. The file name uses the device's date, so this form is not swayed by region */
const at = new Date(2026, 7, 24, 10, 30, 0);

const decks: DetectedDeck[] = [
  {
    deckId: 'd1',
    name: '技術',
    columns: [{ columnId: 'col-1', account: 'alice', title: 'ホーム' }],
  },
  { deckId: 'd2', name: null, columns: [] },
];

test('書き出した JSON は、保存されている設定をそのまま含む', () => {
  const settings = fillAll({
    version: 3,
    language: 'ja',
    global: { filter: { enabled: false, rules: [], order: [] } },
    accounts: { alice: { appearance: { columnWidth: 400 } } },
    columns: {},
  });

  const parsed = JSON.parse(buildExport(settings, [], at));

  assert.equal(parsed.app, EXPORT_APP);
  assert.deepEqual(parsed.settings, settings);
  // Being the same shape as what is stored, the importing side needs to look at this alone
  assert.equal(parsed.settings.global.filter.enabled, false);
  assert.equal(parsed.settings.accounts.alice.appearance.columnWidth, 400);
});

test('デッキとカラムを添える（columnId だけでは何のカラムか読めない）', () => {
  const parsed = JSON.parse(buildExport(emptySettings(), decks, at));
  assert.deepEqual(parsed.detectedDecks, decks);
});

test('pro.x.com を開いていなければ、添えるデッキは空になる', () => {
  const parsed = JSON.parse(buildExport(emptySettings(), [], at));
  assert.deepEqual(parsed.detectedDecks, []);
});

test('書き出した時刻は UTC の ISO で入る', () => {
  const parsed = JSON.parse(buildExport(emptySettings(), [], new Date(Date.UTC(2026, 7, 24, 1, 30))));
  assert.equal(parsed.exportedAt, '2026-08-24T01:30:00.000Z');
});

test('人が読めるように字下げしてある', () => {
  const text = buildExport(emptySettings(), [], at);
  assert.ok(text.includes('\n  "app": "x-pro-tweaks"'));
  // It can be read back into the same shape
  assert.deepEqual(JSON.parse(text).settings, emptySettings());
});

test('ファイル名は端末の日付で付く', () => {
  assert.equal(exportFileName(at), 'x-pro-tweaks-2026-08-24.json');
  // The month and the day are padded to two digits
  assert.equal(exportFileName(new Date(2026, 0, 5)), 'x-pro-tweaks-2026-01-05.json');
});
