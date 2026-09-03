/**
 * Puts the search form into x.com's rail, and takes it out again.
 *
 * Where it goes is `rail.ts`'s to say; this is what does the putting, and what keeps it
 * there. X redraws the rail as it is used, so this is called on every settling of the DOM
 * (`content.ts`): a form already standing is left alone, and one X has thrown away is put
 * back. No timer of its own — the settling is the signal this extension already has.
 */
import { render } from 'preact';
import type { Messages } from '../i18n/index.ts';
import { SearchFormView } from './Form.tsx';
import { placementIn } from './rail.ts';

/** The mark on what was inserted, so nothing is inserted twice */
const MARK = 'data-xpro-search';

/** The mark on X's own blocks this form stands in for, so they can be uncovered again */
const COVERED = 'data-xpro-search-covered';

/** The node the form is rendered into, marked so it can be found again to unmount */
const MOUNT = 'data-xpro-search-mount';

/**
 * Hides one of X's blocks rather than removing it.
 *
 * Removing would take it out of reach of the rail's own selectors (`appearance/css.ts`),
 * which are written to refuse anything holding the search form; a block taken out of that
 * arrangement could come within reach of a rule meant for one of its parts. Hiding leaves
 * the arrangement as X built it.
 */
const cover = (element: Element): void => {
  element.setAttribute(COVERED, '');
  // Not skipped when the mark is already there. X redraws its own blocks as the page is
  // used, and a redraw can put the style back the way X wrote it while leaving the mark
  // in place; skipping on the mark alone would leave the block on screen beside the form
  // that replaced it
  if (element instanceof HTMLElement && element.style.display !== 'none') {
    element.style.display = 'none';
  }
};

const uncover = (element: Element): void => {
  element.removeAttribute(COVERED);
  if (element instanceof HTMLElement) element.style.display = '';
};

/**
 * Builds the form's own box and renders the form into it.
 *
 * The box itself is plain DOM and the form inside it is Preact. Keeping the box out of the
 * component lets the insertion move it between views without unmounting: what is typed
 * into the form is held outside the component (`state.ts`), but the fields' own state —
 * where the caret is, which group is open — lives in the tree, and rebuilding would take
 * it away on every move.
 */
const build = (messages: Messages): HTMLElement => {
  const box = document.createElement('div');
  box.className = 'xpro-search';
  box.setAttribute(MARK, '');
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', messages.search.label);

  const title = document.createElement('h2');
  title.className = 'xpro-search-title';
  title.textContent = messages.search.label;
  box.append(title);

  const mount = document.createElement('div');
  mount.setAttribute(MOUNT, '');
  box.append(mount);
  render(<SearchFormView messages={messages} />, mount);
  return box;
};

/**
 * Puts the form in, returning how many were added.
 *
 * Safe to call on every settling: a rail that already has one is left as it is, and a page
 * whose rail cannot be made sense of is left alone rather than guessed at.
 */
export const insertInto = (messages: Messages): number => {
  const placement = placementIn();
  if (!placement) return 0;

  /*
   * What the form stands in for changes with the rail. x.com moves between views without
   * reloading, and the rail has three shapes: what was covered on the search results is
   * not covered on a timeline. A block left hidden across that move would be a part of X's
   * page missing, with nothing on screen to say why.
   */
  for (const covered of placement.holder.querySelectorAll(`:scope > [${COVERED}]`)) {
    if (!placement.covers.includes(covered)) uncover(covered);
  }
  /*
   * Covering is done on every call, not only on the first. X redraws its own blocks as the
   * page is used, and a block redrawn comes back with the style attribute cleared — the
   * form would then be standing beside the very filters it replaced.
   */
  for (const block of placement.covers) cover(block);

  const existing = placement.holder.querySelector(`:scope > [${MARK}]`);
  if (existing) {
    /*
     * Standing somewhere is not the same as standing in the right place. The form goes
     * under the search box on a timeline and at the head of the rail on the search
     * results, so a move between the two leaves it where the previous view wanted it.
     * Moved rather than rebuilt: `insertBefore` takes a node already in the document, so
     * whatever has been typed into the form survives the move.
     */
    /*
     * `existing !== placement.before` as well as the position check. Moving a node is
     * taking it out of the document and putting it back, which drops the caret out of
     * whatever field was being typed in — so this must not run on a form already standing
     * where it belongs. `rail.ts` no longer answers with the panel itself (`withoutOurs`);
     * this is the second lock on a fault whose only symptom is a caret quietly going away.
     */
    if (existing !== placement.before && existing.nextElementSibling !== placement.before) {
      placement.holder.insertBefore(existing, placement.before);
    }
    return 0;
  }

  placement.holder.insertBefore(build(messages), placement.before);
  return 1;
};

/**
 * Takes the form back out and uncovers what it stood in for.
 *
 * Used when the switch is turned off and while the extension is paused. Nothing the
 * extension put on the page should stay there once it has stood down, and X's own filters
 * have to come back with it — left hidden, the reader would be short a part of X's page
 * with nothing on screen to explain it.
 */
export const remove = (): void => {
  // Preact is let go of before the node is taken away, so what the tree held on to
  // (listeners, effects) goes with it rather than being left behind
  document.querySelectorAll(`[${MOUNT}]`).forEach((mount) => render(null, mount));
  document.querySelectorAll(`[${MARK}]`).forEach((box) => box.remove());
  document.querySelectorAll(`[${COVERED}]`).forEach(uncover);
};
