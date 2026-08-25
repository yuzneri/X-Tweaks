import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  brokenMarkers,
  columnsUnresolved,
  emptyTally,
  sameMarkers,
  textRulesStopped,
  type Tally,
} from './health.ts';

const tally = (patch: Partial<Tally>): Tally => ({ ...emptyTally(), ...patch });

test('何も見ていないうちは、壊れたと言わない', () => {
  assert.deepEqual(brokenMarkers(emptyTally()), []);
});

test('数が足りないうちは、印が無くても壊れたと言わない', () => {
  // Right after opening, or while looking at empty columns only
  assert.deepEqual(brokenMarkers(tally({ articles: 19, cells: 0 })), []);
  assert.deepEqual(brokenMarkers(tally({ cells: 19, posts: 0 })), []);
  assert.deepEqual(brokenMarkers(tally({ posts: 19, texts: 0 })), []);
});

test('投稿らしき要素は在るのに、判定の単位が1つも無ければ壊れている', () => {
  assert.deepEqual(brokenMarkers(tally({ articles: 20, cells: 0 })), ['cell']);
});

test('判定の単位は在るのに、1件も読み取れなければ壊れている', () => {
  assert.deepEqual(brokenMarkers(tally({ articles: 20, cells: 20, posts: 0 })), ['post']);
});

test('読み取れているのに、本文を持つ投稿が1件も無ければ壊れている', () => {
  assert.deepEqual(brokenMarkers(tally({ articles: 20, cells: 20, posts: 20, texts: 0 })), ['text']);
});

test('ふつうに動いていれば、何も挙がらない', () => {
  assert.deepEqual(brokenMarkers(tally({ articles: 40, cells: 45, posts: 30, texts: 25 })), []);
  // Posts without body text mixed in are fine; a single one with text means nothing is broken
  assert.deepEqual(brokenMarkers(tally({ articles: 40, cells: 45, posts: 30, texts: 1 })), []);
});

test('上の段が壊れているときに、下の段まで巻き添えで挙げない', () => {
  // With zero cells, zero readable posts follows as a matter of course
  assert.deepEqual(brokenMarkers(tally({ articles: 50, cells: 0, posts: 0, texts: 0 })), ['cell']);
});

test('本文の印が壊れているときだけ、本文を見るルールを止める', () => {
  assert.equal(textRulesStopped(['text']), true);
  assert.equal(textRulesStopped(['cell']), false);
  assert.equal(textRulesStopped([]), false);
});

test('印の並びが同じかどうかを見分ける', () => {
  assert.equal(sameMarkers([], []), true);
  assert.equal(sameMarkers(['text'], ['text']), true);
  assert.equal(sameMarkers([], ['text']), false);
  assert.equal(sameMarkers(['cell'], ['text']), false);
});

test('カラムは在るのに columnId が1本も解決しなければ壊れている', () => {
  assert.equal(columnsUnresolved(7, 0), true);
  assert.equal(columnsUnresolved(1, 0), true);
});

test('1本でも解決していれば壊れていない。カラムが無いときも判断しない', () => {
  // Some of them failing is degradation: only those columns lose the column tier
  assert.equal(columnsUnresolved(7, 1), false);
  assert.equal(columnsUnresolved(7, 7), false);
  // Having no columns is a normal case (still loading, an empty deck, only the detail panel open)
  assert.equal(columnsUnresolved(0, 0), false);
});
