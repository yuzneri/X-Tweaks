import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteOf, type TransferOutcome } from './transfer-note.ts';

const outcome = (patch: Partial<TransferOutcome> = {}): TransferOutcome => ({
  error: null,
  copied: null,
  loaded: false,
  forgotten: null,
  ...patch,
});

test('何も起きていなければ、何も出さない', () => {
  assert.equal(noteOf(outcome()), null);
});

test('読み込みの断りが最優先', () => {
  const note = noteOf(outcome({ error: '読めません', copied: 'failed', forgotten: 'failed' }));
  assert.deepEqual(note, { kind: 'error', text: '読めません' });
});

test('失敗は、先に立っていた成功の知らせより先に出る', () => {
  // A failed "forget the record" after a copy clears nothing, so the box is unchanged and the copy
  // notice stays true; in the reverse order the failure would be hidden
  assert.deepEqual(noteOf(outcome({ copied: 'done', forgotten: 'failed' })), {
    kind: 'forgetFailed',
  });
  assert.deepEqual(noteOf(outcome({ loaded: true, forgotten: 'failed' })), { kind: 'forgetFailed' });
});

test('失敗どうしなら、コピーの失敗が先', () => {
  assert.deepEqual(noteOf(outcome({ copied: 'failed', forgotten: 'failed' })), {
    kind: 'copyFailed',
  });
});

test('成功の知らせは、コピー → 読み込み → 記録の順で出す', () => {
  assert.deepEqual(noteOf(outcome({ copied: 'done', loaded: true, forgotten: 'done' })), {
    kind: 'copied',
  });
  assert.deepEqual(noteOf(outcome({ loaded: true, forgotten: 'done' })), { kind: 'loaded' });
  assert.deepEqual(noteOf(outcome({ forgotten: 'done' })), { kind: 'forgotten' });
});

test('それぞれ単独でも出る', () => {
  assert.deepEqual(noteOf(outcome({ copied: 'failed' })), { kind: 'copyFailed' });
  assert.deepEqual(noteOf(outcome({ forgotten: 'failed' })), { kind: 'forgetFailed' });
  assert.deepEqual(noteOf(outcome({ copied: 'done' })), { kind: 'copied' });
  assert.deepEqual(noteOf(outcome({ loaded: true })), { kind: 'loaded' });
});
