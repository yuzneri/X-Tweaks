import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuery,
  emptyForm,
  emptyScopes,
  quoted,
  epochSecondsOf,
  searchPath,
  tokenize,
  type SearchForm,
} from './query.ts';

/** The form with only the named fields filled in */
const form = (fields: Partial<SearchForm>): SearchForm => ({ ...emptyForm(), ...fields });

test('空白で語に割れる', () => {
  assert.deepEqual(tokenize('red blue green'), ['red', 'blue', 'green']);
});

test('引用で囲まれた塊は1語のまま', () => {
  assert.deepEqual(tokenize('red "blue green" yellow'), ['red', '"blue green"', 'yellow']);
});

test('引用符は付けたまま返す', () => {
  // What tells a phrase the reader asked for from a word that merely has a space
  // around it. `quoted` reads the difference off the quotes
  assert.deepEqual(tokenize('"one two"'), ['"one two"']);
});

test('連続した空白・改行・タブでも語が増えない', () => {
  assert.deepEqual(tokenize('  red \t blue \n green  '), ['red', 'blue', 'green']);
});

test('空の欄からは1語も出ない', () => {
  assert.deepEqual(tokenize(''), []);
  assert.deepEqual(tokenize('   '), []);
});

test('閉じられていない引用は残りを飲み込む', () => {
  // The same thing X's own search does. Repairing it would mean guessing where the
  // reader meant the phrase to end
  assert.deepEqual(tokenize('red "blue green'), ['red', '"blue green']);
});

test('引用の中の空白だけが守られ、外の空白は割れる', () => {
  assert.deepEqual(tokenize('a "b c" d "e f"'), ['a', '"b c"', 'd', '"e f"']);
});

test('引用済みの語はそのまま', () => {
  assert.equal(quoted('"blue green"'), '"blue green"');
});

test('空白を含む語には引用を付ける', () => {
  // Only a quote could have kept the space together, so this arrives already quoted in
  // practice. Written to hold anyway: the rule is "a term with a space needs quotes"
  assert.equal(quoted('blue green'), '"blue green"');
});

test('空白のない語には引用を付けない', () => {
  assert.equal(quoted('blue'), 'blue');
});

test('語の内側の引用符は落とす', () => {
  // X's search has no escape for a quote inside a phrase. Left in, it would end the
  // phrase early and turn the rest into separate words
  assert.equal(quoted('"say "hi" now"'), '"say hi now"');
});

test('中身の無い語は空で返り、呼ぶ側が捨てる', () => {
  // An empty phrase in a query matches nothing and reads as a mistake
  assert.equal(quoted('""'), '');
  assert.equal(quoted('"'), '');
  assert.equal(quoted('""""'), '');
});

// --- buildQuery ---

test('何も入れなければ空のクエリ', () => {
  assert.equal(buildQuery(emptyForm()), '');
});

test('全ての語はそのまま通る', () => {
  // A reader who knows the operators can write them here and have them reach X untouched
  assert.equal(buildQuery(form({ all: 'rust lang' })), 'rust lang');
  assert.equal(buildQuery(form({ all: 'min_faves:100' })), 'min_faves:100');
});

test('完全一致は引用で囲む', () => {
  assert.equal(buildQuery(form({ exact: 'hello world' })), '"hello world"');
});

test('完全一致の内側の引用符は落ちる', () => {
  assert.equal(buildQuery(form({ exact: 'say "hi"' })), '"say hi"');
});

test('完全一致が空白だけなら何も出ない', () => {
  assert.equal(buildQuery(form({ exact: '   ' })), '');
});

test('いずれかの語は1語なら括弧を付けない', () => {
  // `(foo)` と `foo` は X に同じことを聞いている。素のほうがクエリを読める
  assert.equal(buildQuery(form({ any: 'rust' })), 'rust');
});

test('いずれかの語は2語以上で括弧と OR', () => {
  // X は AND を先に結び、そのあと OR を当てる。括弧が無いと `a OR b c` が
  // `a OR (b c)` として届く
  assert.equal(buildQuery(form({ any: 'rust go zig' })), '(rust OR go OR zig)');
});

test('いずれかの語のフレーズは引用のまま OR に入る', () => {
  assert.equal(buildQuery(form({ any: 'rust "go lang"' })), '(rust OR "go lang")');
});

test('除く語はそれぞれ独立して並ぶ', () => {
  // X 自身が「グループごと否定するな」と書いている
  assert.equal(buildQuery(form({ none: 'crab ferris' })), '-crab -ferris');
});

test('除く語のフレーズは引用ごと除外できる', () => {
  assert.equal(buildQuery(form({ none: '"hot take"' })), '-"hot take"');
});

test('ハッシュタグは # の有無どちらでも同じ形になる', () => {
  assert.equal(buildQuery(form({ hashtags: '#rust go' })), '#rust #go');
});

test('言語は lang: になる', () => {
  assert.equal(buildQuery(form({ lang: 'ja' })), 'lang:ja');
});

test('送信者が1件なら括弧なし', () => {
  assert.equal(buildQuery(form({ from: { names: 'alice', exclude: false } })), 'from:alice');
});

test('送信者が複数なら括弧と OR', () => {
  assert.equal(
    buildQuery(form({ from: { names: 'alice bob', exclude: false } })),
    '(from:alice OR from:bob)'
  );
});

test('送信者の除外は括弧を付けずに並べる', () => {
  // 「a も b も除く」でなければ意味を成さない。X の文書も同じ書き方を指示している
  assert.equal(
    buildQuery(form({ from: { names: 'alice bob', exclude: true } })),
    '-from:alice -from:bob'
  );
});

test('アカウント名の @ は付いていても外れる', () => {
  assert.equal(buildQuery(form({ to: { names: '@alice', exclude: false } })), 'to:alice');
});

test('言及は演算子語を持たず @ だけが付く', () => {
  assert.equal(
    buildQuery(form({ mentioning: { names: 'alice bob', exclude: false } })),
    '(@alice OR @bob)'
  );
});

test('認証済みは is: ではなく filter: で書く', () => {
  // `is:` は X の API の文法で、Web 検索の文法ではない
  assert.equal(buildQuery(form({ verified: 'include' })), 'filter:verified');
  assert.equal(buildQuery(form({ verified: 'exclude' })), '-filter:verified');
});

test('リンク・画像・動画の除外は - が付く', () => {
  assert.equal(
    buildQuery(form({ links: 'include', images: 'exclude', videos: 'include' })),
    'filter:links -filter:images filter:videos'
  );
});

test('返信は2択で、含める指定は無い', () => {
  assert.equal(buildQuery(form({ replies: 'only' })), 'filter:replies');
  assert.equal(buildQuery(form({ replies: 'exclude' })), '-filter:replies');
  assert.equal(buildQuery(form({ replies: 'any' })), '');
});

test('反応数は Web の綴りで書く', () => {
  // min_likes: / min_reposts: は API 専用の名前で、Web 検索は受け付けない
  assert.equal(
    buildQuery(form({ minReplies: '5', minFaves: '100', minRetweets: '10' })),
    'min_replies:5 min_faves:100 min_retweets:10'
  );
});

test('反応数の 0 は指定として通る', () => {
  // 空文字だけが「未入力」。0 は書かれた値
  assert.equal(buildQuery(form({ minFaves: '0' })), 'min_faves:0');
});

test('日時は since_time: と until_time: の秒になる', () => {
  // since:/until: は日付までしか言えない。時刻を言えるのはこの形だけ
  const q = buildQuery(form({ since: '2026-01-01T00:00:00', until: '2026-01-01T01:00:00' }));
  assert.match(q, /^since_time:\d+ until_time:\d+$/);
  const [since, until] = q.split(' ').map((term) => Number(term.split(':')[1]));
  // 1時間の差はちょうど 3600 秒。読み手の時間帯に依らず成り立つ
  assert.equal(until! - since!, 3600);
});

test('全部埋めたときの並び', () => {
  assert.equal(
    buildQuery(
      form({
        all: 'rust',
        exact: 'hello world',
        any: 'go zig',
        none: 'crab',
        hashtags: 'rustlang',
        lang: 'ja',
        from: { names: 'alice', exclude: false },
        to: { names: 'bob', exclude: true },
        mentioning: { names: 'carol', exclude: false },
        verified: 'include',
        links: 'exclude',
        replies: 'exclude',
        minFaves: '100',
        since: '2026-01-01T00:00:00',
      })
    ),
    'rust "hello world" (go OR zig) -crab #rustlang lang:ja from:alice -to:bob @carol ' +
      'filter:verified -filter:links -filter:replies min_faves:100 ' +
      `since_time:${epochSecondsOf('2026-01-01T00:00:00')}`
  );
});

// --- epochSecondsOf ---
//
// The values depend on the reader's time zone, which is the point of them: the field says
// a local moment and X is told the instant. So the assertions here pin the shape and the
// arithmetic rather than a number that would only hold in one place.

test('空の欄からは秒が出ない', () => {
  assert.equal(epochSecondsOf(''), null);
  assert.equal(epochSecondsOf('   '), null);
});

test('日付として読めないものからは秒が出ない', () => {
  assert.equal(epochSecondsOf('きのう'), null);
  assert.equal(epochSecondsOf('2026-13-45T99:99:99'), null);
});

test('秒は整数で、端数を持たない', () => {
  const seconds = epochSecondsOf('2026-01-01T09:30:15');
  assert.ok(seconds !== null && Number.isInteger(seconds));
});

test('秒まで指定すると、その分だけ差が出る', () => {
  const a = epochSecondsOf('2026-01-01T09:30:00');
  const b = epochSecondsOf('2026-01-01T09:30:45');
  assert.equal(b! - a!, 45);
});

test('時刻を省いた日付も読める', () => {
  // The field always fills a time in, but a value arriving from elsewhere may not
  assert.notEqual(epochSecondsOf('2026-01-01'), null);
});

// --- searchPath ---

test('クエリは q に入り、src が付く', () => {
  assert.equal(searchPath('rust', emptyScopes()), '/search?q=rust&src=typd');
});

test('top は書かない', () => {
  // X が何も言われずに出すタブ。X 自身のリンクも省いている
  assert.equal(searchPath('rust', { ...emptyScopes(), tab: 'top' }), '/search?q=rust&src=typd');
});

test('top 以外のタブは f になる', () => {
  assert.equal(searchPath('rust', { ...emptyScopes(), tab: 'live' }), '/search?q=rust&src=typd&f=live');
});

test('フォロー中のみと近くは pf/lf になる', () => {
  assert.equal(
    searchPath('rust', { tab: 'media', followedOnly: true, nearbyOnly: true }),
    '/search?q=rust&src=typd&f=media&pf=on&lf=on'
  );
});

test('指定されていない絞り込みは書かない', () => {
  assert.equal(
    searchPath('rust', { ...emptyScopes(), followedOnly: false, nearbyOnly: false }),
    '/search?q=rust&src=typd'
  );
});

test('クエリはここで1度だけエンコードされる', () => {
  // buildQuery が素のまま返すのは、二重に掛けて # や " を壊さないため
  assert.equal(
    searchPath('#rust "hello world" -filter:links', emptyScopes()),
    '/search?q=%23rust+%22hello+world%22+-filter%3Alinks&src=typd'
  );
});

test('f・pf・lf はクエリではなくアドレスの側に出る', () => {
  // q に混ぜると X には検索語として届く
  const path = searchPath('rust', { tab: 'user', followedOnly: true, nearbyOnly: false });
  assert.equal(new URLSearchParams(path.slice(path.indexOf('?') + 1)).get('q'), 'rust');
});


// --- 読者が余分な印を付けて打ったとき ---
// 「アカウント名の @ は付いていても外れる」と同じ発想を、除外の - とタグの # にも広げる

test('除く語に - を付けて打っても二重にならない', () => {
  // 欄の名前が「除く語」なので、- を付けて打つ読者は必ずいる
  assert.equal(buildQuery(form({ none: '-foo bar' })), '-foo -bar');
});

test('除く語のフレーズに - を付けても引用の内側に入らない', () => {
  // quoted() が引用符を剥がして付け直すので、- を先に落とさないと
  // ハイフンが検索語の一部として phrase の中に残る
  assert.equal(buildQuery(form({ none: '-"hot take"' })), '-"hot take"');
});

test('アカウント欄に引用付きで複数語を打っても演算子が壊れない', () => {
  // スクリーンネームに空白は入らない。from:alice bob は
  // 「from:alice かつ bob を含む」として X に届いてしまう
  assert.equal(
    buildQuery(form({ from: { names: '"alice bob"', exclude: false } })),
    '(from:alice OR from:bob)'
  );
});

test('引用付き複数語のアカウントも @ が全部外れる', () => {
  assert.equal(
    buildQuery(form({ to: { names: '"@alice @bob"', exclude: true } })),
    '-to:alice -to:bob'
  );
});

test('空白だけのフレーズはクエリに残らない', () => {
  // quoted() の doc が言う「中身の無い語」に空白だけの中身も含める
  assert.equal(buildQuery(form({ any: '"  "' })), '');
  assert.equal(buildQuery(form({ none: '"  "' })), '');
  assert.equal(buildQuery(form({ any: '"　"' })), '');
});

test('ハッシュタグ欄に # だけを打っても何も出ない', () => {
  assert.equal(buildQuery(form({ hashtags: '#' })), '');
});

test('空のクエリでもアドレスは組み立てられる', () => {
  // 空のときに検索へ行かせないのは呼ぶ側の役目。ここは形を固定するだけ
  assert.equal(searchPath('', emptyScopes()), '/search?q=&src=typd');
});

