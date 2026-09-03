import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  excludesAnything,
  isExcluded,
  noExclusions,
  noTerms,
  termsOf,
  type Exclusions,
  type Result,
  type Terms,
} from './exclude.ts';

const post = (patch: Partial<Result> = {}): Result => ({
  isRepost: false,
  text: '',
  displayName: '',
  handle: '',
  ...patch,
});

const off = (patch: Partial<Exclusions> = {}): Exclusions => ({ ...noExclusions(), ...patch });
const terms = (patch: Partial<Terms> = {}): Terms => ({ ...noTerms(), ...patch });

test('何も指定しなければ、何も除かない', () => {
  assert.equal(excludesAnything(noExclusions()), false);
  assert.equal(isExcluded(post({ isRepost: true, text: '#rust' }), noExclusions(), noTerms()), false);
});

test('リポストを除く', () => {
  assert.equal(isExcluded(post({ isRepost: true }), off({ reposts: true }), noTerms()), true);
  assert.equal(isExcluded(post({ isRepost: false }), off({ reposts: true }), noTerms()), false);
});

test('ハッシュタグを含む投稿を除く', () => {
  assert.equal(isExcluded(post({ text: 'いい天気 #散歩' }), off({ hashtags: true }), noTerms()), true);
  assert.equal(isExcluded(post({ text: '#朝から 散歩' }), off({ hashtags: true }), noTerms()), true);
  assert.equal(isExcluded(post({ text: 'いい天気' }), off({ hashtags: true }), noTerms()), false);
});

test('タグでない # は拾わない', () => {
  // 語の途中の # はタグの形をしていない
  const タグでない = ['C# を書いた', '詳しくは https://example.com/a#section', '第#1回'];
  for (const text of タグでない) {
    assert.equal(isExcluded(post({ text }), off({ hashtags: true }), noTerms()), false, text);
  }
});

test('# だけで続く語が無ければ拾わない', () => {
  assert.equal(isExcluded(post({ text: 'しるし # だけ' }), off({ hashtags: true }), noTerms()), false);
});

test('リポスト除去とハッシュタグ除去は、検索語を知らなくても効く', () => {
  // トレンドから来た検索結果でも、この2つはクエリに依らず判定できる
  assert.equal(isExcluded(post({ isRepost: true }), off({ reposts: true }), noTerms()), true);
});

test('表示名にだけ当たった投稿を除く', () => {
  const p = post({ displayName: 'Rust 好きの人', text: '今日は寒い', handle: 'alice' });
  assert.equal(isExcluded(p, off({ nameOnly: true }), terms({ words: ['rust'] })), true);
});

test('本文にも当たっていれば、表示名に当たっていても残す', () => {
  const p = post({ displayName: 'Rust 好きの人', text: 'rust を書いた', handle: 'alice' });
  assert.equal(isExcluded(p, off({ nameOnly: true }), terms({ words: ['rust'] })), false);
});

test('@名にだけ当たった投稿を除く', () => {
  const p = post({ displayName: 'アリス', text: '今日は寒い', handle: 'rustacean' });
  assert.equal(isExcluded(p, off({ handleOnly: true }), terms({ words: ['rust'] })), true);
});

test('クエリがその人を名指ししているなら、名前に当たっても残す', () => {
  // from:alice は alice を探す検索。その人の投稿を「名前にしか当たっていない」で
  // 除いたら、何も残らない
  const p = post({ displayName: 'alice', text: '今日は寒い', handle: 'alice' });
  const t = terms({ words: ['alice'], named: ['alice'] });
  assert.equal(isExcluded(p, off({ nameOnly: true, handleOnly: true }), t), false);
});

test('検索語が分からなければ、名前の2つは何もしない', () => {
  // トレンドを押して来た /search、共有リンク、読み込み直し
  const p = post({ displayName: 'Rust 好きの人', text: '今日は寒い', handle: 'rustacean' });
  assert.equal(isExcluded(p, off({ nameOnly: true, handleOnly: true }), noTerms()), false);
});

test('大文字小文字は区別しない', () => {
  const p = post({ displayName: 'RUST fan', text: '今日は寒い', handle: 'alice' });
  assert.equal(isExcluded(p, off({ nameOnly: true }), terms({ words: ['Rust'] })), true);
});

test('複数の語は、どれか1つでも名前に当たり、どれも本文に無ければ除く', () => {
  const p = post({ displayName: 'Go 使い', text: '今日は寒い', handle: 'alice' });
  assert.equal(isExcluded(p, off({ nameOnly: true }), terms({ words: ['rust', 'go'] })), true);
});

test('語のどれかが本文にあれば残す', () => {
  const p = post({ displayName: 'Go 使い', text: 'rust を書いた', handle: 'alice' });
  assert.equal(isExcluded(p, off({ nameOnly: true }), terms({ words: ['rust', 'go'] })), false);
});

// --- termsOf ---

const formOf = (patch: Record<string, unknown> = {}) => ({
  all: '',
  exact: '',
  any: '',
  from: { names: '' },
  to: { names: '' },
  mentioning: { names: '' },
  ...patch,
});

test('語の欄から検索語を集める', () => {
  const t = termsOf(formOf({ all: 'rust lang', exact: 'hello world', any: 'go zig' }));
  assert.deepEqual(t.words, ['rust', 'lang', 'hello', 'world', 'go', 'zig']);
});

test('引用符は語の一部にしない', () => {
  assert.deepEqual(termsOf(formOf({ exact: '"hello world"' })).words, ['hello', 'world']);
});

test('演算子の欄は検索語に入れない', () => {
  // filter:images に当たった投稿は、名前に何かを「含んで」いるわけではない
  assert.deepEqual(termsOf(formOf({ from: { names: 'alice' } })).words, []);
});

test('名指しされたアカウントを集め、@ を外す', () => {
  const t = termsOf(formOf({ from: { names: '@alice bob' }, mentioning: { names: 'carol' } }));
  assert.deepEqual(t.named, ['alice', 'bob', 'carol']);
});
