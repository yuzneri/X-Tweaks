/**
 * x.com as a surface.
 *
 * A scope here is the view being looked at — home, notifications, a list — read from the
 * URL, plus the account signed in. There are no columns, so nothing has to be asked of
 * the page's own state: `viewKeyOf` decides it from the path.
 *
 * The appearance is not wired up yet (`scopes` and `scopeElements` answer with nothing).
 * Where it applies on a page with no columns is its own question, and it is PR ⑥'s.
 */
import { AVATAR_NAME, avatarNameOf } from '../filter/post.ts';
import type { ColumnScope } from '../settings/resolve.ts';
import type { Surface } from './index.ts';
import { viewKeyOf } from './view.ts';

/** The account signed in. x.com shows one at a time, in the button that switches them */
const ACCOUNT_SWITCHER = '[data-testid="SideNav_AccountSwitcher_Button"]';

/**
 * The screen name signed in, or null while it cannot be read.
 *
 * X also writes `UserAvatar-Container-unknown` on avatars it has no user for (the chat
 * and Grok drawers carry them), so that value is refused: taken as a name it would make
 * an account tier called "unknown" that every reader would have to explain to themselves.
 */
const accountOf = (): string | null => {
  const name = avatarNameOf(document.querySelector(ACCOUNT_SWITCHER)?.querySelector(AVATAR_NAME));
  return name === 'unknown' ? null : name;
};

/**
 * Where the page is now. Read fresh each time rather than remembered: x.com moves
 * between views without reloading, and a remembered scope would keep applying the
 * previous view's settings.
 */
const currentScope = (): ColumnScope => ({
  account: accountOf(),
  columnId: viewKeyOf(location.pathname),
});

export const xSurface: Surface = {
  id: 'x',

  scopeOf: currentScope,
  // The scope comes from the URL, not from anything that renders, so it never has to settle
  scopeSettled: () => true,

  // Only the views that have a key are worth listing. A page with none (a post's own
  // page, say) runs on the tiers above, and reporting it as an unresolved scope would
  // set off the watch on X's markers
  detect: () => (viewKeyOf(location.pathname) === null ? [] : [{ ...currentScope(), title: null }]),
  refresh: () => Promise.resolve(xSurface.detect()),
  /*
   * Moving between views changes the settings that apply, so the path is the signal.
   * The account goes in as well: switching accounts changes the tier above without the
   * path moving at all.
   */
  signature: () => `${location.pathname}\n${accountOf() ?? ''}`,
  // No deck. `deckId: null` is what tells the recording side to write nothing down; what
  // takes its place on a surface without decks is PR ⑤a's question
  state: () => ({ decks: [], deckId: null }),

  // The appearance has nowhere to apply until PR ⑥ decides its range, so it is handed nothing
  scopes: () => [],
  scopeElements: () => [],
  scopeOfElement: currentScope,
  rangeOf: (element) => element,
  bandOf: () => null,
  bandStillValid: () => false,
};
