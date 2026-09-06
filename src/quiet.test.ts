import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atAQuietMoment, sayWhatFellOver } from './quiet.ts';

/**
 * The waiting is two `requestAnimationFrame`s deep, so the tests drive their own: each
 * `frame()` runs whatever the last one booked, and two of them carry one batch through.
 */
const frames: (() => void)[] = [];
(globalThis as unknown as { requestAnimationFrame: (fn: () => void) => number }).requestAnimationFrame =
  (fn) => frames.push(fn);

const frame = (): void => {
  const due = frames.splice(0, frames.length);
  for (const one of due) one();
};

/** One quiet moment, start to finish */
const quietMoment = (): void => {
  frame();
  frame();
};

test('積んだ仕事は、2フレーム後にまとめて走る', () => {
  const ran: string[] = [];
  atAQuietMoment(() => ran.push('one'));
  atAQuietMoment(() => ran.push('two'));
  // One frame is not enough: a callback on the next frame runs before that frame is laid out
  frame();
  assert.deepEqual(ran, []);
  frame();
  assert.deepEqual(ran, ['one', 'two']);
});

test('ひとつ転んでも、残りは走る', () => {
  const ran: string[] = [];
  const fell: unknown[] = [];
  sayWhatFellOver((error) => fell.push(error));

  atAQuietMoment(() => {
    throw new Error('落ちた');
  });
  atAQuietMoment(() => ran.push('after'));
  quietMoment();

  assert.deepEqual(ran, ['after'], '転んだ仕事のあとが走っていない');
  assert.equal(fell.length, 1);
  assert.equal((fell[0] as Error).message, '落ちた');
});

test('報告そのものが転んでも、残りは走る', () => {
  const ran: string[] = [];
  sayWhatFellOver(() => {
    throw new Error('報告も落ちた');
  });

  atAQuietMoment(() => {
    throw new Error('落ちた');
  });
  atAQuietMoment(() => ran.push('after'));
  quietMoment();

  assert.deepEqual(ran, ['after']);
  sayWhatFellOver(() => {});
});

test('転んだあとも、次の静かな瞬間は予約できる', () => {
  /*
   * What waits here books its own next turn from inside its callback
   * (`appearance/apply.ts`), so a batch that stopped early would be a booking that never
   * happens again — measuring would stop for the life of the page, silently.
   */
  const ran: string[] = [];
  sayWhatFellOver(() => {});
  atAQuietMoment(() => {
    throw new Error('落ちた');
  });
  quietMoment();

  atAQuietMoment(() => ran.push('later'));
  quietMoment();
  assert.deepEqual(ran, ['later']);
});

test('仕事の中から積んだものは、次の静かな瞬間に回る', () => {
  const ran: string[] = [];
  atAQuietMoment(() => {
    ran.push('first');
    atAQuietMoment(() => ran.push('second'));
  });
  quietMoment();
  assert.deepEqual(ran, ['first'], '同じバッチで走ってしまっている');
  quietMoment();
  assert.deepEqual(ran, ['first', 'second']);
});
