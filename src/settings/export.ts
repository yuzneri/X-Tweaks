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
   * The stored shape, less what says nothing (`whatIsSet`). The import needs to look at
   * this alone, and fills back in whatever was left out.
   */
  settings: Settings;
  /**
   * The names of the columns that have settings, under the decks they belong to.
   *
   * The keys of `settings.columns` are `columnId`s, which alone tell a human nothing
   * about which column is which. Empty when pro.x.com is not open. Not used by the
   * import (it is attached for reference only).
   *
   * Only what a key in `settings.columns` needs to be read: a column nothing is set for
   * has no key to explain, and a deck whose columns are all like that has nothing left to
   * name. Attaching them anyway would bury the few lines that do explain something under
   * every column that was ever on screen.
   *
   * The type is what the export is built from rather than what the file holds: with no
   * column to explain, `whatIsSet` leaves the item out of the file altogether.
   */
  detectedDecks: DetectedGroup[];
};

/**
 * Drops the scopes with no settings, and the groups left with nothing.
 *
 * A scope is kept by the key actually holding something, rather than by the key merely
 * being there: a tier emptied out on the settings screen loses its key (`put` in
 * SettingsApp.tsx), but one arriving from an imported file or an older version can sit
 * there empty, and naming it would explain a setting that is not in the file.
 *
 * `whatIsSet` leaves out exactly the same tiers — one that sets nothing is left with
 * nothing — so the names attached here and the keys the file carries cannot disagree.
 */
const explaining = (decks: DetectedGroup[], settings: Settings): DetectedGroup[] =>
  decks.flatMap((deck) => {
    const scopes = deck.scopes.filter((scope) => !isEmptyNode(settings.columns[scope.key]));
    return scopes.length === 0 ? [] : [{ ...deck, scopes }];
  });

/**
 * Leaves out what says nothing: a `null`, an empty list, and an object left with nothing
 * once its own were left out. `undefined` is the answer for "there is nothing here".
 *
 * The file is meant to be read by a person, and an unset item is most of the shape: every
 * colour, every size, every tier nobody has touched. Written out, the few lines that say
 * something are lost among a hundred that say "not set".
 *
 * It is lossless because the reading side makes no distinction between the two: every
 * `fill…` in schema.ts puts a missing key back as exactly the `null`, empty list or empty
 * object left out here. That is the one thing this depends on — an item read some other
 * way would come back as something else than it went out as.
 *
 * Only those three go. A value is never dropped for being what an item defaults to:
 * `false` and `true` are both answers somewhere, and which of them a missing key means
 * differs from item to item (the rail's blocks are there unless told otherwise, the wide
 * timeline is not). Deciding that per item would be `fillAll` written backwards, and it
 * would fail quietly — as a setting that comes back on.
 */
const whatIsSet = (value: unknown): unknown => {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    /*
     * An element stays, whatever is left of it. These lists are read in the order they are
     * written (the rules, and the order they are judged in), so taking one out would move
     * every one behind it.
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
 * The body of the exported JSON.
 *
 * The timestamp is passed in by the caller. Creating a `new Date()` inside the function
 * would make it impossible to check the exported content against a fixed value.
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
  // It is meant to be read and checked by a person, so it is indented rather than packed
  return JSON.stringify(whatIsSet(exported), null, 2);
};

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * The file name used when saving.
 *
 * The date is the device's own. It is there for the person who exported it to find it
 * again later, and being a day off from the clock in front of them makes that harder
 * (the `exportedAt` inside is held in UTC).
 */
export const exportFileName = (at: Date): string =>
  `x-pro-tweaks-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}.json`;
