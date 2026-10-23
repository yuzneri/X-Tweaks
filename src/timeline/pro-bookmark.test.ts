import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  elementAbove,
  postComponentAbove,
  withBookmark,
  wrapRow,
  type PostComponent,
} from './pro-bookmark.ts';

/** The row as X Pro draws it: the button row, then (on an opened post) something more */
const rowOf = (allowed: boolean) => ({
  type: 'View',
  props: {
    onLayout: () => {},
    children: [{ type: 'TweetActions', props: { allowBookmarkInActionsBar: allowed, id: 'actions' } }, null],
  },
});

/** A stand-in for X Pro's post component: the row's width decides, as in X Pro */
class Post {
  state = { width: 200 };
  forceUpdate() {}
  _renderTweetActions() {
    return rowOf(this.state.width >= 290);
  }
}

const childProps = (row: unknown) =>
  (row as ReturnType<typeof rowOf>).props.children[0]!.props;

test('ブックマークを許した行は写しで、元の行も他の子もそのまま', () => {
  const row = rowOf(false);
  const allowed = withBookmark(row)!;
  assert.equal(childProps(allowed).allowBookmarkInActionsBar, true);
  // Everything else the row carries goes along
  assert.equal(childProps(allowed).id, 'actions');
  assert.equal(allowed.props.onLayout, row.props.onLayout);
  assert.equal((allowed.props.children as unknown[])[1], null);
  // What X Pro drew is not changed in place: a development build would have frozen it
  assert.equal(childProps(row).allowBookmarkInActionsBar, false);
});

test('もう許されている行は、そのまま返す', () => {
  const row = rowOf(true);
  assert.equal(withBookmark(row), row);
});

test('許す印がどこにも無ければ null。X Pro の書き換えをそう知らせる', () => {
  assert.equal(withBookmark({ props: { children: [{ props: { id: 'actions' } }] } }), null);
  assert.equal(withBookmark({ props: { children: { props: { allowBookmarkInActionsBar: false } } } }), null);
});

test('印のある投稿の行だけにブックマークを許し、包むのは1度だけ', () => {
  const statuses: string[] = [];
  const marked = new Post();
  const plain = new Post();
  const wanted = (post: PostComponent) => post === marked;
  assert.equal(wrapRow(marked, wanted, (s) => statuses.push(s)), true);
  const once = Post.prototype._renderTweetActions;
  // Found again from another post of the same kind, it is not wrapped twice
  assert.equal(wrapRow(plain, wanted, (s) => statuses.push(s)), true);
  assert.equal(Post.prototype._renderTweetActions, once);

  assert.equal(childProps(marked._renderTweetActions()).allowBookmarkInActionsBar, true);
  assert.equal(childProps(plain._renderTweetActions()).allowBookmarkInActionsBar, false);
  // Wide enough for X Pro itself, nothing needs changing
  marked.state.width = 400;
  assert.equal(childProps(marked._renderTweetActions()).allowBookmarkInActionsBar, true);
  assert.deepEqual(statuses, []);
});

test('こちらの失敗では X Pro の行を返し、X Pro 自身の例外は通す', () => {
  class Failing {
    fail = false;
    forceUpdate() {}
    _renderTweetActions() {
      if (this.fail) throw new Error('X Pro');
      return { props: { children: [{ props: { id: 'no prop here' } }] } };
    }
  }
  const statuses: string[] = [];
  const post = new Failing();
  wrapRow(post, () => true, (s) => statuses.push(s));
  // The prop gone from X Pro's script: its row stands, and the change is reported
  assert.deepEqual(post._renderTweetActions(), { props: { children: [{ props: { id: 'no prop here' } }] } });
  assert.deepEqual(statuses, ['no-prop']);

  class Asking {
    forceUpdate() {}
    _renderTweetActions() {
      return rowOf(false);
    }
  }
  const asking = new Asking();
  wrapRow(asking, () => {
    throw new Error('ours');
  }, (s) => statuses.push(s));
  assert.ok(asking._renderTweetActions());
  assert.equal(statuses.at(-1), 'error:ours');

  post.fail = true;
  assert.throws(() => post._renderTweetActions(), /X Pro/);
});

test('行を描く手順は、持ち主のプロトタイプで包む', () => {
  // A component drawn from a subclass of X Pro's: the method is one level further up
  class Base {
    forceUpdate() {}
    _renderTweetActions() {
      return rowOf(false);
    }
  }
  class Derived extends Base {}
  assert.equal(wrapRow(new Derived(), () => true, () => {}), true);
  assert.equal(Object.hasOwn(Derived.prototype, '_renderTweetActions'), false);
  assert.equal(childProps(new Derived()._renderTweetActions()).allowBookmarkInActionsBar, true);
  assert.equal(childProps(new Base()._renderTweetActions()).allowBookmarkInActionsBar, true);
});

test('行を描く手順がプロトタイプに無ければ、何も変えない', () => {
  const own = { _renderTweetActions: () => rowOf(false), forceUpdate() {} };
  const before = own._renderTweetActions;
  assert.equal(wrapRow(own, () => true, () => {}), false);
  assert.equal(own._renderTweetActions, before);
});

test('投稿の部品も、それが描かれる場所も、上へ辿って見つける', () => {
  const post = new Post();
  const column = { closest: () => null };
  // 同じ回に描かれる上の要素はまだ無いので、その先の、ページにある要素まで上る
  const component = { stateNode: post, return: { stateNode: null, return: { stateNode: column } } } as const;
  const button = { stateNode: {}, return: { stateNode: null, return: component } };
  assert.equal(postComponentAbove(button), post);
  assert.equal(elementAbove(component), column);
  // 部品が描いたもの（下）は、描かれる場所ではない。初めて描く間はまだ無い
  const drawn = { stateNode: post, child: { stateNode: { closest: () => null } }, return: null };
  assert.equal(elementAbove(drawn), null);
  // 上に何も無ければ見つからない。別のものを取り違えない
  assert.equal(postComponentAbove({ stateNode: {}, return: null }), null);
});

test('部品が何段上にあっても、描かれる場所が何段上にあっても辿り着く', () => {
  // X Pro put the reply button 70 levels below the post component (2026-10-23), and its builds change that
  type Link = { stateNode: unknown; return?: Link };
  const post = new Post();
  const column = { closest: () => null };
  let component: Link = { stateNode: column };
  for (let i = 0; i < 200; i++) component = { stateNode: null, return: component };
  component = { stateNode: post, return: component };
  let button: Link = component;
  for (let i = 0; i < 200; i++) button = { stateNode: {}, return: button };
  assert.equal(postComponentAbove(button), post);
  assert.equal(elementAbove(component), column);
});
