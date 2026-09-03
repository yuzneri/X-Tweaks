/**
 * What has been typed into the search form, held for as long as the page is open.
 *
 * Not stored. Nothing about the form is saved (the design calls for no history and no
 * saved searches), so a reload starts from an empty form and that is the whole of it.
 *
 * Held here rather than inside the component because the component does not outlive the
 * page. x.com moves between views without reloading and redraws its rail as it goes; the
 * form is put back on the next settling (`insert.tsx`), and a reader who had half a query
 * typed would otherwise find it gone for having glanced at another view.
 *
 * A search's address can fill it in as well (`adoptQuery`), so a search arrived at without
 * this form — a trend pressed, a link shared, a page reloaded — can still be taken up and
 * refined. What is already typed always wins over what the address says.
 */
import { buildQuery, emptyForm, emptyScopes, type SearchForm, type SearchScopes } from './query.ts';
import { noExclusions, type Exclusions } from './exclude.ts';

let form: SearchForm = emptyForm();
let scopes: SearchScopes = emptyScopes();
/**
 * The four X has no operator for. Held here with the rest, and stored no more than the
 * rest is: they are for the search being read now.
 */
let exclusions: Exclusions = noExclusions();

export const currentForm = (): SearchForm => form;

/** The address this form was last filled from. One take per address, whatever came of it */
let adoptedFrom: string | null = null;

/**
 * Fills the form from a search's address, once per address.
 *
 * Two things are held apart here, and putting them together was a mistake worth naming.
 * **Whether to look at this address at all** is answered by whether it has been looked at
 * before; **whether to take what it says** is answered by whether anything is typed. The
 * first was once answered with the second — "take it if the form is empty" — and a query
 * that comes out empty then answered "yes" for ever, so every settling of the DOM took it
 * again and rebuilt the form on top of whatever was being typed (`?q=""`, `?q=-`).
 *
 * Returns whether it filled anything, so the caller knows to redraw.
 */
export const adoptQuery = (
  address: string,
  next: SearchForm,
  nextScopes: SearchScopes
): boolean => {
  if (adoptedFrom === address) return false;
  adoptedFrom = address;
  // What is already typed still wins: a reader who has begun writing keeps what they wrote
  if (buildQuery(form) !== '') return false;
  form = next;
  scopes = nextScopes;
  return true;
};

/**
 * Who to tell when the values are changed by something other than the form itself.
 *
 * The form reads this module when it mounts and not again, so a change made from outside
 * it — the reader typing in X's own search box — would sit here unseen. One listener is
 * enough: there is one form on the page.
 */
let listener: (() => void) | null = null;

export const onChangedOutside = (fn: () => void): (() => void) => {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
};

/**
 * Takes a query the reader typed into X's own search box.
 *
 * Unlike `adoptQuery` this overwrites whatever the form holds. Typing into X's box is the
 * reader saying what they want searched for; the form is the same sentence written another
 * way, and the one being typed in has the say.
 */
export const adoptFromSearchBox = (next: SearchForm): void => {
  form = next;
  listener?.();
};
export const currentScopes = (): SearchScopes => scopes;

export const updateForm = (next: SearchForm): void => {
  form = next;
};

export const updateScopes = (next: SearchScopes): void => {
  scopes = next;
};

/**
 * Empties both.
 *
 * Only ever called from the form, which empties what it is showing in the same breath.
 * On its own this would leave the fields showing what they showed before: the component
 * reads this module when it mounts and not again.
 */
export const currentExclusions = (): Exclusions => exclusions;

export const updateExclusions = (next: Exclusions): void => {
  exclusions = next;
};

export const clear = (): void => {
  form = emptyForm();
  scopes = emptyScopes();
  exclusions = noExclusions();
};
