/**
 * What was pressed last. Menus tell themselves apart by where the press that opened them
 * happened: the wording inside changes with the UI language, and X marks none as "this is
 * the one". The menu each surface inserts into, X Pro's column options and the compose
 * form all need that press, so it is remembered here rather than by a listener each.
 */

let last: Element | null = null;

/** The element the last press landed on. null before anything has been pressed */
export const lastTrigger = (): Element | null => last;

/**
 * Starts watching. Called once at startup. The listener captures, so it runs before X's
 * own handlers stop the event, and it only reads: nothing is prevented or stopped.
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
