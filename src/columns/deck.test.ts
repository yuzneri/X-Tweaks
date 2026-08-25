import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckIdOf, deckNameOf, deckStateFrom, UNKNOWN_DECK } from './deck.ts';

test('デッキの URL から ID を読む', () => {
  assert.equal(deckIdOf('/i/decks/1234567890123456789'), '1234567890123456789');
  // Links on the rail carry absolute URLs
  assert.equal(deckIdOf('https://pro.x.com/i/decks/abcdef'), 'abcdef');
  assert.equal(deckIdOf('/i/decks/abcdef/'), 'abcdef');
});

test('デッキを指していない URL は読まない', () => {
  assert.equal(deckIdOf('/home'), null);
  assert.equal(deckIdOf('/i/decks/manage'), null);
  assert.equal(deckIdOf('/i/decks/new'), null);
  // The edit screen carries the same id as the deck on screen; taking it lists the deck twice
  assert.equal(deckIdOf('https://pro.x.com/i/decks/abcdef/edit'), null);
});

test('読み札からデッキ名を取り出す', () => {
  assert.equal(deckNameOf('デッキ「技術」の選択を解除しました'), '技術');
  assert.equal(deckNameOf('デッキ「ホーム」を選択しました'), 'ホーム');
  // The enclosing marks change with the language. This is only used for display, so take what can be taken
  assert.equal(deckNameOf('Deck "News" deselected'), 'News');
  assert.equal(deckNameOf('Deck «Actualités» désélectionné'), 'Actualités');
});

test('読み札の中の別の引用符まで飲み込まない', () => {
  // Without pairing open with close, the apostrophe is read as a closing mark and `News" isn` comes out
  assert.equal(deckNameOf(`Deck "News" isn't selected`), 'News');
});

test('名前が読めなければ null（呼ぶ側が番号で呼ぶ）', () => {
  assert.equal(deckNameOf(null), null);
  assert.equal(deckNameOf('Deck 3'), null);
  assert.equal(deckNameOf('「」'), null);
});

test('名前に囲む記号が入っていても、外側で切り出す', () => {
  // Even a name like 「デッキ「あ「い」う」の…」 is not cut at the inner mark
  assert.equal(deckNameOf('デッキ「あ「い」う」の選択を解除しました'), 'あ「い」う');
});

const link = (id: string, label: string | null = null) => ({
  tagName: 'A',
  href: `/i/decks/${id}`,
  label,
});
const selected = (label: string | null = null) => ({ tagName: 'BUTTON', href: null, label });

test('帯が読めなければ、一覧は空。どのデッキを見ているかは URL から言える', () => {
  assert.deepEqual(deckStateFrom([], 'abcdef'), { decks: [], deckId: 'abcdef' });
});

test('URL の指すデッキがリンク側に居る間は、何も決めない', () => {
  // On a deck switch the URL changes first and the rail takes 4.4 seconds to catch up.
  // Building the list in that gap makes the deck viewed until a moment ago disappear
  // along with its records
  const rail = [link('aaa', 'デッキ「技術」を選択しました'), selected('デッキ「ニュース」を選択しました')];
  assert.deepEqual(deckStateFrom(rail, 'aaa'), { decks: [], deckId: null });
});

test('選択中のデッキは、帯の中のその位置に入る', () => {
  const rail = [
    link('aaa', 'デッキ「技術」を選択しました'),
    selected('デッキ「ホーム」の選択を解除しました'),
    link('ccc', 'デッキ「ニュース」を選択しました'),
  ];
  assert.deepEqual(deckStateFrom(rail, 'bbb'), {
    decks: [
      { deckId: 'aaa', name: '技術' },
      { deckId: 'bbb', name: 'ホーム' },
      { deckId: 'ccc', name: 'ニュース' },
    ],
    deckId: 'bbb',
  });
});

test('デッキが1つしか無くても、選択中のものを並べる', () => {
  // A user with no links to any other deck: the rail carries only "New deck"
  const rail = [selected('デッキ「ホーム」の選択を解除しました'), { tagName: 'A', href: '/i/decks/new', label: null }];
  assert.deepEqual(deckStateFrom(rail, 'bbb'), {
    decks: [{ deckId: 'bbb', name: 'ホーム' }],
    deckId: 'bbb',
  });
});

test('選択中の印がどこにも無くても、見ているデッキだけは並べる', () => {
  // When the rail's shape changes and the `<button>` can no longer be found
  const rail = [link('aaa', 'デッキ「技術」を選択しました')];
  assert.deepEqual(deckStateFrom(rail, 'bbb'), {
    decks: [
      { deckId: 'aaa', name: '技術' },
      { deckId: 'bbb', name: null },
    ],
    deckId: 'bbb',
  });
});

test('デッキではないリンクは一覧に入れない', () => {
  const rail = [
    { tagName: 'A', href: '/i/decks/manage', label: null },
    { tagName: 'A', href: '/i/decks/new', label: null },
    { tagName: 'A', href: '/i/decks/aaa/edit', label: null },
    selected('デッキ「ホーム」の選択を解除しました'),
  ];
  assert.deepEqual(deckStateFrom(rail, 'bbb').decks, [{ deckId: 'bbb', name: 'ホーム' }]);
});

test('読み札が読めないデッキは、名前を null にして並べる', () => {
  const rail = [link('aaa', null), selected(null)];
  assert.deepEqual(deckStateFrom(rail, 'bbb').decks, [
    { deckId: 'aaa', name: null },
    { deckId: 'bbb', name: null },
  ]);
});

test('URL からデッキが読めなくても、見ているデッキとして並べる', () => {
  // `currentDeckId()` falls back to '?' when unreadable. With null, that deck's
  // columns would be recorded nowhere
  const rail = [link('aaa', 'デッキ「技術」を選択しました'), selected('デッキ「ホーム」の選択を解除しました')];
  assert.deepEqual(deckStateFrom(rail, UNKNOWN_DECK), {
    decks: [
      { deckId: 'aaa', name: '技術' },
      { deckId: UNKNOWN_DECK, name: 'ホーム' },
    ],
    deckId: UNKNOWN_DECK,
  });
});

test('同じデッキが二重に並ばない', () => {
  // A link to the selected deck's `…/edit` sometimes shows up on the rail
  const rail = [
    { tagName: 'A', href: '/i/decks/bbb/edit', label: null },
    selected('デッキ「ホーム」の選択を解除しました'),
  ];
  assert.deepEqual(deckStateFrom(rail, 'bbb').decks, [{ deckId: 'bbb', name: 'ホーム' }]);
});
