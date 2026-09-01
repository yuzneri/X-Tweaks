/**
 * Running the filter: watching the DOM for changes, judging posts, and applying the result.
 */
import { adjustsContrast, highlightBaseOf, type Settings } from '../settings/schema.ts';
import { resolve, type ColumnScope } from '../settings/resolve.ts';
import { surface } from '../surface/index.ts';
import type { ColumnInfo } from '../columns/registry.ts';
import type { DeckState } from '../columns/deck.ts';
import { adJudgementBroken, compileFilter, decide, type CompiledFilter } from './decide.ts';
import {
  brokenMarkers,
  columnsUnresolved,
  emptyTally,
  sameMarkers,
  textRulesStopped,
  type Marker,
  type Tally,
} from './health.ts';
import { apply, isExpandedByUser, reset, type Look } from './apply.ts';
import { sweep } from './emphasis.ts';
import { CELL_SELECTOR, readPost } from './post.ts';
import { injectStyles } from './styles.ts';
import { applyAppearance, stampColumns, stampMediaFrames } from '../appearance/apply.ts';
import { localeOf, messagesFor, type Messages } from '../i18n/index.ts';
import { saveAdGuard, saveHealth } from '../settings/storage.ts';

/**
 * The cells already judged. X causes a flood of changes by rewriting attributes and
 * the like, so this keeps the same cell from being judged over and over. A cell
 * detached from the DOM disappears along with the reference.
 */
let judged = new WeakSet<Element>();

/**
 * How long to wait while changes keep coming, batching them together. It turns
 * directly into the delay before a new post is collapsed.
 * One round of settling work takes about 4ms, so even at this interval the share of
 * time held stays within 8%.
 */
const SETTLE_MS = 50;

let current: Settings | null = null;

let messages: Messages = messagesFor('en');

/** The effective settings per column, so the three-tier merge and regex compilation are not repeated per post */
const effective = new Map<string, { filter: CompiledFilter; look: Look }>();

/** On receiving settings, rebuilds the language, the effective settings and the appearance together */
const adopt = (settings: Settings): void => {
  current = settings;
  messages = messagesFor(localeOf(settings.language));
  // The match-reason text comes from the dictionary, so a language change means a rebuild
  effective.clear();
  applyAppearance(settings, surface().scopes(), messages);
};

/**
 * The arrangement of columns most recently resolved. It remembers the sequence of
 * markers rather than the count: with the count alone, switching to a deck with the
 * same number of columns and reordering both raise no signal, and the previous
 * columns' settings keep applying.
 */
let knownSignature = '';

/** The column contents most recently reported. They are re-read on every settling, but unchanged contents are not reported */
let reported = '';

/** The key the effective settings are looked up by. The same combination of tiers gives the same result */
const keyOf = (scope: ColumnScope): string => `${scope.account ?? ''} ${scope.columnId ?? ''}`;

const effectiveFor = (scope: ColumnScope, settings: Settings) => {
  const key = keyOf(scope);
  const cached = effective.get(key);
  if (cached) return cached;

  const node = resolve(settings, scope);
  const built = {
    filter: compileFilter(node.filter, messages, { withoutText: textRulesStopped(broken) }),
    /*
     * How highlight and emphasis are shown. `appearanceFor` is not used because it
     * empties the contents at a tier where the appearance is switched off. Highlight
     * and emphasis are filter-side actions and appear even with the appearance off,
     * and stopping only the adjustment there would leave unreadable or muddied colors.
     */
    look: {
      adjustContrast: adjustsContrast(node.appearance.autoContrast),
      highlightBase: highlightBaseOf(node.appearance.highlightBase),
    },
  };
  effective.set(key, built);
  return built;
};

/**
 * The watch on ad detection. It counts the share among the posts judged and, once that
 * goes too far, switches off ad rules alone. It keeps every post from tipping into
 * being an ad and vanishing the day spotting ads stops working.
 */
let adWatch = { judged: 0, ads: 0 };
let adBroken = false;

/** The watch on X's markers. Counting and clearing both happen where the ad watch does */
let tally: Tally = emptyTally();
let broken: Marker[] = [];

/**
 * Whether columns exist but not one `columnId` can be resolved.
 * It is recounted only on resolving. Looking at it on every settling would read the
 * moment right after a deck switch, when "the columns have sprouted but the markers
 * are not stamped yet", as broken.
 */
let columnsBroken = false;

const resetAdWatch = (): void => {
  adWatch = { judged: 0, ads: 0 };
  tally = emptyTally();
};

/** Something that looks like a post. Being an ARIA role, it stands a good chance of surviving a renamed marker */
const ARTICLE_SELECTOR = 'article[role="article"]';

/**
 * Logs that something could not be saved. There is no screen here, so the log is the
 * only way to say so. A storage failure is not reported through storage (the same
 * mechanism is the one failing).
 */
const warnSaveFailed =
  (what: string) =>
  (): void => {
    hooks?.logStyled(
      `⚠ Could not save ${what}; the settings page may show stale information`,
      'color:#f59e0b'
    );
  };

/**
 * Checks whether the markers are broken. Called after one full pass of judging.
 * It reports again only when the set of broken markers changes, and when the body-text
 * marker is broken it drops the rules that read the body and judges again.
 */
const checkHealth = (): void => {
  tally.articles = document.querySelectorAll(ARTICLE_SELECTOR).length;
  tally.cells = document.querySelectorAll(CELL_SELECTOR).length;
  const found = brokenMarkers(tally);
  // Spotting columns is not counted during judging, so the result from resolving is added
  if (columnsBroken) found.push('column');
  if (sameMarkers(found, broken)) return;

  const stopped = textRulesStopped(broken);
  broken = found;
  hooks?.logStyled(
    `⚠ These markers look broken: ${found.join(', ')}. ` +
      'Parts of the extension that depend on them are off until pro.x.com changes back',
    'color:#f59e0b'
  );
  saveHealth(found).catch(warnSaveFailed('which markers look broken'));
  // If the treatment of body-reading rules changed, rebuild the effective settings and apply again
  if (textRulesStopped(found) !== stopped) {
    effective.clear();
    judgeAll();
  }
};

const watchAd = (isAd: boolean): void => {
  if (adBroken) return;
  adWatch.judged++;
  if (isAd) adWatch.ads++;
  if (!adJudgementBroken(adWatch.judged, adWatch.ads)) return;

  adBroken = true;
  hooks?.logStyled(
    `⚠ ${adWatch.ads} of ${adWatch.judged} posts looked like ads, which cannot be right. ` +
      `Ad rules are off until you reload pro.x.com`,
    'color:#f59e0b'
  );
  saveAdGuard(true).catch(warnSaveFailed('that ad rules were turned off'));
  // Bring back what was collapsed or hidden as an ad
  judgeAll();
};

/** true once judged. A cell still mid-render, or one that is not a judging target, gives false */
const judge = (cell: Element): boolean => {
  if (!current) return false;
  const post = readPost(cell);
  if (!post) return false;
  watchAd(post.isAd);
  tally.posts++;
  if (post.values.text.length > 0) tally.texts++;
  // Once the detection counts as broken, treat everything as not an ad
  const seen = adBroken ? { ...post, isAd: false } : post;
  const { filter, look } = effectiveFor(surface().scopeOf(cell), current);
  // The placeholder names a single author (a post `readPost` could read always has one)
  apply(cell, decide(seen, filter), seen.values.screenName[0] ?? null, messages, look);
  return true;
};

/**
 * Looks only at cells not judged yet. A cell that could not be judged is not
 * remembered (if it was mid-render, it has to be picked up again on the next change).
 *
 * `onlySettled` is for while the arrangement of columns is changing: it skips cells
 * whose scope may still move and judges the settled ones first.
 */
const judgeNew = (root: ParentNode, onlySettled = false): void => {
  for (const cell of root.querySelectorAll(CELL_SELECTOR)) {
    if (judged.has(cell)) continue;
    if (onlySettled && !surface().scopeSettled(cell)) continue;
    if (judge(cell)) judged.add(cell);
  }
  // A round that looked at only part of them is no material for the watch. The skipped
  // cells were not unreadable, merely unlooked-at, and letting them through would
  // wrongly report "there are cells but not one could be read"
  if (!onlySettled) checkHealth();
};

/**
 * Judges every visible cell again. Called when the rules change and when the
 * arrangement of columns changes. Resetting first is what clears the colors left by
 * the previous rules.
 */
const judgeAll = (): void => {
  judged = new WeakSet();
  // Carrying the previous round's counts over would count the same cell twice
  resetAdWatch();
  for (const cell of document.querySelectorAll(CELL_SELECTOR)) {
    // A cell opened by hand stays open
    if (!isExpandedByUser(cell)) reset(cell);
    if (judge(cell)) judged.add(cell);
  }
  // Emphasis does not change the DOM, so merely changing a color does not wake the Observer
  sweep();
};

/**
 * Judges again and then looks at the marker watch. It is not called from inside
 * `judgeAll` because a broken body-text marker would make `judgeAll` run again and the
 * two would bounce back and forth.
 */
const judgeAllAndCheck = (): void => {
  judgeAll();
  checkHealth();
};

let hooks: EngineHooks | null = null;

/**
 * Reports the columns found, staying quiet when the contents are unchanged.
 * They are re-read on every settling, and reporting each time would repeat the
 * reading and writing of storage.
 */
const report = (columns: ColumnInfo[]): void => {
  // The recording side needs to know which deck the columns belong to, so the deck state goes along
  const found = { ...surface().state(), columns };
  const key = JSON.stringify(found);
  if (key === reported) return;
  reported = key;
  hooks?.onColumns(found);
};

/**
 * Whether a resolve is in flight. `refresh` waits for the MAIN world's reply, which in
 * an environment where it does not run takes 9.8 seconds over three attempts. The DOM
 * changes during that wait, so without a brake a new resolve would start on every
 * settling and pile up.
 */
let refreshing = false;
/** Whether the arrangement changed during a resolve. Remembered so it can be chased once that finishes */
let pending = false;

const refreshColumns = async (): Promise<ColumnInfo[]> => {
  // Nothing is queued while one is running. Only the fact that something changed is
  // passed on, to be chased after it finishes
  if (refreshing) {
    pending = true;
    return [];
  }
  refreshing = true;
  try {
    let columns = await surface().refresh();
    knownSignature = surface().signature();
    // Resolve again if the arrangement changed while waiting.
    // The signature is updated every time, so this loop stops once the arrangement settles
    while (pending) {
      pending = false;
      columns = await surface().refresh();
      knownSignature = surface().signature();
    }
    effective.clear();
    columnsBroken = columnsUnresolved(
      columns.length,
      columns.filter((column) => column.columnId !== null).length
    );
    // Columns changing places changes what the rules target, so the appearance is set again
    if (current) applyAppearance(current, surface().scopes(), messages);
    judgeAllAndCheck();
    report(columns);
    return columns;
  } finally {
    refreshing = false;
  }
};

/**
 * Runs one piece of settling work. A failure is recorded rather than rethrown.
 * This is degrading, not swallowing: the work here is a row of mutually independent
 * jobs, and stopping all of them over one failure would take the whole extension down.
 */
const guard = (name: string, step: () => void): void => {
  try {
    step();
  } catch (error) {
    hooks?.logStyled(`xpro-tweaks: ${name} failed: ${String(error)}`, 'color:#f59e0b');
  }
};

/**
 * A single Observer for the whole deck.
 * Not being per column, it needs no re-attaching as columns are created and destroyed.
 */
const observe = (): void => {
  // Rather than judging on every change, wait a little and pick up the unjudged cells
  // together. X inserts in bulk while scrolling, and handling them one at a time cannot
  // keep up.
  //
  // requestAnimationFrame is not used because it is not called in a background tab, and
  // the accumulated changes would keep growing unprocessed until the tab comes back.
  let timer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      // The settling jobs are independent, so a failure in one lets the rest proceed.
      // An exception escaping upward would leave neither the markers nor the judging
      // running, and the whole extension would look dead
      guard('onSettle', () => hooks?.onSettle?.());
      // Discard the emphasis ranges attached to posts that left the screen
      guard('sweep', sweep);
      // A redraw by X wipes the column markers and the media frame markers, so they are set again on every settling
      guard('stampColumns', stampColumns);
      guard('stampMediaFrames', stampMediaFrames);
      // When the arrangement of columns changes, resolve the columnIds and accounts again
      if (surface().signature() !== knownSignature) {
        refreshColumns().catch((error: unknown) => {
          hooks?.logStyled(`xpro-tweaks: column refresh failed: ${String(error)}`, 'color:#f59e0b');
        });
        // Columns arrive one at a time over tens of seconds, so waiting for all of them
        // would leave new posts untouched. Cells inside a column with no marker are
        // skipped: a result reached without the column tier gets overturned later and flickers
        guard('judge', () => judgeNew(document, true));
        return;
      }
      // Even when the set of columns is the same, the names arrive late
      guard('detect', () => report(surface().detect()));
      guard('judge', () => judgeNew(document));
    }, SETTLE_MS);
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

export const updateSettings = (settings: Settings): void => {
  adopt(settings);
  judgeAllAndCheck();
  /*
   * Which columns stay on record depends on whether they have settings, so a change to
   * the settings means narrowing them down again.
   * `report` drops duplicates by the contents of what was detected, so without clearing
   * the memory a settings-only change would go unreported.
   * It does not wait for a settling because there is no telling when the next one comes
   * in a background tab.
   */
  reported = '';
  report(surface().detect());
};

/** The parts outside the judging (the entry points to the settings screen and so on) use the same dictionary */
export const currentMessages = (): Messages => messages;

export type EngineHooks = {
  log: (...args: unknown[]) => void;
  /** Called on every settling of the DOM. A ride-along, to avoid adding another Observer */
  onSettle?: () => void;
  logStyled: (message: string, style: string) => void;
  /** Called when the columns are resolved. Used to tell the settings screen */
  onColumns: (found: DeckState & { columns: ColumnInfo[] }) => void;
};

export const start = async (settings: Settings, given: EngineHooks): Promise<void> => {
  injectStyles();
  adopt(settings);
  hooks = given;
  // Posts appearing while the columns are being resolved are picked up and judged by the Observer
  observe();

  const columns = await refreshColumns();
  const total = columns.length;
  const withId = columns.filter((c) => c.columnId !== null).length;
  const withAccount = columns.filter((c) => c.account !== null).length;

  if (total === 0) {
    given.log('No columns yet; posts will be judged once columns render');
  } else if (withId === total && withAccount === total) {
    given.log(`Resolved ${total} columns (columnId and account for all of them)`);
  } else {
    given.logStyled(
      `Resolved columnId for ${withId} and account for ${withAccount} of ${total} columns. ` +
        'Columns that could not be resolved run with whatever settings do apply',
      'color:#f59e0b'
    );
  }
};
