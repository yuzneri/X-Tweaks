/** Running the filter: watching the DOM for changes, judging posts, and applying the result */
import { adjustsContrast, highlightBaseOf, paintKey, type Settings } from '../settings/schema.ts';
import { appearanceFor, resolve, type ColumnScope } from '../settings/resolve.ts';
import { surface } from '../surface/index.ts';
import type { ScopeInfo, SurfaceState } from '../surface/index.ts';
import { adJudgementBroken, compileFilter, decide, type CompiledFilter, type Post } from './decide.ts';
import {
  brokenMarkers,
  columnsUnresolved,
  emptyTally,
  sameMarkers,
  textRulesStopped,
  type Marker,
  type Tally,
} from './health.ts';
import { apply, coloursWaiting, composeWaiting, isExpandedByUser, reset, type Look } from './apply.ts';
import { clearReadable, markReadableWaiting, wordsWaiting } from './readable.ts';
import { nextWait, SETTLE_MS } from './pace.ts';
import { sweep } from './emphasis.ts';
import { CELL_SELECTOR, readPost } from './post.ts';
import { injectStyles } from './styles.ts';
import {
  applyAppearance,
  askForASettling,
  sayWhereSlow,
  stampColumns,
  stampMediaFrames,
} from '../appearance/apply.ts';
import { handledChanges, postsTouched } from '../appearance/changed.ts';
import { atAQuietMoment, sayWhatFellOver } from '../quiet.ts';
import { counted, feltAsSlow, pageCaughtUp, saidIfSlow, spentOn, timed } from '../diagnostics.ts';
import { localeOf, messagesFor, type Messages } from '../i18n/index.ts';
import { saveAdGuard, saveHealth } from '../settings/storage.ts';

/**
 * Cells already judged. A WeakSet, so a detached cell drops out — needed because X's constant
 * attribute rewrites would otherwise repeat the judging.
 */
let judged = new WeakSet<Element>();

let current: Settings | null = null;

let messages: Messages = messagesFor('en');

/** X's own words for a picture nobody described, as the settings hold them */
let genericAlts: ReadonlySet<string> = new Set();

/** Effective settings per column, cached so tier merging and regex compilation are not repeated per post */
const effective = new Map<string, { filter: CompiledFilter; look: Look }>();

/** On receiving settings, rebuilds the language, the effective settings and the appearance together */
const adopt = (settings: Settings): void => {
  current = settings;
  // Built here rather than per post
  genericAlts = new Set(settings.genericAlts);
  messages = messagesFor(localeOf(settings.language));
  // The match-reason text comes from the dictionary, so a language change means a rebuild
  effective.clear();
  applyAppearance(settings, surface().scopes(), messages);
};

/**
 * Columns last resolved, as the marker sequence rather than a count — a same-count reorder would
 * otherwise raise no signal, leaving stale column settings applied.
 */
let knownSignature = '';

/** Column contents last reported; re-read every settling, but unchanged contents are not reported */
let reported = '';

/**
 * Lookup key for effective settings: same tier combination gives the same result. Site is left
 * out despite being a tier — the two sites are separate origins, so it is fixed for the page and
 * identical in every key.
 */
const keyOf = (scope: ColumnScope): string => `${scope.account ?? ''} ${scope.columnId ?? ''}`;

const effectiveFor = (scope: ColumnScope, settings: Settings) => {
  const key = keyOf(scope);
  const cached = effective.get(key);
  if (cached) return cached;

  const node = resolve(settings, scope);
  const built = {
    filter: compileFilter(node.filter, messages, { withoutText: textRulesStopped(broken) }),
    // How highlight/emphasis are shown. Not `appearanceFor`, which empties its result when
    // appearance is off — highlight and emphasis are filter-side and show anyway, so only the
    // adjustment must stop, or colours end up muddied or unreadable.
    look: {
      adjustContrast: adjustsContrast(node.appearance.autoContrast),
      highlightBase: highlightBaseOf(node.appearance.highlightBase),
      // What is actually painted in the scope, which a composited colour is kept against.
      // `node.appearance` is the merge alone — with appearance off it still carries colours
      // the page no longer shows (`settings/resolve.ts`), so this tells the two apart.
      paint: paintKey(appearanceFor(settings, scope)),
    },
  };
  effective.set(key, built);
  return built;
};

/**
 * Watches ad detection. Once the ad share among judged posts goes too far, switches off ad rules
 * alone, so a detection failure cannot tip every post into "ad" and hide them all.
 */
let adWatch = { judged: 0, ads: 0 };
let adBroken = false;

/** The watch on X's markers. Counting and clearing both happen where the ad watch does */
let tally: Tally = emptyTally();
let broken: Marker[] = [];

/**
 * Whether columns exist but not one `columnId` resolves. Recounted only on resolving — every
 * settling would catch the moment right after a deck switch, columns sprouted but markers not
 * yet stamped, as broken.
 */
let columnsBroken = false;

const resetAdWatch = (): void => {
  adWatch = { judged: 0, ads: 0 };
  tally = emptyTally();
};

/** Something that looks like a post. Being an ARIA role, it stands a good chance of surviving a renamed marker */
const ARTICLE_SELECTOR = 'article[role="article"]';

/**
 * Logs a failed save. There is no screen here, so the log is the only way to report it — a
 * storage failure cannot be reported through storage.
 */
const warnSaveFailed =
  (what: string) =>
  (): void => {
    hooks?.logStyled(
      `⚠ Could not save ${what}; the settings page may show stale information`,
      'color:#f59e0b'
    );
  };

/** What the last check made of the markers. A verdict is acted on once it comes twice running */
let lastFound: Marker[] = [];

/**
 * Checks whether the markers are broken, after a full judging pass. Reports again only on a
 * change, and drops the body-reading rules and re-judges if the body-text marker breaks. A
 * verdict must come twice running: a deck switch empties and refills the columns, and in
 * between posts are present but unreadable — looking exactly like a renamed body-text marker
 * (seen on the real site: "post" broken, then unbroken a moment later).
 */
const checkHealth = (): void => {
  tally.articles = document.querySelectorAll(ARTICLE_SELECTOR).length;
  tally.cells = document.querySelectorAll(CELL_SELECTOR).length;
  const found = brokenMarkers(tally);
  // Column-spotting is not counted during judging, so the resolve result is added here
  if (columnsBroken) found.push('column');
  const settled = sameMarkers(found, lastFound);
  lastFound = found;
  if (!settled || sameMarkers(found, broken)) return;

  const stopped = textRulesStopped(broken);
  broken = found;
  hooks?.logStyled(
    `⚠ These markers look broken: ${found.join(', ')}. ` +
      'Parts of the extension that depend on them are off until pro.x.com changes back',
    'color:#f59e0b'
  );
  saveHealth(found).catch(warnSaveFailed('which markers look broken'));
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

/**
 * What each post said when last read. Reading one means dozens of searches through it, and a
 * real post holds hundreds of elements. Remembers what the post *says*, never the verdict, so
 * a rule change re-judges from the cached reading. Dropped when the page changed the post
 * (`postsTouched`), or X rebuilt it as a new element.
 */
const reads = new WeakMap<Element, Post>();

/**
 * Drops the cached reading and worked-out words for posts the page changed since the last
 * settling. Both describe the post as it stood; X rewriting one in place leaves it at the same
 * element, so neither refreshes on its own.
 */
const forgetTouchedReads = (): void => {
  for (const cell of postsTouched()) {
    reads.delete(cell);
    clearReadable(cell);
  }
};

/** true once judged. A cell still mid-render, or one that is not a judging target, gives false */
const judge = (cell: Element): boolean => {
  if (!current) return false;
  // Timed apart: each part is different work — searching the post, matching rules against
  // it, writing the answer into the page — and which one a slow round cost is the question
  // (`diagnostics.ts`).
  const t0 = performance.now();
  const known = reads.get(cell);
  const post = known ?? readPost(cell, genericAlts);
  if (!post) return false;
  if (!known) {
    reads.set(cell, post);
    counted('posts read', 1);
    spentOn('· reading', performance.now() - t0);
  }
  watchAd(post.isAd);
  tally.posts++;
  if (post.values.text.length > 0) tally.texts++;
  // Once the detection counts as broken, treat everything as not an ad
  const seen = adBroken ? { ...post, isAd: false } : post;
  const t1 = performance.now();
  const { filter, look } = effectiveFor(surface().scopeOf(cell), current);
  const verdict = decide(seen, filter);
  const t2 = performance.now();
  spentOn('· deciding', t2 - t1);
  // The placeholder names a single author (a post `readPost` could read always has one)
  apply(cell, verdict, seen.values.screenName[0] ?? null, messages, look);
  spentOn('· applying', performance.now() - t2);
  return true;
};

/**
 * Looks only at cells not yet judged. One that could not be judged is not remembered — if
 * mid-render, it is picked up next change. `onlySettled` is for while columns rearrange: skips
 * cells whose scope may yet move, judging settled ones first.
 */
const judgeNew = (root: ParentNode, onlySettled = false): void => {
  let fresh = 0;
  for (const cell of root.querySelectorAll(CELL_SELECTOR)) {
    if (judged.has(cell)) continue;
    if (onlySettled && !surface().scopeSettled(cell)) continue;
    if (judge(cell)) {
      judged.add(cell);
      fresh += 1;
    }
  }
  counted('posts judged', fresh);
  keepWordsReadable();
  // A partial round is not material for the watch: skipped cells are unlooked-at, not
  // unreadable, and would wrongly report "cells, none readable"
  if (!onlySettled) checkHealth();
};

/**
 * Judges every visible cell again, on a rule change or column rearrangement. Not cleared first
 * — the judgement gives its whole state, down to "nothing applies", and clearing would mean a
 * few hundred wasted DOM changes re-looked-at by the marking passes (`appearance/changed.ts`).
 * What is cleared is what could not be judged: a mid-render cell would otherwise keep stale
 * state with nothing to remove it.
 */
const judgeAll = (): void => {
  judged = new WeakSet();
  // Called here too, not just at a settling, since this also runs on a settings change,
  // which can land between the page changing a post and the settling that would notice —
  // otherwise the stale reading stands until the rules change again
  forgetTouchedReads();
  // Carrying the previous round's counts over would count the same cell twice
  resetAdWatch();
  const all = document.querySelectorAll(CELL_SELECTOR);
  counted('posts judged again', all.length);
  for (const cell of all) {
    if (judge(cell)) {
      judged.add(cell);
      continue;
    }
    // A cell opened by hand stays open
    if (!isExpandedByUser(cell)) reset(cell);
  }
  keepWordsReadable();
  // Emphasis does not change the DOM, so merely changing a color does not wake the Observer
  sweep();
};

/**
 * Looks at the words in posts highlighted this round, all together — held back until here
 * because reading a colour out of a page just written to is costly (`filter/readable.ts`).
 */
const keepWordsReadable = (): void => {
  // Put off until the browser has laid out and painted the page (`quiet.ts`). Both passes
  // below read colours back, and doing that mid-round, with writes still pending, costs the
  // page its responsiveness. The trade-off: a colour arriving a frame or two late, unseeable.
  atAQuietMoment(() => {
    const started = performance.now();
    try {
      // Both passes read the page back; the first pays for whatever was written since it
      // last drew. Timed here to tell that cost apart from the passes themselves
      // (`diagnostics.ts`); nothing is forced on a round with nothing to read
      if (coloursWaiting() || wordsWaiting()) pageCaughtUp();
      const ours = performance.now();
      const coloured = composeWaiting();
      const words = performance.now();
      if (coloured > 0) {
        counted('posts coloured', coloured);
        spentOn('· composing colours', words - ours);
      }
      const posts = markReadableWaiting();
      if (posts > 0) {
        counted('posts kept readable', posts);
        spentOn('· keeping words readable', performance.now() - words);
      }
    } finally {
      // Runs whatever the round did, however it ended. Measurements are cleared only where
      // reported, or a silent round would report work it never did on the next printed line.
      say('colouring the posts that were highlighted', performance.now() - started);
    }
  });
};

/**
 * Judges again and then looks at the marker watch. Not called from inside `judgeAll` because a
 * broken body-text marker would make `judgeAll` run again and the two would bounce.
 */
const judgeAllAndCheck = (): void => {
  judgeAll();
  checkHealth();
};

let hooks: EngineHooks | null = null;

/**
 * Reports the columns found, staying quiet when unchanged: re-read every settling, and reporting
 * each time would repeat writing to storage.
 */
const report = (columns: ScopeInfo[]): void => {
  // The recording side needs to know which deck the columns belong to, so the deck state goes along
  const found = { ...surface().state(), columns };
  const key = JSON.stringify(found);
  if (key === reported) return;
  reported = key;
  hooks?.onColumns(found);
};

/**
 * Whether a resolve is in flight. `refresh` waits for the MAIN world's reply, which where it
 * does not run takes 9.8 seconds over three attempts; without this brake, a new resolve would
 * start on every settling during that wait and pile up.
 */
let refreshing = false;
/** Whether the arrangement changed during a resolve. Remembered so it can be chased once that finishes */
let pending = false;

const refreshColumns = async (): Promise<ScopeInfo[]> => {
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
      columns.filter((scope) => scope.columnId !== null).length
    );
    const started = performance.now();
    // Columns changing places changes what the rules target, so the appearance is set again
    if (current) timed('appearance', () => applyAppearance(current!, surface().scopes(), messages));
    timed('judge', judgeAllAndCheck);
    report(columns);
    say(`taking in ${columns.length} columns`, performance.now() - started);
    return columns;
  } finally {
    refreshing = false;
  }
};

/**
 * Runs one piece of settling work, recording a failure rather than rethrowing. Degrades, not
 * swallows: the jobs are independent, and stopping everything over one would take the whole
 * extension down.
 */
const guard = (name: string, step: () => void): void => {
  try {
    timed(name, step);
  } catch (error) {
    hooks?.logStyled(`xpro-tweaks: ${name} failed: ${String(error)}`, 'color:#f59e0b');
  }
};

/**
 * Says what a round cost, where it cost enough to be felt (`diagnostics.ts`). Page size decides
 * nearly everything about the number, so it is counted here, only when about to print, rather
 * than kept continuously.
 */
const say = (what: string, took: number): void => {
  if (feltAsSlow(took)) counted('posts on the page', document.querySelectorAll(CELL_SELECTOR).length);
  saidIfSlow(what, took, (message, style) => hooks?.logStyled(message, style));
};

/**
 * One settling, start to finish. However the work below ends, the round is closed. What the
 * passes wrote is reported to the watch after this task, not during it, so it lands on the
 * next round instead of being cleared here unlooked-at (`appearance/changed.ts`).
 */
const settle = (): void => {
  const started = performance.now();
  try {
    settleWork();
  } finally {
    handledChanges();
    say('settling', performance.now() - started);
  }
};

/**
 * The work itself: everything looked at again once the DOM stops changing. The jobs are
 * independent, so a failure in one lets the rest proceed — an escaping exception would stop
 * both markers and judging, and the extension would look dead.
 */
const settleWork = (): void => {
  guard('onSettle', () => hooks?.onSettle?.());
  // Discard the emphasis ranges attached to posts that left the screen
  guard('sweep', sweep);
  // X's redraws wipe the column and media-frame markers, so both are set again every settling
  guard('stampColumns', stampColumns);
  guard('stampMediaFrames', stampMediaFrames);
  if (surface().signature() !== knownSignature) {
    refreshColumns().catch((error: unknown) => {
      hooks?.logStyled(`xpro-tweaks: column refresh failed: ${String(error)}`, 'color:#f59e0b');
    });
    // Columns arrive one at a time over tens of seconds, so waiting for all would leave new
    // posts untouched. Cells in a column with no marker yet are skipped — a result reached
    // without the column tier gets overturned later and flickers
    forgetTouchedReads();
    guard('judge', () => judgeNew(document, true));
    return;
  }
  // Even when the set of columns is the same, the names arrive late
  guard('detect', () => report(surface().detect()));
  // What the page changed is no longer what was read out of it
  forgetTouchedReads();
  guard('judge', () => judgeNew(document));
};

/** A single Observer for the whole deck: not being per column, it needs no re-attaching as columns come and go */
const observe = (): void => {
  // Rather than judging on every change, wait and pick up unjudged cells together — X
  // inserts in bulk while scrolling, and handling them one at a time cannot keep up. How
  // long to wait is `pace.ts`'s call, from what the last round cost.
  let timer: ReturnType<typeof setTimeout> | null = null;
  let wait = SETTLE_MS;

  const soon = (): void => {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      const started = performance.now();
      settle();
      wait = nextWait(performance.now() - started);
    }, wait);
  };

  const observer = new MutationObserver(soon);
  observer.observe(document.body, { childList: true, subtree: true });

  // A scope changing width moves nothing in the page, so the Observer hears nothing of it,
  // even though everything measured inside it was just thrown away (`appearance/apply.ts`).
  // Without this the page would keep the old width's layout until a post happened to arrive.
  askForASettling(soon);
};

export const updateSettings = (settings: Settings): void => {
  const started = performance.now();
  timed('appearance', () => adopt(settings));
  timed('judge', judgeAllAndCheck);
  // Which columns stay on record depends on whether they have settings, so a settings change
  // means narrowing them down again. `report` drops duplicates by detected contents, so
  // without clearing this a settings-only change would go unreported. Does not wait for a
  // settling — in a background tab there is no telling when the next one comes.
  reported = '';
  report(surface().detect());
  say('applying a change to the settings', performance.now() - started);
};

/** The parts outside the judging (the entry points to the settings screen and so on) use the same dictionary */
export const currentMessages = (): Messages => messages;

export type EngineHooks = {
  log: (...args: unknown[]) => void;
  /** Called on every settling of the DOM. A ride-along, to avoid adding another Observer */
  onSettle?: () => void;
  logStyled: (message: string, style: string) => void;
  /** Called when the columns are resolved. Used to tell the settings screen */
  onColumns: (found: SurfaceState & { columns: ScopeInfo[] }) => void;
};

export const start = async (settings: Settings, given: EngineHooks): Promise<void> => {
  injectStyles();
  sayWhereSlow((message, style) => given.logStyled(message, style));
  // Work put off to a quiet moment runs outside every `guard` here, and what falls over
  // there is silent otherwise (`quiet.ts`)
  sayWhatFellOver((error) =>
    given.logStyled(`xpro-tweaks: work put off to a quiet moment failed: ${String(error)}`, 'color:#f59e0b')
  );
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
