/**
 * The script running in the extension's context (the ISOLATED world).
 * Loads the settings, starts the filter, and applies changes to the settings.
 */
import {
  load,
  loadPaused,
  save,
  saveAdGuard,
  saveDetected,
  saveHealth,
  subscribe,
  subscribePaused,
} from './settings/storage.ts';

// Namespace resolution only, the same as in storage.ts
declare const chrome: typeof browser | undefined;
const api: typeof browser = typeof browser !== 'undefined' ? browser : chrome!;
import { install as installSurface } from './surface/index.ts';
import { proSurface } from './surface/pro.ts';
import { emptySettings, type Settings } from './settings/schema.ts';
import { recordable } from './settings/detected.ts';
import { currentMessages, start, updateSettings } from './filter/engine.ts';
import { open as openPanel, toggle as togglePanel } from './panel/panel.tsx';
import { OPEN_PANEL } from './panel/message.ts';
import { insertInto as insertMenuItem, watch as watchMenuItem, watchTrigger } from './panel/menu.ts';
import {
  insertInto as insertColumnItem,
  rememberTrigger,
  watch as watchColumnItem,
} from './panel/column-options.ts';
import {
  noticeComposeForm,
  rememberTrigger as rememberComposeTrigger,
  restorePending as restoreKeptHashtags,
  start as startCompose,
  updateSettings as updateCompose,
} from './compose/keep.ts';
import {
  insertInto as insertComposeSwitches,
  remove as removeComposeSwitches,
  start as startComposeSwitches,
  updateSettings as updateComposeSwitches,
} from './compose/switches.ts';
import { injectStyles as injectComposeStyles } from './compose/styles.ts';

const PREFIX_STYLE = 'color:#1d9bf0;font-weight:bold';
const log = (...args: unknown[]) => console.log('%c[X Pro Tweaks]', PREFIX_STYLE, ...args);
// Format specifiers are only interpreted in the leading argument, so a colored body
// is assembled by a dedicated function
const logStyled = (message: string, style: string) =>
  console.log(`%c[X Pro Tweaks]%c ${message}`, PREFIX_STYLE, style);

/**
 * The settings applied while paused. Applying empty settings stops the filter and the
 * appearance at once without adding a branch on either the judging or the appearance
 * side, and posts already affected are restored by the re-application.
 * Only `language` is kept, so that resuming does not drop the language to "automatic"
 * for a moment.
 */
const effectiveSettings = (settings: Settings, paused: boolean): Settings =>
  paused ? { ...emptySettings(), language: settings.language } : settings;

/**
 * Logs are written in English regardless of the user's language setting.
 * They are diagnostic output for narrowing down problems, and the wording is better
 * left steady when reports are compared against each other.
 */
const summarize = (settings: Settings) => ({
  rules: settings.global.filter.rules.length,
  filterEnabled: settings.global.filter.enabled,
  accountSettings: Object.keys(settings.accounts).length,
  columnSettings: Object.keys(settings.columns).length,
});

/**
 * Logs that something could not be saved. This script has no screen of its own.
 * The same save is reported only once: the record of detected columns is rewritten on
 * every settling of the DOM, so a persistent failure would bury the log.
 */
const warned = new Set<string>();
const warnSaveFailed =
  (what: string) =>
  (): void => {
    if (warned.has(what)) return;
    warned.add(what);
    logStyled(
      `⚠ Could not save ${what}; the settings page may show stale information`,
      'color:#f59e0b'
    );
  };

const main = async (): Promise<void> => {
  /*
   * Which site this is, decided once and never again. Everything that resolves a scope or
   * paints goes through it, so it is installed before anything else runs.
   * Only X Pro exists for now; picking between surfaces comes with x.com.
   */
  installSurface(proSurface);

  const [{ settings, unreadable }, startPaused] = await Promise.all([load(), loadPaused()]);
  // Even if they were switched off during the previous load, start from a clean slate and try again
  saveAdGuard(false).catch(warnSaveFailed('that ad rules are on again'));
  saveHealth([]).catch(warnSaveFailed('that the markers are fine again'));
  // The settings and the pause arrive separately, so the current values are kept and recombined
  let current = settings;
  let paused = startPaused;
  if (unreadable !== null) {
    logStyled(
      `⚠ The saved settings use format version ${unreadable.version}, which this extension ` +
        `cannot read. Running with defaults; nothing was overwritten`,
      'color:#f59e0b'
    );
  }

  // Instructions from the popup on the toolbar icon
  api.runtime.onMessage.addListener((message: unknown) => {
    if ((message as { type?: unknown } | null)?.type === OPEN_PANEL) openPanel();
  });

  // One listener, handed to everyone who needs to know what was pressed
  watchTrigger((target) => {
    rememberTrigger(target);
    rememberComposeTrigger(target);
  });
  // Clicks on the inserted items are received on document, so they arrive even if X stops them further in
  watchMenuItem(togglePanel);
  watchColumnItem(openPanel);

  /*
   * The compose form is watched from the start, whether or not anything is switched on.
   * What it does is decided when a post goes out, so a change to the settings takes
   * effect on the next post with nothing to restart.
   */
  startCompose(effectiveSettings(current, paused).compose, { log });

  /*
   * The same two settings, reachable from the compose form itself.
   * A change made there is saved from here, and comes back to every surface (this one
   * included) through `subscribe`, so there is one copy of the values and one way in.
   * What is saved is the stored settings, not the paused ones: pausing must not erase
   * what was chosen.
   */
  injectComposeStyles();
  startComposeSwitches(effectiveSettings(current, paused).compose, (compose) => {
    save({ ...current, compose }).catch(warnSaveFailed('the posting settings'));
  });

  /**
   * Applies a change to the settings. Nothing is applied until startup finishes.
   * Applying during `start()` would judge without the column tier, since the columns
   * are not resolved yet, and would be discarded anyway by the re-application at the
   * end of `start()`. All that is remembered is that something could not be applied,
   * so the latest values can be applied once after startup finishes.
   */
  let started = false;
  let missed = false;
  /** The deck whose records were rebuilt on this page. Starts empty per page */
  let rebuiltDeck: string | null = null;
  const reapply = (): boolean => {
    /*
     * The compose form is told first and unconditionally. What holds the rest back is
     * that the columns are not resolved yet, and the compose form does not depend on
     * them, so there is no reason to make it wait.
     */
    updateCompose(effectiveSettings(current, paused).compose);
    updateComposeSwitches(effectiveSettings(current, paused).compose);
    if (!started) {
      missed = true;
      return false;
    }
    updateSettings(effectiveSettings(current, paused));
    return true;
  };

  /*
   * The subscriptions are registered before `start()`. Registered afterwards, changes
   * made during the one or two seconds startup takes would reach nobody
   * (`storage.onChanged` does not deliver changes made while it was not listening).
   */
  subscribe((next) => {
    current = next;
    const applied = reapply();
    log(applied ? 'Applied updated settings' : 'Settings changed while starting', summarize(next));
  });

  subscribePaused((next) => {
    paused = next;
    if (!reapply()) {
      log('Pause toggled while starting');
      return;
    }
    log(paused ? 'Paused; nothing is applied' : 'Resumed', summarize(current));
  });

  await start(effectiveSettings(current, paused), {
    log,
    logStyled,
    // While the rail and the URL disagree, `deckId` is null. Writing without being able
    // to tell which deck the columns belong to would erase the records of the deck
    // being viewed until a moment ago
    onColumns: (found) => {
      if (found.deckId === null) return;
      const columns = recordable(found.columns);
      /*
       * A deck not yet rebuilt on this page gets rebuilt. The memory is per page, so a
       * reload rebuilds just as a switch does.
       * Nothing is remembered while no column is visible: a switch goes
       * "10 columns → 0 → 4", and remembering at the 0 point would lose the chance to
       * rebuild by the time columns appear.
       */
      const rebuild = rebuiltDeck !== found.deckId;
      if (columns.length > 0) rebuiltDeck = found.deckId;
      // Configured columns not found during a rebuild are marked and kept rather than dropped
      const configured = new Set(Object.keys(current.columns));
      saveDetected(found.decks, found.deckId, columns, configured, rebuild).catch(
        warnSaveFailed('the columns found on this page')
      );
    },
    onSettle: () => {
      const messages = currentMessages();
      insertMenuItem(messages);
      insertColumnItem(messages);
      // While paused nothing the extension does applies, so the switches are taken out
      // rather than left showing values that would not take effect
      if (paused) {
        removeComposeSwitches();
        return;
      }
      insertComposeSwitches(messages);
      // The compose form is written down while it is open: once a post goes out it is
      // gone, and nothing about it can be read any more
      noticeComposeForm();
      // Tags kept from the last post go into the form the moment one is opened by hand
      restoreKeptHashtags();
    },
  });
  started = true;
  log('Filter started', summarize(current));
  // Changes that arrived during startup are applied here. However many arrived,
  // applying the latest values once is enough
  if (missed) {
    updateSettings(effectiveSettings(current, paused));
    log('Applied settings that changed while starting', summarize(current));
  }
  if (paused) logStyled('⏸ Paused from the toolbar; nothing is applied', 'color:#f59e0b');
};

main().catch((e) => {
  logStyled('✗ Failed to start the filter', 'color:#ef4444;font-weight:bold');
  log(e instanceof Error ? e.message : e);
});
