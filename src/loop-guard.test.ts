import { test } from 'node:test';
import assert from 'node:assert/strict';
import { burstMeter, guardChunks, kindOf, RECORD_AT, type Deps, type Tap } from './loop-guard.ts';

/** webpack's chunk loading, as its runtime does it: replay what was pushed, then wrap `push` */
const runWebpack = (chunks: any[]) => {
  const m: Record<string, Function> = {};
  const c: Record<string, { exports: unknown }> = {};
  const installed: Record<string, number> = {};
  const req: any = (id: string) => {
    const cached = c[id];
    if (cached) return cached.exports;
    const module = { exports: {} };
    c[id] = module;
    m[id]!(module, module.exports, req);
    return module.exports;
  };
  req.m = m;
  req.c = c;
  const callback = (parent: Function | 0, data: any[]) => {
    const [ids, modules, runtime] = data;
    let result;
    if (ids.some((id: string) => installed[id] !== 0)) {
      for (const id in modules) m[id] = modules[id];
      if (runtime) result = runtime(req);
    }
    if (parent) parent(data);
    for (const id of ids) installed[id] = 0;
    return result;
  };
  chunks.forEach(callback.bind(null, 0));
  chunks.push = callback.bind(null, chunks.push.bind(chunks));
  return req;
};

/** A module like Redux's: `createStore` behind a getter, an enhancer path, `@@redux/INIT` in the text */
const reduxFactory = (module: any, exports: any) => {
  const INIT = '@@redux/INIT';
  const createStore = (reducer: Function, enhancer?: Function): unknown => {
    if (enhancer) return enhancer(createStore)(reducer);
    let state = reducer(undefined, { type: INIT });
    const listeners: Function[] = [];
    return {
      dispatch: (action: unknown) => {
        state = reducer(state, action);
        listeners.forEach((l) => l());
        return action;
      },
      getState: () => state,
      subscribe: (l: Function) => {
        listeners.push(l);
        return () => {};
      },
    };
  };
  Object.defineProperty(exports, '__esModule', { value: true });
  Object.defineProperty(exports, 'y$', { enumerable: true, get: () => createStore });
  Object.defineProperty(exports, 'Zz', { enumerable: true, get: () => (f: Function) => f });
  Object.defineProperty(exports, 'frozen', { value: () => 'frozen' });
  void module;
};

const otherFactory = (module: any) => {
  module.exports = { plain: true };
};

const counter = (state = 0, action: any) => (action.type === 'inc' ? state + 1 : state);

type Harness = Deps & { taps: Tap[]; statuses: string[]; warnings: unknown[]; timers: (() => void)[]; tick: () => void };
const harness = (mode: 'tap' | 'break' = 'tap', threshold = 5): Harness => {
  const h: Harness = {
    mode,
    threshold,
    taps: [],
    statuses: [],
    warnings: [],
    timers: [],
    later: (fn) => h.timers.push(fn),
    tick: () => {
      const due = h.timers.splice(0);
      due.forEach((fn) => fn());
    },
    now: () => 1000,
    record: (tap) => h.taps.push(structuredClone(tap)),
    status: (s) => h.statuses.push(s),
    warn: (message, detail) => h.warnings.push([message, detail]),
  };
  return h;
};

test('burstMeter: 同じタスクの中で数え、次のマクロタスクで戻る', () => {
  const timers: (() => void)[] = [];
  const ended: unknown[] = [];
  const note = burstMeter((fn) => timers.push(fn), (b) => ended.push(b));
  note('a');
  note('a');
  assert.deepEqual(note('b'), { count: 3, kinds: { a: 2, b: 1 } });
  assert.equal(timers.length, 1);
  timers.shift()!();
  assert.deepEqual(ended, [{ count: 3, kinds: { a: 2, b: 1 } }]);
  assert.deepEqual(note('c'), { count: 1, kinds: { c: 1 } });
  assert.equal(timers.length, 1);
});

test('kindOf: type か関数名か', () => {
  assert.equal(kindOf({ type: 'x/Y' }), 'x/Y');
  assert.equal(kindOf(function updateVoiceEntries() {}), 'fn:updateVoiceEntries');
  assert.equal(kindOf(() => {}), 'fn:() => {}');
  assert.equal(kindOf({}), 'object');
});

test('webpack より先に chunk が来ても、後から来ても store の dispatch を捕まえる', () => {
  for (const webpackFirst of [false, true]) {
    const h = harness();
    const chunks: any[] = [];
    guardChunks(chunks, h);
    let req: any = webpackFirst ? runWebpack(chunks) : null;
    chunks.push([['v'], { 1: otherFactory, 2: reduxFactory }]);
    chunks.push([['m'], { 3: otherFactory }]);
    if (!webpackFirst) req = runWebpack(chunks);
    assert.equal(h.statuses.at(-1), 'waiting', `webpackFirst=${webpackFirst}`);
    const redux = req(2);
    assert.equal(h.statuses.at(-1), 'hooked');
    assert.equal(redux.__esModule, true);
    assert.equal(redux.frozen(), 'frozen');
    assert.equal(redux.y$, redux.y$, 'the same wrapper each time');
    const store = redux.y$(counter);
    assert.equal(h.statuses.at(-1), 'armed:1');
    store.dispatch({ type: 'inc' });
    assert.equal(store.getState(), 1);
    assert.deepEqual(req(1), { plain: true });
    assert.deepEqual(req(3), { plain: true });
  }
});

test('enhancer を通しても最終的な store が一つだけ捕まる', () => {
  const h = harness();
  const chunks: any[] = [];
  guardChunks(chunks, h);
  const req = runWebpack(chunks);
  chunks.push([['v'], { 2: reduxFactory }]);
  const redux = req(2);
  const enhancer = (createStore: Function) => (reducer: Function) => {
    const inner = createStore(reducer);
    return { ...inner, dispatch: (a: unknown) => inner.dispatch(a) };
  };
  const store = redux.y$(counter, redux.Zz(enhancer));
  assert.equal(h.statuses.at(-1), 'armed:1');
  store.dispatch({ type: 'inc' });
  assert.equal(store.getState(), 1);
});

test('redux が同じ chunk の runtime で先に実行されていたら手を出さない', () => {
  const h = harness();
  const chunks: any[] = [];
  guardChunks(chunks, h);
  const req = runWebpack(chunks);
  chunks.push([['v'], { 2: reduxFactory }, (r: any) => r(2)]);
  assert.equal(h.statuses.at(-1), 'executed');
  const store = req(2).y$(counter);
  store.dispatch({ type: 'inc' });
  assert.equal(h.taps.at(-1)!.stores, 0);
});

test('redux が無ければ waiting のまま、chunk はそのまま届く', () => {
  const h = harness();
  const chunks: any[] = [];
  guardChunks(chunks, h);
  chunks.push([['a'], { 1: otherFactory }]);
  const req = runWebpack(chunks);
  chunks.push([['b'], { 3: otherFactory }]);
  assert.deepEqual(req(1), { plain: true });
  assert.deepEqual(req(3), { plain: true });
  assert.deepEqual(h.statuses, ['waiting']);
});

const armed = (h: Harness) => {
  const chunks: any[] = [];
  guardChunks(chunks, h);
  const req = runWebpack(chunks);
  chunks.push([['v'], { 2: reduxFactory }]);
  return req(2).y$(counter);
};

test('tap: RECORD_AT ごとに記録し、タスクの終わりに確定する', () => {
  const h = harness('tap');
  const store = armed(h);
  for (let i = 0; i < 3; i++) store.dispatch({ type: 'inc' });
  h.tick();
  assert.equal(h.taps.at(-1)!.maxBelow, 3);
  assert.deepEqual(h.taps.at(-1)!.tasks, []);
  for (let i = 0; i < RECORD_AT * 2 + 1; i++) store.dispatch(i % 2 ? { type: 'inc' } : function loop() {});
  const during = h.taps.at(-1)!.tasks;
  assert.equal(during.length, 1);
  assert.equal(during[0]!.count, RECORD_AT * 2);
  h.tick();
  const task = h.taps.at(-1)!.tasks[0]!;
  assert.equal(task.count, RECORD_AT * 2 + 1);
  assert.deepEqual(task.kinds, [
    ['fn:loop', RECORD_AT + 1],
    ['inc', RECORD_AT],
  ]);
  assert.equal(task.dropped, 0);
  assert.equal(store.getState(), 3 + RECORD_AT, 'tap refuses nothing');
  assert.equal(h.warnings.length, 0);
});

test('break: 閾値を超えた分だけ捨て、次のタスクでは通す', () => {
  const h = harness('break', 5);
  const store = armed(h);
  const outs: unknown[] = [];
  for (let i = 0; i < 8; i++) outs.push(store.dispatch({ type: 'inc' }));
  assert.equal(store.getState(), 5);
  assert.deepEqual(outs[7], { type: 'inc' }, 'a refused action comes back as itself');
  assert.ok(store.dispatch(() => {}) instanceof Promise, 'a refused thunk gets a promise');
  assert.equal(h.warnings.length, 1, 'warned once for the task');
  h.tick();
  store.dispatch({ type: 'inc' });
  assert.equal(store.getState(), 6);
});

test('dispatch の途中で記録に失敗しても X には漏れず、以後は素通しになる', () => {
  const h = harness('break', 1000);
  const store = armed(h);
  h.record = () => {
    throw new Error('quota');
  };
  for (let i = 0; i < RECORD_AT + 10; i++) store.dispatch({ type: 'inc' });
  assert.equal(h.statuses.at(-1), 'error:quota');
  assert.equal(store.getState(), RECORD_AT + 10, 'every dispatch reached the store, none was refused');
  assert.equal(h.warnings.length, 0);
});

test('タスクの終わりの記録に失敗しても理由が残る', () => {
  const h = harness();
  const store = armed(h);
  store.dispatch({ type: 'inc' });
  h.record = () => {
    throw new Error('late');
  };
  h.tick();
  assert.equal(h.statuses.at(-1), 'error:late');
  store.dispatch({ type: 'inc' });
  assert.equal(store.getState(), 2);
});

test('継承した関数は包まず、クラスの export は new で呼べる', () => {
  const h = harness();
  const chunks: any[] = [];
  guardChunks(chunks, h);
  const req = runWebpack(chunks);
  const factory = (module: any, exports: any) => {
    const mark = '@@redux/INIT';
    class Thing {
      mark = mark;
    }
    exports.Thing = Thing;
  };
  chunks.push([['v'], { 2: factory }]);
  const mod = req(2);
  assert.equal(mod.hasOwnProperty, Object.prototype.hasOwnProperty);
  assert.equal(new mod.Thing().mark, '@@redux/INIT');
});

test('自分の側で例外が起きたら hook を外し、理由を残す', () => {
  const h = harness();
  const chunks: any[] = [];
  guardChunks(chunks, h);
  h.record = () => {
    throw new Error('boom');
  };
  const req = runWebpack(chunks);
  chunks.push([['v'], { 2: reduxFactory }]);
  const redux = req(2);
  assert.equal(h.statuses.at(-1), 'error:boom');
  const store = redux.y$(counter);
  store.dispatch({ type: 'inc' });
  assert.equal(store.getState(), 1, 'redux still works, untouched');
  assert.equal(h.taps.at(-1)!.stores, 0);
});
