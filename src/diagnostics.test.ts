import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counted, feltAsSlow, noted, saidIfSlow, spentOn } from './diagnostics.ts';

/**
 * The module keeps what a round measured until the round is said, so these tests run in
 * the order they are written and the first of them is the one that sees a fresh module —
 * which is what it is for. `node --test` gives each file its own process, so nothing
 * outside this file can have said anything first.
 */
const said: string[] = [];
const log = (message: string): void => {
  said.push(message);
};

test('最初の遅い回は、読み込み直後でも言う', () => {
  /*
   * The window between one line and the next is measured from a clock that starts at
   * nothing when the page loads, so "never said anything yet" cannot be written as zero:
   * that reads as "said something just now" and swallows the first slow round of the page,
   * which is the one with most to say.
   */
  saidIfSlow('opening the page', 200, log);
  assert.equal(said.length, 1);
  assert.match(said[0]!, /^⏱ 200ms opening the page/);
});

test('間を置かずに続いた回は数えられ、いちばん重い回が添えられる', () => {
  said.length = 0;
  saidIfSlow('one', 120, log);
  saidIfSlow('two', 300, log);
  saidIfSlow('three', 90, log);
  assert.deepEqual(said, [], '静かにしている間に何か言っている');

  // The window is a second, so nothing above is printed; the next line carries them
  saidIfSlow('four', 80, log);
  assert.deepEqual(said, []);
});

test('速い回は何も言わないし、測ったものも残さない', () => {
  said.length = 0;
  spentOn('· something', 40);
  counted('posts', 7);
  noted('every post');
  saidIfSlow('a quick round', 5, log);
  assert.deepEqual(said, [], '速い回について何か言っている');
});

test('言わずに終わった回の数字が、次の行に混ざらない', async () => {
  /*
   * What a round measured is cleared where it is said and nowhere else, so a round that
   * measured and then said nothing would leave its numbers to be added to whatever prints
   * next — which would then be reporting work it never did.
   */
  said.length = 0;
  spentOn('· the page catching up', 200);
  saidIfSlow('a round that says nothing', 5, log);
  assert.deepEqual(said, []);

  // Waited out rather than counted: nothing is printed within a second of the last line,
  // and the tests above have just used that up
  await new Promise((resolve) => setTimeout(resolve, 1100));

  spentOn('· its own work', 10);
  saidIfSlow('the next round', 1500, log);
  assert.equal(said.length, 1, '窓が明けたのに何も言っていない');
  assert.match(said[0]!, /· its own work 10ms/);
  assert.doesNotMatch(said[0]!, /catching up/, '前の回の数字が混ざっている');
  // The rounds held back while the window was closed are counted into this line
  assert.match(said[0]!, /\+\d+ more since the last of these, worst 300ms/);
});

test('言うかどうかの境目は 50ms', () => {
  assert.equal(feltAsSlow(49), false);
  assert.equal(feltAsSlow(50), true);
  assert.equal(feltAsSlow(0), false);
});
