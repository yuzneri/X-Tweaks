/**
 * The script running in the page's context (the MAIN world). It walks React's internal
 * state from a column element to read the columnId and writes it onto the element as a
 * marker, and — only when asked to through `localStorage` — puts a guard on X's Redux store
 * (`loop-guard.ts`). Nothing else is given to it and it imports nothing beyond that one
 * module, which itself imports nothing: it sits where X's own scripts can see it, the most
 * exposed to their implementation changing, so its surface is kept as small as possible.
 */
import { guardChunks, RECORD_AT, type Mode } from './loop-guard.ts';

const REQUEST = 'xpro-tweaks:request-columns';
const RESPONSE = 'xpro-tweaks:response-columns';
const COLUMN_SELECTOR = '[data-testid="multi-column-layout-column-content"]';
/** Where the columnId read is written. The extension side (columns/registry.ts) reads it under the same name */
const COLUMN_ID_ATTR = 'data-xpro-column-id';
/** The drawer that renders the column options. Which column it belongs to is not in the DOM, so it is read from the internal state here too */
const DRAWER_SELECTOR = '[data-testid="drawerAnimatedDiv"]';

/** React's internals. No public type exists, so only what is needed to walk it is written out */
type Fiber = {
  memoizedProps?: { columnId?: unknown } | null;
  return?: Fiber | null;
  child?: Fiber | null;
  sibling?: Fiber | null;
};

/** The columnId is not in a DOM attribute, so React's internal state is the only place to read it */
const fiberOf = (el: Element): Fiber | null => {
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  return key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null;
};

/**
 * Gets the columnId from a column element. It sits in the props two levels above, but that
 * depth can move as X's implementation changes, so the walk goes up several levels instead.
 */
const columnIdOf = (el: Element): { columnId: string | null; depth: number | null } => {
  let fiber = fiberOf(el);
  for (let depth = 0; fiber && depth < 8; depth++) {
    const columnId = fiber.memoizedProps?.columnId;
    if (typeof columnId === 'string' && columnId) return { columnId, depth };
    fiber = fiber.return ?? null;
  }
  return { columnId: null, depth: null };
};

/**
 * Looks for a columnId by walking downward (children and siblings) from an element. A
 * drawer that hangs off the deck as a whole ties to no column however far up the walk
 * goes, but holds one on the content side, so the search goes there under a node cap.
 */
const columnIdBelow = (el: Element, limit = 400): string | null => {
  const root = fiberOf(el);
  if (!root) return null;
  const queue: Fiber[] = [root];
  for (let seen = 0; queue.length > 0 && seen < limit; seen++) {
    const fiber = queue.shift()!;
    const columnId = fiber.memoizedProps?.columnId;
    if (typeof columnId === 'string' && columnId) return columnId;
    if (fiber.child) queue.push(fiber.child);
    if (fiber.sibling) queue.push(fiber.sibling);
  }
  return null;
};

/**
 * Returns which column each open column-options drawer belongs to. The DOM holds no marker
 * tying the two, and the extension's own approach of remembering what was clicked does not
 * work for a drawer already open when the page was loaded.
 */
const collectDrawers = () =>
  Array.from(document.querySelectorAll(DRAWER_SELECTOR)).map((el, index) => ({
    index,
    columnId: columnIdOf(el).columnId ?? columnIdBelow(el),
  }));

/**
 * Reads the columns, stamps the markers onto the elements and returns the list. Only one
 * attribute is stamped and removing it restores the original; an identical value is not
 * rewritten, so nothing competes with X's re-rendering. Elements that could not be read
 * have their marker dropped, since a stale one would apply another column's settings.
 */
const collect = () =>
  Array.from(document.querySelectorAll(COLUMN_SELECTOR)).map((el, index) => {
    const { columnId, depth } = columnIdOf(el);
    if (columnId) {
      if (el.getAttribute(COLUMN_ID_ATTR) !== columnId) el.setAttribute(COLUMN_ID_ATTR, columnId);
    } else {
      el.removeAttribute(COLUMN_ID_ATTR);
    }
    return { index, columnId, depth, fiberFound: !!fiberOf(el) };
  });

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  // Anything not from this same window is ignored
  if (event.source !== window) return;
  const data = event.data as { type?: unknown; requestId?: unknown } | null;
  if (!data || data.type !== REQUEST) return;

  let payload;
  try {
    payload = { columns: collect(), drawers: collectDrawers(), error: null };
  } catch (e) {
    // A failed read is reported rather than swallowed: the extension side needs to tell
    // "the MAIN world ran but no columnId could be obtained" apart from the rest
    payload = { columns: [], drawers: [], error: e instanceof Error ? e.message : String(e) };
  }

  window.postMessage({ type: RESPONSE, requestId: data.requestId, ...payload }, window.location.origin);
});

/**
 * Where the extension side says whether the loop guard is wanted: nothing, `tap` (count and
 * record only) or `break` (refuse the dispatches of a runaway task), the latter with an
 * optional threshold as `break:<n>`. localStorage rather than a message because this runs
 * at document_start, before anything of the extension's is listening.
 */
const GUARD_KEY = 'xtweaks:loop-guard';
/**
 * Where the guard keeps its record, rewritten as it goes. In `tap` mode it also goes to the
 * console: a write to localStorage only reaches the disk once the page's event loop comes
 * round, which a loop never lets it do, so a tab killed in one loses everything written
 * since; console messages leave the process at once.
 */
const TAP_KEY = 'xtweaks:loop-tap';
/** Where the previous load's record is moved to, so the next load can read what a killed tab left */
const TAP_PREV_KEY = 'xtweaks:loop-tap:prev';
/** The chunk array X's scripts push onto. Made here, before webpack's runtime wraps its `push` */
const CHUNKS = 'webpackChunk_twitter_responsive_web';
/**
 * Dispatches in one task past which `break` refuses the rest, unless the key says otherwise.
 * Measured on X Pro (2026-09-16): the loop dispatches 37-75 times a second and nothing else
 * exceeded 116 in a task (a video player starting up), so 300 is reached by the loop in
 * 4-8 seconds and by nothing honest.
 */
const THRESHOLD = 300;

const guardWanted = (): { mode: Mode; threshold: number } | null => {
  let asked: string | null;
  try {
    asked = localStorage.getItem(GUARD_KEY);
  } catch {
    // Storage the page is not allowed to read means nobody could have asked for the guard
    return null;
  }
  if (asked === 'tap') return { mode: 'tap', threshold: THRESHOLD };
  if (asked === 'break') return { mode: 'break', threshold: THRESHOLD };
  const custom = asked?.match(/^break:(\d+)$/);
  if (!custom) return null;
  // Below the point where a task gets a record, nothing could be learned about what was
  // refused, so such a threshold is taken as a mistake and the default stands
  const threshold = Number(custom[1]);
  return { mode: 'break', threshold: threshold >= RECORD_AT ? threshold : THRESHOLD };
};

/** Where the hook reports how it went, for the extension side and anyone looking at the page */
const status = (value: string) => {
  document.documentElement.dataset.xproLoopGuard = value;
};

const guardTheStore = ({ mode, threshold }: { mode: Mode; threshold: number }) => {
  const page = window as unknown as Record<string, unknown>;
  const chunks = (page[CHUNKS] ??= []);
  // Something else already got in front of webpack (or webpack itself has run): its `push`
  // is not to be taken away
  if (!Array.isArray(chunks) || chunks.push !== Array.prototype.push) {
    status('taken');
    return;
  }
  // Runs `fn` in a macrotask of its own. A message on a channel rather than `setTimeout`:
  // both wait for the loop of microtasks to end, but a timer in a background tab is held
  // back for a second or more, which would count several tasks' worth of dispatches as one
  const channel = new MessageChannel();
  const due: (() => void)[] = [];
  channel.port1.onmessage = () => due.shift()?.();
  const later = (fn: () => void) => {
    due.push(fn);
    channel.port2.postMessage(null);
  };
  const previous = localStorage.getItem(TAP_KEY);
  if (previous !== null) localStorage.setItem(TAP_PREV_KEY, previous);
  guardChunks(chunks, {
    mode,
    threshold,
    later,
    now: () => Date.now(),
    record: (tap) => {
      const json = JSON.stringify(tap);
      localStorage.setItem(TAP_KEY, json);
      if (mode === 'tap') console.info(TAP_KEY, json);
    },
    status,
    warn: (message, detail) => console.warn(message, detail),
  });
};

const wanted = guardWanted();
if (wanted) {
  try {
    guardTheStore(wanted);
  } catch (e) {
    // An experiment that fails to start must not take the rest of this script with it; the
    // reason is left where the extension side can see it
    status(`error:${e instanceof Error ? e.message : String(e)}`);
  }
}

// A marker is left in the DOM so the extension side can tell whether the MAIN world is
// running. postMessage would not do: this runs at document_start and the extension side at
// document_idle, so nothing is listening yet and the message is lost. The DOM is visible
// from both worlds, whatever the order of execution.
document.documentElement.dataset.xproMainWorld = '1';

