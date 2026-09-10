import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixedTrendHref } from './trend-link.ts';

/** The two forms of the same trend, as they stand on a real page (`test/trend.htm`, `test/trend_x.htm`) */
test('X Pro のアプリ用リンクを、x.com が開くのと同じページに直す', () => {
  assert.equal(
    fixedTrendHref('twitter://trending/2098003547510210590'),
    'https://x.com/i/trending/2098003547510210590'
  );
});

test('直したあとのアドレスは、もう直す対象ではない', () => {
  assert.equal(fixedTrendHref('https://x.com/i/trending/2098003547510210590'), null);
});

test('トレンド以外のアプリ用リンクには触らない', () => {
  assert.equal(fixedTrendHref('twitter://user?screen_name=yuzneri'), null);
  assert.equal(fixedTrendHref('twitter://timeline'), null);
});

test('id が数字の並びでなければ、直さずそのままにする', () => {
  // What follows the id is not dropped and not passed on: the link is left as it was
  assert.equal(fixedTrendHref('twitter://trending/2098003547510210590?timeline=VGltZWxpbmU'), null);
  assert.equal(fixedTrendHref('twitter://trending/'), null);
  assert.equal(fixedTrendHref('twitter://trending/../../evil'), null);
  assert.equal(fixedTrendHref(null), null);
  assert.equal(fixedTrendHref(undefined), null);
});
