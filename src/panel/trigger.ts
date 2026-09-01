/**
 * What was pressed last.
 *
 * Menus tell themselves apart by where the press that opened them happened: the wording
 * inside changes with the UI language, and X marks none of them as "this is the one".
 * Several parts need that same press — the menu each surface inserts into, X Pro's
 * column options, and the compose form — so it is remembered in one place rather than
 * each of them attaching its own listener.
 */

let last: Element | null = null;

/** The element the last press landed on. null before anything has been pressed */
export const lastTrigger = (): Element | null => last;

/**
 * Starts watching. Called once at startup.
 *
 * The listener captures, so it runs before X's own handlers stop the event, and it only
 * reads: nothing is prevented and nothing is stopped.
 */
export const watchTrigger = (onTrigger: (target: Element | null) => void): void => {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      last = target instanceof Element ? target : null;
      onTrigger(last);
    },
    true
  );
};
