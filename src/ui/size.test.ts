import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSizeInput } from './size.ts';

test('空欄は「未指定」として通す', () => {
  assert.deepEqual(parseSizeInput(''), { size: null, invalid: false });
  assert.deepEqual(parseSizeInput('   '), { size: null, invalid: false });
});

test('正の整数を受け入れ、前後の空白は許す', () => {
  assert.deepEqual(parseSizeInput('350'), { size: 350, invalid: false });
  assert.deepEqual(parseSizeInput('  16  '), { size: 16, invalid: false });
});

test('0 と負の数は弾く。未指定に戻すのは空欄で表せる', () => {
  assert.deepEqual(parseSizeInput('0'), { size: null, invalid: true });
  assert.deepEqual(parseSizeInput('-5'), { size: null, invalid: true });
});

test('数として読めても書式が違うものは弾く', () => {
  // Number() accepts these, but as a px value they mean nothing
  for (const input of ['12.5', '1e3', '0x1f', '３５０', '350px', '+8', 'Infinity', 'abc']) {
    // It carries no explanatory text; the side that shows it takes that from the dictionaries
    assert.deepEqual(parseSizeInput(input), { size: null, invalid: true }, `${input} は寸法として受け入れない`);
  }
});
