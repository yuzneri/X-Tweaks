/**
 * What has been typed into the search form, held for as long as the page is open.
 *
 * Not stored. Nothing about the form is saved (the design calls for no history and no
 * saved searches), so a reload starts from an empty form and that is the whole of it.
 *
 * Held here rather than inside the component because the component does not outlive the
 * page. x.com moves between views without reloading and redraws its rail as it goes; the
 * form is put back on the next settling (`insert.ts`), and a reader who had half a query
 * typed would otherwise find it gone for having glanced at another view. Reading it back
 * from the address instead was considered and refused — that is the reverse parsing this
 * feature deliberately does not do.
 */
import { emptyForm, emptyScopes, type SearchForm, type SearchScopes } from './query.ts';

let form: SearchForm = emptyForm();
let scopes: SearchScopes = emptyScopes();

export const currentForm = (): SearchForm => form;
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
export const clear = (): void => {
  form = emptyForm();
  scopes = emptyScopes();
};
