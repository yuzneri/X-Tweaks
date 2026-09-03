/**
 * Puts the query the form has built into X's own search box, so that what is about to be
 * sent is visible where a reader already looks for it.
 *
 * **This is the most fragile thing in the feature, and it is built so that its failing
 * costs nothing.** X's box is a controlled input: React holds the value and redraws from
 * what it holds, so a plain assignment is overwritten the moment X redraws, and X never
 * learns the value changed. The way round it is to call the setter the prototype defines —
 * going under React rather than through it — and then to say that the value changed in the
 * event React is listening for.
 *
 * If X changes how it builds that box, this stops working and nothing else does: the form
 * keeps its own values, the link keeps its own address, and the search still runs. Nothing
 * downstream reads the box back.
 */

import { onSearchResults } from './hide.ts';

/** X's search box */
const SEARCH_INPUT = 'input[data-testid="SearchBox_Search_Input"]';

/**
 * The rail, which this form stands in.
 *
 * X puts a search box here too, on a timeline. **That one is never written to.** Typing
 * into X's box opens its list of suggestions, and X redraws the rail to make room for it —
 * taking this form down with it, mid-word. Writing into the container we live in is a way
 * of asking to be destroyed.
 *
 * The box on the search results is in the timeline instead, and that is the one worth
 * showing the query in anyway: it is where a reader looks to see what was searched for.
 */
const RAIL = '[data-testid="sidebarColumn"]';

/**
 * Writes a value into an input the page's own framework is holding.
 *
 * The setter is taken off the prototype rather than called on the element, because the
 * framework has put its own setter on the element to catch exactly this.
 */
const setControlled = (input: HTMLInputElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) return;
  writing = true;
  try {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } finally {
    writing = false;
  }
};

/**
 * Set while this module is the one writing.
 *
 * The write has to announce itself as an `input` event or X never notices it, and the
 * watcher below is listening for exactly that event — so without this the two would hand
 * the same query back and forth. Cleared in a `finally`: an exception here must not leave
 * the watcher deaf.
 */
let writing = false;

/**
 * Shows the query in X's search box, where there is one.
 *
 * Called as the form is typed into. A box already showing this query is left alone: writing
 * the same value again would move the caret and set X redrawing for nothing.
 */
export const mirror = (query: string, root: ParentNode = document): void => {
  /*
   * Only where a search has been made. Elsewhere X's box is how a search is begun, and
   * filling it as somebody types in this form opens X's list of suggestions over what they
   * are doing.
   */
  if (!onSearchResults()) return;
  for (const input of root.querySelectorAll(SEARCH_INPUT)) {
    if (!(input instanceof HTMLInputElement)) continue;
    // Never the one in the rail: writing there is asking X to redraw the rail this form
    // is standing in (see `RAIL`)
    if (input.closest(RAIL)) continue;
    if (input.value === query) continue;
    /*
     * A box the reader is typing in is left alone. X's box and this form are two ways of
     * saying the same thing, and the one being used has the say — overwriting under
     * somebody's hands is worse than the two disagreeing for a moment.
     */
    if (document.activeElement === input) continue;
    setControlled(input, query);
  }
};

/**
 * Listens for what the reader types into X's own search box, and puts it into the form.
 *
 * The other direction. A reader who starts in X's box and then wants to narrow it down
 * finds the form already holding what they typed, rather than empty beside it.
 *
 * **Every box, this time — the one in the rail included.** Reading from it costs nothing;
 * it was only writing to it that made X redraw the rail (see `RAIL`).
 *
 * Listens on the document rather than on the box, and once. X builds and throws away that
 * box as the page is used, so a listener put on the element would go with it.
 */
export const watchSearchBox = (adopt: (query: string) => void): void => {
  if (watching) return;
  watching = true;
  document.addEventListener(
    'input',
    (event) => {
      // Not our own write coming back round
      if (writing) return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches(SEARCH_INPUT)) return;
      adopt(target.value);
    },
    true
  );
};

let watching = false;
