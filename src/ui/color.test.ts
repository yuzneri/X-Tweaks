import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseColorInput } from './color.ts';

test('空欄は「既定色を使う」として通す', () => {
  assert.deepEqual(parseColorInput(''), { color: null, invalid: false });
  assert.deepEqual(parseColorInput('   '), { color: null, invalid: false });
});

test('#rrggbb をそのまま受け入れ、小文字に揃える', () => {
  assert.deepEqual(parseColorInput('#8a6d1f'), { color: '#8a6d1f', invalid: false });
  assert.deepEqual(parseColorInput('#AABBCC'), { color: '#aabbcc', invalid: false });
});

test('先頭の # は省略でき、前後の空白も許す', () => {
  assert.deepEqual(parseColorInput('8a6d1f'), { color: '#8a6d1f', invalid: false });
  assert.deepEqual(parseColorInput('  #8A6D1F  '), { color: '#8a6d1f', invalid: false });
});

test('不透明度つき（#rrggbbaa）も受け入れる', () => {
  assert.deepEqual(parseColorInput('#8a6d1f80'), { color: '#8a6d1f80', invalid: false });
  assert.deepEqual(parseColorInput('8A6D1F26'), { color: '#8a6d1f26', invalid: false });
});

test('#rrggbb でも #rrggbbaa でもないものは弾く', () => {
  for (const input of ['#abc', 'abc', 'red', '#gghhii', '#aabbccddee', '#12345', '#1234567']) {
    // It carries no explanatory text; the side that shows it takes that from the dictionaries
    assert.deepEqual(parseColorInput(input), { color: null, invalid: true }, `${input} は色として受け入れない`);
  }
});
