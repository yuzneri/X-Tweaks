/**
 * Reordering a list by dragging. Only swapping up and down within one list is needed, so
 * pointer events do the job rather than outside machinery (bundling one in grows
 * `content.js` by a third). Near an edge it scrolls automatically, since the list is taller
 * than the pane and a row could not otherwise be dropped off screen.
 */
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

/** How many px inside the pane's edge scrolling starts */
const EDGE_ZONE = 56;

/** The maximum scroll per frame; the closer to the edge, the closer to this */
const MAX_SPEED = 18;

/**
 * Finds what scrolls that element vertically: the right pane in two-pane layout, the frame
 * when stacked. On a narrow options page every ancestor is `overflow: visible`, so the
 * document (taking the overflow) is the last resort.
 */
const scrollerOf = (el: HTMLElement): HTMLElement | null => {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) {
      return p;
    }
  }
  const doc = document.scrollingElement as HTMLElement | null;
  return doc && doc.scrollHeight > doc.clientHeight ? doc : null;
};

/**
 * The box the edges are measured against. A scrolling document's rectangle is the whole
 * document (its top goes negative), so the window's height is used instead.
 */
const edgeBoxOf = (scroller: HTMLElement): { top: number; bottom: number } =>
  scroller === document.scrollingElement
    ? { top: 0, bottom: window.innerHeight }
    : scroller.getBoundingClientRect();

/**
 * One row's vertical span; top and bottom alone are passed rather than the rectangle, so
 * the decision can be unit-tested
 */
export type VerticalSpan = { top: number; bottom: number };

/**
 * Returns the drop destination as an array index (take `from` out, then insert here).
 *
 * The swap happens as soon as the neighboring row is overlapped: its top edge moving down,
 * bottom edge moving up. Deciding by a row's midpoint would make the first candidate moving
 * down one's own current position, so dropping would do nothing.
 */
export const dropIndex = (rows: readonly VerticalSpan[], from: number, y: number): number => {
  const own = rows[from]!;
  // Neither above nor below one's own row means no movement
  if (y >= own.top && y <= own.bottom) return from;

  const downward = y > own.bottom;
  let passed = 0;
  for (let i = 0; i < rows.length; i++) {
    if (i === from) continue;
    const r = rows[i]!;
    // Down: entering that row counts as passing; up: leaving it entirely counts as passing
    if (downward ? r.top < y : r.bottom < y) passed++;
  }
  return passed;
};

/** What is being held; kept in a ref rather than state so it is not swept up in re-renders */
type Grab = {
  /** The grabbed row itself; if the settings change mid-grab, what an index points at shifts */
  row: HTMLElement;
  list: HTMLElement;
  /** The vertical position last reported (screen coordinates) */
  y: number;
  scroller: HTMLElement | null;
  /**
   * Directions already inside the edge band when grabbed; scrolling that way waits until the
   * band is left once. Rows near the list's end sit near the edge, and scrolling off the
   * moment they are grabbed would throw the aim off.
   */
  held: { up: boolean; down: boolean };
};

export type Reorder = {
  /** The index of the row being held; `null` when nothing is held */
  from: number | null;
  /** The destination index (`from` taken out, inserted here); equal to `from` means no movement */
  to: number | null;
  gripProps: (index: number) => {
    onPointerDown: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerCancel: (event: PointerEvent) => void;
  };
};

export const useReorder = (onDrop: (from: number, to: number) => void): Reorder => {
  const grabbed = useRef<Grab | null>(null);
  const frame = useRef(0);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);

  /** Re-reads the list and the grabbed row's position; the list can change mid-grab too */
  const placeOf = (grab: Grab): { rows: VerticalSpan[]; from: number } => {
    const elements = [...grab.list.children] as HTMLElement[];
    return {
      rows: elements.map((el) => el.getBoundingClientRect()),
      from: elements.indexOf(grab.row),
    };
  };

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    grabbed.current = null;
    setFrom(null);
    setTo(null);
  }, []);

  /**
   * Runs every frame while something is held; the destination is re-measured here too, since
   * rows shift during automatic scrolling even with the finger still.
   */
  const step = useCallback(() => {
    const grab = grabbed.current;
    if (!grab) return;

    const scroller = grab.scroller;
    if (scroller) {
      const box = edgeBoxOf(scroller);
      const toTop = grab.y - box.top;
      const toBottom = box.bottom - grab.y;
      // Leaving the band releases the hold on that direction
      if (toTop >= EDGE_ZONE) grab.held.up = false;
      if (toBottom >= EDGE_ZONE) grab.held.down = false;
      // Faster the closer to the edge; the browser caps it at the end of the scroll
      const delta =
        toTop < EDGE_ZONE && !grab.held.up
          ? -MAX_SPEED * (1 - Math.max(0, toTop) / EDGE_ZONE)
          : toBottom < EDGE_ZONE && !grab.held.down
            ? MAX_SPEED * (1 - Math.max(0, toBottom) / EDGE_ZONE)
            : 0;
      if (delta !== 0) scroller.scrollTop += delta;
    }

    const { rows, from: current } = placeOf(grab);
    // The row being held is gone (deleted on another surface); the grab goes with it
    if (current < 0) {
      stop();
      return;
    }
    setFrom(current);
    setTo(dropIndex(rows, current, grab.y));
    frame.current = requestAnimationFrame(step);
  }, [stop]);

  // The screen can be left mid-grab (switching to another tab, say); leave nothing behind
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /**
   * When the mind changes mid-grab; the handle is a marker holding no focus, so `document`
   * listens for the key
   */
  useEffect(() => {
    if (from === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // The in-page panel closes on Esc; cancelling the reorder comes first
      event.stopPropagation();
      stop();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [from, stop]);

  const gripProps = (index: number) => ({
    onPointerDown: (event: PointerEvent) => {
      // Left button only, not a context menu or a secondary button
      if (event.button !== 0) return;
      const grip = event.currentTarget as HTMLElement;
      const row = grip.closest('li');
      const list = row?.parentElement;
      if (!row || !list) return;
      // Events keep arriving while held, even once the finger leaves the row
      grip.setPointerCapture(event.pointerId);
      // Keeps text selection and page scrolling from taking it
      event.preventDefault();

      const scroller = scrollerOf(grip);
      const box = scroller ? edgeBoxOf(scroller) : null;
      grabbed.current = {
        row,
        list,
        y: event.clientY,
        scroller,
        held: box
          ? { up: event.clientY - box.top < EDGE_ZONE, down: box.bottom - event.clientY < EDGE_ZONE }
          : { up: false, down: false },
      };
      setFrom(index);
      setTo(index);
      frame.current = requestAnimationFrame(step);
    },

    // Only the position is remembered; re-measuring and re-rendering happen together in the
    // frame
    onPointerMove: (event: PointerEvent) => {
      if (grabbed.current) grabbed.current.y = event.clientY;
    },

    onPointerUp: (event: PointerEvent) => {
      const grab = grabbed.current;
      if (!grab) return;
      // Measured on the spot, not taken from state, so there is no need to wait for the last frame
      grab.y = event.clientY;
      const { rows, from: current } = placeOf(grab);
      const target = current < 0 ? -1 : dropIndex(rows, current, grab.y);
      stop();
      if (current >= 0 && target !== current) onDrop(current, target);
    },

    onPointerCancel: () => stop(),
  });

  return { from, to, gripProps };
};
