/**
 * x.com as a surface.
 *
 * A scope here is the view being looked at — home, notifications, a list — read from the
 * URL, plus the account signed in. There are no columns, so nothing has to be asked of
 * the page's own state: `viewKeyOf` decides it from the path.
 *
 * The appearance applies to the timeline down the middle of the page, which X marks. One
 * view is on screen at a time, so there is one scope where X Pro has as many as the deck
 * holds.
 */
import { AVATAR_NAME, avatarNameOf } from '../filter/post.ts';
import { watch as watchEntry } from '../panel/menu-item.ts';
import { insertInto as insertMenuItem } from '../panel/x-menu.ts';
import type { ColumnScope } from '../settings/resolve.ts';
import type { Surface } from './index.ts';
import { isPostPage, viewKeyOf, viewNameFrom } from './view.ts';

/** The one group x.com's views go in. The name is the settings screen's to supply */
const GROUP = 'all';

/** The account signed in. x.com shows one at a time, in the button that switches them */
const ACCOUNT_SWITCHER = '[data-testid="SideNav_AccountSwitcher_Button"]';

/**
 * The timeline down the middle of the page: what the view being looked at is drawn in.
 * X marks it itself, and it holds the posts and the bar above them without taking in the
 * side rail or the trends beside it, which belong to no view.
 */
const PRIMARY_COLUMN = '[data-testid="primaryColumn"]';

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
  columnId: viewKeyOf(location.pathname, location.search),
});

export const xSurface: Surface = {
  id: 'x',

  scopeOf: currentScope,
  // The scope comes from the URL, not from anything that renders, so it never has to settle
  scopeSettled: () => true,

  // Only the views that have a key are worth listing. A page with none (a post's own
  // page, say) runs on the tiers above, and reporting it as an unresolved scope would
  // set off the watch on X's markers
  detect: () => {
    const key = viewKeyOf(location.pathname, location.search);
    // What X calls this view. Reading it is `viewNameFrom`'s; all this knows is where to look
    return key === null ? [] : [{ ...currentScope(), title: viewNameFrom(document.title) }];
  },
  refresh: () => Promise.resolve(xSurface.detect()),
  /*
   * Moving between views changes the settings that apply, so the path is the signal.
   * The account goes in as well: switching accounts changes the tier above without the
   * path moving at all.
   */
  signature: () => `${location.pathname}${location.search}\n${accountOf() ?? ''}`,
  /*
   * One group for the whole site. x.com has nothing like a deck, so there is nothing to
   * group views by — but the record needs somewhere to put them, and the settings screen
   * needs something to head the list with.
   */
  state: () => ({ groups: [{ id: GROUP, name: null }], groupId: GROUP }),
  /*
   * Held one per person and one per query, profiles and searches would pile up for every
   * one ever glanced at. Moving to another view drops the ones nothing was set for, there
   * and then: unlike a column, a view cannot be hiding off the side of the window.
   */
  pruning: 'at-once',

  /*
   * The one view on screen. Reported whether or not it has a key of its own: a page the
   * settings cannot be held for still takes the account's and the global tier's, and the
   * key those are applied under is `columnKey`'s to decide.
   */
  scopes: () => [currentScope()],

  // One timeline filling the middle of the page, not one column among several
  hasColumns: false,
  scopeElements: () => Array.from(document.querySelectorAll(PRIMARY_COLUMN)),
  scopeOfElement: currentScope,
  // The timeline is the range: there is nothing between it and the view
  rangeOf: (element) => element,
  /*
   * No bar of its own to paint. x.com writes the view's name into the same sticky header
   * that carries the back arrow and the tabs, over the timeline rather than beside it, so
   * painting it would paint the page's own chrome. The settings screen leaves the two
   * colors that need one out of x.com's tabs for the same reason.
   */
  bandOf: () => null,
  bandStillValid: () => false,
  // Decided by where you are, not by what is on the page: x.com's reply box and its home
  // composer are the same element (see `isPostPage`)
  opened: () => isPostPage(location.pathname),

  // One way in: the "More" menu. x.com has nothing like a column's options, so `openAt`
  // is never called — there is no per-scope handle on the page to press
  insertEntryPoints: insertMenuItem,
  watchEntryPoints: ({ toggle }) => watchEntry(toggle),
};
