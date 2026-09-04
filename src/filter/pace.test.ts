import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SETTLE_MS, nextWait, SETTLE_MS } from './pace.ts';

test('軽い回のあとは、いちばん短い待ちに戻る', () => {
  assert.equal(nextWait(0), SETTLE_MS);
  assert.equal(nextWait(4), SETTLE_MS);
  // The floor holds until the round costs a fifth of it
  assert.equal(nextWait(SETTLE_MS * 0.2), SETTLE_MS);
});

test('重い回のあとは、その回の5倍だけ待つ', () => {
  assert.equal(nextWait(20), 100);
  assert.equal(nextWait(50), 250);
});

test('どれだけ重くても、待ちには上限がある', () => {
  // The wait is also how long a post waits to be collapsed, so it does not grow without end
  assert.equal(nextWait(MAX_SETTLE_MS), MAX_SETTLE_MS);
  assert.equal(nextWait(10_000), MAX_SETTLE_MS);
});

test('待ちは重かった回に引きずられない。次が軽ければ次から短い', () => {
  const heavy = nextWait(300);
  assert.equal(heavy, MAX_SETTLE_MS);
  assert.equal(nextWait(3), SETTLE_MS);
});
