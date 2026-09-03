import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adoptQuery, currentForm, currentScopes, updateForm, updateScopes } from './state.ts';
import { emptyForm, emptyScopes, type SearchForm } from './query.ts';
import { parseQuery, parseScopes, queryAt } from './parse.ts';

/**
 * 取り込みを、呼ぶ側（`insert.tsx`）と同じ形で1回起こす。
 *
 * 「このアドレスは見た」という記憶はモジュールが持ち、消す手立てを外に出していない。
 * テストごとに違うアドレスを使うのはそのためで、同じアドレスを二度渡す試験だけが
 * 意図的に同じものを渡す。
 */
const arriveAt = (pathname: string, search: string): boolean => {
  const asked = queryAt(pathname, search);
  return adoptQuery(pathname + search, asked, parseQuery(asked), parseScopes(search));
};

const form = (fields: Partial<SearchForm>): SearchForm => ({ ...emptyForm(), ...fields });

test('空のフォームは、アドレスのクエリを取り込む', () => {
  updateForm(emptyForm());
  assert.equal(arriveAt('/search', '?q=rust'), true);
  assert.equal(currentForm().all, 'rust');
});

test('同じアドレスをもう一度渡しても、何も起きない', () => {
  updateForm(emptyForm());
  assert.equal(arriveAt('/search', '?q=同じ'), true);
  // 打ちかけの内容。settling のたびに取り込むと、これが消える
  updateForm(form({ all: '打ちかけ' }));
  assert.equal(arriveAt('/search', '?q=同じ'), false);
  assert.equal(currentForm().all, '打ちかけ');
});

test('フォームが同じクエリを組み立てるなら、欄の並びは崩さない', () => {
  // フォーム自身が送り出した検索。クエリから組み直すと all に寄ってしまう
  updateForm(form({ all: 'rust', any: 'crab' }));
  assert.equal(arriveAt('/search', '?q=rust+crab'), false);
  assert.equal(currentForm().any, 'crab');
});

test('別の検索へ移ったら、打たれていてもフォームは追う', () => {
  updateForm(form({ all: '前の検索' }));
  assert.equal(arriveAt('/search', '?q=次の検索'), true);
  assert.equal(currentForm().all, '次の検索');
});

test('ハッシュタグのページからも取り込む', () => {
  // X はタグを押すと /hashtag/… へ送る。?q= は無い
  updateForm(emptyForm());
  assert.equal(arriveAt('/hashtag/preact', '?src=hashtag_click'), true);
  assert.equal(currentForm().hashtags, 'preact');
  assert.equal(currentForm().all, '');
});

test('タグが違えばアドレスも違う（パラメータは同じでも）', () => {
  updateForm(emptyForm());
  assert.equal(arriveAt('/hashtag/alpha', ''), true);
  // パラメータはどちらも空。パスを鍵に含めていないと、ここが false になる
  assert.equal(arriveAt('/hashtag/beta', ''), true);
  assert.equal(currentForm().hashtags, 'beta');
});

test('クエリが同じでも、タブが変われば取り込む', () => {
  updateForm(form({ all: 'rust' }));
  updateScopes(emptyScopes());
  assert.equal(arriveAt('/search', '?q=rust&f=user'), true);
  assert.equal(currentScopes().tab, 'user');
  // クエリは同じなので、欄には触れていない
  assert.equal(currentForm().all, 'rust');
});

test('アドレスに載る絞り込みも追う', () => {
  updateForm(emptyForm());
  updateScopes(emptyScopes());
  assert.equal(arriveAt('/search', '?q=rust&pf=on&lf=on'), true);
  assert.equal(currentScopes().followedOnly, true);
  assert.equal(currentScopes().nearbyOnly, true);
});
