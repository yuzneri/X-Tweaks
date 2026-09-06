import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLY_MS,
  applyIn,
  MAX_SETTLE_MS,
  MEASURE_MAX_MS,
  MEASURE_MS,
  measureAgainIn,
  nextWait,
  SETTLE_MS,
} from './pace.ts';

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

test('設定の変更は、間が空いていればすぐ当てる', () => {
  assert.equal(applyIn(1_000, 0), 0);
  assert.equal(applyIn(1_000, 1_000 - APPLY_MS), 0);
});

test('立て続けに来た変更は、窓が閉じるまで待つ', () => {
  // A key pressed 20ms after the last one was applied waits out the rest of the window
  assert.equal(applyIn(1_020, 1_000), APPLY_MS - 20);
  assert.equal(applyIn(1_000, 1_000), APPLY_MS);
});

test('測るのが安いページは、こまめに測る', () => {
  assert.equal(measureAgainIn(0), MEASURE_MS);
  assert.equal(measureAgainIn(50), MEASURE_MS);
});

test('測るのが高いページは、そのぶん間を空ける', () => {
  assert.equal(measureAgainIn(200), 1000);
  // However slow it gets, a new picture is not left uncapped for ever
  assert.equal(measureAgainIn(10_000), MEASURE_MAX_MS);
});

test('時計が戻っても、設定の反映は止まらない', () => {
  /*
   * The clock behind this is monotonic (`content.ts` reads `performance.now()`), so a
   * reading before the last one cannot happen. Pinned anyway: read from a wall clock —
   * which is what this was given at first — an NTP correction or a machine waking from
   * sleep hands in a `now` from before `lastApply`, and an unclamped subtraction would
   * hold the settings back by however far the clock moved.
   */
  assert.equal(applyIn(1000, 5000), APPLY_MS);
  assert.ok(applyIn(1000, 5000) <= APPLY_MS);
});
