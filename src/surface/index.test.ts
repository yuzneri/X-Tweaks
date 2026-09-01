import { test } from 'node:test';
import assert from 'node:assert/strict';
import { install, surface, type Surface } from './index.ts';

/**
 * 接合面の中身は DOM を触るので、ここでは呼ばない。
 * 確かめたいのは「入れる前に使うと黙って進まない」という起動順の約束だけ。
 */
const stub = { id: 'pro' } as Surface;

test('入れる前に呼ぶと失敗する。黙って null を返さない', () => {
  assert.throws(() => surface(), /No surface installed/);
});

test('入れたあとは、入れたものが返る', () => {
  install(stub);
  assert.equal(surface(), stub);
});
