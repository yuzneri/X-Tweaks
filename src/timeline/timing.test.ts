import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atTop, nextGo, RETRY_MS } from './timing.ts';

/** A page read at the very top, which is where the offer is worth taking */
const TOP = { scrollY: 0 };

test('まだ一度も行っていなければ、押しに行く', () => {
  assert.equal(nextGo({ goes: 0, lastGo: 0 }, 1_000, TOP), 'press');
});

test('2回目はキーを試す。押すのが効いていない可能性を1度だけ当たる', () => {
  assert.equal(nextGo({ goes: 1, lastGo: 0 }, 1_000 + RETRY_MS, TOP), 'period');
});

test('3回目からは押すのに戻る', () => {
  const now = 1_000 + RETRY_MS;
  assert.equal(nextGo({ goes: 2, lastGo: 1_000 }, now, TOP), 'press');
  assert.equal(nextGo({ goes: 9, lastGo: 1_000 }, now, TOP), 'press');
});

test('前に行ってから間が空くまでは、何もしない', () => {
  // The offer standing does not mean the last press failed: X may have put the next
  // batch behind the same button. Either way the answer is to wait, then go again
  assert.equal(nextGo({ goes: 1, lastGo: 1_000 }, 1_000 + RETRY_MS - 1, TOP), 'wait');
  assert.equal(nextGo({ goes: 1, lastGo: 1_000 }, 1_000 + RETRY_MS, TOP), 'period');
});

test('一度も行っていなければ、間の判定は効かない。時計がどこにあろうと押す', () => {
  assert.equal(nextGo({ goes: 0, lastGo: 1_000 }, 1_000, TOP), 'press');
});

test('上にいなければ、何回目だろうと後回し', () => {
  const away = { scrollY: 5_000 };
  assert.equal(nextGo({ goes: 0, lastGo: 0 }, 1_000, away), 'later');
  assert.equal(nextGo({ goes: 1, lastGo: 0 }, 1_000 + RETRY_MS, away), 'later');
});

test('「後回し」と「待つ」は別物。言うに値するのは前者だけ', () => {
  // One is the reader being somewhere else, the other is this having just gone. The
  // caller says something only for the first, so they cannot be the same answer
  assert.equal(nextGo({ goes: 0, lastGo: 0 }, 0, { scrollY: 5_000 }), 'later');
  assert.equal(nextGo({ goes: 1, lastGo: 0 }, 1, TOP), 'wait');
});

test('少し下がったくらいは、まだ上にいるうちに入る', () => {
  // Pressing moves to the new posts, so what is being avoided is pulling somebody off
  // what they were reading. A couple of hundred pixels is not that
  assert.equal(atTop(0), true);
  assert.equal(atTop(200), true);
  assert.equal(atTop(201), false);
});
