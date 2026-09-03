import { test } from 'node:test';
import assert from 'node:assert/strict';
import { railShape } from './rail.ts';

/*
 * Only the rule deciding which shape the rail is can be checked here: everything else in
 * `rail.ts` reads the DOM, and this project's tests run without one. The reading itself is
 * checked against saved copies of the three pages (see the review log for PR3).
 */

test('検索窓のある欄は、窓の下に置く', () => {
  assert.equal(railShape({ searchForm: true, advancedSearch: false }), 'below-search');
});

test('「高度な検索」のある欄では、X の検索フィルターと入れ替わる', () => {
  assert.equal(railShape({ searchForm: false, advancedSearch: true }), 'replace-filters');
});

test('どちらの印も無い欄では、先頭に置く', () => {
  assert.equal(railShape({ searchForm: false, advancedSearch: false }), 'at-top');
});

test('両方あるときは検索窓が勝つ', () => {
  // X shows the two on different pages, so this does not arise today. The order is fixed
  // all the same: a rail holding a search box is a timeline's rail, and putting the form
  // under the box is where a reader of that page will look for it
  assert.equal(railShape({ searchForm: true, advancedSearch: true }), 'below-search');
});
