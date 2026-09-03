import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, parseScopes, queryAt } from './parse.ts';
import { buildQuery, emptyForm, type SearchForm } from './query.ts';

const form = (fields: Partial<SearchForm>): SearchForm => ({ ...emptyForm(), ...fields });

/**
 * The one promise this makes: what a query says survives being read and written again.
 * Which field a word lands in cannot always be told, so that is not what is checked.
 */
const roundTrips = (query: string): void =>
  assert.equal(buildQuery(parseQuery(query)), query, query);

test('素の語は往復する', () => {
  roundTrips('rust');
  roundTrips('rust lang go');
});

test('フレーズは往復する', () => {
  roundTrips('"hello world"');
  roundTrips('rust "hello world"');
});

test('OR の群は往復する', () => {
  roundTrips('(go OR zig)');
  roundTrips('(go OR zig OR rust)');
  roundTrips('rust (go OR zig)');
});

test('除外は往復する', () => {
  roundTrips('-crab');
  roundTrips('rust -crab -ferris');
  roundTrips('-"hot take"');
});

test('ハッシュタグは往復する', () => {
  roundTrips('#rust');
  roundTrips('#rust #go');
});

test('アカウントの欄は往復する', () => {
  roundTrips('from:alice');
  roundTrips('(from:alice OR from:bob)');
  roundTrips('-from:alice -from:bob');
  roundTrips('to:alice');
  roundTrips('@alice');
  roundTrips('(@alice OR @bob)');
});

test('filter: 系と返信は往復する', () => {
  roundTrips('filter:verified');
  roundTrips('-filter:links');
  roundTrips('filter:images -filter:videos');
  roundTrips('filter:replies');
  roundTrips('-filter:replies');
});

test('言語と反応数は往復する', () => {
  roundTrips('lang:ja');
  roundTrips('min_replies:5 min_faves:100 min_retweets:10');
  roundTrips('min_faves:0');
});

test('全部入りのクエリが往復する', () => {
  roundTrips(
    'rust "hello world" (go OR zig) -crab #rustlang lang:ja from:alice -to:bob @carol ' +
      'filter:verified -filter:links -filter:replies min_faves:100'
  );
});

test('期間は往復する', () => {
  // 秒はその場の時間帯で日付に直され、また秒に戻る
  const q = buildQuery(
    form({ since: { date: '2026-01-01', time: '' }, until: { date: '2026-02-01', time: '' } })
  );
  roundTrips(q);
  const withTime = buildQuery(
    form({ since: { date: '2026-01-01', time: '09:30:15' }, until: { date: '', time: '' } })
  );
  roundTrips(withTime);
});

test('日付だけの期間は、日付だけの欄に戻る', () => {
  // 時刻が日の端なら、時刻の欄は空のままにする。丸ごとの日を扱っていた印
  const q = buildQuery(form({ since: { date: '2026-01-01', time: '' } }));
  assert.deepEqual(parseQuery(q).since, { date: '2026-01-01', time: '' });
});

test('時刻を指定した期間は、時刻の欄に戻る', () => {
  const q = buildQuery(form({ since: { date: '2026-01-01', time: '09:30:15' } }));
  assert.deepEqual(parseQuery(q).since, { date: '2026-01-01', time: '09:30:15' });
});

test('知らない演算子は「全ての語」に入り、そのまま出ていく', () => {
  // この拡張が出さない演算子でも、往復で失われない
  roundTrips('rust within_time:3d');
  roundTrips('conversation_id:123');
});

test('空のクエリは空のフォームになる', () => {
  assert.deepEqual(parseQuery(''), emptyForm());
  assert.equal(buildQuery(parseQuery('')), '');
});

test('フレーズが2つあるときは、どちらも「全ての語」に残す', () => {
  // どちらが「この語順のとおりに含む」の欄から来たのかは決められない
  const parsed = parseQuery('"a b" "c d"');
  assert.equal(parsed.exact, '');
  roundTrips('"a b" "c d"');
});

// --- アドレスの側 ---

test('アドレスからクエリを取り出す', () => {
  assert.equal(queryAt('/search', '?q=rust+lang&src=typd'), 'rust lang');
  assert.equal(queryAt('/search', '?src=typd'), '');
});

test('アドレスから f・pf・lf を読む', () => {
  assert.deepEqual(parseScopes('?q=a&f=live&pf=on&lf=on'), {
    tab: 'live',
    followedOnly: true,
    nearbyOnly: true,
  });
});

test('f が無ければ top、知らない値でも top', () => {
  assert.equal(parseScopes('?q=a').tab, 'top');
  assert.equal(parseScopes('?q=a&f=image').tab, 'top');
});

test('pf・lf は on のときだけ立つ', () => {
  assert.equal(parseScopes('?q=a&pf=off').followedOnly, false);
  assert.equal(parseScopes('?q=a').nearbyOnly, false);
});


test('ハッシュタグのページは、アドレスにクエリを持たない', () => {
  // X はタグを押すと /hashtag/… へ送る。?q= を読むだけでは、
  // 検索結果を前にしてフォームが空のままになる
  assert.equal(queryAt('/hashtag/rust', ''), '#rust');
  assert.equal(queryAt('/hashtag/rust', '?src=hashtag_click'), '#rust');
  assert.equal(queryAt('/hashtag/%E6%97%A5%E6%9C%AC%E8%AA%9E', ''), '#日本語');
});

test('ハッシュタグのページを読み込んで組み直すと、同じクエリになる', () => {
  const asked = queryAt('/hashtag/rust', '?src=hashtag_click');
  assert.equal(buildQuery(parseQuery(asked)), '#rust');
});

test('検索でないページは、クエリを持たない', () => {
  assert.equal(queryAt('/home', ''), '');
  assert.equal(queryAt('/alice', ''), '');
  // 空の検索は検索結果のビューではない（viewKeyOf の判断と揃える）
  assert.equal(queryAt('/search', '?q='), '');
});
