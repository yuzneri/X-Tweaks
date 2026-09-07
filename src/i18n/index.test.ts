import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from './en.ts';
import { ja } from './ja.ts';
import { isLanguage, messagesFor, resolveLocale } from './index.ts';
import { ACTIONS, COUNT_METRICS, MATCH_MODES, MATCH_TARGETS, TRAIT_KEYS } from '../settings/schema.ts';

test('自動のときはブラウザの言語で決める', () => {
  assert.equal(resolveLocale('auto', 'ja'), 'ja');
  assert.equal(resolveLocale('auto', 'ja-JP'), 'ja');
  // It sometimes arrives in uppercase
  assert.equal(resolveLocale('auto', 'JA-jp'), 'ja');
  // Everything other than Japanese gets English, there being only two translations
  assert.equal(resolveLocale('auto', 'en-US'), 'en');
  assert.equal(resolveLocale('auto', 'zh-TW'), 'en');
  assert.equal(resolveLocale('auto', ''), 'en');
});

test('言語を指定していれば、ブラウザの言語を見ない', () => {
  assert.equal(resolveLocale('ja', 'en-US'), 'ja');
  assert.equal(resolveLocale('en', 'ja-JP'), 'en');
});

test('保存された値が言語かどうかを判別する', () => {
  assert.ok(isLanguage('auto'));
  assert.ok(isLanguage('ja'));
  assert.ok(isLanguage('en'));
  for (const bad of ['fr', '', null, undefined, 0, {}]) {
    assert.equal(isLanguage(bad), false, `${String(bad)} は言語ではない`);
  }
});

test('言語ごとの辞書を返す', () => {
  assert.equal(messagesFor('ja'), ja);
  assert.equal(messagesFor('en'), en);
});

/** Walks the nesting into keys of the form `language.auto`. A function value counts as one leaf */
const leafKeys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? leafKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

/** Looks a value up by a key of the form `language.auto`. For a function message, the function itself is returned */
const valueAt = (o: object, key: string): unknown =>
  key.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown>)[k], o);

/**
 * Missing and extra translations fall to `ja.ts`'s type annotation, so this check
 * should not be needed. It is here anyway to catch cases where that type net is
 * removed, such as switching the dictionaries to being read from JSON.
 */
test('日本語と英語で、辞書のキーがそろっている', () => {
  assert.deepEqual(leafKeys(ja).sort(), leafKeys(en).sort());
});

/**
 * The dictionaries do not import `settings/schema.ts` (schema uses i18n, and a
 * reference the other way would be circular). That leaves "a trait or action was added
 * but its message was forgotten" outside what types can prevent, so it is checked here.
 */
test('性質・対象・照らし合わせ方・動作の文言が、設定の値とちょうど対応している', () => {
  assert.deepEqual(Object.keys(en.traits).sort(), [...TRAIT_KEYS].sort());
  assert.deepEqual(Object.keys(en.countMetrics).sort(), [...COUNT_METRICS].sort());
  assert.deepEqual(Object.keys(en.rules.targets).sort(), [...MATCH_TARGETS].sort());
  assert.deepEqual(Object.keys(en.rules.modes).sort(), [...MATCH_MODES].sort());
  assert.deepEqual(Object.keys(en.actions).sort(), Object.values(ACTIONS).sort());
  // The per-action descriptions have to be written too whenever an action is added
  assert.deepEqual(Object.keys(en.rules.actionHints).sort(), Object.values(ACTIONS).sort());
});

/**
 * The keys that stay the same string in both languages.
 * The ones listed here need no translation (the names of the languages themselves and
 * the like).
 *
 * Adding to this list is the way of saying "this one does not need translating".
 * Forgetting to translate something added to the dictionaries makes the test below
 * fail on a key that is not in the list.
 */
const UNTRANSLATED = [
  'language.ja',
  'language.en',
  // A unit, which does not change with the language
  'size.unit',
  // The parentheses around the relative time. Halfwidth with a leading space in both
  // languages, hence identical (treated like `size.unit`)
  'appearance.timeParens.open',
  'appearance.timeParens.close',
  // The names of the two sites. They are X's own, and are not translated anywhere
  'surfaces.pro',
  'surfaces.x',
  // A name of X's own, written the same way in the Japanese interface
  'xChrome.nav.items.grok',
  'xChrome.drawers.items.grok',
];

test('訳し忘れたまま英語が残っているキーが無い', () => {
  const same = leafKeys(ja).filter((key) => valueAt(ja, key) === valueAt(en, key));
  assert.deepEqual(same.sort(), [...UNTRANSLATED].sort());
});
