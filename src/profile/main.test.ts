import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installProfileDefaults, type ProfileWindow } from './main.ts';
import type { ProfileSettings } from '../settings/schema.ts';

const chosen: ProfileSettings = { posts: 'all', sort: 'popular', media: 'photos' };

class FakePopStateEvent extends Event {
  state: unknown;
  constructor(type: string, init: { state?: unknown } = {}) {
    super(type);
    this.state = init.state;
  }
}

/**
 * A page with a history of its own: `entries` is what Back would walk, and `routed` is every
 * address X's router was told of by a `popstate` — the only way it learns of a replace.
 */
const page = (start: string) => {
  const target = new EventTarget();
  let url = new URL(start, 'https://x.com');
  const entries = [url.href];
  let index = 0;
  let state: unknown = { key: 'k0' };
  const location = {
    get href() {
      return url.href;
    },
    get pathname() {
      return url.pathname;
    },
    get search() {
      return url.search;
    },
  };
  const history = {
    get state() {
      return state;
    },
    pushState(next: unknown, _unused: string, to?: string | URL | null) {
      url = new URL(String(to), url);
      state = next;
      entries.splice(index + 1, Infinity, url.href);
      index++;
    },
    replaceState(next: unknown, _unused: string, to?: string | URL | null) {
      url = new URL(String(to), url);
      state = next;
      entries[index] = url.href;
    },
  } as unknown as History;
  const routed: { path: string; state: unknown }[] = [];
  target.addEventListener('popstate', (event) => {
    routed.push({ path: `${url.pathname}${url.search}`, state: (event as FakePopStateEvent).state });
  });
  const win: ProfileWindow = {
    history,
    location,
    addEventListener: (type, listener, capture) => target.addEventListener(type, listener, capture),
    dispatchEvent: (event) => target.dispatchEvent(event),
    PopStateEvent: FakePopStateEvent as unknown as typeof PopStateEvent,
  };
  /** What Back does: the browser moves the address, then tells the page */
  const back = () => {
    index--;
    url = new URL(entries[index]!);
    target.dispatchEvent(new FakePopStateEvent('popstate', { state }));
  };
  const path = () => `${url.pathname}${url.search}`;
  return { win, entries: () => entries.map((e) => new URL(e).pathname + new URL(e).search), routed, back, path };
};

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

test('外からプロフィールへ移ると、置き換えてから X のルーターに知らせる', async () => {
  const p = page('/home');
  installProfileDefaults(p.win).setProfile(chosen);
  p.win.history.pushState({ key: 'k1' }, '', '/alice');
  // push の直後はまだ X の既定のまま。X の history が push を確定させるのを待つ
  assert.equal(p.path(), '/alice');
  await tick();
  assert.equal(p.path(), '/alice/all?sort=popular');
  // 戻るで /alice を通らない
  assert.deepEqual(p.entries(), ['/home', '/alice/all?sort=popular']);
  // ルーターは新しいアドレスと、push のときの state をそのまま受け取る
  assert.deepEqual(p.routed, [{ path: '/alice/all?sort=popular', state: { key: 'k1' } }]);
});

test('同じタブの中でメニューから選び直したら、そのまま', async () => {
  const p = page('/alice/all?sort=popular');
  installProfileDefaults(p.win).setProfile(chosen);
  // X は並べ替えを replace で変える（「新しい順」を選ぶと sort が消える）。それも「いまの場所」として追う
  p.win.history.replaceState({ key: 'k0' }, '', '/alice/all');
  // 続けて種類で「ポスト」を選ぶ
  p.win.history.pushState({ key: 'k1' }, '', '/alice');
  await tick();
  assert.equal(p.path(), '/alice');
  assert.deepEqual(p.routed, []);
});

test('戻るで帰ってきたときは書き換えない', async () => {
  const p = page('/alice/all?sort=popular');
  installProfileDefaults(p.win).setProfile(chosen);
  // 自分で「ポスト」を選び、投稿を開いて、戻る
  p.win.history.pushState({ key: 'k1' }, '', '/alice?sort=popular');
  await tick();
  p.win.history.pushState({ key: 'k2' }, '', '/alice/status/1');
  await tick();
  p.back();
  await tick();
  assert.equal(p.path(), '/alice?sort=popular');
  // 届いたのはブラウザの popstate だけ
  assert.equal(p.routed.length, 1);
});

test('戻るのあとに外へ移ってから来たら、また既定を当てる', async () => {
  const p = page('/home');
  installProfileDefaults(p.win).setProfile(chosen);
  p.win.history.pushState({ key: 'k1' }, '', '/alice/media');
  await tick();
  assert.equal(p.path(), '/alice/media?filter=photo');
  p.win.history.pushState({ key: 'k2' }, '', '/alice');
  await tick();
  assert.equal(p.path(), '/alice/all?sort=popular');
});

test('続けて移ったときは、最後の行き先だけを見る', async () => {
  const p = page('/home');
  installProfileDefaults(p.win).setProfile(chosen);
  p.win.history.pushState({ key: 'k1' }, '', '/alice');
  p.win.history.pushState({ key: 'k2' }, '', '/explore');
  await tick();
  assert.equal(p.path(), '/explore');
  assert.deepEqual(p.routed, []);
});

test('push の直後に X が replace しても、その場所で既定を当てる', async () => {
  const p = page('/home');
  installProfileDefaults(p.win).setProfile(chosen);
  // 画面名の書き方を X が同じタスクの中で直した、という場面
  p.win.history.pushState({ key: 'k1' }, '', '/Alice');
  p.win.history.replaceState({ key: 'k1' }, '', '/alice');
  await tick();
  assert.equal(p.path(), '/alice/all?sort=popular');
});

test('読み込んだページは、設定が届いた時点で既定にする', () => {
  const p = page('/alice');
  const defaults = installProfileDefaults(p.win);
  assert.equal(p.path(), '/alice');
  defaults.setProfile(chosen);
  assert.equal(p.path(), '/alice/all?sort=popular');
  // 2 回目以降の設定の変更は、いまのページには当てない
  defaults.setProfile({ ...chosen, posts: 'highlights' });
  assert.equal(p.path(), '/alice/all?sort=popular');
});

test('設定が届く前に移っていたら、読み込んだページの扱いはしない', async () => {
  const p = page('/home');
  const defaults = installProfileDefaults(p.win);
  p.win.history.pushState({ key: 'k1' }, '', '/alice');
  await tick();
  // 設定がまだ無いので何もしない
  assert.equal(p.path(), '/alice');
  defaults.setProfile(chosen);
  assert.equal(p.path(), '/alice');
});

test('一時停止中（X の既定）は何も動かさない', async () => {
  const p = page('/home');
  installProfileDefaults(p.win).setProfile({ posts: 'posts', sort: 'recent', media: 'videos' });
  p.win.history.pushState({ key: 'k1' }, '', '/alice');
  await tick();
  assert.equal(p.path(), '/alice');
  assert.deepEqual(p.routed, []);
});
