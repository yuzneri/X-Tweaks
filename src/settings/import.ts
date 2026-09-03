/**
 * Importing the settings. Everything about whether it can be read is checked before
 * storage is touched.
 * Handed unreadable JSON, the existing settings do not change at all.
 */
import { EXPORT_APP } from './export.ts';
import {
  fillAll,
  isRecord,
  newRuleId,
  SCHEMA_VERSION,
  type Settings,
  type SettingsNode,
} from './schema.ts';

/** Why it could not be read. The wording is chosen from the dictionaries by the caller (the screen) */
export type ImportError =
  /** Not readable as JSON. `detail` is what `JSON.parse` said */
  | { kind: 'badJson'; detail: string }
  /** Not something this extension exported */
  | { kind: 'notOurs' }
  /** A different storage format version. No conversion is attempted */
  | { kind: 'badVersion'; version: unknown };

export type ImportResult = { ok: true; settings: Settings } | { ok: false; error: ImportError };

/**
 * Gives that tier's rules new ids, updating the references in the order at the same time.
 *
 * Rules sharing an id across tiers make one of them drop out of the merged order and
 * stop applying. That never happens when restoring one's own export, but it can once
 * someone else's settings are read or parts are cut and pasted together.
 */
const reidentify = (node: SettingsNode): SettingsNode => {
  const renamed = new Map(node.filter.rules.map((rule) => [rule.id, newRuleId()]));
  return {
    ...node,
    filter: {
      ...node.filter,
      rules: node.filter.rules.map((rule) => ({ ...rule, id: renamed.get(rule.id)! })),
      // Normalization has already run, so the order points at each existing rule exactly once
      order: node.filter.order.map((id) => renamed.get(id)!),
    },
  };
};

/** The same, for a whole map of tiers. Three of the places settings live are maps */
const reidentifyMap = (nodes: Record<string, SettingsNode>): Record<string, SettingsNode> =>
  Object.fromEntries(Object.entries(nodes).map(([key, node]) => [key, reidentify(node)]));

const reidentifyAll = (settings: Settings): Settings => ({
  ...settings,
  global: reidentify(settings.global),
  accounts: reidentifyMap(settings.accounts),
  surfaces: {
    pro: reidentify(settings.surfaces.pro),
    x: reidentify(settings.surfaces.x),
  },
  surfaceAccounts: {
    pro: reidentifyMap(settings.surfaceAccounts.pro),
    x: reidentifyMap(settings.surfaceAccounts.x),
  },
  columns: reidentifyMap(settings.columns),
});

/**
 * Builds settings from an exported string.
 *
 * A different version is not converted. Keeping normalization to a single shape carries
 * less risk of reading broken settings than writing conversions would.
 */
export const parseImport = (text: string): ImportResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: { kind: 'badJson', detail: (error as Error).message } };
  }

  if (!isRecord(parsed) || parsed.app !== EXPORT_APP) {
    return { ok: false, error: { kind: 'notOurs' } };
  }

  const settings = parsed.settings;
  const version = isRecord(settings) ? settings.version : undefined;
  if (version !== SCHEMA_VERSION) {
    return { ok: false, error: { kind: 'badVersion', version } };
  }

  // Missing keys and wrong types fall back to defaults here (the same route as reading stored values)
  return { ok: true, settings: reidentifyAll(fillAll(settings)) };
};
