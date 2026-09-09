/**
 * The script running in the page's context (the MAIN world). It walks React's internal
 * state from a column element to read the columnId and writes it onto the element as a
 * marker. Nothing else is given to it and it imports no other module: it sits where X's
 * own scripts can see it, the most exposed to their implementation changing, so its
 * surface is kept as small as possible.
 */
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

// A marker is left in the DOM so the extension side can tell whether the MAIN world is
// running. postMessage would not do: this runs at document_start and the extension side at
// document_idle, so nothing is listening yet and the message is lost. The DOM is visible
// from both worlds, whatever the order of execution.
document.documentElement.dataset.xproMainWorld = '1';

// Importing no other module leaves nothing at the top level, and TypeScript would treat
// this as a global script. An empty export closes it into a module
export {};
