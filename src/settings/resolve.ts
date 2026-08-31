/**
 * Merges the settings of the three tiers (global, account, column) into the settings
 * effective for one column.
 *   - Rules accumulate. Across tiers, the lower tier comes first in the order
 *   - Whether filtering applies, and the appearance, are inherited by overriding: the
 *     lower tier wins, and what it leaves unset is inherited from above
 */
import {
  appearanceApplies,
  emptyNode,
  type AppearanceNode,
  type FilterNode,
  type Settings,
  type SettingsNode,
} from './schema.ts';

/** Takes the first setting found, looking upward from the lowest tier. null when no tier sets it */
const inherit = <T>(tiers: SettingsNode[], pick: (node: SettingsNode) => T | null): T | null => {
  for (let i = tiers.length - 1; i >= 0; i--) {
    const value = pick(tiers[i]!);
    if (value !== null) return value;
  }
  return null;
};

/**
 * The order across the tiers, strung together starting from the lowest. Judging takes
 * the first rule that matches, so the order they are strung in is the tiers' priority,
 * matching the direction of the appearance's overriding inheritance.
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

/**
 * Rules accumulate. Each carries its own action, so stringing three tiers together
 * causes no conflict.
 * To cancel an upper tier's settings, put a "do nothing" rule in a lower tier.
 */
const mergeFilter = (tiers: SettingsNode[]): FilterNode => ({
  enabled: inherit(tiers, (node) => node.filter.enabled),
  rules: tiers.flatMap((node) => node.filter.rules),
  order: mergeOrder(tiers),
});

const mergeAppearance = (tiers: SettingsNode[]): AppearanceNode => ({
  enabled: inherit(tiers, (node) => node.appearance.enabled),
  columnWidth: inherit(tiers, (node) => node.appearance.columnWidth),
  compact: inherit(tiers, (node) => node.appearance.compact),
  fontSize: inherit(tiers, (node) => node.appearance.fontSize),
  maxLines: inherit(tiers, (node) => node.appearance.maxLines),
  collapseNewlines: inherit(tiers, (node) => node.appearance.collapseNewlines),
  colors: {
    background: inherit(tiers, (node) => node.appearance.colors.background),
    text: inherit(tiers, (node) => node.appearance.colors.text),
    name: inherit(tiers, (node) => node.appearance.colors.name),
    meta: inherit(tiers, (node) => node.appearance.colors.meta),
    link: inherit(tiers, (node) => node.appearance.colors.link),
    border: inherit(tiers, (node) => node.appearance.colors.border),
    columnTitle: inherit(tiers, (node) => node.appearance.colors.columnTitle),
    columnHeader: inherit(tiers, (node) => node.appearance.colors.columnHeader),
  },
  media: {
    maxThumbHeight: inherit(tiers, (node) => node.appearance.media.maxThumbHeight),
    collapse: inherit(tiers, (node) => node.appearance.media.collapse),
  },
  timeFormat: inherit(tiers, (node) => node.appearance.timeFormat),
  autoContrast: inherit(tiers, (node) => node.appearance.autoContrast),
  highlightBase: inherit(tiers, (node) => node.appearance.highlightBase),
});

/** Where a column sits. Either part can be unknown, and that tier is then left out of the merge */
export type ColumnScope = {
  /** The screen name of the account it belongs to. null when it cannot be read from the column header */
  account: string | null;
  /** The column's identifier. null for posts outside any column */
  columnId: string | null;
};

/**
 * Lists the tiers that apply, from the top down. A tier with no settings is not added,
 * so a post with neither an account nor a column determined runs on the global settings alone.
 */
export const tiersFor = (settings: Settings, scope: ColumnScope): SettingsNode[] => {
  const tiers = [settings.global];
  const account = scope.account !== null ? settings.accounts[scope.account] : undefined;
  if (account) tiers.push(account);
  const column = scope.columnId !== null ? settings.columns[scope.columnId] : undefined;
  if (column) tiers.push(column);
  return tiers;
};

/**
 * The effective value, looking up to the top tier, of whether filtering applies in that
 * scope. Used by the settings screen's markers. It does not go as far as merging the
 * rules, making it lighter than `resolve`.
 */
export const enabledAt = (settings: Settings, scope: ColumnScope): boolean | null =>
  inherit(tiersFor(settings, scope), (node) => node.filter.enabled);

export const resolve = (settings: Settings, scope: ColumnScope): SettingsNode => {
  const tiers = tiersFor(settings, scope);
  return { filter: mergeFilter(tiers), appearance: mergeAppearance(tiers) };
};

/**
 * The appearance actually applied to that column. Where it is switched off, it is
 * replaced by "nothing set at all".
 * Emitting no CSS is not enough: the applying side also handles the markers and the
 * inserted button, and those work from the appearance's contents.
 */
export const appearanceFor = (settings: Settings, scope: ColumnScope): AppearanceNode => {
  const appearance = mergeAppearance(tiersFor(settings, scope));
  return appearanceApplies(appearance.enabled) ? appearance : emptyNode().appearance;
};

/**
 * A settings tier, used to say where a merged value came from.
 * Distinct from `EditScope`, which is about what is being edited.
 */
export type Tier = 'global' | 'account' | 'column';

/**
 * Which tier that item's value came from. It takes a function that picks the item
 * because weaving the origin into the types would mean wrapping each of the
 * appearance's thirteen items.
 */
export const sourceOf = <T>(
  settings: Settings,
  scope: ColumnScope,
  pick: (node: SettingsNode) => T | null
): Tier | null => {
  const column = scope.columnId !== null ? settings.columns[scope.columnId] : undefined;
  if (column && pick(column) !== null) return 'column';
  const account = scope.account !== null ? settings.accounts[scope.account] : undefined;
  if (account && pick(account) !== null) return 'account';
  return pick(settings.global) !== null ? 'global' : null;
};

/**
 * Which tier that rule belongs to.
 * An id appearing in the merged order always exists in one of the tiers.
 */
export const ruleSourceOf = (settings: Settings, scope: ColumnScope, id: string): Tier | null => {
  const has = (node: SettingsNode | undefined) => !!node?.filter.rules.some((r) => r.id === id);
  const column = scope.columnId !== null ? settings.columns[scope.columnId] : undefined;
  if (has(column)) return 'column';
  const account = scope.account !== null ? settings.accounts[scope.account] : undefined;
  if (has(account)) return 'account';
  return has(settings.global) ? 'global' : null;
};

/**
 * The scope being edited on the settings screen.
 * A different thing from `ColumnScope`, used only to decide what sits above that scope.
 */
export type EditScope =
  | { tier: 'global' }
  | { tier: 'accounts' }
  /**
   * The account a column belongs to is known only from what was detected.
   * With pro.x.com not open it is null, and the effective values are then the global
   * ones alone.
   */
  | { tier: 'columns'; account: string | null };

export type Inherited = {
  enabled: boolean | null;
  appearance: AppearanceNode;
};

/**
 * Merges only the tiers above that scope, to show unset fields "what applies if this
 * stays empty".
 * Rules accumulate rather than being inherited by overriding, so they are not handled here.
 */
export const inheritedFor = (settings: Settings, scope: EditScope): Inherited => {
  // Nothing sits above global. Left empty, X Pro's own display simply stays
  if (scope.tier === 'global') return { enabled: null, appearance: mergeAppearance([]) };

  const tiers = [settings.global];
  if (scope.tier === 'columns' && scope.account !== null) {
    const account = settings.accounts[scope.account];
    if (account) tiers.push(account);
  }
  return { enabled: inherit(tiers, (node) => node.filter.enabled), appearance: mergeAppearance(tiers) };
};
