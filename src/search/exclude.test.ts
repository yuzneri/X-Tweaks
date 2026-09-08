import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exclusionsFrom,
  excludesAnything,
  namedExclusions,
  isExcluded,
  noExclusions,
  noTerms,
  termsOf,
  type Exclusions,
  type Result,
  type Terms,
} from './exclude.ts';

type PostPatch = Partial<Omit<Result, 'counts'>> & { counts?: Partial<Result['counts']> };

const post = (patch: PostPatch = {}): Result => ({
  isRepost: false,
  text: '',
  displayName: '',
  handle: '',
  ...patch,
  counts: { hashtag: 0, reply: 0, repost: 0, like: 0, view: 0, ...patch.counts },
});

/** 除外の指定。数は `atLeast` に入るので、そこだけ別に混ぜる */
const off = (
  patch: Partial<Omit<Exclusions, 'atLeast'>> & { atLeast?: Partial<Exclusions['atLeast']> } = {}
): Exclusions => {
  const base = noExclusions();
  return { ...base, ...patch, atLeast: { ...base.atLeast, ...patch.atLeast } };
};
const terms = (patch: Partial<Terms> = {}): Terms => ({ ...noTerms(), ...patch });

test('何も指定しなければ、何も除かない', () => {
  assert.equal(excludesAnything(noExclusions()), false);
  assert.equal(isExcluded(post({ isRepost: true, text: '#rust' }), noExclusions(), noTerms()), false);
});

test('リポストを除く', () => {
  assert.equal(isExcluded(post({ isRepost: true }), off({ reposts: true }), noTerms()), true);
  assert.equal(isExcluded(post({ isRepost: false }), off({ reposts: true }), noTerms()), false);
});

test('ハッシュタグが指定の数以上なら除く', () => {
  const from1 = off({ atLeast: { hashtag: 1 } });
  assert.equal(isExcluded(post({ counts: { hashtag: 1 } }), from1, noTerms()), true);
  assert.equal(isExcluded(post({ counts: { hashtag: 0 } }), from1, noTerms()), false);

  // 3つ以上と言えば、2つの投稿は残る
  const from3 = off({ atLeast: { hashtag: 3 } });
  assert.equal(isExcluded(post({ counts: { hashtag: 3 } }), from3, noTerms()), true);
  assert.equal(isExcluded(post({ counts: { hashtag: 2 } }), from3, noTerms()), false);
});

test('タグかどうかは X が決める（数える対象が X 自身のタグリンク）', () => {
  // 「C# を書いた」のような # は X がタグにしないので、数にも入らない。
  // 本文を見て判断していた頃と違い、境界を自前で決める必要が無くなった
  assert.equal(
    isExcluded(post({ text: 'C# を書いた', counts: { hashtag: 0 } }), off({ atLeast: { hashtag: 1 } }), noTerms()),
    false
  );
});

test('反応の数が指定以上なら除く', () => {
  // Xの検索は下限（min_faves など）しか言えないので、上限をこちらで受け持つ
  const from100 = off({ atLeast: { like: 100 } });
  assert.equal(isExcluded(post({ counts: { like: 100 } }), from100, noTerms()), true);
  assert.equal(isExcluded(post({ counts: { like: 99 } }), from100, noTerms()), false);
  // 種類ごとに独立している
  assert.equal(isExcluded(post({ counts: { repost: 500 } }), from100, noTerms()), false);
});

test('Xが数字を出していない件数では除かない', () => {
  // 「出していない」は「0」ではない。読めたものだけで判断する
  assert.equal(
    isExcluded(post({ counts: { view: null } }), off({ atLeast: { view: 1 } }), noTerms()),
    false
  );
});

test('リポストと数の指定は、検索語を知らなくても効く', () => {
  // トレンドから来た検索結果でも、これらはクエリに依らず判定できる
  assert.equal(isExcluded(post({ isRepost: true }), off({ reposts: true }), noTerms()), true);
  assert.equal(
    isExcluded(post({ counts: { like: 10 } }), off({ atLeast: { like: 5 } }), noTerms()),
    true
  );
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

test('印を書き出して読み戻すと、同じものになる', () => {
  const cases: Exclusions[] = [
    noExclusions(),
    off({ reposts: true }),
    off({ nameOnly: true, handleOnly: true }),
    off({ reposts: true, nameOnly: true, handleOnly: true }),
    off({ atLeast: { hashtag: 3 } }),
    off({ reposts: true, atLeast: { hashtag: 1, reply: 2, repost: 30, like: 400, view: 5000 } }),
  ];
  for (const exclusions of cases) {
    assert.deepEqual(exclusionsFrom(namedExclusions(exclusions)), exclusions);
  }
});

test('何も入っていない印は、空の文字列になる', () => {
  assert.equal(namedExclusions(noExclusions()), '');
});

test('書かれていないものは読み戻さない', () => {
  // ページ自身が書ける置き場から読むので、知らない文字列は「何も無い」として扱う
  for (const text of [null, '', '   ', 'reposts,hashtags', 'true', '{"reposts":true}', '__proto__']) {
    assert.deepEqual(exclusionsFrom(text), noExclusions(), JSON.stringify(text));
  }
});

test('知っている名前だけを拾い、残りは捨てる', () => {
  assert.deepEqual(exclusionsFrom('reposts nonsense handleOnly'), off({ reposts: true, handleOnly: true }));
});

test('印はすべて書き出せる', () => {
  // 印を足して namedExclusions の名前に足し忘れると、その印が引き継がれない
  const all = off({
    reposts: true,
    nameOnly: true,
    handleOnly: true,
    atLeast: { hashtag: 1, reply: 1, repost: 1, like: 1, view: 1 },
  });
  const written = namedExclusions(all).split(' ');
  assert.deepEqual(
    written.map((word) => word.split(':')[0]).sort(),
    ['handleOnly', 'hashtag', 'like', 'nameOnly', 'reply', 'repost', 'reposts', 'view']
  );
});

test('旧い hashtags（真偽値だった頃の名前）は「1つ以上」として読む', () => {
  // 開いたままのタブが持っている指定を、この変更で落とさないため
  assert.equal(exclusionsFrom('reposts hashtags').atLeast.hashtag, 1);
  assert.equal(exclusionsFrom('reposts hashtags').reposts, true);
  // 数を伴う新しい書き方はそのまま読む
  assert.equal(exclusionsFrom('hashtag:3').atLeast.hashtag, 3);
  // 数の無い新しい名前は指定なし
  assert.equal(exclusionsFrom('hashtag').atLeast.hashtag, null);
});

test('読めない数は指定なしとして読む', () => {
  for (const text of ['like:0', 'like:-3', 'like:1.5', 'like:あ', 'like:', 'like']) {
    assert.equal(exclusionsFrom(text).atLeast.like, null, text);
  }
  assert.equal(exclusionsFrom('like:100').atLeast.like, 100);
});
