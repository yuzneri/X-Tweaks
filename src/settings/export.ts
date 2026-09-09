/**
 * Exporting the settings. The account tier is listed only while pro.x.com is open and
 * columns have been detected, so the screen alone never shows the whole picture.
 */
import { isEmptyNode, isRecord, type Settings } from './schema.ts';
import type { DetectedGroup } from './detected.ts';

/** The mark identifying a file as one of ours. The import checks it too */
export const EXPORT_APP = 'x-pro-tweaks';

export type ExportedSettings = {
  app: typeof EXPORT_APP;
  /** When it was exported (UTC). A machine-read value, so it is not shifted to local time */
  exportedAt: string;
  /**
   * The stored shape, minus what says nothing (`whatIsSet`). The import looks at this
   * alone and fills back in whatever was left out.
   */
  settings: Settings;
  /**
   * The names of the columns that have settings, under the decks they belong to.
   *
   * The keys of `settings.columns` are `columnId`s, which alone tell a human nothing about
   * which column is which. Empty when pro.x.com is not open; not used by the import
   * (attached for reference only). Only includes keys that need explaining: a column with
   * nothing set has no key to explain, and attaching the rest would bury the few that do
   * under every column ever on screen. The type is what the export is built from, not what
   * the file holds — with no column to explain, `whatIsSet` drops the item from the file.
   */
  detectedDecks: DetectedGroup[];
};

/**
 * Drops the scopes with no settings, and the groups left with nothing.
 *
 * A scope is kept by the key actually holding something, not merely being present: a tier
 * emptied on the settings screen loses its key (`put` in SettingsApp.tsx), but one from an
 * imported file or older version can sit there empty, and naming it would explain a
 * setting absent from the file. `whatIsSet` drops exactly the same tiers — one that sets
 * nothing is left with nothing — so the names here and the file's keys cannot disagree.
 */
const explaining = (decks: DetectedGroup[], settings: Settings): DetectedGroup[] =>
  decks.flatMap((deck) => {
    const scopes = deck.scopes.filter((scope) => !isEmptyNode(settings.columns[scope.key]));
    return scopes.length === 0 ? [] : [{ ...deck, scopes }];
  });

/**
 * Leaves out what says nothing: a `null`, an empty list, and an object left with nothing
 * once its contents are left out. `undefined` answers "there is nothing here".
 *
 * The file is meant for a person to read, and an unset item is most of the shape — every
 * colour, size, and untouched tier — so the few lines that say something get lost among a
 * hundred saying "not set". It is lossless because the reading side treats the two the
 * same: every `fill…` in schema.ts puts a missing key back as exactly the `null`, empty
 * list or empty object left out here — the one thing this depends on, since reading it any
 * other way would return something different from what went out.
 *
 * Only those three go. A value is never dropped for matching an item's default: `false`
 * and `true` are both defaults somewhere, and which one a missing key means differs per
 * item (the rail's blocks default on, `wideTimeline` defaults off). Deciding that per item
 * would be `fillAll` written backwards, and would fail quietly — as a setting silently
 * switching back on.
 */
const whatIsSet = (value: unknown): unknown => {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    /*
     * An element stays whatever remains of it: these lists are read in written order (the
     * rules, judged in that order), so removing one would shift every one behind it.
     */
    return value.map((item) => {
      const kept = whatIsSet(item);
      return kept === undefined ? null : kept;
    });
  }
  if (!isRecord(value)) return value;

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => [key, whatIsSet(item)] as const)
    .filter((entry) => entry[1] !== undefined);
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
};

/**
 * The body of the exported JSON. The timestamp comes from the caller — a `new Date()`
 * inside would make the exported content impossible to check against a fixed value.
 */
export const buildExport = (
  settings: Settings,
  detectedDecks: DetectedGroup[],
  at: Date
): string => {
  const exported: ExportedSettings = {
    app: EXPORT_APP,
    exportedAt: at.toISOString(),
    settings,
    detectedDecks: explaining(detectedDecks, settings),
  };
  // Meant to be read and checked by a person, so indented rather than packed
  return JSON.stringify(whatIsSet(exported), null, 2);
};

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * The file name used when saving. The date is the device's own, there so the person who
 * exported it can find it again later; a day's offset from their clock would make that
 * harder (`exportedAt` inside is held in UTC).
 */
export const exportFileName = (at: Date): string =>
  `x-pro-tweaks-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}.json`;
