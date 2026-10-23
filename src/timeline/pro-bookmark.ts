/**
 * Draws the bookmark button in X Pro's narrow columns, where X Pro leaves it out.
 *
 * X Pro's post component draws the row of buttons in `_renderTweetActions`, handing the row
 * `allowBookmarkInActionsBar` only once it has measured the row at 290px or wider (read from
 * its script, 2026-10-23). In a column narrower than "wide" the button is never made, so no
 * stylesheet can bring it back. The method is wrapped on the component's prototype, once, and
 * what it returns is handed on with that prop set for a post inside a marked scope
 * (`BOOKMARK_ATTR`). Only that prop is touched: the same width decides the Grok button too,
 * which stays as X Pro has it.
 *
 * A scope marked or unmarked has its posts drawn again, which is when the change shows. A post
 * arriving in a marked scope shows it when X Pro draws it again after measuring the row: the
 * first drawing has no element yet to tell which scope the post is in.
 *
 * Nothing names a module or an export, both renamed on every build of X Pro: the component is
 * found from a post's reply button by the method it has. Anything not found as expected leaves
 * X Pro as it is, and how it went is left on the root as `data-xpro-narrow-bookmark`.
 */

/**
 * The marker on a scope whose posts are to have the bookmark button drawn even in a narrow
 * column: set by the extension side (`appearance/apply.ts`) where the setting asks for it and
 * no post is opened, read here.
 */
export const BOOKMARK_ATTR = 'data-xpro-bookmark-always';

/** React's internals. No public type exists, so only what is needed to walk them is written out */
type Fiber = { stateNode?: unknown; child?: Fiber | null; return?: Fiber | null };

/** X Pro's post component, as far as it is used here */
export type PostComponent = {
  _renderTweetActions: (...args: unknown[]) => unknown;
  forceUpdate: () => void;
  /** The component's place in React's tree, kept there by React 17 and later */
  _reactInternals?: Fiber;
};

/** Something React has been handed to draw, as far as it is looked into here */
type Drawn = { props: Record<string, unknown> };

/** What a drawn element is asked: which scope it sits in */
type Placed = { closest: (selector: string) => unknown };

const PROP = 'allowBookmarkInActionsBar';

/** Its button sits deep inside the row the component draws, so a walk up from it finds the component */
const REPLY_BUTTON = '[data-testid="reply"]';

export const isPostComponent = (value: unknown): value is PostComponent =>
  typeof (value as PostComponent | null)?._renderTweetActions === 'function' &&
  typeof (value as PostComponent).forceUpdate === 'function';

/**
 * The post component an element drawn inside a post belongs to. The walk has no cap on how far
 * up it goes: it ends at the root anyway, and how many components X Pro puts between the two is
 * up to its build (70 from the reply button on 2026-10-23)
 */
export const postComponentAbove = (fiber: Fiber | null): PostComponent | null => {
  for (let f = fiber; f; f = f.return ?? null) {
    if (isPostComponent(f.stateNode)) return f.stateNode;
  }
  return null;
};

/**
 * The first element a component has drawn. Null before it has drawn any. No cap on how far
 * down, for the same reason as above: the chain ends where nothing more is drawn
 */
export const elementBelow = (fiber: Fiber | null): Placed | null => {
  for (let f = fiber; f; f = f.child ?? null) {
    const node = f.stateNode as Partial<Placed> | null | undefined;
    if (typeof node?.closest === 'function') return node as Placed;
  }
  return null;
};

const isDrawn = (value: unknown): value is Drawn =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Drawn).props === 'object' &&
  (value as Drawn).props !== null;

/**
 * The row as drawn, with the bookmark allowed. Copied rather than changed in place: a
 * development build of React freezes what it draws. Null where no child carries the prop,
 * which is how a change to X Pro's script shows.
 */
export const withBookmark = (row: Drawn): Drawn | null => {
  const children = row.props.children;
  if (!Array.isArray(children)) return null;
  let found = false;
  let changed = false;
  const next = children.map((child: unknown) => {
    if (!isDrawn(child) || !(PROP in child.props)) return child;
    found = true;
    if (child.props[PROP] === true) return child;
    changed = true;
    return { ...child, props: { ...child.props, [PROP]: true } };
  });
  if (!found) return null;
  return changed ? { ...row, props: { ...row.props, children: next } } : row;
};

const WRAPPED = Symbol('xpro-tweaks:narrow-bookmark');

/**
 * Wraps the method on the prototype that holds it, once. `wanted` says, for one post, whether
 * its row is to have the bookmark. False where the method is not a plain one on a prototype —
 * one on the component itself would have to be wrapped post by post — and nothing is changed.
 */
export const wrapRow = (
  component: PostComponent,
  wanted: (post: PostComponent) => boolean,
  report: (status: string) => void
): boolean => {
  let proto: object | null = Object.getPrototypeOf(component);
  while (proto && !Object.hasOwn(proto, '_renderTweetActions')) proto = Object.getPrototypeOf(proto);
  const descriptor = proto ? Object.getOwnPropertyDescriptor(proto, '_renderTweetActions') : undefined;
  if (!proto || !descriptor?.configurable || typeof descriptor.value !== 'function') return false;
  const original = descriptor.value as PostComponent['_renderTweetActions'];
  if (WRAPPED in original) return true;

  const wrapped = function (this: PostComponent, ...args: unknown[]): unknown {
    const row = original.apply(this, args);
    /*
     * A failure of this file's must not cost the post its buttons: X Pro's own row is handed
     * on and the reason left for whoever looks. X Pro's own exceptions, thrown above, are not
     * caught
     */
    try {
      if (!isDrawn(row) || !wanted(this)) return row;
      const allowed = withBookmark(row);
      if (allowed) return allowed;
      report('no-prop');
    } catch (e) {
      report(`error:${e instanceof Error ? e.message : String(e)}`);
    }
    return row;
  };
  Object.defineProperty(wrapped, WRAPPED, { value: true });
  Object.defineProperty(proto, '_renderTweetActions', { ...descriptor, value: wrapped });
  return true;
};

const fiberOf = (el: Element): Fiber | null => {
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  return key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null;
};

/** The post components drawn in a part of the page, found from their reply buttons */
const componentsIn = (root: ParentNode): Set<PostComponent> => {
  const found = new Set<PostComponent>();
  for (const button of root.querySelectorAll(REPLY_BUTTON)) {
    const post = postComponentAbove(fiberOf(button));
    if (post) found.add(post);
  }
  return found;
};

/** The post component found first from the given reply buttons */
const firstComponent = (buttons: Iterable<Element>): PostComponent | null => {
  for (const button of buttons) {
    const post = postComponentAbove(fiberOf(button));
    if (post) return post;
  }
  return null;
};

/** Only the marker is watched, until a component is still to be found (then posts arriving too) */
const MARKERS: MutationObserverInit = { subtree: true, attributes: true, attributeFilter: [BOOKMARK_ATTR] };
const MARKERS_AND_POSTS: MutationObserverInit = { ...MARKERS, childList: true };

export const installProBookmark = (): void => {
  const root = document.documentElement;
  const marked = `[${BOOKMARK_ATTR}]`;
  const report = (status: string) => {
    if (root.dataset.xproNarrowBookmark !== status) root.dataset.xproNarrowBookmark = status;
  };
  const wanted = (post: PostComponent) => !!elementBelow(post._reactInternals ?? null)?.closest(marked);

  let wrapped = false;
  /** Scopes marked or unmarked since their posts were last drawn again */
  const touched = new Set<Element>();
  let frame: number | null = null;

  const redraw = () => {
    frame = null;
    if (!wrapped) {
      try {
        if (!document.querySelector(marked)) {
          // Unmarked again before a post turned up: nothing is waited for any more
          touched.clear();
          observer.observe(root, MARKERS);
          return;
        }
        const buttons = document.querySelectorAll(`${marked} ${REPLY_BUTTON}`);
        const first = firstComponent(buttons);
        if (!first) {
          observer.observe(root, MARKERS_AND_POSTS);
          /*
           * Watched on even where posts are there and none was found: a reply button need not sit in a
           * post this component draws, and one that does may arrive later
           */
          report(buttons.length === 0 ? 'waiting' : 'no-component');
          return;
        }
        if (!wrapRow(first, wanted, report)) {
          observer.disconnect();
          report('no-method');
          return;
        }
      } catch (e) {
        observer.disconnect();
        report(`error:${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      wrapped = true;
      observer.observe(root, MARKERS);
      report('wrapped');
    }
    const scopes = [...touched].filter((scope) => scope.isConnected);
    touched.clear();
    for (const scope of scopes) for (const post of componentsIn(scope)) post.forceUpdate();
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') touched.add(record.target as Element);
    }
    if (touched.size > 0 && frame === null) frame = requestAnimationFrame(redraw);
  });
  observer.observe(root, MARKERS);
};
