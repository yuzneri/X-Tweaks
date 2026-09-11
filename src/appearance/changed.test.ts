import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  changedCells,
  handledChanges,
  noticeChange,
  postsTouched,
  resumeWatching,
  stopWatching,
  watchChanges,
} from './changed.ts';

/**
 * The watch is a MutationObserver over the page, so the tests hand it a stand-in that only
 * records what it was asked to do. The module keeps its state between tests, so they run as
 * one story: watching, stood down, back again.
 */
const calls: string[] = [];
class FakeObserver {
  observe(): void {
    calls.push('observe');
  }
  disconnect(): void {
    calls.push('disconnect');
  }
}
/** A node inside a post: all `noticeChange` asks of it is which post it is in */
class FakeElement {
  readonly cell: unknown;
  constructor(cell: unknown) {
    this.cell = cell;
  }
  closest(): unknown {
    return this.cell;
  }
}
const g = globalThis as unknown as Record<string, unknown>;
g.MutationObserver = FakeObserver;
g.Element = FakeElement;
g.document = { body: {} };

const cell = { name: 'a post' };
const nodeIn = (post: unknown): Node => new FakeElement(post) as unknown as Node;

test('見張りは一度だけ張られ、変わった投稿を覚える', () => {
  watchChanges();
  watchChanges();
  assert.deepEqual(calls, ['observe']);
  noticeChange(nodeIn(cell));
  assert.ok(postsTouched().has(cell as unknown as Element));
});

test('全件の回のあとは、覚えた投稿だけを見る', () => {
  // The first round looks at everything, as does the safety round; the next one does not
  assert.equal(changedCells(), null);
  handledChanges();
  noticeChange(nodeIn(cell));
  assert.notEqual(changedCells(), null);
  handledChanges();
});

test('止めると見張りを外し、覚えていた投稿も手放す', () => {
  noticeChange(nodeIn(cell));
  calls.length = 0;
  stopWatching();
  assert.deepEqual(calls, ['disconnect']);
  assert.equal(postsTouched().size, 0);
});

test('止めている間は、設定を当て直しても見張りは張られない', () => {
  // Every application of the settings asks for the watch (`appearance/apply.ts`), the
  // empty settings of the pause included
  calls.length = 0;
  watchChanges();
  assert.deepEqual(calls, []);
});

test('止めている間は、変わった投稿を溜めない', () => {
  // A picture finishing loading still reports its post; nothing would ever take it back out
  noticeChange(nodeIn(cell));
  assert.equal(postsTouched().size, 0);
});

test('再開すると見張りを張り直し、次の回は全件を見る', () => {
  calls.length = 0;
  resumeWatching();
  assert.deepEqual(calls, ['observe']);
  // What changed while stood down went unheard, so the watch's list says nothing about it
  assert.equal(changedCells(), null);
  handledChanges();
  noticeChange(nodeIn(cell));
  assert.ok(postsTouched().has(cell as unknown as Element));
});
