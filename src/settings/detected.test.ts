import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allColumns,
  emptyDetected,
  mergeDetected,
  recordable,
  withoutColumn,
  type Detected,
  type DetectedColumn,
} from './detected.ts';

const DECKS = [
  { deckId: 'd1', name: '技術' },
  { deckId: 'd2', name: 'ニュース' },
];

const column = (columnId: string, account: string | null = 'alice', title: string | null = 'ホーム') => ({
  columnId,
  account,
  title,
});

/** No column has settings by default. Not dropping one that goes out of sight is the basic behavior */
const merge = (
  previous: Detected,
  decks: { deckId: string; name: string | null }[],
  currentDeckId: string | null,
  columns: DetectedColumn[],
  configured: string[] = []
): Detected => mergeDetected(previous, decks, currentDeckId, columns, new Set(configured), false);

/**
 * The merge for reopening a deck.
 * The caller (`content.ts`) decides it by "is this a deck not yet rebuilt on this page"
 */
const reopen = (
  previous: Detected,
  decks: { deckId: string; name: string | null }[],
  currentDeckId: string | null,
  columns: DetectedColumn[],
  configured: string[] = []
): Detected => mergeDetected(previous, decks, currentDeckId, columns, new Set(configured), true);

test('設定を持つカラムは、別のデッキへ移っても残る', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1')], ['c1']);
  const second = merge(first, DECKS, 'd2', [column('c2', 'bob', '通知')], ['c1']);

  assert.deepEqual(
    second.decks.map((deck) => [deck.deckId, deck.columns.map((c) => c.columnId)]),
    [['d1', ['c1']], ['d2', ['c2']]]
  );
  assert.equal(second.currentDeckId, 'd2');
});

test('別のデッキへ移っても、そのデッキのカラムは設定が無くても残る', () => {
  // A deck that is not on screen is not touched. Seeing none of its columns means they are unlooked-at, not gone
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  const second = merge(first, DECKS, 'd2', [column('c2')]);
  assert.deepEqual(
    second.decks.map((deck) => [deck.deckId, deck.columns.map((c) => c.columnId)]),
    [['d1', ['c1']], ['d2', ['c2']]]
  );
});

test('デッキの並びと名前は、帯から読んだ一覧に従う', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  // Reordered, and renamed as well
  const after = merge(
    before,
    [{ deckId: 'd2', name: 'ニュース' }, { deckId: 'd1', name: '技術（改）' }],
    'd1',
    [column('c1')]
  );
  assert.deepEqual(after.decks.map((deck) => [deck.deckId, deck.name]), [
    ['d2', 'ニュース'],
    ['d1', '技術（改）'],
  ]);
});

test('帯から消えたデッキは、覚えていたカラムごと捨てる', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  const after = merge(before, [{ deckId: 'd2', name: 'ニュース' }], 'd2', [column('c2')]);
  assert.deepEqual(after.decks.map((deck) => deck.deckId), ['d2']);
});

test('分かっている名前とアカウントを、null で潰さない', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1', 'alice', 'ホーム')]);
  // Right after a deck switch the header's box appears first and the name comes out empty
  const after = merge(before, DECKS, 'd1', [column('c1', null, null)]);
  assert.deepEqual(after.decks[0]!.columns, [{ columnId: 'c1', account: 'alice', title: 'ホーム' }]);
});

test('空の一覧では置き換えない（切り替えの途中で0本になる）', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  const after = merge(before, DECKS, 'd1', []);
  assert.deepEqual(after.decks[0]!.columns.map((c) => c.columnId), ['c1']);
});

test('同じデッキを見ているあいだは、横に流して見えなくなっても落ちない', () => {
  // X Pro keeps columns outside the window out of the DOM, so a column scrolled aside goes out of sight
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')]);
  const after = merge(before, DECKS, 'd1', [column('c2'), column('c3')]);
  assert.deepEqual(after.decks[0]!.columns.map((c) => c.columnId), ['c1', 'c2', 'c3']);
});

test('デッキを開き直すと、設定を持たない見えないカラムは落ちる', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2'), column('c3')]);
  // c2 had been deleted on X's side
  const back = reopen(first, DECKS, 'd1', [column('c1'), column('c3')]);
  assert.deepEqual(back.decks[0]!.columns.map((c) => c.columnId), ['c1', 'c3']);
});

test('開き直しで見つからなかった設定持ちのカラムは、落とさず印を付ける', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  const back = reopen(first, DECKS, 'd1', [column('c1')], ['c2']);
  assert.deepEqual(
    back.decks[0]!.columns.map((c) => [c.columnId, c.missing ?? false]),
    [['c1', false], ['c2', true]]
  );
});

test('印の付いたカラムは、次に見つかれば印が落ちる', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  const back = reopen(first, DECKS, 'd1', [column('c1')], ['c2']);
  assert.equal(back.decks[0]!.columns[1]!.missing, true);
  // Scrolled sideways and c2 came into view
  const found = merge(back, DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  assert.equal(found.decks[0]!.columns[1]!.missing, undefined);
});

test('カラムが1本も見えていなければ、開き直しでも控えに触らない', () => {
  // A switch goes "10 columns → 0 → 4". Rebuilding at the moment of zero makes the list vanish for an instant
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c1']);
  const between = reopen(first, DECKS, 'd1', []);
  assert.deepEqual(between.decks[0]!.columns.map((c) => c.columnId), ['c1', 'c2']);
  assert.equal(between.decks[0]!.columns.some((c) => c.missing), false);
});

test('並びは、いま見えているカラムの順に従う', () => {
  // When the user reorders the columns, the record follows
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2'), column('c3')]);
  const after = merge(before, DECKS, 'd1', [column('c3'), column('c1'), column('c2')]);
  assert.deepEqual(after.decks[0]!.columns.map((c) => c.columnId), ['c3', 'c1', 'c2']);
});

test('見えていないカラムは、覚えていた並びで直前に居た見えるカラムの後ろに残る', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2'), column('c3')], ['c2']);
  // c2 went out of sight and the rest was reordered. In the remembered order c2 sat after c1
  const after = merge(before, DECKS, 'd1', [column('c3'), column('c1')], ['c2']);
  assert.deepEqual(after.decks[0]!.columns.map((c) => c.columnId), ['c3', 'c1', 'c2']);
});

test('どの見えるカラムより前に居たものは先頭に置く（左に隠れている）', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2'), column('c3')], ['c1']);
  // Scrolled right, and c1 left the screen
  const after = merge(before, DECKS, 'd1', [column('c2'), column('c3')], ['c1']);
  assert.deepEqual(after.decks[0]!.columns.map((c) => c.columnId), ['c1', 'c2', 'c3']);
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
  assert.deepEqual(back.decks[0]!.columns.map((c) => c.columnId), ['c1', 'c3']);
});

test('初めて見たカラムも、見えている順のその位置に入る', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  const after = merge(before, DECKS, 'd1', [column('c9'), column('c1')], ['c2']);
  // c9 is visible before c1. c2 is out of sight, but in the remembered order it sat after c1
  assert.deepEqual(after.decks[0]!.columns.map((c) => c.columnId), ['c9', 'c1', 'c2']);
});

test('帯が読めなければ、覚えている一覧を保ったまま表示中のデッキだけを直す', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  const after = merge(before, [], 'd1', [column('c1'), column('c9')]);
  assert.deepEqual(after.decks.map((deck) => [deck.deckId, deck.columns.length]), [
    ['d1', 2],
    ['d2', 0],
  ]);
});

test('全デッキのカラムを平らに並べる（未割り当ての判定に使う）', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1', 'alice')], ['c1']);
  const both = merge(first, DECKS, 'd2', [column('c2', 'bob')], ['c1']);
  assert.deepEqual(allColumns(both).map((c) => c.account), ['alice', 'bob']);
});

test('columnId が取れなかったカラムは記録しない', () => {
  assert.deepEqual(
    recordable([
      { columnId: 'c1', account: 'alice', title: 'ホーム' },
      { columnId: null, account: 'bob', title: '通知' },
    ]),
    [{ columnId: 'c1', account: 'alice', title: 'ホーム' }]
  );
});

test('カラム1本を控えから外す（設定を持つカラムを片付ける）', () => {
  const first = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c1', 'c2']);
  const both = merge(first, DECKS, 'd2', [column('c9')], ['c1', 'c2']);

  const after = withoutColumn(both, 'c2');
  assert.deepEqual(
    after.decks.map((deck) => [deck.deckId, deck.columns.map((c) => c.columnId)]),
    [['d1', ['c1']], ['d2', ['c9']]]
  );
  // The record of which deck is on screen is left alone
  assert.equal(after.currentDeckId, both.currentDeckId);
});

test('無い id を外しても、控えは変わらない', () => {
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1')]);
  assert.deepEqual(withoutColumn(before, 'いない'), before);
});

test('同じ印が2つの要素に付いていても、1本だけ並べる', () => {
  // Possible while X reuses an element, or while an old element lingers mid deck-switch
  const before = merge(emptyDetected(), DECKS, 'd1', [column('c1'), column('c2')], ['c2']);
  const after = merge(before, DECKS, 'd1', [column('c1'), column('c1')], ['c2']);
  assert.deepEqual(after.decks[0]!.columns.map((c) => c.columnId), ['c1', 'c2']);
});

test('覚えていた控えに重複が入っていても、1本に戻す', () => {
  const stored = {
    decks: [{ deckId: 'd1', name: '技術', columns: [column('c1'), column('c1'), column('c2')] }],
    currentDeckId: 'd1',
  };
  const after = merge(stored, DECKS, 'd1', [column('c2')], ['c1']);
  assert.deepEqual(after.decks[0]!.columns.map((c) => c.columnId), ['c1', 'c2']);
});
