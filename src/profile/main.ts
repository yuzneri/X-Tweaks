/**
 * Moves a profile to the chosen defaults as it is opened. Runs in the page's own world on
 * x.com (`main-world-x.ts`), where X's router lives.
 *
 * Nothing that leads to a profile can be changed at its source: avatars, names, mentions
 * and hover cards all go through X's router, which pushes the address itself. So the push
 * is let through, and straight after it the address is replaced and X's router is told to
 * read it again, the same way it hears of the Back button: a `popstate`.
 *
 * - The pushed address is not rewritten on its way in: X's history builds its own record
 *   of where it is from what it pushed, and would disagree with the address bar
 * - Replaced, not pushed, so Back does not pass through X's default on the way out
 * - A microtask later, not at once: X's history announces its push after `pushState`
 *   returns, and a `popstate` heard before that would be overtaken by it
 * - In this world, not the extension's: X's router reads `state` off the event, and an
 *   object made in the extension's world cannot be relied on to be readable here (Firefox)
 * - Pushes only, and the first load: Back and Forward return to where someone was, and a
 *   choice made there before is not overridden on the way back
 */
import { defaultTarget, type Place } from './default-tab.ts';
import type { ProfileSettings } from '../settings/schema.ts';

/** The message the extension's side sends the settings in, and on every change */
export const PROFILE_DEFAULTS = 'xpro-tweaks:set-profile-defaults';

/** What is used of the window; written out so a test can stand in for it */
export type ProfileWindow = {
  history: History;
  location: { href: string; pathname: string; search: string };
  addEventListener: (type: 'popstate', listener: () => void, capture: boolean) => void;
  dispatchEvent: (event: Event) => boolean;
  PopStateEvent: typeof PopStateEvent;
};

export const installProfileDefaults = (
  win: ProfileWindow
): { setProfile: (profile: ProfileSettings) => void } => {
  const { history } = win;
  const here = (): Place => ({ pathname: win.location.pathname, search: win.location.search });
  const push = history.pushState;
  const replace = history.replaceState;

  /** Unknown until the extension's side has read its settings: nothing is moved before then */
  let profile: ProfileSettings | null = null;
  /** Where the page was before the latest push. Kept up to date through replaces and pops */
  let last = here();
  /** Pushes since the page loaded. Any at all means the first load is past */
  let pushes = 0;

  const settle = (to: Place, from: Place | null): void => {
    if (profile === null) return;
    const target = defaultTarget(to, from, profile);
    if (target === null) return;
    replace.call(history, history.state, '', target);
    last = here();
    win.dispatchEvent(new win.PopStateEvent('popstate', { state: history.state }));
  };

  history.pushState = function (this: History, ...args: Parameters<History['pushState']>) {
    const from = last;
    push.apply(this, args);
    last = here();
    const turn = ++pushes;
    /*
     * Another push in the meantime is somewhere else to go, and judged on its own turn. A
     * replace is not: the address is read when the turn comes, so it is judged as it stands
     */
    queueMicrotask(() => {
      if (turn === pushes) settle(here(), from);
    });
  };
  /*
   * X replaces as well as pushes: choosing an order on the posts tab is a replace, as is X
   * dropping an order it will not offer. Followed so `last` is never stale; never judged.
   */
  history.replaceState = function (this: History, ...args: Parameters<History['replaceState']>) {
    replace.apply(this, args);
    last = here();
  };
  // Captured, so it is up to date before X's own listener runs
  win.addEventListener(
    'popstate',
    () => {
      last = here();
    },
    true
  );

  return {
    setProfile: (next) => {
      const first = profile === null;
      profile = next;
      // The settings arrive after X has drawn the page it was loaded on. If nobody has moved
      // since, that page is still the arrival
      if (first && pushes === 0) settle(here(), null);
    },
  };
};
