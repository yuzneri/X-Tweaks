import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeTime, timeTextFrom } from './time.ts';
import { ja } from '../i18n/ja.ts';
import { en } from '../i18n/en.ts';

const NOW = new Date(2026, 7, 25, 10, 0);

test('今日の投稿は時刻だけ（日付は自明で、括弧の中の相対が補う）', () => {
  assert.deepEqual(describeTime(new Date(2026, 7, 25, 11, 18), NOW, ja), {
    text: '11:18',
    today: true,
  });
  // On the same day it is the clock time alone, whatever the hour
  assert.equal(describeTime(new Date(2026, 7, 25, 0, 5), NOW, ja).text, '00:05');
});

test('今日でなければ日付から出す', () => {
  assert.deepEqual(describeTime(new Date(2026, 7, 21, 19, 3), NOW, ja), {
    text: '8月21日 19:03',
    today: false,
  });
});

test('昨日の投稿も日付から出す（X がまだ相対を出していても）', () => {
  // Even 20 hours ago shows the date once the day has turned; "20 hours" alone does not say which day
  assert.equal(describeTime(new Date(2026, 7, 24, 14, 0), NOW, ja).text, '8月24日 14:00');
});

test('年が違えば年も付ける（去年の8月を今年と読み違えないため）', () => {
  assert.equal(describeTime(new Date(2025, 11, 31, 8, 21), NOW, ja).text, '2025年12月31日 08:21');
});

test('時と分は2桁にそろえる（並べたときに幅が動かない）', () => {
  assert.equal(describeTime(new Date(2026, 7, 25, 9, 7), NOW, ja).text, '09:07');
  assert.equal(describeTime(new Date(2026, 8, 3, 9, 7), NOW, ja).text, '9月3日 09:07');
});

test('日付の並べ方は言語で変わる', () => {
  assert.equal(describeTime(new Date(2026, 7, 21, 19, 3), NOW, en).text, 'Aug 21, 19:03');
  assert.equal(describeTime(new Date(2025, 11, 31, 8, 21), NOW, en).text, 'Dec 31 2025, 08:21');
  // Today is the clock time alone in either language
  assert.equal(describeTime(new Date(2026, 7, 25, 11, 18), NOW, en).text, '11:18');
});

test('読めない時刻には印を付けない（空の印は時刻が消えたように見える）', () => {
  assert.equal(timeTextFrom(null, NOW, ja), null);
  assert.equal(timeTextFrom('', NOW, ja), null);
  assert.equal(timeTextFrom('そんな時刻は無い', NOW, ja), null);
});

test('datetime を読んで、今日かどうかまで返す', () => {
  const shown = timeTextFrom('2026-08-24T08:21:55.000Z', NOW, ja);
  // Rendered in the device's time zone, so the time itself depends on the environment;
  // check the shape and that it is not today
  assert.equal(shown?.today, false);
  assert.match(shown?.text ?? '', /^\d+月\d+日 \d{2}:\d{2}$/);
});
