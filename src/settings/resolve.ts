/**
 * Merges the four tiers (global, account, site, column) into settings for one column. Rules
 * accumulate, lower tier first; "applies" and the appearance inherit by overriding, the
 * lower tier winning and unset values coming from above.
 */
import {
  appearanceApplies,
  emptyNode,
  type AppearanceNode,
  type ClearableItem,
  type FilterNode,
  type Settings,
  type SettingsNode,
} from './schema.ts';
import type { SurfaceId } from '../surface/index.ts';

/**
 * Takes the first setting found, looking upward from the lowest tier; null when none sets it.
 *
 * `item` names the appearance item for ones a tier can put back to "as X shows it"
 * (`CLEARABLE_ITEMS`). A tier that does so ends the walk — what stands above is exactly what
 * it is cancelling. Items that cannot be cancelled (switches, choices, "applies") are looked up
 * without it. A tier that both sets the item and lists it cleared is read as setting it — the
 * value written on purpose wins — which can only arise from an imported file, since the
 * settings screen offers one or the other, never both.
 */
const inherit = <T>(
  tiers: SettingsNode[],
  pick: (node: SettingsNode) => T | null,
  item?: ClearableItem
): T | null => {
  for (let i = tiers.length - 1; i >= 0; i--) {
    const node = tiers[i]!;
    const value = pick(node);
    if (value !== null) return value;
    if (item !== undefined && node.appearance.cleared.includes(item)) return null;
  }
  return null;
};

/**
 * The order across tiers, strung from the lowest. Judging takes the first matching rule, so
 * this order is the tiers' priority, matching the appearance's overriding inheritance direction.
 */
const mergeOrder = (tiers: SettingsNode[]): string[] => {
  const seen = new Set<string>();
  return [...tiers]
    .reverse()
    .flatMap((node) => node.filter.order)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
};

/** Rules accumulate. Each carries its own action, so stringing tiers together causes no conflict; to cancel an upper tier's settings, put a "do nothing" rule in a lower tier */
const mergeFilter = (tiers: SettingsNode[]): FilterNode => ({
  enabled: inherit(tiers, (node) => node.filter.enabled),
  rules: tiers.flatMap((node) => node.filter.rules),
  order: mergeOrder(tiers),
});

const mergeAppearance = (tiers: SettingsNode[]): AppearanceNode => ({
  enabled: inherit(tiers, (node) => node.appearance.enabled),
  columnWidth: inherit(tiers, (node) => node.appearance.columnWidth, 'columnWidth'),
  compact: inherit(tiers, (node) => node.appearance.compact),
  fontSize: inherit(tiers, (node) => node.appearance.fontSize, 'fontSize'),
  maxLines: inherit(tiers, (node) => node.appearance.maxLines, 'maxLines'),
  wordsShown: inherit(tiers, (node) => node.appearance.wordsShown, 'wordsShown'),
  collapseNewlines: inherit(tiers, (node) => node.appearance.collapseNewlines),
  rawCounts: inherit(tiers, (node) => node.appearance.rawCounts),
  colors: {
    background: inherit(tiers, (node) => node.appearance.colors.background, 'colors.background'),
    text: inherit(tiers, (node) => node.appearance.colors.text, 'colors.text'),
    name: inherit(tiers, (node) => node.appearance.colors.name, 'colors.name'),
    meta: inherit(tiers, (node) => node.appearance.colors.meta, 'colors.meta'),
    link: inherit(tiers, (node) => node.appearance.colors.link, 'colors.link'),
    border: inherit(tiers, (node) => node.appearance.colors.border, 'colors.border'),
    columnTitle: inherit(tiers, (node) => node.appearance.colors.columnTitle, 'colors.columnTitle'),
    columnHeader: inherit(
      tiers,
      (node) => node.appearance.colors.columnHeader,
      'colors.columnHeader'
    ),
    composeBackground: inherit(
      tiers,
      (node) => node.appearance.colors.composeBackground,
      'colors.composeBackground'
    ),
    pageBackground: inherit(
      tiers,
      (node) => node.appearance.colors.pageBackground,
      'colors.pageBackground'
    ),
  },
  media: {
    maxThumbHeight: inherit(
      tiers,
      (node) => node.appearance.media.maxThumbHeight,
      'media.maxThumbHeight'
    ),
    style: inherit(tiers, (node) => node.appearance.media.style),
  },
  timeFormat: inherit(tiers, (node) => node.appearance.timeFormat),
  cardStyle: inherit(tiers, (node) => node.appearance.cardStyle),
  quoteStyle: inherit(tiers, (node) => node.appearance.quoteStyle),
  autoContrast: inherit(tiers, (node) => node.appearance.autoContrast),
  highlightBase: inherit(tiers, (node) => node.appearance.highlightBase),
  /*
   * Empty by construction: "put this back to how X shows it" is said to the tiers above,
   * and merging is where that is said — what comes out is the values themselves, with
   * nothing left below to cancel.
   */
  cleared: [],
});

/** Where a column sits. Any part can be unknown, and that tier is then left out of the merge */
export type ColumnScope = {
  /** The screen name of the account it belongs to. null when it cannot be read from the column header */
  account: string | null;
  /**
   * Which site it is being read on. The applying side always knows: both things that build a
   * scope from the page are a single site's (`surface/x.ts`, `columns/registry.ts`). null is
   * for the settings screen, which asks about scopes pinned to no site — what a whole account
   * holds reaches both, and answering as one would answer a question nobody asked.
   */
  surface: SurfaceId | null;
  /** The column's identifier. null for posts outside any column */
  columnId: string | null;
};

/**
 * Lists the tiers that apply, top down. A tier with no settings is not added, so a post with
 * neither account nor column determined runs on the global settings alone. The site sits
 * below the account: what a site says wins, so a colour following an account everywhere can
 * be taken back on one of the two sites.
 */
export const tiersFor = (settings: Settings, scope: ColumnScope): SettingsNode[] => {
  const tiers = [settings.global];
  const account = scope.account !== null ? settings.accounts[scope.account] : undefined;
  if (account) tiers.push(account);
  if (scope.surface !== null) tiers.push(settings.surfaces[scope.surface]);
  const onSite = surfaceAccountOf(settings, scope.account, scope.surface);
  if (onSite) tiers.push(onSite);
  const column = scope.columnId !== null ? settings.columns[scope.columnId] : undefined;
  if (column) tiers.push(column);
  return tiers;
};

/**
 * That account's settings for that one site, if both are known and anything was written.
 * Written once so `tiersFor`, `tiersInward`, and the settings screen's tier display cannot disagree.
 */
const surfaceAccountOf = (
  settings: Settings,
  account: string | null,
  surface: SurfaceId | null
): SettingsNode | undefined =>
  account !== null && surface !== null ? settings.surfaceAccounts[surface][account] : undefined;

/**
 * The effective value of whether filtering applies in that scope, looking up to the top
 * tier. Used by the settings screen's markers; lighter than `resolve` since it skips merging rules.
 */
export const enabledAt = (settings: Settings, scope: ColumnScope): boolean | null =>
  inherit(tiersFor(settings, scope), (node) => node.filter.enabled);

export const resolve = (settings: Settings, scope: ColumnScope): SettingsNode => {
  const tiers = tiersFor(settings, scope);
  return { filter: mergeFilter(tiers), appearance: mergeAppearance(tiers) };
};

/**
 * The appearance actually applied to that column; switched off, it is replaced by "nothing
 * set at all" — emitting no CSS is not enough, since the applying side's markers and
 * inserted button also work from the appearance's contents.
 */
export const appearanceFor = (settings: Settings, scope: ColumnScope): AppearanceNode => {
  const appearance = mergeAppearance(tiersFor(settings, scope));
  return appearanceApplies(appearance.enabled) ? appearance : emptyNode().appearance;
};

/** A settings tier, used to say where a merged value came from. Distinct from `EditScope`, which is about what is being edited */
export type Tier = 'global' | 'account' | 'surface' | 'surfaceAccount' | 'column';

/**
 * The tiers a scope covers, innermost first — the order to look in for whichever answers.
 * The reverse of `tiersFor`, which lists them outermost-first for merging. One list rather
 * than two walks, so `sourceOf` and `ruleSourceOf` cannot disagree on which tier wins.
 */
const tiersInward = (settings: Settings, scope: ColumnScope): [Tier, SettingsNode | undefined][] => [
  ['column', scope.columnId !== null ? settings.columns[scope.columnId] : undefined],
  ['surfaceAccount', surfaceAccountOf(settings, scope.account, scope.surface)],
  ['surface', scope.surface !== null ? settings.surfaces[scope.surface] : undefined],
  ['account', scope.account !== null ? settings.accounts[scope.account] : undefined],
  ['global', settings.global],
];

/**
 * Which tier that item's value came from. `item` names the appearance item as `inherit`
 * does, for the same reason: a tier clearing the item is where the answer comes from, even
 * though the answer is "nothing applies". Without it the screen would trace a cancelled
 * item to the tier it was cancelled from, reading "not set / Global".
 */
export const sourceOf = <T>(
  settings: Settings,
  scope: ColumnScope,
  pick: (node: SettingsNode) => T | null,
  item?: ClearableItem
): Tier | null =>
  tiersInward(settings, scope).find(
    ([, node]) =>
      node && (pick(node) !== null || (item !== undefined && node.appearance.cleared.includes(item)))
  )?.[0] ?? null;

/** Which tier that rule belongs to. An id appearing in the merged order always exists in one of the tiers */
export const ruleSourceOf = (settings: Settings, scope: ColumnScope, id: string): Tier | null =>
  tiersInward(settings, scope).find(([, node]) =>
    node?.filter.rules.some((rule) => rule.id === id)
  )?.[0] ?? null;

/** The scope being edited on the settings screen. A different thing from `ColumnScope`, used only to decide what sits above that scope */
export type EditScope =
  | { tier: 'global' }
  | { tier: 'accounts' }
  /**
   * One whole site. Above it sits the account, which a site belongs to none of, so "what
   * applies if this stays empty" is the global tier alone — same as a column whose account
   * cannot be read.
   */
  | { tier: 'surface' }
  /**
   * One account on one site. Unlike a site's own page, everything above it is determined —
   * global, that account, that site — so what is shown dimmed is the whole truth here.
   */
  | { tier: 'surfaceAccount'; account: string; surface: SurfaceId }
  /**
   * The account a column belongs to is known only from detection — null with pro.x.com not
   * open, leaving the global values alone. Which site it belongs to is always known,
   * written into the column's own key.
   */
  | { tier: 'columns'; account: string | null; surface: SurfaceId };

export type Inherited = {
  enabled: boolean | null;
  appearance: AppearanceNode;
  /**
   * The same merge, with every account folded in where the scope belongs to none of them.
   *
   * **Only ever asked whether an item is null.** The value itself belongs to no one account
   * and must never be shown: on a site's page it would be whichever account came last. What
   * it can answer is the weaker "as X shows it" question — is there anything above worth
   * cancelling — for which the accounts do count. Elsewhere it is the same node as `appearance`.
   */
  settable: AppearanceNode;
};

/**
 * Merges only the tiers above that scope, to show unset fields "what applies if this stays
 * empty". Rules accumulate rather than inherit by overriding, so they're not handled here.
 * A site's page is the one scope whose tiers above cannot all be shown: the account sits
 * there and a site belongs to none of them, so the dimmed value stops at global, and
 * `settable` carries the accounts for the one question answerable without naming an account.
 */
export const inheritedFor = (settings: Settings, scope: EditScope): Inherited => {
  // Nothing sits above global. Left empty, X Pro's own display simply stays
  if (scope.tier === 'global') {
    const nothing = mergeAppearance([]);
    return { enabled: null, appearance: nothing, settable: nothing };
  }

  const tiers = [settings.global];
  if (scope.tier === 'surfaceAccount') {
    const account = settings.accounts[scope.account];
    if (account) tiers.push(account);
    tiers.push(settings.surfaces[scope.surface]);
  }
  if (scope.tier === 'columns') {
    if (scope.account !== null) {
      const account = settings.accounts[scope.account];
      if (account) tiers.push(account);
    }
    tiers.push(settings.surfaces[scope.surface]);
    // Listed again rather than taken from `tiersFor`, which works from a column's own
    // scope — a tier added there must be added here too
    const onSite = surfaceAccountOf(settings, scope.account, scope.surface);
    if (onSite) tiers.push(onSite);
  }
  return {
    enabled: inherit(tiers, (node) => node.filter.enabled),
    appearance: mergeAppearance(tiers),
    settable: mergeAppearance(
      scope.tier === 'surface' ? [...tiers, ...Object.values(settings.accounts)] : tiers
    ),
  };
};
