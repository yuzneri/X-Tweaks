import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  canEmphasizeWith,
  DEFAULT_EMPHASIS_COLOR,
  DEFAULT_HIGHLIGHT_COLOR,
  emptyNode,
  defaultOrder,
  emptySettings,
  fillAll,
  newRuleId,
  ruleName,
  type Condition,
  type FilterNode,
  type MatchTarget,
  type Rule,
  type Settings,
  type TraitKey,
} from '../settings/schema.ts';
import { resolve, type ColumnScope } from '../settings/resolve.ts';
import { messagesFor } from '../i18n/index.ts';

/** The dictionary used for judging. Checked in Japanese (the i18n tests cover the difference from English) */
const m = messagesFor('ja');
import {
  adJudgementBroken,
  compileFilter,
  decide,
  type Decision,
  type Post,
} from './decide.ts';

/**
 * A post's values are held as lists, but one is enough for most checks here.
 * A single value can be passed as a bare string, and null as "has no value" (an empty list).
 */
type PostPatch = Partial<Omit<Post, 'values'>> & {
  [K in keyof Post['values']]?: string | string[] | null;
};

const some = (value: string | string[] | null | undefined, fallback: string[]): string[] => {
  if (value === undefined) return fallback;
  if (value === null) return [];
  return Array.isArray(value) ? value : [value];
};

const post = (patch: PostPatch = {}): Post => ({
  values: {
    text: some(patch.text, ['ふつうの投稿']),
    quotedText: some(patch.quotedText, []),
    screenName: some(patch.screenName, ['alice']),
    displayName: some(patch.displayName, ['アリス']),
    repostedBy: some(patch.repostedBy, []),
    quotedScreenName: some(patch.quotedScreenName, []),
    quotedDisplayName: some(patch.quotedDisplayName, []),
    replyTo: some(patch.replyTo, []),
    pollChoice: some(patch.pollChoice, []),
    cardDomain: some(patch.cardDomain, []),
    cardTitle: some(patch.cardTitle, []),
    spaceName: some(patch.spaceName, []),
    articleText: some(patch.articleText, []),
  },
  isRepost: patch.isRepost ?? false,
  isQuote: patch.isQuote ?? false,
  isReply: patch.isReply ?? false,
  hasMedia: patch.hasMedia ?? false,
  communityNote: patch.communityNote ?? null,
  poll: patch.poll ?? null,
  hasSpace: patch.hasSpace ?? false,
  hasArticle: patch.hasArticle ?? false,
  hasLinkCard: patch.hasLinkCard ?? false,
  isAd: patch.isAd ?? false,
  // The default is "posted just now", which changes nothing for tests that ignore age
  postedAt: patch.postedAt === undefined ? Date.now() : patch.postedAt,
});

/** Without an explicit order, one is built from the existing rules in the default order (normalization's job in the real code) */
const filter = (patch: Partial<FilterNode> = {}): FilterNode => {
  const base = { ...emptyNode().filter, ...patch };
  return patch.order ? base : { ...base, order: defaultOrder(base) };
};

type TextPatch = { target?: MatchTarget; mode?: 'contains' | 'exact' | 'regex'; pattern?: string; caseSensitive?: boolean; negate?: boolean };

/** A text condition. The default is "the body contains 宣伝" */
const text = (patch: TextPatch = {}): Condition => ({
  kind: 'text',
  target: 'text',
  mode: 'contains',
  pattern: '宣伝',
  caseSensitive: false,
  negate: false,
  ...patch,
});

/** A trait condition */
const traitOf = (trait: TraitKey, negate = false): Condition => ({ kind: 'trait', trait, negate });

const rule = (patch: Partial<Rule> = {}): Rule => ({
  id: newRuleId(),
  conditions: [text()],
  action: ACTIONS.COLLAPSE,
  color: null,
  label: '',
  enabled: true,
  ...patch,
});

/** A rule that looks at the user ID, corresponding to the former "user" rule */
const user = (pattern: string, patch: Partial<Rule> = {}): Rule =>
  rule({ id: pattern, conditions: [text({ target: 'screenName', mode: 'exact', pattern })], ...patch });

/** The action deciding how the post is shown (collapse, hide, highlight). null when nothing matches */
const judge = (p: Post, f: FilterNode) => decide(p, compileFilter(f, m)).decision;

/** The emphasis rules that matched, returned in the order they were seen */
const emphasesOf = (p: Post, f: FilterNode) => decide(p, compileFilter(f, m)).emphases;

/** Takes out the highlight color. null for a collapse or for no match */
const colorOf = (decision: Decision | null): string | null =>
  decision?.action === ACTIONS.HIGHLIGHT ? decision.color : null;

/** Matches an emphasis rule and takes out the parts painted within the given string */
const markedTexts = (r: Rule, p: Post, value: string): string[] => {
  const [emphasis] = emphasesOf(p, filter({ rules: [r] }));
  assert.ok(emphasis, '強調に一致していない');
  return emphasis.ranges(value).map((range) => value.slice(range.start, range.end));
};

// --- Emphasis ---

test('強調は一致した箇所を返す', () => {
  const r = rule({ action: ACTIONS.EMPHASIZE });
  const p = post({ text: 'これは宣伝です' });
  const [emphasis] = emphasesOf(p, filter({ rules: [r] }));
  assert.equal(emphasis?.target, 'text');
  // With no color set, the emphasis default applies. It is stronger than the highlight one
  assert.equal(emphasis?.color, DEFAULT_EMPHASIS_COLOR);
  assert.notEqual(DEFAULT_EMPHASIS_COLOR, DEFAULT_HIGHLIGHT_COLOR);
  // Emphasis does not change how the post is shown
  assert.equal(judge(p, filter({ rules: [r] })), null);
});

test('強調は一致した箇所をすべて塗る', () => {
  const r = rule({ action: ACTIONS.EMPHASIZE });
  const [emphasis] = emphasesOf(post({ text: '宣伝と宣伝' }), filter({ rules: [r] }));
  assert.deepEqual(emphasis?.ranges('宣伝と宣伝'), [
    { start: 0, end: 2 },
    { start: 3, end: 5 },
  ]);
});

test('強調は他の動作と同時に効く', () => {
  const f = filter({
    rules: [
      rule({ id: 'e1', action: ACTIONS.EMPHASIZE }),
      rule({ id: 'h1', conditions: [traitOf('repost')], action: ACTIONS.HIGHLIGHT, color: '#00ba7c26' }),
    ],
  });
  const p = post({ text: 'これは宣伝です', isRepost: true });
  // Even with the emphasis rule first in the order, the repost highlight still applies
  assert.deepEqual(judge(p, f), {
    action: ACTIONS.HIGHLIGHT,
    color: '#00ba7c26',
    label: m.traits.repost,
  });
  assert.equal(emphasesOf(p, f).length, 1);
});

test('一致した強調のルールはすべて効き、見つけた順に並ぶ', () => {
  const f = filter({
    rules: [
      rule({ id: 'e1', action: ACTIONS.EMPHASIZE }),
      rule({
        id: 'e2',
        conditions: [text({ pattern: 'です' })],
        action: ACTIONS.EMPHASIZE,
        color: '#11223344',
      }),
    ],
  });
  const found = emphasesOf(post({ text: 'これは宣伝です' }), f);
  assert.equal(found.length, 2);
  assert.equal(found[0]?.color, DEFAULT_EMPHASIS_COLOR);
  assert.equal(found[1]?.color, '#11223344');
});

test('折りたたむルールが先に一致しても、強調は集まる', () => {
  const f = filter({
    rules: [
      rule({ id: 'c1', conditions: [text({ pattern: 'これ' })], action: ACTIONS.COLLAPSE }),
      rule({ id: 'e1', action: ACTIONS.EMPHASIZE }),
    ],
  });
  const p = post({ text: 'これは宣伝です' });
  assert.equal(judge(p, f)?.action, ACTIONS.COLLAPSE);
  assert.equal(emphasesOf(p, f).length, 1);
});

test('フィルタを止めていれば強調も効かない', () => {
  const f = filter({ enabled: false, rules: [rule({ action: ACTIONS.EMPHASIZE })] });
  assert.deepEqual(emphasesOf(post({ text: 'これは宣伝です' }), f), []);
});

test('文字列条件を持たないルールを強調にしても、塗る先が無いので何も塗らない', () => {
  const f = filter({
    rules: [rule({ conditions: [traitOf('repost')], action: ACTIONS.EMPHASIZE })],
  });
  assert.deepEqual(emphasesOf(post({ isRepost: true }), f), []);
  // How it is shown does not change either
  assert.equal(judge(post({ isRepost: true }), f), null);
});

test('大文字小文字を無視しても、塗る位置がずれない', () => {
  const r = rule({ conditions: [text({ pattern: 'x' })], action: ACTIONS.EMPHASIZE });
  // `İ`.toLowerCase() becomes two characters. Counting positions after lowercasing would shift them back by that much
  assert.deepEqual(markedTexts(r, post({ text: 'İİx' }), 'İİx'), ['x']);
});

test('完全に一致のルールは、その文字列そのものが一致したときだけ塗る', () => {
  const r = rule({
    conditions: [text({ pattern: 'まるごと', mode: 'exact' })],
    action: ACTIONS.EMPHASIZE,
  });
  const p = post({ text: 'まるごと' });
  assert.deepEqual(markedTexts(r, p, 'まるごと'), ['まるごと']);
  // Other elements of the same post, such as the quoted one, do not match and are not painted
  assert.deepEqual(markedTexts(r, p, 'まるごと入り'), []);
});

test('正規表現の強調は、一致した箇所を前から順に塗る', () => {
  const r = rule({
    conditions: [text({ pattern: '[0-9]+円', mode: 'regex' })],
    action: ACTIONS.EMPHASIZE,
  });
  assert.deepEqual(markedTexts(r, post({ text: '100円と20円' }), '100円と20円'), ['100円', '20円']);
});

test('長さ0の一致は塗らない', () => {
  const r = rule({
    conditions: [text({ pattern: 'あ*', mode: 'regex' })],
    action: ACTIONS.EMPHASIZE,
  });
  assert.deepEqual(markedTexts(r, post({ text: 'いあうあ' }), 'いあうあ'), ['あ', 'あ']);
});

test('ユーザーIDの強調は大文字小文字を区別しない', () => {
  const r = rule({
    conditions: [text({ target: 'screenName', pattern: 'Alice', caseSensitive: true })],
    action: ACTIONS.EMPHASIZE,
  });
  assert.deepEqual(markedTexts(r, post({ screenName: 'alice' }), '@ALICE'), ['ALICE']);
});

// --- Text conditions ---

test('ルールが無ければ何もしない', () => {
  assert.equal(judge(post(), filter()), null);
});

test('本文にパターンが含まれれば一致する', () => {
  const f = filter({ rules: [rule()] });
  assert.deepEqual(judge(post({ text: 'これは宣伝です' }), f), {
    action: ACTIONS.COLLAPSE,
    label: '本文が「宣伝」を含む',
  });
  assert.equal(judge(post({ text: '普通の話' }), f), null);
});

test('本文を持たない投稿は、本文の条件に一致しない', () => {
  const f = filter({ rules: [rule()] });
  assert.equal(judge(post({ text: null }), f), null);
});

/* --- How old a post is --- */

const HOUR = 60 * 60 * 1000;
const ageFilter = (direction: 'older' | 'newer', minutes: number, negate = false) =>
  filter({ rules: [rule({ conditions: [{ kind: 'age', direction, minutes, negate }] })] });

test('「より古い」は、指定より前に投稿されたものに当たる', () => {
  const f = ageFilter('older', 60);
  assert.ok(judge(post({ postedAt: Date.now() - 5 * HOUR }), f));
  assert.equal(judge(post({ postedAt: Date.now() - 10 * 60 * 1000 }), f), null);
});

test('「より新しい」は、指定より後に投稿されたものに当たる', () => {
  const f = ageFilter('newer', 60);
  assert.equal(judge(post({ postedAt: Date.now() - 5 * HOUR }), f), null);
  assert.ok(judge(post({ postedAt: Date.now() - 10 * 60 * 1000 }), f));
});

test('時刻を持たない投稿（広告）は古さの条件に当たらない。否定にすれば当たる', () => {
  const ad = { postedAt: null, isAd: true };
  assert.equal(judge(post(ad), ageFilter('older', 60)), null);
  assert.equal(judge(post(ad), ageFilter('newer', 60)), null);
  assert.ok(judge(post(ad), ageFilter('older', 60, true)));
});

test('同じフィルタを使い回しても、投稿の時刻ごとに判定される', () => {
  const f = ageFilter('older', 1);
  assert.equal(judge(post({ postedAt: Date.now() - 30 * 1000 }), f), null);
  assert.ok(judge(post({ postedAt: Date.now() - 150 * 1000 }), f));
});

test('古さだけのルールでは「強調」を選べない（塗る先が無い）', () => {
  // What gets painted is where a text condition matched, and age has no characters to correspond to
  const condition = { kind: 'age', direction: 'older', minutes: 60, negate: false } as const;
  assert.equal(canEmphasizeWith(condition), false);
});


test('対象が複数の値を持つとき、どれか1つが一致すれば一致する', () => {
  const f = filter({ rules: [rule()] });
  // A quoting post: the body is two values, the quoting side's and the quoted one's
  assert.ok(judge(post({ text: ['ふつうの話', 'これは宣伝です'] }), f));
  assert.equal(judge(post({ text: ['ふつうの話', 'べつの話'] }), f), null);
});

test('完全に一致は、連ねた全体ではなく値ごとに照らす', () => {
  const f = filter({ rules: [rule({ conditions: [text({ pattern: 'まるごと', mode: 'exact' })] })] });
  assert.ok(judge(post({ text: ['まるごと', '引用元の本文'] }), f));
  assert.equal(judge(post({ text: ['まるごと入り', '引用元の本文'] }), f), null);
});

test('リポストした人・引用元・返信先も対象にできる', () => {
  const byTarget = (target: MatchTarget, p: PostPatch) =>
    judge(post(p), filter({ rules: [rule({ conditions: [text({ target, pattern: 'bob' })] })] }));

  assert.ok(byTarget('repostedBy', { repostedBy: 'bob' }));
  assert.ok(byTarget('quotedScreenName', { quotedScreenName: 'bob' }));
  assert.ok(byTarget('replyTo', { replyTo: ['carol', 'bob'] }));
  // A post without that value does not match
  assert.equal(byTarget('repostedBy', {}), null);
  assert.equal(byTarget('replyTo', { replyTo: ['carol'] }), null);
});

test('大文字小文字は既定で区別せず、指定すれば区別する', () => {
  const insensitive = filter({ rules: [rule({ conditions: [text({ pattern: 'SALE' })] })] });
  assert.ok(judge(post({ text: 'sale 開催中' }), insensitive));

  const sensitive = filter({
    rules: [rule({ conditions: [text({ pattern: 'SALE', caseSensitive: true })] })],
  });
  assert.equal(judge(post({ text: 'sale 開催中' }), sensitive), null);
  assert.ok(judge(post({ text: 'SALE 開催中' }), sensitive));
});

test('ユーザーIDを見る対象では、区別する指定を無視する（X 側が区別しないため）', () => {
  const verdictOf = (target: MatchTarget, p: PostPatch) =>
    judge(
      post(p),
      filter({
        rules: [rule({ conditions: [text({ target, pattern: 'Bob', caseSensitive: true })] })],
      })
    );

  assert.ok(verdictOf('screenName', { screenName: 'bob' }));
  assert.ok(verdictOf('repostedBy', { repostedBy: 'BOB' }));
  assert.ok(verdictOf('quotedScreenName', { quotedScreenName: 'bob' }));
  assert.ok(verdictOf('replyTo', { replyTo: ['bob'] }));
  // A display name is a name as written, so the setting is honored
  assert.equal(verdictOf('quotedDisplayName', { quotedDisplayName: 'bob' }), null);
});

test('正規表現として解釈する。大小の区別の指定も効く', () => {
  const f = filter({
    rules: [rule({ conditions: [text({ pattern: '^PR[:：]', mode: 'regex' })] })],
  });
  assert.ok(judge(post({ text: 'PR: 新商品' }), f));
  assert.ok(judge(post({ text: 'pr：新商品' }), f));
  assert.equal(judge(post({ text: 'これは PR: ではない' }), f), null);
});

test('同じ正規表現を続けて判定しても結果が変わらない', () => {
  // With the g flag, lastIndex persists and the second and later judgements miss
  const f = compileFilter(
    filter({ rules: [rule({ conditions: [text({ mode: 'regex' })] })] }),
    m
  );
  const p = post({ text: '宣伝です' });
  assert.ok(decide(p, f).decision);
  assert.ok(decide(p, f).decision);
  assert.ok(decide(p, f).decision);
});

test('壊れた正規表現は例外を投げず、何にも一致しない', () => {
  const f = filter({
    rules: [rule({ conditions: [text({ pattern: '[unclosed', mode: 'regex' })] })],
  });
  assert.equal(judge(post({ text: '[unclosed を含む' }), f), null);
});

test('ユーザーは完全一致で、大文字小文字は区別しない', () => {
  const f = filter({ rules: [user('SpamBot')] });
  assert.deepEqual(judge(post({ screenName: 'spambot' }), f), {
    action: ACTIONS.COLLAPSE,
    label: 'ユーザーIDが「SpamBot」と完全に一致',
  });
  // A partial match does not count
  assert.equal(judge(post({ screenName: 'spambot2' }), f), null);
  assert.equal(judge(post({ screenName: null }), f), null);
});

// --- Trait conditions and negation ---

test('性質の条件は、その性質を持つ投稿だけに一致する', () => {
  const verdictOf = (trait: TraitKey, p: PostPatch) =>
    judge(post(p), filter({ rules: [rule({ conditions: [traitOf(trait)] })] }));

  assert.equal(verdictOf('repost', { isRepost: true })?.label, m.traits.repost);
  assert.equal(verdictOf('repost', {}), null);
  assert.ok(verdictOf('quote', { isQuote: true }));
  assert.ok(verdictOf('reply', { isReply: true }));
  assert.ok(verdictOf('communityNote', { communityNote: 'added' }));
  assert.ok(verdictOf('communityNoteRating', { communityNote: 'rating' }));
  assert.ok(verdictOf('pollOpen', { poll: 'open' }));
  assert.ok(verdictOf('pollClosed', { poll: 'closed' }));
  assert.ok(verdictOf('space', { hasSpace: true }));
  assert.ok(verdictOf('article', { hasArticle: true }));
  assert.ok(verdictOf('ad', { isAd: true }));
  assert.ok(verdictOf('media', { hasMedia: true }));
  assert.equal(verdictOf('media', { hasMedia: false }), null);
});

test('状態を持つ性質は、その状態のときだけ一致する', () => {
  const verdictOf = (trait: TraitKey, p: PostPatch) =>
    judge(post(p), filter({ rules: [rule({ conditions: [traitOf(trait)] })] }));

  // Community Notes split into "attached" and "awaiting a rating"
  assert.equal(verdictOf('communityNote', { communityNote: 'rating' }), null);
  assert.equal(verdictOf('communityNoteRating', { communityNote: 'added' }), null);
  // For a poll, the rule that matches swaps over once voting closes
  assert.equal(verdictOf('pollOpen', { poll: 'closed' }), null);
  assert.equal(verdictOf('pollClosed', { poll: 'open' }), null);
  // With neither present, nothing matches
  assert.equal(verdictOf('communityNote', {}), null);
  assert.equal(verdictOf('pollOpen', {}), null);
  assert.equal(verdictOf('space', {}), null);
});

test('否定は結果を反転する。「画像なし」は「画像あり」の否定で書ける', () => {
  const f = filter({ rules: [rule({ conditions: [traitOf('media', true)] })] });
  assert.ok(judge(post({ hasMedia: false }), f));
  assert.equal(judge(post({ hasMedia: true }), f), null);
});

test('否定の文字列条件は、値を持たない投稿にも一致する', () => {
  const f = filter({ rules: [rule({ conditions: [text({ negate: true })] })] });
  assert.ok(judge(post({ text: '普通の話' }), f));
  assert.equal(judge(post({ text: 'これは宣伝です' }), f), null);
  // A post with no body does not match "contains 宣伝", so it matches its negation
  assert.ok(judge(post({ text: null }), f));
});

test('条件をすべて満たしたときだけ一致する（AND）', () => {
  const f = filter({
    rules: [
      rule({
        conditions: [
          traitOf('repost'),
          text({ pattern: '宣伝' }),
          text({ target: 'screenName', mode: 'exact', pattern: 'bob' }),
        ],
        action: ACTIONS.HIDE,
      }),
    ],
  });
  assert.ok(judge(post({ isRepost: true, text: 'これは宣伝です', screenName: 'bob' }), f));
  // Missing even one of them means no match
  assert.equal(judge(post({ isRepost: false, text: 'これは宣伝です', screenName: 'bob' }), f), null);
  assert.equal(judge(post({ isRepost: true, text: '普通の話', screenName: 'bob' }), f), null);
  assert.equal(judge(post({ isRepost: true, text: 'これは宣伝です', screenName: 'carol' }), f), null);
});

// --- Actions ---

test('「何もしない」に一致したら、そこで判定が終わる', () => {
  const f = filter({
    rules: [
      rule({ id: 'skip', conditions: [traitOf('repost')], action: ACTIONS.NOTHING }),
      rule({ id: 'hide', action: ACTIONS.HIDE }),
      rule({ id: 'mark', action: ACTIONS.EMPHASIZE }),
    ],
  });
  const reposted = post({ text: 'これは宣伝です', isRepost: true });
  // The later rules are not looked at: no display decision and no emphasis
  assert.equal(judge(reposted, f), null);
  assert.deepEqual(emphasesOf(reposted, f), []);

  // When it is not a repost, the later rules apply as they are
  const plain = post({ text: 'これは宣伝です' });
  assert.equal(judge(plain, f)?.action, ACTIONS.HIDE);
  assert.equal(emphasesOf(plain, f).length, 1);
});

test('「何もしない」より前に集めた強調も捨てる', () => {
  const f = filter({
    rules: [
      rule({ id: 'mark', action: ACTIONS.EMPHASIZE }),
      rule({ id: 'skip', conditions: [traitOf('repost')], action: ACTIONS.NOTHING }),
    ],
  });
  assert.deepEqual(emphasesOf(post({ text: 'これは宣伝です', isRepost: true }), f), []);
});

test('無効にしたルールは判定に加わらない', () => {
  const f = filter({ rules: [rule({ enabled: false })] });
  assert.equal(judge(post({ text: 'これは宣伝です' }), f), null);
});

test('表示名を付けたルールは、その名前を一致理由に使う', () => {
  const f = filter({ rules: [rule({ label: '広告っぽい' })] });
  assert.equal(judge(post({ text: 'これは宣伝です' }), f)?.label, '広告っぽい');
});

test('一致理由の名前は、渡した辞書の言語で出る', () => {
  const f = filter({ rules: [rule({ conditions: [traitOf('repost')] })] });
  const en = messagesFor('en');
  const p = post({ isRepost: true });
  assert.equal(decide(p, compileFilter(f, en)).decision?.label, en.traits.repost);
  // The same settings give a different name once the dictionary changes
  assert.equal(decide(p, compileFilter(f, m)).decision?.label, m.traits.repost);
});

test('ハイライトは指定した色を返し、色なしなら動作ごとの既定色が入る', () => {
  const withColor = filter({ rules: [rule({ action: ACTIONS.HIGHLIGHT, color: '#ff8800' })] });
  assert.deepEqual(judge(post({ text: 'これは宣伝です' }), withColor), {
    action: ACTIONS.HIGHLIGHT,
    color: '#ff8800',
    label: '本文が「宣伝」を含む',
  });

  const withoutColor = filter({ rules: [rule({ action: ACTIONS.HIGHLIGHT })] });
  assert.equal(colorOf(judge(post({ text: 'これは宣伝です' }), withoutColor)), DEFAULT_HIGHLIGHT_COLOR);
});

test('先に一致したルールの動作が効く。折りたたむとハイライトに優先関係は無い', () => {
  const highlightFirst = filter({
    rules: [
      rule({ id: 'k1', action: ACTIONS.HIGHLIGHT, color: '#ff8800' }),
      rule({ id: 'k2', conditions: [text({ pattern: 'セール' })], action: ACTIONS.COLLAPSE }),
    ],
  });
  assert.deepEqual(judge(post({ text: '宣伝とセール' }), highlightFirst), {
    action: ACTIONS.HIGHLIGHT,
    color: '#ff8800',
    label: '本文が「宣伝」を含む',
  });

  // Reordered, the collapse wins
  const collapseFirst = { ...highlightFirst, order: [...highlightFirst.order].reverse() };
  assert.deepEqual(judge(post({ text: '宣伝とセール' }), collapseFirst), {
    action: ACTIONS.COLLAPSE,
    label: '本文が「セール」を含む',
  });
});

test('非表示は色を持たず、一致したルール名だけを返す', () => {
  const f = filter({ rules: [rule({ action: ACTIONS.HIDE, label: 'スパム' })] });
  assert.deepEqual(judge(post({ text: 'これは宣伝です' }), f), {
    action: ACTIONS.HIDE,
    label: 'スパム',
  });
});

test('複数のハイライトに一致したら、並びで先のものの色を使う', () => {
  const f = filter({
    rules: [
      rule({ id: 'k1', action: ACTIONS.HIGHLIGHT, color: '#111111' }),
      rule({
        id: 'k2',
        conditions: [text({ pattern: 'セール' })],
        action: ACTIONS.HIGHLIGHT,
        color: '#222222',
      }),
    ],
  });
  assert.equal(colorOf(judge(post({ text: '宣伝とセール' }), f)), '#111111');
});

test('この段でフィルタを止めていれば、ルールがあっても何もしない', () => {
  const f = filter({ enabled: false, rules: [rule()] });
  assert.equal(judge(post({ text: 'これは宣伝です' }), f), null);
});

test('未指定は「適用する」として扱う', () => {
  const f = filter({ enabled: null, rules: [rule()] });
  assert.ok(judge(post({ text: 'これは宣伝です' }), f));
});

test('ルール名を持たないルールは、条件を並べた名前で理由を出す', () => {
  const r = rule({ conditions: [traitOf('repost'), text({ pattern: '宣伝' })] });
  assert.equal(judge(post({ isRepost: true, text: 'これは宣伝です' }), filter({ rules: [r] }))?.label,
    ruleName(r, m));
  assert.equal(ruleName(r, m), 'リポスト かつ 本文が「宣伝」を含む');
});

// --- Ordering across the tiers ---
//
// Checked by connecting the merge (resolve) to the judgement (decide).

const tieredSettings = (patch: (s: Settings) => void): Settings => {
  const s = emptySettings();
  patch(s);
  return s;
};

/** A tier's settings only get a consistent order through fillNode, so they are run through it again after being rewritten */
const normalized = (s: Settings): Settings => fillAll(s);

const verdictOf = (p: Post, s: Settings, scope: Omit<ColumnScope, 'surface'>) =>
  // Every case here is about the tiers above the site, so no site takes part
  decide(p, compileFilter(resolve(normalized(s), { ...scope, surface: null }).filter, m)).decision;

test('段をまたぐ順はカラム → アカウント → グローバルで固定', () => {
  const s = tieredSettings((s) => {
    s.global.filter.rules = [rule({ id: 'g1', action: ACTIONS.HIGHLIGHT, color: '#111111' })];
    s.accounts.alice = emptyNode();
    s.accounts.alice!.filter.rules = [
      rule({ id: 'a1', action: ACTIONS.HIGHLIGHT, color: '#222222' }),
    ];
  });
  // The lower tier is seen first, overriding the global setting
  assert.equal(
    colorOf(verdictOf(post({ text: 'これは宣伝です' }), s, { account: 'alice', columnId: null })),
    '#222222'
  );
  // Where that tier is not consulted, the global setting applies as it is
  assert.equal(
    colorOf(verdictOf(post({ text: 'これは宣伝です' }), s, { account: null, columnId: null })),
    '#111111'
  );
});

test('カラム段の指定は、グローバル段の指定を覆せる', () => {
  // The use case of hiding something everywhere but keeping it in one column, merely marked
  const s = tieredSettings((s) => {
    s.global.filter.rules = [rule({ id: 'k1', action: ACTIONS.HIDE })];
    s.columns['col-1'] = emptyNode();
    s.columns['col-1']!.filter.rules = [
      rule({ id: 'k2', action: ACTIONS.HIGHLIGHT, color: '#222222' }),
    ];
  });
  const p = post({ text: 'これは宣伝です' });
  assert.equal(colorOf(verdictOf(p, s, { account: null, columnId: 'col-1' })), '#222222');
  assert.equal(verdictOf(p, s, { account: null, columnId: null })?.action, ACTIONS.HIDE);
});

test('段の中の並べ替えは、その段の中でだけ効く', () => {
  const s = tieredSettings((s) => {
    s.columns['col-1'] = emptyNode();
    s.columns['col-1']!.filter.rules = [
      rule({ id: 'k1', action: ACTIONS.HIGHLIGHT, color: '#111111' }),
      rule({ id: 'k2', action: ACTIONS.HIGHLIGHT, color: '#222222' }),
    ];
    s.columns['col-1']!.filter.order = ['k2', 'k1'];
  });
  assert.equal(
    colorOf(verdictOf(post({ text: 'これは宣伝です' }), s, { account: null, columnId: 'col-1' })),
    '#222222'
  );
});

test('下の段の「何もしない」は、上の段のルールまで止める', () => {
  const s = tieredSettings((s) => {
    s.global.filter.rules = [rule({ id: 'g1', conditions: [traitOf('repost')], action: ACTIONS.HIDE })];
    s.columns['col-1'] = emptyNode();
    s.columns['col-1']!.filter.rules = [
      rule({ id: 'c1', conditions: [traitOf('repost')], action: ACTIONS.NOTHING }),
    ];
  });
  const p = post({ isRepost: true });
  // Reposts are not hidden in this column
  assert.equal(verdictOf(p, s, { account: null, columnId: 'col-1' }), null);
  // In other columns the global setting applies as it is
  assert.equal(verdictOf(p, s, { account: null, columnId: null })?.action, ACTIONS.HIDE);
});

test('リポストした人は塗る先が無いので、その条件では塗らない', () => {
  // The "… reposted" line shows only a display name; the ID the judgement looks at never appears on screen
  const f = filter({
    rules: [
      rule({ conditions: [text({ target: 'repostedBy', pattern: 'bob' })], action: ACTIONS.EMPHASIZE }),
    ],
  });
  assert.deepEqual(emphasesOf(post({ repostedBy: 'bob' }), f), []);

  // When a paintable target's condition is mixed in, only that one is painted
  const mixed = filter({
    rules: [
      rule({
        conditions: [text({ target: 'repostedBy', pattern: 'bob' }), text({ pattern: '宣伝' })],
        action: ACTIONS.EMPHASIZE,
      }),
    ],
  });
  const marks = emphasesOf(post({ text: 'これは宣伝です', repostedBy: 'bob' }), mixed);
  assert.deepEqual(marks.map((e) => e.target), ['text']);
});

test('ルールの文字列条件をすべて塗る', () => {
  const f = filter({
    rules: [
      rule({
        conditions: [
          traitOf('repost'),
          text({ pattern: '宣伝' }),
          text({ target: 'screenName', mode: 'exact', pattern: 'alice' }),
          text({ target: 'quotedText', pattern: '引用' }),
        ],
        action: ACTIONS.EMPHASIZE,
      }),
    ],
  });
  const marks = emphasesOf(
    post({ isRepost: true, text: 'これは宣伝です', screenName: 'alice', quotedText: '引用元の本文' }),
    f
  );
  // In the order of the conditions. The trait condition has nothing to paint and is skipped
  assert.deepEqual(marks.map((e) => e.target), ['text', 'screenName', 'quotedText']);
  // Each one returns the positions of its own pattern
  assert.deepEqual(marks[0]?.ranges('これは宣伝です'), [{ start: 3, end: 5 }]);
  assert.deepEqual(marks[2]?.ranges('引用元の本文'), [{ start: 0, end: 2 }]);
});

test('否定の条件は塗らないが、同じルールの他の条件は塗る', () => {
  const f = filter({
    rules: [
      rule({
        conditions: [text({ pattern: '広告', negate: true }), text({ pattern: '宣伝' })],
        action: ACTIONS.EMPHASIZE,
      }),
    ],
  });
  const marks = emphasesOf(post({ text: 'これは宣伝です' }), f);
  assert.equal(marks.length, 1);
  assert.deepEqual(marks[0]?.ranges('これは宣伝です'), [{ start: 3, end: 5 }]);
});

test('広告の判定が壊れているとみなす境目', () => {
  // No decision while too few have been seen: ads can happen to sit together right after opening
  assert.equal(adJudgementBroken(1, 1), false);
  assert.equal(adJudgementBroken(19, 19), false);

  // With 20 seen, going above half stops it
  assert.equal(adJudgementBroken(20, 20), true);
  assert.equal(adJudgementBroken(20, 11), true);
  assert.equal(adJudgementBroken(20, 10), false); // exactly half is allowed
  assert.equal(adJudgementBroken(100, 51), true);
  assert.equal(adJudgementBroken(100, 50), false);

  // No ads at all, or nothing seen in the first place
  assert.equal(adJudgementBroken(100, 0), false);
  assert.equal(adJudgementBroken(0, 0), false);
});

test('本文の印が壊れたときは、本文を見るルールを外す', () => {
  // "the body does not contain 広告" matches every post once the body is unreadable
  const negated = rule({ conditions: [text({ pattern: '広告', negate: true })], action: ACTIONS.HIDE });
  const byUser = user('alice', { action: ACTIONS.COLLAPSE });
  const f = filter({ rules: [negated, byUser], order: [negated.id, byUser.id] });
  // A post in the state where the body cannot be read
  const broken = post({ text: [], screenName: 'alice' });

  // Left as is, the negated condition matches and the post disappears
  assert.equal(decide(broken, compileFilter(f, m)).decision?.action, ACTIONS.HIDE);

  // Dropped, it no longer matches. Rules that do not read the body remain
  const safe = compileFilter(f, m, { withoutText: true });
  assert.equal(decide(broken, safe).decision?.action, ACTIONS.COLLAPSE);
});

test('引用の本文を見るルールも外す。同じ印から読んでいる', () => {
  const quoted = rule({ conditions: [text({ target: 'quotedText', pattern: '宣伝', negate: true })] });
  const f = filter({ rules: [quoted], order: [quoted.id] });
  assert.equal(decide(post({ quotedText: [] }), compileFilter(f, m)).decision?.action, ACTIONS.COLLAPSE);
  assert.equal(decide(post({ quotedText: [] }), compileFilter(f, m, { withoutText: true })).decision, null);
});

test('埋め込まれたものの文字でも絞れる', () => {
  const matches = (target: MatchTarget, pattern: string, p: PostPatch) =>
    judge(
      post(p),
      filter({ rules: [rule({ conditions: [text({ target, pattern })] })] })
    ) !== null;

  assert.equal(matches('pollChoice', 'ほのぼの', { pollChoice: ['シリアス寄', 'ほのぼの寄'] }), true);
  assert.equal(matches('cardDomain', 'youtube.com', { cardDomain: ['youtube.com'] }), true);
  assert.equal(matches('cardTitle', '発売', { cardTitle: ['新刊が発売されます'] }), true);
  assert.equal(matches('spaceName', 'フリートーク', { spaceName: ['#83 今夜フリートーク'] }), true);
  assert.equal(matches('articleText', '執筆', { articleText: ['書籍を執筆して思うこと'] }), true);
});

test('埋め込みが無い投稿は、その対象では絞られない', () => {
  const matches = (target: MatchTarget, pattern: string) =>
    judge(post({}), filter({ rules: [rule({ conditions: [text({ target, pattern })] })] })) !== null;

  // A target with no value matches no text condition
  assert.equal(matches('pollChoice', 'なんでも'), false);
  assert.equal(matches('cardDomain', 'youtube.com'), false);
  assert.equal(matches('spaceName', 'なんでも'), false);
});

/** A condition comparing against "myself". It carries no pattern */
const selfOf = (target: MatchTarget, negate = false): Condition => ({
  kind: 'text',
  target,
  mode: 'self',
  pattern: '',
  caseSensitive: false,
  negate,
});

test('「自分自身」は、対象の値が投稿者自身のときに当たる', () => {
  const matches = (target: MatchTarget, p: PostPatch) =>
    judge(post(p), filter({ rules: [rule({ conditions: [selfOf(target)] })] })) !== null;

  assert.equal(matches('replyTo', { screenName: ['alice'], replyTo: ['alice'] }), true);
  assert.equal(matches('replyTo', { screenName: ['alice'], replyTo: ['bob'] }), false);
  assert.equal(matches('quotedScreenName', { screenName: ['alice'], quotedScreenName: ['alice'] }), true);
  assert.equal(matches('quotedScreenName', { screenName: ['alice'], quotedScreenName: ['bob'] }), false);
  assert.equal(matches('repostedBy', { screenName: ['alice'], repostedBy: ['alice'] }), true);
  assert.equal(matches('repostedBy', { screenName: ['alice'], repostedBy: ['bob'] }), false);
});

test('複数の値があるとき、どれか1つが投稿者自身なら当たる', () => {
  // A reply in one's own thread that draws in someone else as well
  const f = filter({ rules: [rule({ conditions: [selfOf('replyTo')] })] });
  assert.ok(judge(post({ screenName: ['alice'], replyTo: ['bob', 'alice'] }), f));
  assert.equal(judge(post({ screenName: ['alice'], replyTo: ['bob', 'carol'] }), f), null);
});

test('値を持たない投稿は「自分自身」に当たらない', () => {
  const f = filter({ rules: [rule({ conditions: [selfOf('replyTo')] })] });
  assert.equal(judge(post({ screenName: ['alice'] }), f), null);
});

test('「自分自身」でも、ユーザーIDの大文字小文字は区別しない', () => {
  const matches = (target: MatchTarget, p: PostPatch) =>
    judge(post(p), filter({ rules: [rule({ conditions: [selfOf(target)] })] })) !== null;

  assert.equal(matches('replyTo', { screenName: ['Alice'], replyTo: ['alice'] }), true);
  assert.equal(matches('quotedScreenName', { screenName: ['aLiCe'], quotedScreenName: ['AlIcE'] }), true);
});

test('「自分自身」も否定できる（他人への返信だけを選べる）', () => {
  const f = filter({ rules: [rule({ conditions: [selfOf('replyTo', true)] })] });
  assert.ok(judge(post({ screenName: ['alice'], replyTo: ['bob'] }), f));
  assert.equal(judge(post({ screenName: ['alice'], replyTo: ['alice'] }), f), null);
});
