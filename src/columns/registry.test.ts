import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columnElements, detect, scopeElementOf } from './registry.ts';

/**
 * The registry walks up from a column body looking for the header, so the tests hand it a
 * tree of stand-ins that answer only what the walk asks: who the parent is, whether one holds
 * another, and what a search of the subtree for a marker finds. Searches are counted, being
 * the cost the range cache exists to avoid.
 */
let searches = 0;
class FakeElement {
  parentElement: FakeElement | null = null;
  readonly children: FakeElement[] = [];
  readonly testid: string | null;
  textContent: string;
  constructor(testid: string | null = null, textContent = '') {
    this.testid = testid;
    this.textContent = textContent;
  }
  append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      node.parentElement = this;
      this.children.push(node);
    }
  }
  remove(): void {
    const siblings = this.parentElement?.children;
    if (siblings) siblings.splice(siblings.indexOf(this), 1);
    this.parentElement = null;
  }
  get isConnected(): boolean {
    let el: FakeElement = this;
    while (el.parentElement) el = el.parentElement;
    return el === root;
  }
  contains(other: FakeElement): boolean {
    for (let el: FakeElement | null = other; el; el = el.parentElement) if (el === this) return true;
    return false;
  }
  *descendants(): Generator<FakeElement> {
    for (const child of this.children) {
      yield child;
      yield* child.descendants();
    }
  }
  querySelector(selector: string): FakeElement | null {
    searches++;
    const testid = /data-testid="([^"]+)"/.exec(selector)?.[1];
    for (const el of this.descendants()) if (el.testid === testid) return el;
    return null;
  }
  querySelectorAll(): FakeElement[] {
    return [];
  }
  getAttribute(): null {
    return null;
  }
  closest(): null {
    return null;
  }
}
const root = new FakeElement('root');
let columns: FakeElement[] = [];
let walks = 0;
const g = globalThis as unknown as Record<string, unknown>;
g.document = {
  querySelectorAll: () => {
    walks++;
    return columns;
  },
};

const el = (node: FakeElement): Element => node as unknown as Element;
const all = (): Element[] => columns.map(el);
const header = (name: string): FakeElement => new FakeElement('column-title-wrapper', name);
const column = (): FakeElement => new FakeElement('multi-column-layout-column-content');

test('カラムの範囲は見出しを持つ最初の先祖で、二度目は探さずに答える', () => {
  const [a, b] = [column(), column()];
  const wrapA = new FakeElement();
  wrapA.append(header('Home'), a);
  const wrapB = new FakeElement();
  wrapB.append(header('Mentions'), b);
  root.append(wrapA, wrapB);
  columns = [a, b];

  assert.equal(scopeElementOf(el(a), all()), el(wrapA));
  assert.equal(scopeElementOf(el(b), all()), el(wrapB));
  const walked = searches;
  assert.equal(scopeElementOf(el(a), all()), el(wrapA));
  assert.equal(searches, walked);
  assert.deepEqual(
    detect().map((scope) => scope.title),
    ['Home', 'Mentions']
  );
  assert.equal(searches, walked);
});

test('見出しが作り直されたら範囲を探し直し、新しい名前を読む', () => {
  const a = columns[0]!;
  const wrapA = a.parentElement!;
  wrapA.children[0]!.remove();
  wrapA.append(header('Home (renamed)'));
  const walked = searches;
  assert.equal(detect()[0]!.title, 'Home (renamed)');
  assert.ok(searches > walked);
});

test('範囲の中に別のカラムが入ってきたら、覚えていた範囲は使わない', () => {
  const a = columns[0]!;
  const wrapA = a.parentElement!;
  const c = column();
  wrapA.append(c);
  columns = [a, c, columns[1]!];
  // The wrapper now holds two columns, so neither may claim it: each is its own range
  assert.equal(scopeElementOf(el(a), all()), el(a));
  c.remove();
  columns = [a, columns[2]!];
  assert.equal(scopeElementOf(el(a), all()), el(wrapA));
});

test('見出しがまだ無いカラムの範囲は覚えず、見出しが着いたら見つける', () => {
  const late = column();
  const inner = new FakeElement();
  inner.append(late);
  const wrap = new FakeElement();
  wrap.append(inner);
  root.append(wrap);
  columns = [...columns, late];
  // Nothing holds a header on the way up, so the walk stops only where the other columns come in
  assert.equal(scopeElementOf(el(late), all()), el(wrap));
  // Had that been remembered, the header arriving inside a smaller box would go unseen
  inner.append(header('Late'));
  assert.equal(scopeElementOf(el(late), all()), el(inner));
  assert.equal(detect()[2]!.title, 'Late');
});

test('カラムの一覧は同じタスクの中では一度しか探さず、次のタスクでは探し直す', async () => {
  const before = walks;
  const first = columnElements();
  assert.equal(columnElements(), first);
  assert.equal(walks, before + 1);
  await new Promise((resolve) => setTimeout(resolve));
  assert.notEqual(columnElements(), first);
  assert.equal(walks, before + 2);
});
