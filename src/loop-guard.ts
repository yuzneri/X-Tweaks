/**
 * A guard against X Pro's own render loop, put on its Redux store from the page's side.
 *
 * X Pro seizes up for minutes at a time in a loop of its own making: an update dispatches an
 * action, the store notifies, the component updates and dispatches again, all inside
 * microtasks, so no timer, no input and no paint gets a turn until it stops. The extension
 * cannot fix X's code, but its MAIN-world script runs before any of X's, so it can hand X a
 * store whose `dispatch` counts how many times it has been called without a macrotask in
 * between, and — when asked to — refuses the calls past a number no honest task reaches.
 *
 * The store is reached through the bundler: X's scripts register their modules by pushing
 * onto a global array, and webpack's runtime wraps that array's `push` with its own callback,
 * keeping the earlier `push` as a parent to call after registering. An array put in place
 * first, with a `push` of its own, therefore sees every chunk. The chunk holding Redux is
 * told by its text (Redux's own `@@redux/INIT` action), its factory is wrapped so that the
 * functions it exports are watched, and any of them that returns a store has that store's
 * `dispatch` replaced. Nothing here names a module id or an export: both are renamed on
 * every build of X.
 *
 * Everything that depends on X's build is guarded: if Redux is not found, was already run, or
 * something throws in this file, the page is left exactly as it was and the reason is
 * reported through `status`. Exceptions thrown by X's own code are never caught.
 */

/** A module factory as webpack calls it */
type Factory = (module: { exports: unknown }, exports: unknown, require: Require) => void;
/** `__webpack_require__`: `m` holds the factories, `c` the modules already run */
type Require = ((id: string) => unknown) & { m: Record<string, Factory>; c: Record<string, unknown> };
/** What a script pushes onto the chunk array: the chunk ids, the factories, and a runtime hook */
type Chunk = [ids: unknown[], modules: Record<string, Factory>, runtime?: (require: Require) => unknown];

type Store = {
  dispatch: (action: unknown) => unknown;
  getState: () => unknown;
  subscribe: (listener: () => void) => () => void;
};

/**
 * Where the extension side asks for the guard, in the page's localStorage: nothing, `tap`
 * (count and record only) or `break` (refuse the dispatches of a runaway task), the latter
 * with an optional threshold as `break:<n>`. localStorage rather than a message because the
 * MAIN-world script reads it at document_start, before anything of the extension's is
 * listening; it is read on the next load, not the moment it is written.
 */
export const GUARD_KEY = 'xtweaks:loop-guard';

/** The text that tells Redux's module from the rest of the bundle */
const REDUX_MARK = '@@redux/INIT';
/** The chunk id pushed to get hold of `__webpack_require__`; anything but a real chunk id */
const PROBE = 'xtweaks-loop-guard';

export type Mode = 'tap' | 'break';

/** What is remembered about a task that dispatched, for the record */
export type Burst = { count: number; kinds: Record<string, number> };

/**
 * Counts the dispatches of the task now running. The count comes back to nothing on the
 * next macrotask (`later`, a `setTimeout` of zero): a loop that lives in microtasks never
 * lets that run, so its count only ever grows. `onEnd` hears the count each task ended with.
 */
export const burstMeter = (later: (fn: () => void) => void, onEnd: (burst: Burst) => void) => {
  let burst: Burst = { count: 0, kinds: {} };
  let armed = false;
  return (kind: string): Burst => {
    if (!armed) {
      armed = true;
      later(() => {
        const ended = burst;
        burst = { count: 0, kinds: {} };
        armed = false;
        onEnd(ended);
      });
    }
    burst.count++;
    burst.kinds[kind] = (burst.kinds[kind] ?? 0) + 1;
    return burst;
  };
};

/** How a dispatched action is named in the record: its type, or the function it is (by name, or the start of its text when minified) */
export const kindOf = (action: unknown): string => {
  if (typeof action === 'function') return `fn:${action.name || String(action).slice(0, 48)}`;
  const type = (action as { type?: unknown } | null)?.type;
  return typeof type === 'string' ? type : typeof action;
};

/** A record of one task's dispatches, written while it is still running so a kill keeps it */
export type TaskRecord = {
  store: number;
  began: number;
  last: number;
  count: number;
  /** The kinds seen most, and how often */
  kinds: [string, number][];
  /** How many dispatches were refused (`break` mode) */
  dropped: number;
};

export type Tap = {
  status: string;
  stores: number;
  /** The most dispatches any task not worth a record made: what a normal task looks like */
  maxBelow: number;
  /** The tasks that dispatched `RECORD_AT` times or more, latest last */
  tasks: TaskRecord[];
};

/** From how many dispatches in one task a record is kept, and how often it is rewritten */
export const RECORD_AT = 100;
/** How many task records are kept */
const TASKS_KEPT = 20;
/** How many kinds a record names */
const KINDS_KEPT = 20;

export type Deps = {
  mode: Mode;
  /** In `break` mode, the dispatch past which the rest of the task's are refused */
  threshold: number;
  /** Runs `fn` in a macrotask of its own (`setTimeout`, 0) */
  later: (fn: () => void) => void;
  now: () => number;
  /** Where the record is written, whole, each time it changes */
  record: (tap: Tap) => void;
  /** Where the failure of the hook, or its success, is reported (a DOM attribute) */
  status: (status: string) => void;
  /** Where `break` says what it refused */
  warn: (message: string, detail: unknown) => void;
};

const topKinds = (kinds: Record<string, number>): [string, number][] =>
  Object.entries(kinds)
    .sort((a, b) => b[1] - a[1])
    .slice(0, KINDS_KEPT);

const isStore = (value: unknown): value is Store => {
  if (typeof value !== 'object' || value === null) return false;
  const store = value as Partial<Store>;
  return typeof store.dispatch === 'function' && typeof store.getState === 'function' && typeof store.subscribe === 'function';
};

/**
 * Puts the guard on the chunk array. `chunks` is the array X's scripts will push onto, made
 * before any of them runs and still with the ordinary `push`.
 */
export const guardChunks = (chunks: unknown[], deps: Deps): void => {
  const tap: Tap = { status: 'waiting', stores: 0, maxBelow: 0, tasks: [] };
  const report = (status: string) => {
    tap.status = status;
    deps.status(status);
    deps.record(tap);
  };

  /** True once something of ours failed: from then on, chunks pass through untouched */
  let dead = false;
  const fail = (e: unknown) => {
    dead = true;
    tap.status = `error:${e instanceof Error ? e.message : String(e)}`;
    deps.status(tap.status);
    try {
      deps.record(tap);
    } catch {
      // The record may be the very thing that failed; the status carries the reason regardless
    }
  };

  const guardStore = (store: Store) => {
    const index = tap.stores++;
    const original = store.dispatch;
    let task: TaskRecord | null = null;
    let warned = false;
    const note = burstMeter(deps.later, (ended) => {
      try {
        if (task) {
          task.last = deps.now();
          task.count = ended.count;
          task.kinds = topKinds(ended.kinds);
          deps.record(tap);
        } else if (ended.count > tap.maxBelow) {
          tap.maxBelow = ended.count;
          deps.record(tap);
        }
      } catch (e) {
        fail(e);
      }
      task = null;
      warned = false;
    });
    /** Counts the dispatch and keeps the record; answers whether it is to be refused */
    const observe = (action: unknown): boolean => {
      const burst = note(kindOf(action));
      if (burst.count >= RECORD_AT && burst.count % RECORD_AT === 0) {
        if (!task) {
          task = { store: index, began: deps.now(), last: 0, count: 0, kinds: [], dropped: 0 };
          tap.tasks.push(task);
          if (tap.tasks.length > TASKS_KEPT) tap.tasks.shift();
        }
        task.last = deps.now();
        task.count = burst.count;
        task.kinds = topKinds(burst.kinds);
        deps.record(tap);
      }
      if (deps.mode !== 'break' || burst.count <= deps.threshold) return false;
      if (task) task.dropped++;
      if (!warned) {
        warned = true;
        deps.warn(`X Tweaks: ${deps.threshold} dispatches in one task; refusing the rest`, topKinds(burst.kinds));
      }
      return true;
    };
    store.dispatch = function (this: unknown, action: unknown) {
      // A failure of ours ends the guard and is never thrown at X: from then on the dispatch
      // passes straight through
      let refuse = false;
      if (!dead) {
        try {
          refuse = observe(action);
        } catch (e) {
          fail(e);
        }
      }
      if (refuse) {
        // What the caller gets back is a guess at what it expects: an action comes back as
        // itself, as Redux would return it, and a thunk gets a settled promise in place of
        // whatever it would have returned
        return typeof action === 'function' ? Promise.resolve() : action;
      }
      return original.call(this, action);
    };
    report(`armed:${tap.stores}`);
  };

  /** The wrapper of each exported function, kept so the same function is handed out each time */
  const wrappers = new WeakMap<Function, Function>();
  const watchStores = (exports: unknown): unknown => {
    if (typeof exports !== 'object' || exports === null) return exports;
    return new Proxy(exports, {
      get(target, key) {
        const value = Reflect.get(target, key);
        if (typeof value !== 'function' || dead) return value;
        // Only the module's own exports are watched, not what it inherits from Object; and a
        // proxy may not answer differently from a property that can neither change nor be
        // redefined, so such a one is handed out as it is (Redux's exports are getters)
        const own = Object.getOwnPropertyDescriptor(target, key);
        if (!own || (!own.configurable && !own.writable && 'value' in own)) return value;
        let wrapper = wrappers.get(value);
        if (!wrapper) {
          wrapper = function (this: unknown, ...args: unknown[]) {
            const out = new.target ? Reflect.construct(value, args, new.target) : value.apply(this, args);
            if (!dead && isStore(out)) {
              try {
                guardStore(out);
              } catch (e) {
                fail(e);
              }
            }
            return out;
          };
          wrappers.set(value, wrapper);
        }
        return wrapper;
      },
    });
  };

  const wrapFactory =
    (factory: Factory): Factory =>
    (module, exports, require) => {
      factory(module, exports, require);
      try {
        module.exports = watchStores(module.exports);
        report('hooked');
      } catch (e) {
        fail(e);
      }
    };

  /** The id of the Redux module in `modules`, if it is there */
  const reduxIn = (modules: Record<string, Factory>): string | null => {
    for (const id in modules) {
      if (Object.hasOwn(modules, id) && String(modules[id]).includes(REDUX_MARK)) return id;
    }
    return null;
  };

  let require: Require | null = null;
  let found = false;

  const guard = (...data: unknown[]): number => {
    // Until webpack wraps this, the chunks are kept here for its replay; after, it registers
    // them first and calls this as the parent, with the factories already in `require.m`
    const before = chunks.push === guard;
    if (!dead && !found) {
      try {
        for (const chunk of data as Chunk[]) {
          if (chunk[0][0] === PROBE) continue;
          const id = reduxIn(chunk[1]);
          if (id === null) continue;
          found = true;
          if (before) {
            chunk[1][id] = wrapFactory(chunk[1][id]!);
          } else {
            if (!require) chunks.push([[PROBE], {}, (r: Require) => (require = r)]);
            if (!require) throw new Error('no __webpack_require__');
            if (id in require.c) report('executed');
            else require.m[id] = wrapFactory(require.m[id]!);
          }
        }
      } catch (e) {
        fail(e);
      }
    }
    return before ? Array.prototype.push.apply(chunks, data) : chunks.length;
  };
  chunks.push = guard;
  report('waiting');
};
