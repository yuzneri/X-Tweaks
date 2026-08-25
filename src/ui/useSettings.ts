/**
 * Gathers loading, saving and subscribing for the settings. The settings screen touches
 * them only through this hook, so the forms need only receive a value and return a change.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { emptySettings, type Settings } from '../settings/schema.ts';
import { load, save, subscribe } from '../settings/storage.ts';

/**
 * The notice shown briefly in a corner of the screen. It carries no wording.
 * This hook is called above the Provider that hands the dictionary down, so it returns only
 * what happened and leaves the wording to the inside of the Provider.
 *
 * Success is a single kind. Saving oneself and receiving a save from another screen both
 * leave the user in the same state: what is on screen is what is stored.
 * Only failure is separate: the screen and what is stored disagree, and the same notice as success would hide that.
 */
export type StatusKind = 'saved' | 'saveFailed';

type Status = { kind: StatusKind | null; id: number };

export type SettingsStore = {
  settings: Settings;
  /**
   * When the stored format version differed and could not be read: that version, and whether it is newer.
   * null when it could be read. The explanatory sentence is assembled by the side that shows it
   */
  unreadable: { version: number; newer: boolean } | null;
  status: StatusKind | null;
  update: (next: Settings) => void;
  /**
   * Reports a failure to save something other than the settings themselves (the record of detected columns).
   * The place saved to differs, but to the user it is the same "could not save", so there is one place to report it
   */
  reportSaveFailed: () => void;
  /** Whether the stored settings have been read. Distinguishes "before reading" from "nothing set" */
  loaded: boolean;
};

export const useSettings = (): SettingsStore => {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [unreadable, setUnreadable] = useState<SettingsStore['unreadable']>(null);
  const [loaded, setLoaded] = useState(false);
  // A running number, so the display time restarts even when the same notice is raised twice in a row
  const [status, setStatus] = useState<Status>({ kind: null, id: 0 });
  // Replacing the state on a notification from one's own save would throw away focus and text mid-composition
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
      // A save received from another screen also says "Saved". A notification from one's own save
      // coming around is the same notice, so a race in lowering `savingByMe` cannot garble the display
      setStatus((prev) => ({ kind: 'saved', id: prev.id + 1 }));
    });
  }, []);

  useEffect(() => {
    if (!status.kind) return;
    // Only a failure is not cleared. The disagreement stands, and clearing it would hide that.
    // It is overwritten by `saved` on the next successful save
    if (status.kind === 'saveFailed') return;
    const timer = setTimeout(() => setStatus((prev) => ({ kind: null, id: prev.id })), 2000);
    return () => clearTimeout(timer);
  }, [status.id]);

  const announce = (kind: StatusKind) => setStatus((prev) => ({ kind, id: prev.id + 1 }));

  const update = (next: Settings) => {
    // Redrawn without waiting for the save to finish. Waiting makes typing feel sluggish
    setSettings(next);
    // Once it has been saved over, settings that could not be read are gone.
    // Without clearing it, the "started from the defaults" notice would stay up after the replacement
    setUnreadable(null);
    savingByMe.current = true;
    save(next)
      .then(() => announce('saved'))
      // The values on screen are not rolled back on failure, so focus and text mid-composition are not thrown away
      .catch(() => announce('saveFailed'))
      // The flag is always lowered. Left raised, changes from other screens would stop arriving.
      // `storage.onChanged` arrives asynchronously right after a save, so it is lowered once the notification has come
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
