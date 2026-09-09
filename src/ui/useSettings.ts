/**
 * Gathers loading, saving and subscribing for the settings. The screen touches them only
 * through this hook, so forms need only receive a value and return a change.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { emptySettings, type Settings } from '../settings/schema.ts';
import { load, save, subscribe } from '../settings/storage.ts';

/**
 * The notice shown briefly in a corner of the screen. Carries no wording: this hook is
 * called above the Provider that hands the dictionary down, so it returns only what happened.
 *
 * Success is a single kind — saving oneself and receiving a save from another screen both
 * leave what is on screen matching what is stored. Only failure is separate: the two
 * disagree, and the same notice as success would hide that.
 */
export type StatusKind = 'saved' | 'saveFailed';

type Status = { kind: StatusKind | null; id: number };

export type SettingsStore = {
  settings: Settings;
  /**
   * When the stored format version differed and could not be read: that version, and whether
   * it is newer; `null` when readable. The explanatory sentence is assembled by the side
   * that shows it.
   */
  unreadable: { version: number; newer: boolean } | null;
  status: StatusKind | null;
  update: (next: Settings) => void;
  /**
   * Reports a failure to save something other than the settings themselves (the record of
   * detected columns). The place saved to differs, but to the user it is the same "could
   * not save", so it is reported here.
   */
  reportSaveFailed: () => void;
  /** Whether stored settings are read yet; distinguishes "before reading" from "nothing set" */
  loaded: boolean;
};

export const useSettings = (): SettingsStore => {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [unreadable, setUnreadable] = useState<SettingsStore['unreadable']>(null);
  const [loaded, setLoaded] = useState(false);
  // A running number, so the display time restarts even for a repeated notice
  const [status, setStatus] = useState<Status>({ kind: null, id: 0 });
  // Replacing state on a notification from one's own save would lose focus and mid-typing text
  const savingByMe = useRef(false);

  useEffect(() => {
    load().then((loaded) => {
      setSettings(loaded.settings);
      setUnreadable(loaded.unreadable);
      setLoaded(true);
    });
    return subscribe((next) => {
      if (savingByMe.current) return;
      setSettings(next);
      // A save from another screen also says "Saved", the same notice as one's own coming
      // around, so a race in lowering `savingByMe` cannot garble the display
      setStatus((prev) => ({ kind: 'saved', id: prev.id + 1 }));
    });
  }, []);

  useEffect(() => {
    if (!status.kind) return;
    // Only a failure is not cleared: the disagreement stands, clearing it would hide that.
    // `saved` overwrites it on the next successful save
    if (status.kind === 'saveFailed') return;
    const timer = setTimeout(() => setStatus((prev) => ({ kind: null, id: prev.id })), 2000);
    return () => clearTimeout(timer);
  }, [status.id]);

  const announce = (kind: StatusKind) => setStatus((prev) => ({ kind, id: prev.id + 1 }));

  const update = (next: Settings) => {
    // Redrawn without waiting for the save to finish; waiting makes typing feel sluggish
    setSettings(next);
    // Once saved over, unreadable settings are gone; without clearing it, the "started from
    // the defaults" notice would stay up after the replacement
    setUnreadable(null);
    savingByMe.current = true;
    save(next)
      .then(() => announce('saved'))
      // Values on screen are not rolled back on failure, keeping focus and mid-typing text
      .catch(() => announce('saveFailed'))
      // The flag is always lowered; left raised, changes from other screens would stop
      // arriving. `storage.onChanged` fires asynchronously right after a save, so this waits
      .finally(() => setTimeout(() => (savingByMe.current = false), 0));
  };

  return {
    settings,
    unreadable,
    status: status.kind,
    update,
    reportSaveFailed: () => announce('saveFailed'),
    loaded,
  };
};
