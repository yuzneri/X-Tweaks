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
import { surfaceFor } from './surface/select.ts';
import { emptySettings, type Settings } from './settings/schema.ts';
import { startNewPosts, takeNewPosts, updateNewPosts } from './timeline/new-posts.ts';
import { recordable } from './settings/detected.ts';
import { currentMessages, start, updateSettings } from './filter/engine.ts';
import { applyIn } from './filter/pace.ts';
import { clearAltTitles, stampAltTitles, useGenericAlts } from './appearance/apply.ts';
import { clearComposeMarks, markComposeForms } from './appearance/compose-mark.ts';
import { atAQuietMoment } from './quiet.ts';
import { timed } from './diagnostics.ts';
import { open as openPanel, toggle as togglePanel } from './panel/panel.tsx';
import { OPEN_PANEL } from './panel/message.ts';
import { watchTrigger } from './panel/trigger.ts';
import { rememberTrigger } from './panel/column-options.ts';
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
import {
  insertInto as insertSearchForm,
  remove as removeSearchForm,
} from './search/insert.tsx';
import { injectStyles as injectSearchStyles } from './search/styles.ts';
import { watchSearchBox } from './search/mirror.ts';
import { parseQuery } from './search/parse.ts';
import { adoptFromSearchBox } from './search/state.ts';
import {
  apply as applySearchExclusions,
  clear as clearSearchExclusions,
  onSearchResults,
} from './search/hide.ts';
import { excludesAnything, termsOf } from './search/exclude.ts';
import { currentExclusions, currentForm } from './search/state.ts';

const PREFIX_STYLE = 'color:#1d9bf0;font-weight:bold';
const log = (...args: unknown[]) => console.log('%c[X Tweaks]', PREFIX_STYLE, ...args);
// Format specifiers are only interpreted in the leading argument, so a colored body
// is assembled by a dedicated function
const logStyled = (message: string, style: string) =>
  console.log(`%c[X Tweaks]%c ${message}`, PREFIX_STYLE, style);

/**
 * The settings applied while paused. Empty ones stop the filter and the appearance at once
 * without a branch in either, and re-applying them restores what was affected. `language`
 * is kept so resuming does not drop it to "automatic" for a moment.
 */
const effectiveSettings = (settings: Settings, paused: boolean): Settings =>
  paused ? { ...emptySettings(), language: settings.language } : settings;

/**
 * Logs are written in English whatever the language setting: they are for narrowing down
 * problems, and the wording is better left steady across reports.
 */
const summarize = (settings: Settings) => ({
  rules: settings.global.filter.rules.length,
  filterEnabled: settings.global.filter.enabled,
  accountSettings: Object.keys(settings.accounts).length,
  // Counted apart: settings can sit here and nowhere else, and "no account settings" while
  // a colour is being cancelled would send a reader astray
  siteAccountSettings:
    Object.keys(settings.surfaceAccounts.pro).length +
    Object.keys(settings.surfaceAccounts.x).length,
  columnSettings: Object.keys(settings.columns).length,
});

/**
 * Logs that something could not be saved; this script has no screen of its own. Said once
 * per kind: the record of detected columns is rewritten on every settling, so a failure
 * that persists would bury the log.
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
  // Which site this is, decided once. Everything that resolves a scope or paints goes
  // through it, so it is installed first
  const surface = surfaceFor(location.hostname);
  if (surface === null) {
    logStyled(`✗ Not a site this extension knows: ${location.hostname}`, 'color:#ef4444');
    return;
  }
  installSurface(surface);

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
  surface.watchEntryPoints({ toggle: togglePanel, openAt: openPanel });

  // Watched from the start, switched on or not: what it does is decided when a post goes
  // out, so a change to the settings takes effect on the next one with nothing to restart
  startCompose(effectiveSettings(current, paused).compose, { log });
  startNewPosts({ log });
  // The same question the taking side asks (`onSettle` below). Without it X Pro says it
  // is watching for posts it will never go after, this being a setting x.com alone reads
  updateNewPosts(surface.id === 'x' && effectiveSettings(current, paused).xChrome.autoNewPosts);

  // X's words for a picture nobody described, as known so far. Handed over before anything
  // is read, so a page opened with them written down neither learns them again nor writes
  // over what was corrected by hand. `reapply` keeps them current
  useGenericAlts(current.genericAlts);

  /*
   * The same two settings, reachable from the compose form itself. A change made there is
   * saved from here and comes back through `subscribe`, so there is one copy and one way
   * in. What is saved is the stored settings, not the paused ones: pausing must not erase
   * what was chosen.
   */
  injectComposeStyles();
  // x.com alone: X Pro has no rail for the form to stand in
  if (surface.id === 'x') {
    injectSearchStyles();
    // What the reader types into X's own search box goes into the form, so a search begun
    // there can be narrowed here. Left running with the form off: it writes only to this
    // feature's own values, which nobody reads then
    watchSearchBox((query) => adoptFromSearchBox(parseQuery(query)));
  }
  startComposeSwitches(effectiveSettings(current, paused).compose, (compose) => {
    save({ ...current, compose }).catch(warnSaveFailed('the posting settings'));
  });

  /**
   * Nothing is applied until startup finishes: applying during `start()` would judge
   * without the column tier, the columns not being resolved yet, and be discarded by the
   * re-application at the end of it. Only the fact that something was missed is kept, so
   * the latest values go in once afterwards.
   */
  let started = false;
  let missed = false;
  /**
   * Applying the settings, no faster than `applyIn` allows: the first change of a burst
   * goes in at once and the rest are gathered up. The screen saves on every keystroke and
   * every save is judged against every post, which was a stall per character.
   *
   * The values are read at the moment of applying, so what goes in is the latest.
   */
  let applyTimer: ReturnType<typeof setTimeout> | null = null;
  // Never, rather than the moment the page loaded: the clock starts at nothing, so a
  // zero would hold the first change back (`filter/pace.ts`)
  let lastApply = Number.NEGATIVE_INFINITY;
  const applySettings = (): void => {
    if (applyTimer !== null) return;
    const wait = applyIn(performance.now(), lastApply);
    if (wait === 0) {
      lastApply = performance.now();
      updateSettings(effectiveSettings(current, paused));
      return;
    }
    applyTimer = setTimeout(() => {
      applyTimer = null;
      lastApply = performance.now();
      updateSettings(effectiveSettings(current, paused));
    }, wait);
  };
  /** The group whose records were rebuilt on this page. Starts empty per page */
  let rebuiltGroup: string | null = null;
  const reapply = (): boolean => {
    // Told first and unconditionally: what holds the rest back is the columns not being
    // resolved, which this does not depend on
    updateCompose(effectiveSettings(current, paused).compose);
    updateComposeSwitches(effectiveSettings(current, paused).compose);
    // Told with the compose form and for the same reason: it depends on no column being
    // resolved, so there is nothing for it to wait for
    updateNewPosts(surface.id === 'x' && effectiveSettings(current, paused).xChrome.autoNewPosts);
    // Told unconditionally too: which words are X's own is not a setting that pausing
    // stands down, it is what stops a picture's own description being mistaken for one
    useGenericAlts(current.genericAlts);
    if (!started) {
      missed = true;
      return false;
    }
    applySettings();
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

  /** Whether the mark on the compose forms is already waiting to be set */
  let markingComposeSoon = false;
  /**
   * Sets the mark saying which account a compose form posts as, once the page is quiet.
   *
   * Which boxes X paints is a question about how they are drawn, so working it out reads
   * their sizes back (`appearance/compose-mark.ts`). A settling is the worst moment to
   * ask — the first reading since X wrote to the page works out the whole page's layout
   * inside the round — and once the page is drawn there is nothing outstanding to pay
   * for (`quiet.ts`). A frame or two late is not something a reader can see.
   */
  const markComposeFormsSoon = (): void => {
    if (markingComposeSoon) return;
    markingComposeSoon = true;
    atAQuietMoment(() => {
      markingComposeSoon = false;
      // The pause may have arrived while this was waiting, and it takes the marks off
      if (!paused) markComposeForms();
    });
  };

  await start(effectiveSettings(current, paused), {
    log,
    logStyled,
    // While what the surface reports and the page disagree, `groupId` is null. Writing
    // without being able to tell which group the scopes belong to would erase the records
    // of the group being viewed until a moment ago
    onColumns: (found) => {
      if (found.groupId === null) return;
      const scopes = recordable(found.columns);
      /*
       * A group not yet rebuilt on this page gets rebuilt; the memory is per page, so a
       * reload rebuilds as a switch does. Nothing is remembered while no scope is visible:
       * a deck switch goes "10 columns → 0 → 4", and remembering at the 0 would lose the
       * chance to rebuild by the time they appear.
       */
      const reopened = rebuiltGroup !== found.groupId;
      if (scopes.length > 0) rebuiltGroup = found.groupId;
      // X Pro waits for the group to be reopened before touching anything and marks what
      // it keeps; x.com drops at once and marks nothing (see `Pruning`)
      const prune =
        surface.pruning === 'at-once'
          ? { drop: true, mark: false }
          : { drop: reopened, mark: reopened };
      // Scopes with settings are kept whatever happens
      const configured = new Set(Object.keys(current.columns));
      saveDetected(surface.id, found.groups, found.groupId, scopes, configured, prune).catch(
        warnSaveFailed('the scopes found on this page')
      );
    },
    onSettle: () => {
      const messages = currentMessages();
      // Timed one by one: added up as one, a long round says nothing about which job it was
      timed('· entry points', () => surface.insertEntryPoints(messages));
      // Nothing applies while paused, so the switches come out rather than show values
      // that would not take effect
      if (paused) {
        removeComposeSwitches();
        // X's own search filters come back with it, `/search` being left short of a part
        // of X's page otherwise, and so do the posts it put away
        removeSearchForm();
        clearSearchExclusions();
        // No setting of anyone's, so the empty settings do not stop it the way they stop
        // the rest. Stopped here, where the pause is known
        clearAltTitles();
        // The rules the marks answer go away with the empty settings, so a mark left on
        // would paint nothing. It is taken off anyway: nothing the extension wrote should
        // stay in the page while it is stood down
        clearComposeMarks();
        return;
      }
      timed('· compose switches', () => insertComposeSwitches(messages));
      /*
       * The search form. Asked on every settling for the reason the compose switches are:
       * X redraws the rail as the page is used, and moving between views changes which of
       * the rail's three shapes is on screen. Off, the form is taken out rather than left
       * standing — and what it covered is uncovered with it.
       */
      if (surface.id === 'x') {
        if (effectiveSettings(current, paused).search.form) {
          timed('· search form', () => insertSearchForm(messages));
          // What the form ticks that X has no operator for. Asked every settling: results
          // arrive as the reader scrolls, and the answer changes as the boxes are ticked
          const exclusions = currentExclusions();
          if (onSearchResults() && excludesAnything(exclusions)) {
            timed('· search exclusions', () =>
              applySearchExclusions(exclusions, termsOf(currentForm()))
            );
          } else {
            // Off the results, or nothing ticked: the posts put away come back
            clearSearchExclusions();
          }
        } else {
          removeSearchForm();
          clearSearchExclusions();
        }
      }
      /*
       * Bringing new posts in, asked every settling: what it goes by is X's own button
       * appearing. x.com only — X Pro keeps its columns current itself and writes the same
       * mark on a button of its own, so the site is asked here rather than in the selector
       */
      if (surface.id === 'x') timed('· new posts', takeNewPosts);
      /*
       * Which account the form on screen will post as. Asked every settling: X opens and
       * closes the form as it is used, and on X Pro the account in it can change while it
       * stands open. The rules it answers are already written (`appearance/apply.ts`), so
       * only the marking is left — and not in this round, it reading the page back, which a
       * settling must not do (`markComposeFormsSoon`)
       */
      markComposeFormsSoon();
      /*
       * The tooltip carrying what a picture is of. Set here rather than with the markers
       * the settings drive, for the reason it is cleared above.
       *
       * X's own word for an undescribed picture comes back where this round worked it out,
       * and is written down so the next page starts knowing it and the settings screen can
       * correct it. Nothing comes back once it is known, so this saves once.
       */
      const learned = timed('· picture tooltips', stampAltTitles);
      if (learned) {
        save({ ...current, genericAlts: [...learned] }).catch(
          warnSaveFailed("X's own word for a picture")
        );
      }
      // Written down while the form is open: once a post goes out it is gone
      noticeComposeForm();
      // Tags kept from the last post go into the form the moment one is opened by hand
      restoreKeptHashtags();
    },
  });
  started = true;
  log('Filter started', summarize(current));
  // Changes that arrived during startup: applying the latest values once is enough
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
