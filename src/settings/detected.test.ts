import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allScopes,
  emptyDetected,
  mergeDetected,
  recordable,
  withoutScope,
  type Detected,
  type DetectedScope,
} from './detected.ts';

/** 見えなくなっても触らない（X Pro が同じデッキを見ているあいだ） */
const KEEP = { drop: false, mark: false };
/** デッキを開き直したとき。設定の無いものは落とし、あるものには印を付ける */
const REOPEN = { drop: true, mark: true };
/** x.com。設定の無いものはその場で落とし、あるものに印は付けない */
const AT_ONCE = { drop: true, mark: false };

const DECKS = [
  { id: 'd1', name: '技術' },
  { id: 'd2', name: 'ニュース' },
];

const column = (key: string, account: string | null = 'alice', title: string | null = 'ホーム') => ({
  key,
  account,
  title,
});

/** No column has settings by default. Not dropping one that goes out of sight is the basic behavior */
const merge = (
  previous: Detected,
  decks: { id: string; name: string | null }[],
  currentGroupId: string | null,
  columns: DetectedScope[],
  configured: string[] = []
): Detected => mergeDetected(previous, 'pro', decks, currentGroupId, columns, new Set(configured), KEEP);

/**
 * The merge for reopening a deck.
 * The caller (`content.ts`) decides it by "is this a deck not yet rebuilt on this page"
 */
const reopen = (
  previous: Detected,
  decks: { id: string; name: string | null }[],
  currentGroupId: string | null,
  columns: DetectedScope[],
  configured: string[] = []
): Detected => mergeDetected(previous, 'pro', decks, currentGroupId, columns, new Set(configured), REOPEN);

test('設定を持つカラムは、別のデッキへ移っても残る', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1')], ['c1']);
  const second = merge(first, DECKS, 'd2', [column('c2', 'bob', '通知')], ['c1']);

  assert.deepEqual(
    second.groups.map((deck) => [deck.id, deck.scopes.map((c) => c.key)]),
    [['d1', ['c1']], ['d2', ['c2']]]
  );
  assert.equal(second.currentGroupId, 'd2');
});

test('別のデッキへ移っても、そのデッキのカラムは設定が無くても残る', () => {
  // A deck that is not on screen is not touched. Seeing none of its columns means they are unlooked-at, not gone
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  const second = merge(first, DECKS, 'd2', [column('c2')]);
  assert.deepEqual(
    second.groups.map((deck) => [deck.id, deck.scopes.map((c) => c.key)]),
    [['d1', ['c1']], ['d2', ['c2']]]
  );
});

test('デッキの並びと名前は、帯から読んだ一覧に従う', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  // Reordered, and renamed as well
  const after = merge(
    before,
    [{ id: 'd2', name: 'ニュース' }, { id: 'd1', name: '技術（改）' }],
    'd1',
    [column('c1')]
  );
  assert.deepEqual(after.groups.map((deck) => [deck.id, deck.name]), [
    ['d2', 'ニュース'],
    ['d1', '技術（改）'],
  ]);
});

test('帯から消えたデッキは、覚えていたカラムごと捨てる', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  const after = merge(before, [{ id: 'd2', name: 'ニュース' }], 'd2', [column('c2')]);
  assert.deepEqual(after.groups.map((deck) => deck.id), ['d2']);
});

test('分かっている名前とアカウントを、null で潰さない', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1', 'alice', 'ホーム')]);
  // Right after a deck switch the header's box appears first and the name comes out empty
  const after = merge(before, DECKS, 'd1', [column('c1', null, null)]);
  assert.deepEqual(after.groups[0]!.scopes, [{ key: 'c1', account: 'alice', title: 'ホーム' }]);
});

test('空の一覧では置き換えない（切り替えの途中で0本になる）', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  const after = merge(before, DECKS, 'd1', []);
  assert.deepEqual(after.groups[0]!.scopes.map((c) => c.key), ['c1']);
});

test('同じデッキを見ているあいだは、横に流して見えなくなっても落ちない', () => {
  // X Pro keeps columns outside the window out of the DOM, so a column scrolled aside goes out of sight
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')]);
  const after = merge(before, DECKS, 'd1', [column('c2'), column('c3')]);
  assert.deepEqual(after.groups[0]!.scopes.map((c) => c.key), ['c1', 'c2', 'c3']);
});

test('デッキを開き直すと、設定を持たない見えないカラムは落ちる', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2'), column('c3')]);
  // c2 had been deleted on X's side
  const back = reopen(first, DECKS, 'd1', [column('c1'), column('c3')]);
  assert.deepEqual(back.groups[0]!.scopes.map((c) => c.key), ['c1', 'c3']);
});

test('開き直しで見つからなかった設定持ちのカラムは、落とさず印を付ける', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  const back = reopen(first, DECKS, 'd1', [column('c1')], ['c2']);
  assert.deepEqual(
    back.groups[0]!.scopes.map((c) => [c.key, c.missing ?? false]),
    [['c1', false], ['c2', true]]
  );
});

test('印の付いたカラムは、次に見つかれば印が落ちる', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  const back = reopen(first, DECKS, 'd1', [column('c1')], ['c2']);
  assert.equal(back.groups[0]!.scopes[1]!.missing, true);
  // Scrolled sideways and c2 came into view
  const found = merge(back, DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  assert.equal(found.groups[0]!.scopes[1]!.missing, undefined);
});

test('カラムが1本も見えていなければ、開き直しでも控えに触らない', () => {
  // A switch goes "10 columns → 0 → 4". Rebuilding at the moment of zero makes the list vanish for an instant
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c1']);
  const between = reopen(first, DECKS, 'd1', []);
  assert.deepEqual(between.groups[0]!.scopes.map((c) => c.key), ['c1', 'c2']);
  assert.equal(between.groups[0]!.scopes.some((c) => c.missing), false);
});

test('並びは、いま見えているカラムの順に従う', () => {
  // When the user reorders the columns, the record follows
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2'), column('c3')]);
  const after = merge(before, DECKS, 'd1', [column('c3'), column('c1'), column('c2')]);
  assert.deepEqual(after.groups[0]!.scopes.map((c) => c.key), ['c3', 'c1', 'c2']);
});

test('見えていないカラムは、覚えていた並びで直前に居た見えるカラムの後ろに残る', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2'), column('c3')], ['c2']);
  // c2 went out of sight and the rest was reordered. In the remembered order c2 sat after c1
  const after = merge(before, DECKS, 'd1', [column('c3'), column('c1')], ['c2']);
  assert.deepEqual(after.groups[0]!.scopes.map((c) => c.key), ['c3', 'c1', 'c2']);
});

test('どの見えるカラムより前に居たものは先頭に置く（左に隠れている）', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2'), column('c3')], ['c1']);
  // Scrolled right, and c1 left the screen
  const after = merge(before, DECKS, 'd1', [column('c2'), column('c3')], ['c1']);
  assert.deepEqual(after.groups[0]!.scopes.map((c) => c.key), ['c1', 'c2', 'c3']);
});

test('紐づけ先が消えていたら、その前の見えるカラムへ繰り上がる', () => {
  const first = merge(
    emptyDetected(),
    DECKS,
    'd1',
    [column('c1'), column('c2'), column('c3')],
    ['c3']
  );
  // Reopened. c2 (which sat just before c3) has no settings and drops; c3 moves behind c1
  const back = reopen(first, DECKS, 'd1', [column('c1')], ['c3']);
  assert.deepEqual(back.groups[0]!.scopes.map((c) => c.key), ['c1', 'c3']);
});

test('初めて見たカラムも、見えている順のその位置に入る', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  const after = merge(before, DECKS, 'd1', [column('c9'), column('c1')], ['c2']);
  // c9 is visible before c1. c2 is out of sight, but in the remembered order it sat after c1
  assert.deepEqual(after.groups[0]!.scopes.map((c) => c.key), ['c9', 'c1', 'c2']);
});

test('帯が読めなければ、覚えている一覧を保ったまま表示中のデッキだけを直す', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  const after = merge(before, [], 'd1', [column('c1'), column('c9')]);
  assert.deepEqual(after.groups.map((deck) => [deck.id, deck.scopes.length]), [
    ['d1', 2],
    ['d2', 0],
  ]);
});

test('全デッキのカラムを平らに並べる（未割り当ての判定に使う）', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1', 'alice')], ['c1']);
  const both = merge(first, DECKS, 'd2', [column('c2', 'bob')], ['c1']);
  assert.deepEqual(allScopes(both).map((c) => c.account), ['alice', 'bob']);
});

test('片方のサイトを開いても、もう片方の記録は消えない', () => {
  const onPro = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  // x.com はグループを 1 つしか持たない。ここで Pro のデッキが消えてはいけない
  const onX = mergeDetected(
    onPro,
    'x',
    [{ id: 'all', name: null }],
    'all',
    [{ key: 'view:home', account: 'alice', title: null }],
    new Set(),
    AT_ONCE
  );

  assert.deepEqual(
    onX.groups.map((group) => [group.surface, group.id, group.scopes.map((scope) => scope.key)]),
    [
      ['pro', 'd1', ['c1']],
      ['pro', 'd2', []],
      ['x', 'all', ['view:home']],
    ]
  );

  // 戻っても同じ。x.com の記録は Pro 側の報告で消えない
  const backOnPro = merge(onX, DECKS, 'd1', [column('c1')]);
  assert.deepEqual(
    backOnPro.groups.map((group) => [group.surface, group.id]),
    [
      ['x', 'all'],
      ['pro', 'd1'],
      ['pro', 'd2'],
    ]
  );
});

test('キーが取れなかったものは記録しない', () => {
  assert.deepEqual(
    recordable([
      { columnId: 'c1', account: 'alice', title: 'ホーム' },
      { columnId: null, account: 'bob', title: '通知' },
    ]),
    [{ key: 'c1', account: 'alice', title: 'ホーム' }]
  );
});

test('カラム1本を控えから外す（設定を持つカラムを片付ける）', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c1', 'c2']);
  const both = merge(first, DECKS, 'd2', [column('c9')], ['c1', 'c2']);

  const after = withoutScope(both, 'c2');
  assert.deepEqual(
    after.groups.map((deck) => [deck.id, deck.scopes.map((c) => c.key)]),
    [['d1', ['c1']], ['d2', ['c9']]]
  );
  // The record of which deck is on screen is left alone
  assert.equal(after.currentGroupId, both.currentGroupId);
});

test('無い id を外しても、控えは変わらない', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  assert.deepEqual(withoutScope(before, 'いない'), before);
});

test('同じ印が2つの要素に付いていても、1本だけ並べる', () => {
  // Possible while X reuses an element, or while an old element lingers mid deck-switch
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  const after = merge(before, DECKS, 'd1', [column('c1'), column('c1')], ['c2']);
  assert.deepEqual(after.groups[0]!.scopes.map((c) => c.key), ['c1', 'c2']);
});

test('覚えていた控えに重複が入っていても、1本に戻す', () => {
  const stored = {
    groups: [
      { surface: 'pro' as const, id: 'd1', name: '技術', scopes: [column('c1'), column('c1'), column('c2')] },
    ],
    currentGroupId: 'd1',
  };
  const after = merge(stored, DECKS, 'd1', [column('c2')], ['c1']);
  assert.deepEqual(after.groups[0]!.scopes.map((c) => c.key), ['c1', 'c2']);
});

test('x.com は、設定の無いものをその場で落とす', () => {
  const seen = mergeDetected(
    emptyDetected(),
    'x',
    [{ id: 'all', name: null }],
    'all',
    [{ key: 'view:profile:alice', account: null, title: 'Alice' }],
    new Set(),
    AT_ONCE
  );
  // 次のビューへ移ると、設定の無いプロフィールは残らない
  const moved = mergeDetected(
    seen,
    'x',
    [{ id: 'all', name: null }],
    'all',
    [{ key: 'view:home', account: null, title: 'ホーム' }],
    new Set(),
    AT_ONCE
  );
  assert.deepEqual(moved.groups[0]!.scopes.map((scope) => scope.key), ['view:home']);
});

test('x.com でも、設定のあるものは残す。ただし印は付けない', () => {
  const seen = mergeDetected(
    emptyDetected(),
    'x',
    [{ id: 'all', name: null }],
    'all',
    [{ key: 'view:profile:alice', account: null, title: 'Alice' }],
    new Set(['view:profile:alice']),
    AT_ONCE
  );
  const moved = mergeDetected(
    seen,
    'x',
    [{ id: 'all', name: null }],
    'all',
    [{ key: 'view:home', account: null, title: 'ホーム' }],
    new Set(['view:profile:alice']),
    AT_ONCE
  );
  assert.deepEqual(
    moved.groups[0]!.scopes.map((scope) => [scope.key, scope.missing ?? false]),
    [
      // 別のビューを見ているだけなので、「見つからない」とは言わない
      ['view:profile:alice', false],
      ['view:home', false],
    ]
  );
});
