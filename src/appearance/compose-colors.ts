/**
 * Which colour each compose form gets, and what colour the page behind x.com gets.
 *
 * Split out from `apply.ts` so it can be read and tested without a page: everything here
 * is a question about the stored settings, the same split `compose/keep.ts` makes with
 * `compose/signal.ts`. Marking the forms and writing the stylesheet stay on the other side.
 */
import { appearanceFor } from '../settings/resolve.ts';
import type { AppearanceNode, Settings } from '../settings/schema.ts';
import type { SurfaceId } from '../surface/index.ts';

/** One colour to write, and who it is for. `null` means "whatever account this is" */
export type ComposeColor = { account: string | null; color: string };

export type ComposeColors = {
  colors: ComposeColor[];
  /**
   * Accounts the general colour must not reach. An account that switched the appearance off
   * resolves no colour of its own, and the general rule matches any marked form, so without
   * this, turning the appearance off would leave the compose form coloured.
   */
  except: string[];
};

/**
 * Every account with settings that can reach this site's compose form: the ones set for the
 * account itself, and the ones set for that account on this site alone. An account can
 * appear in the second and not the first — "leave this account's colour off X Pro" is
 * written there and nowhere else — and a name missed here is a form that keeps the general
 * colour it was supposed to lose. The other site's map is left out: nothing in it can reach
 * the form being painted.
 */
const accountsIn = (settings: Settings, surface: SurfaceId): string[] => [
  ...new Set([...Object.keys(settings.accounts), ...Object.keys(settings.surfaceAccounts[surface])]),
];

/**
 * The colour of each account's compose form, general one first.
 *
 * Resolved with no column: the form belongs to an account rather than to anything on screen,
 * so `tiersFor` (`settings/resolve.ts`) leaves the column tier out. The site is passed
 * because it is a tier of its own below the account — a colour set for an account reaches
 * both sites, and the site tier is where one of the two takes it back. The entry for no
 * account carries what the tiers above set, which accounts setting nothing of their own
 * inherit; it comes first so a named account's colour, weighing the same, wins by coming
 * later.
 *
 * Accounts are taken from what is stored rather than from what is on screen: on X Pro the
 * drawer posts as whichever account was chosen in it, which need not be any column's.
 */
export const composeColors = (settings: Settings, surface: SurfaceId): ComposeColors => {
  const colorFor = (account: string | null): string | null =>
    appearanceFor(settings, { account, surface, columnId: null }).colors.composeBackground;

  const general = colorFor(null);
  const colors: ComposeColor[] = general === null ? [] : [{ account: null, color: general }];
  const except: string[] = [];
  for (const account of accountsIn(settings, surface)) {
    const color = colorFor(account);
    // An account that only repeats what it inherits needs no line of its own
    if (color !== null && color !== general) colors.push({ account, color });
    // Nothing resolved where something is coming down from above: this account is
    // holding the appearance back, and the general colour is part of what it holds back
    else if (color === null && general !== null) except.push(account);
  }
  return { colors, except };
};

/**
 * The colour behind x.com's page, from the view on screen. x.com draws one view at a time,
 * so there is one answer: the columns are folded by key before they get here, and on x.com
 * that fold leaves a single entry.
 */
export const pageColor = (columns: { appearance: AppearanceNode }[]): string | null =>
  columns[0]?.appearance.colors.pageBackground ?? null;
