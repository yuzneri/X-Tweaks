import { test } from 'node:test';
import assert from 'node:assert/strict';
import { switchStates } from './switches.ts';
import { ja } from '../i18n/ja.ts';

test('投稿フォームの中でも、設定画面と同じ2つを同じ文言で出す', () => {
  const states = switchStates({ reopen: true, keepHashtags: false }, ja);
  assert.deepEqual(
    states.map((state) => state.key),
    ['reopen', 'keepHashtags']
  );
  // The wording comes from the same dictionary the settings screen reads, so the two
  // surfaces cannot end up calling the same setting by different names
  assert.equal(states[0]!.label, ja.compose.reopen.label);
  assert.equal(states[1]!.label, ja.compose.keepHashtags.label);
});

test('2つは連動しない。片方だけでもそのまま映す', () => {
  // Neither waits on the other: with the form left to close, the tags wait for the next
  // form opened by hand instead (see restoresHashtags in schema.ts)
  const tagsOnly = switchStates({ reopen: false, keepHashtags: true }, ja);
  assert.deepEqual(
    tagsOnly.map((state) => state.checked),
    [false, true]
  );

  const openOnly = switchStates({ reopen: true, keepHashtags: false }, ja);
  assert.deepEqual(
    openOnly.map((state) => state.checked),
    [true, false]
  );
});

test('入っているかどうかは、保存されている値をそのまま映す', () => {
  const states = switchStates({ reopen: false, keepHashtags: false }, ja);
  assert.deepEqual(
    states.map((state) => state.checked),
    [false, false]
  );
});
