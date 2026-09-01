import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceFor } from './select.ts';

test('ホストごとにサーフェスが決まる', () => {
  assert.equal(surfaceFor('pro.x.com')?.id, 'pro');
  assert.equal(surfaceFor('x.com')?.id, 'x');
});

test('知らないホストでは何も選ばない。当てずっぽうで動かさない', () => {
  // 紛らわしい隣人。前方・後方が一致するだけのホストを x.com 扱いしない
  for (const host of ['www.x.com', 'x.com.example.jp', 'notx.com', 'twitter.com', '']) {
    assert.equal(surfaceFor(host), null, host);
  }
});
