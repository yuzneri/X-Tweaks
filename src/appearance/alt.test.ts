import { test } from 'node:test';
import assert from 'node:assert/strict';
import { descriptionOf, learnGenericAlts, type PhotoAlt } from './alt.ts';

const none = new Set<string>();

test('2人の別のアカウントが同じ alt を出していたら、それは X の言葉', () => {
  const photos: PhotoAlt[] = [
    { alt: '画像', account: 'alice' },
    { alt: '画像', account: 'bob' },
    { alt: '桜の木の下で撮った集合写真', account: 'carol' },
  ];
  assert.deepEqual([...learnGenericAlts(photos, none)], ['画像']);
});

test('同じ人が同じ説明を何度出しても覚えない', () => {
  // The false positive this guards: one person putting the same words on post after post
  // — a shop listing the same goods, an artist the same terms. Counting by post instead
  // of by account would take those words for X's own and swallow them
  const photos: PhotoAlt[] = [
    { alt: '受注状況', account: 'alice' },
    { alt: '受注状況', account: 'alice' },
    { alt: '受注状況', account: 'alice' },
  ];
  assert.equal(learnGenericAlts(photos, none).size, 0);
});

test('デッキが同じポストを何カラムに出しても覚えない', () => {
  // Four columns of the same home timeline show one post four times over
  const photos: PhotoAlt[] = Array.from({ length: 4 }, () => ({
    alt: '桜の木の下で撮った集合写真',
    account: 'alice',
  }));
  assert.equal(learnGenericAlts(photos, none).size, 0);
});

test('複数行の alt は、どれだけ繰り返されても覚えない', () => {
  // X's word for a picture is a word. Two lines means somebody wrote it
  const photos: PhotoAlt[] = [
    { alt: '在庫あり\n発送は翌営業日', account: 'alice' },
    { alt: '在庫あり\n発送は翌営業日', account: 'bob' },
  ];
  assert.equal(learnGenericAlts(photos, none).size, 0);
});

test('長すぎる alt は、どれだけ繰り返されても覚えない', () => {
  // The shortest one-line description anybody was seen to write ran to 22 characters,
  // and this kind of text — a hashtag campaign — is just what several accounts do carry
  // word for word. The bound sits below it on purpose
  const shared = '#1分間０いいね0リプ０リツイートチャレンジ';
  assert.equal(shared.length, 22);
  const photos: PhotoAlt[] = [
    { alt: shared, account: 'alice' },
    { alt: shared, account: 'bob' },
  ];
  assert.equal(learnGenericAlts(photos, none).size, 0);

  // X's own words are far shorter, and the bound itself is still within reach
  const atLimit = 'あ'.repeat(20);
  const reached = learnGenericAlts(
    [
      { alt: atLimit, account: 'alice' },
      { alt: atLimit, account: 'bob' },
    ],
    none
  );
  assert.deepEqual([...reached], [atLimit]);
});

test('1人しか出していないうちは決められない', () => {
  const learned = learnGenericAlts([{ alt: '画像', account: 'alice' }], none);
  assert.equal(learned.size, 0);
  // Which means it is shown as if it were a description. The next person's picture settles it
  assert.equal(descriptionOf('画像', learned), '画像');
});

test('アカウントが読めない写真は数に入れない', () => {
  const photos: PhotoAlt[] = [
    { alt: '画像', account: null },
    { alt: '画像', account: null },
  ];
  assert.equal(learnGenericAlts(photos, none).size, 0);
});

test('一度覚えた言葉は忘れない。画面から消えても持ち越す', () => {
  const known = new Set(['画像']);
  // A pass with nothing repeating in it does not take the earlier word away
  const learned = learnGenericAlts([{ alt: '桜の木の下で', account: 'alice' }], known);
  assert.deepEqual([...learned], ['画像']);
});

test('種類ごとに別の言葉を覚える（写真と動画で文言が違う）', () => {
  const photos: PhotoAlt[] = [
    { alt: '画像', account: 'alice' },
    { alt: '画像', account: 'bob' },
    { alt: '埋め込み動画', account: 'carol' },
    { alt: '埋め込み動画', account: 'dave' },
  ];
  assert.deepEqual([...learnGenericAlts(photos, none)].sort(), ['埋め込み動画', '画像']);
});

test('1語覚えたあとも、別の語を覚えられる', () => {
  // Photos far outnumber videos, so 「画像」 is settled first. Were that the end of it,
  // 「埋め込み動画」 would never be reached and every video would carry it as a description
  const learned = learnGenericAlts(
    [
      { alt: '埋め込み動画', account: 'alice' },
      { alt: '埋め込み動画', account: 'bob' },
    ],
    new Set(['画像'])
  );
  assert.deepEqual([...learned].sort(), ['埋め込み動画', '画像']);
});

test('覚えた言葉の写真は、何も言うことがない', () => {
  const generic = new Set(['画像']);
  assert.equal(descriptionOf('画像', generic), null);
  assert.equal(descriptionOf('桜の木の下で撮った集合写真', generic), '桜の木の下で撮った集合写真');
  assert.equal(descriptionOf(null, generic), null);
});
