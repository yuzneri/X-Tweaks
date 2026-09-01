/**
 * Exporting the settings. The account tier is listed only while pro.x.com is open and
 * columns have been detected, so the screen alone never shows the whole picture.
 */
import type { Settings } from './schema.ts';
import type { DetectedGroup } from './detected.ts';

/** The mark identifying a file as one of ours. The import checks it too */
export const EXPORT_APP = 'x-pro-tweaks';

export type ExportedSettings = {
  app: typeof EXPORT_APP;
  /** When it was exported (UTC). A machine-read value, so it is not shifted to local time */
  exportedAt: string;
  /** Exactly the stored shape. The import needs to look at this alone */
  settings: Settings;
  /**
   * The decks and columns known at the time of export.
   *
   * The keys of `settings.columns` are `columnId`s, which alone tell a human nothing
   * about which column is which. Empty when pro.x.com is not open. Not used by the
   * import (it is attached for reference only).
   */
  detectedDecks: DetectedGroup[];
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
    detectedDecks,
  };
  // It is meant to be read and checked by a person, so it is indented rather than packed
  return JSON.stringify(exported, null, 2);
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
