import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noticeComposeForm, restorePending, start } from './keep.ts';

const post = '仮の本文\n\n見本イベント https://example.com/event/123/\n #サンプルタグ';

class FakeElement {
  isConnected = true;
  textContent = '';
  editor: FakeElement | null = null;
  lines: FakeElement[] = [];
  drawer: FakeElement | null = null;

  querySelectorAll(selector: string): FakeElement[] {
    if (selector === '[data-block="true"]') return this.lines;
    if (selector.includes('tweetTextarea_')) return this.editor ? [this.editor] : [];
    return [];
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  closest(selector: string): FakeElement | null {
    return selector.includes('drawerAnimatedDiv') ? this.drawer : null;
  }

  contains(other: FakeElement | null): boolean {
    return other === this;
  }

  focus(): void {
    fakeDocument.activeElement = this;
  }
}

const makeDrawer = (text: string): { drawer: FakeElement; editor: FakeElement; target: FakeElement } => {
  const drawer = new FakeElement();
  const editor = new FakeElement();
  editor.lines = text.split('\n').map((part) => {
    const line = new FakeElement();
    line.textContent = part;
    return line;
  });
  drawer.editor = editor;
  const target = new FakeElement();
  target.drawer = drawer;
  return { drawer, editor, target };
};

type Listener = (event: { target: FakeElement }) => void;
const listeners = new Map<string, Listener[]>();
let current: FakeElement | null = null;
let acceptsInsertion = true;
const selection: { isCollapsed: boolean; anchorOffset: number; anchorNode: FakeElement | null } = {
  isCollapsed: true,
  anchorOffset: 0,
  anchorNode: null,
};
const fakeSelection = Object.assign(selection, {
  removeAllRanges: () => {
    selection.anchorNode = null;
  },
  addRange: (range: { start: FakeElement | null }) => {
    selection.anchorNode = range.start;
    selection.anchorOffset = 0;
  },
});
const fakeDocument = {
  activeElement: null as FakeElement | null,
  addEventListener: (type: string, listener: Listener) => {
    listeners.set(type, [...(listeners.get(type) ?? []), listener]);
  },
  querySelectorAll: (selector: string): FakeElement[] =>
    selector.includes('drawerAnimatedDiv') && current?.isConnected ? [current] : [],
  getSelection: () => fakeSelection,
  createTreeWalker: (root: FakeElement) => ({ nextNode: () => root }),
  createRange: () => {
    const range = {
      start: null as FakeElement | null,
      setStart(node: FakeElement) {
        this.start = node;
      },
      collapse() {},
    };
    return range;
  },
  execCommand: (_command: string, _showUI: boolean, value: string) => {
    const editor = current?.editor;
    if (!editor || !acceptsInsertion) return false;
    const [first, ...rest] = value.split('\n');
    editor.lines[0]!.textContent += first;
    for (const part of rest) {
      const line = new FakeElement();
      line.textContent = part;
      editor.lines.push(line);
    }
    selection.anchorNode = editor.lines.at(-1)!;
    selection.anchorOffset = editor.lines.at(-1)!.textContent.length;
    return true;
  },
};

class FakePerformanceObserver {
  static current: FakePerformanceObserver;
  private readonly callback: (list: { getEntries: () => { name: string; startTime: number }[] }) => void;
  constructor(callback: (list: { getEntries: () => { name: string; startTime: number }[] }) => void) {
    this.callback = callback;
    FakePerformanceObserver.current = this;
  }
  observe(): void {}
  post(): void {
    this.callback({
      getEntries: () => [
        { name: 'https://x.com/i/api/graphql/id/CreateTweet', startTime: performance.now() },
      ],
    });
  }
}

test('タグを改行して残し、挿入失敗時は次のフォームで再試行する', async () => {
  Object.assign(globalThis, {
    Element: FakeElement,
    HTMLElement: FakeElement,
    HTMLButtonElement: FakeElement,
    NodeFilter: { SHOW_TEXT: 4 },
    document: fakeDocument,
    PerformanceObserver: FakePerformanceObserver,
  });
  const logs: unknown[][] = [];
  start({ reopen: false, keepHashtags: true }, { log: (...args) => logs.push(args) });

  const first = makeDrawer('仮の本文');
  current = first.drawer;
  noticeComposeForm(); // The filter's last settled reading, before the paste.
  first.editor.lines = post.split('\n').map((part) => {
    const line = new FakeElement();
    line.textContent = part;
    return line;
  });
  // Draft.js can paste without an input event. The send button's pointerdown must see it.
  for (const listener of listeners.get('pointerdown') ?? []) listener({ target: first.target });
  first.drawer.isConnected = false;
  const next = makeDrawer('');
  current = next.drawer; // The next form opens before the request observer runs.
  FakePerformanceObserver.current.post();
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(logs.some(([message, detail]) =>
    message === 'Left the compose form closed' &&
    (detail as { hashtags?: string }).hashtags === '\n#サンプルタグ'
  ));

  assert.deepEqual(next.editor.lines.map((line) => line.textContent), ['', '#サンプルタグ']);
  assert.equal(selection.anchorNode, next.editor.lines[0]);

  // The keyboard send has the same last-minute snapshot. A refused insertion remains
  // available when another fresh compose form is opened.
  for (const listener of listeners.get('keydown') ?? []) listener({ target: next.target });
  next.drawer.isConnected = false;
  current = null;
  FakePerformanceObserver.current.post();
  await new Promise((resolve) => setImmediate(resolve));

  acceptsInsertion = false;
  const refused = makeDrawer('');
  current = refused.drawer;
  restorePending();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(refused.editor.lines[0]!.textContent, '');

  refused.drawer.isConnected = false;
  acceptsInsertion = true;
  const retry = makeDrawer('');
  current = retry.drawer;
  await new Promise((resolve) => setImmediate(resolve));
  restorePending();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(retry.editor.lines.map((line) => line.textContent), ['', '#サンプルタグ']);
  assert.equal(selection.anchorNode, retry.editor.lines[0]);
});
