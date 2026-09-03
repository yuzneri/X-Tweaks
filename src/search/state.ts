/**
 * What has been typed into the search form, held for as long as the page is open.
 *
 * Not stored. Nothing about the form is saved (the design calls for no history and no
 * saved searches), so a reload starts from an empty form and that is the whole of it. The
 * four the form ticks are the one exception, and are carried no further than the tab
 * (`carried`).
 *
 * Held here rather than inside the component because the component does not outlive the
 * page. x.com moves between views without reloading and redraws its rail as it goes; the
 * form is put back on the next settling (`insert.tsx`), and a reader who had half a query
 * typed would otherwise find it gone for having glanced at another view.
 *
 * A search's address can fill it in as well (`adoptQuery`), so a search arrived at without
 * this form — a tag pressed, a trend, a link shared, a page reloaded — can still be taken
 * up and refined. The address wins whenever it asks for a different search than the fields
 * already build, since the form stands beside those results and must describe them.
 */
import { buildQuery, emptyForm, emptyScopes, type SearchForm, type SearchScopes } from './query.ts';
import { exclusionsFrom, namedExclusions, noExclusions, type Exclusions } from './exclude.ts';

let form: SearchForm = emptyForm();
let scopes: SearchScopes = emptyScopes();

/** Where the four are written down so that they outlive the page (see `carried`) */
const CARRIED = 'xpro:search-exclusions';

/**
 * What was ticked before this page was built.
 *
 * The four have to outlive the page, unlike everything else here. Running a search takes
 * the reader to a new page, and everything in this module goes with the old one — so a
 * reader who asked for no reposts would be asking again after every search.
 *
 * `sessionStorage` rather than the extension's own store: it is the one that lasts exactly
 * as long as the tab, which is what "not saved" has to mean now that this survives a page
 * at all. It is also read without waiting, and this is read while the page is being built.
 *
 * What comes back is not trusted. This is the page's own storage and x.com can write to
 * it, so the text is read as a list of names and anything else is nothing (`exclusionsFrom`).
 */
const carried = (): Exclusions => {
  try {
    return exclusionsFrom(sessionStorage.getItem(CARRIED));
  } catch {
    // Storage can be turned off altogether. Carrying is a convenience, so the four simply
    // start off, exactly as they did before any of this was carried
    return noExclusions();
  }
};

const carry = (exclusions: Exclusions): void => {
  try {
    sessionStorage.setItem(CARRIED, namedExclusions(exclusions));
  } catch {
    // As above. What is ticked still holds for this page; only the carrying is lost
  }
};

/**
 * The four X has no operator for. Held here with the rest, and saved no more than the rest
 * is — but carried across the page the search takes the reader to (`carried`).
 */
let exclusions: Exclusions = carried();

export const currentForm = (): SearchForm => form;

/** The address this form was last filled from. One take per address, whatever came of it */
let adoptedFrom: string | null = null;

/** Whether two sets of address parameters say the same thing */
const sameScopes = (a: SearchScopes, b: SearchScopes): boolean =>
  a.tab === b.tab && a.followedOnly === b.followedOnly && a.nearbyOnly === b.nearbyOnly;

/**
 * Fills the form from a search's address, once per address.
 *
 * Two things are held apart here, and putting them together was a mistake worth naming.
 * **Whether to look at this address at all** is answered by whether it has been looked at
 * before; **whether to take what it says** is answered by comparing it with the form. The
 * first was once answered with the second — "take it if the form is empty" — and a query
 * that comes out empty then answered "yes" for ever, so every settling of the DOM took it
 * again and rebuilt the form on top of whatever was being typed (`?q=""`, `?q=-`).
 *
 * **The fields are kept only where they already build what the address asks for.** That is
 * the search this form sent the reader on, and rebuilding it from the query would shuffle
 * the words between the fields they were typed into. Any other address is a search the
 * reader asked for some other way — a tag pressed, a trend, a link — and the form has to
 * follow it, or it sits beside the results describing a different search. x.com moves
 * between searches without reloading, so nothing else would ever correct it.
 *
 * The cost is that a half-written query is lost by pressing a tag. Showing the wrong search
 * is worse: what is on screen would be a lie rather than merely gone.
 *
 * Returns whether it changed anything, so the caller knows to redraw.
 */
export const adoptQuery = (
  address: string,
  asked: string,
  next: SearchForm,
  nextScopes: SearchScopes
): boolean => {
  if (adoptedFrom === address) return false;
  adoptedFrom = address;

  let took = false;
  if (asked !== buildQuery(form)) {
    form = next;
    took = true;
  }
  if (!sameScopes(scopes, nextScopes)) {
    scopes = nextScopes;
    took = true;
  }
  return took;
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
  carry(next);
};

export const clear = (): void => {
  form = emptyForm();
  scopes = emptyScopes();
  exclusions = noExclusions();
  // Emptied where it is carried as well: "clear" that came back on the next page would be
  // no clearing at all
  carry(exclusions);
};
