import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heldForTheTask } from './held.ts';

test('同じタスクの中では一度しか読まず、次のタスクでは読み直す', async () => {
  let reads = 0;
  const ask = heldForTheTask(() => ({ read: ++reads }));
  const first = ask();
  assert.equal(ask(), first);
  assert.equal(reads, 1);
  await new Promise((resolve) => setTimeout(resolve));
  assert.notEqual(ask(), first);
  assert.equal(reads, 2);
});

test('答えが null でも読み直さない', () => {
  let reads = 0;
  const ask = heldForTheTask((): null => {
    reads++;
    return null;
  });
  assert.equal(ask(), null);
  assert.equal(ask(), null);
  assert.equal(reads, 1);
});
