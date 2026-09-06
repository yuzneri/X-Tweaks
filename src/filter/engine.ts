/**
 * Running the filter: watching the DOM for changes, judging posts, and applying the result.
 */
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
 * The cells already judged. X causes a flood of changes by rewriting attributes and
 * the like, so this keeps the same cell from being judged over and over. A cell
 * detached from the DOM disappears along with the reference.
 */
let judged = new WeakSet<Element>();

let current: Settings | null = null;

let messages: Messages = messagesFor('en');

/** The effective settings per column, so the merge across tiers and regex compilation are not repeated per post */
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

/**
 * The key the effective settings are looked up by. The same combination of tiers gives
 * the same result.
 *
 * The site is left out although it is one of the tiers: it is fixed for the whole page
 * (the two sites are separate origins, so no navigation swaps one for the other), and a
 * part that is the same in every key is worth leaving out of all of them.
 */
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
      /*
       * What is actually painted in that scope, which is what a composited colour has to
       * be kept against. `node.appearance` is the merge alone: with the appearance
       * switched off it still carries the colours, while the page shows none of them
       * (`settings/resolve.ts`), and a key that cannot tell those apart holds a colour
       * composited over paint that is no longer there.
       */
      paint: paintKey(appearanceFor(settings, scope)),
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

/** What the last check made of the markers. A verdict is acted on once it comes twice running */
let lastFound: Marker[] = [];

/**
 * Checks whether the markers are broken. Called after one full pass of judging.
 * It reports again only when the set of broken markers changes, and when the body-text
 * marker is broken it drops the rules that read the body and judges again.
 *
 * A verdict has to come twice in a row before it counts. A deck being switched empties
 * the columns and fills them again, and in between there is a moment where the posts are
 * in the page but not one of them can be read yet — which is the shape of the body-text
 * marker having been renamed, and was being reported as exactly that (seen on the real
 * site: "post" broken, then unbroken a moment later).
 */
const checkHealth = (): void => {
  tally.articles = document.querySelectorAll(ARTICLE_SELECTOR).length;
  tally.cells = document.querySelectorAll(CELL_SELECTOR).length;
  const found = brokenMarkers(tally);
  // Spotting columns is not counted during judging, so the result from resolving is added
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

/**
 * What each post said when it was last read out.
 *
 * Reading one means a couple of dozen searches through it, and a post on the real site
 * holds hundreds of elements — measured there at nearly 2ms a post, which is what made
 * a deck coming back cost a fifth of a second per column while every post already on
 * screen was read out again.
 *
 * What is remembered is what the post *says*, never what was decided about it: a change
 * to the rules judges every post afresh, from what it said. The reading is dropped where
 * the page changed the post (`postsTouched`), and with it where X built the post anew,
 * that being a different element with nothing remembered about it.
 */
const reads = new WeakMap<Element, Post>();

/**
 * Lets go of what was read from the posts the page has changed since the last settling,
 * and of what was worked out about the words in them.
 *
 * Both are answers about a post as it stood. X rewriting one in place leaves the post
 * where it is, so neither would be asked again on its own.
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
  /*
   * The three parts are timed apart. They are each a different kind of work — searching
   * the post, matching the rules against what it says, and writing the answer into the
   * page — and which of them a slow round was spent on is the whole question
   * (`diagnostics.ts`).
   */
  const t0 = performance.now();
  const known = reads.get(cell);
  const post = known ?? readPost(cell);
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
 * Looks only at cells not judged yet. A cell that could not be judged is not
 * remembered (if it was mid-render, it has to be picked up again on the next change).
 *
 * `onlySettled` is for while the arrangement of columns is changing: it skips cells
 * whose scope may still move and judges the settled ones first.
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
  // A round that looked at only part of them is no material for the watch. The skipped
  // cells were not unreadable, merely unlooked-at, and letting them through would
  // wrongly report "there are cells but not one could be read"
  if (!onlySettled) checkHealth();
};

/**
 * Judges every visible cell again. Called when the rules change and when the
 * arrangement of columns changes.
 *
 * A cell that gets judged is not cleared first: the judgement says what its whole state
 * is, down to "nothing applies", and clearing it beforehand only takes the placeholder
 * out to put an identical one back. Doing that to every post on the page is a few hundred
 * changes to the DOM for nothing — and every one of them is a post the marking passes
 * then have to look at again (`appearance/changed.ts`).
 *
 * What is cleared is what could not be judged: a cell mid-render keeps whatever the rules
 * that are gone gave it, and nothing else is coming to take it off.
 */
const judgeAll = (): void => {
  judged = new WeakSet();
  /*
   * Asked here as well as at a settling, because this runs on a change to the settings
   * too — which can arrive between the page changing a post and the settling that would
   * have heard about it, and judging that post from what it used to say would stand until
   * the rules changed again
   */
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
 * Looks at the words in the posts this round highlighted, all of them together.
 * Held back until here for what it costs to read a colour back out of a page that has
 * just been written to (`filter/readable.ts`).
 */
const keepWordsReadable = (): void => {
  /*
   * Put off until the browser has laid the page out and painted it (`quiet.ts`). Both of
   * these read colours back out of the page, and doing that in the middle of a round —
   * with everything the round has just written still to be worked out — is what costs the
   * page its answering: measured on a real timeline at about 85ms for the first reading of
   * a round, whether it is answering for one post or twenty.
   *
   * What waits is a colour arriving a frame or two after the post it belongs to, which is
   * not something a reader can see.
   */
  atAQuietMoment(() => {
    const started = performance.now();
    try {
      // Both of the passes below read the page back, and the first reading pays for
      // whatever has been written since it was last drawn. Asked for here, that cost is
      // told apart from what the passes themselves do (`diagnostics.ts`) — and nothing is
      // forced on a round with nothing to read
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
      /*
       * Whatever the round found to do, and however it ended. What a round measured is
       * cleared where it is said, and nowhere else — a round that read the page and then
       * said nothing leaves its numbers to be added to the next line printed, which is
       * then reporting work it never did. A round that cost nothing still says nothing:
       * that judgement belongs to `diagnostics.ts`, not here.
       */
      say('colouring the posts that were highlighted', performance.now() - started);
    }
  });
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
const report = (columns: ScopeInfo[]): void => {
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

const refreshColumns = async (): Promise<ScopeInfo[]> => {
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
 * Runs one piece of settling work. A failure is recorded rather than rethrown.
 * This is degrading, not swallowing: the work here is a row of mutually independent
 * jobs, and stopping all of them over one failure would take the whole extension down.
 */
const guard = (name: string, step: () => void): void => {
  try {
    timed(name, step);
  } catch (error) {
    hooks?.logStyled(`xpro-tweaks: ${name} failed: ${String(error)}`, 'color:#f59e0b');
  }
};

/**
 * Says what a round cost, where it cost enough to be felt (`diagnostics.ts`).
 *
 * How big the page is decides nearly everything about the number, so it goes in the line
 * — counted here rather than kept, because it is only ever wanted where a line is about
 * to be printed.
 */
const say = (what: string, took: number): void => {
  if (feltAsSlow(took)) counted('posts on the page', document.querySelectorAll(CELL_SELECTOR).length);
  saidIfSlow(what, took, (message, style) => hooks?.logStyled(message, style));
};

/**
 * One settling, start to finish.
 *
 * However the work below leaves off, the round is closed: what the passes were told to
 * look at has been looked at. What they wrote themselves is reported to the watch after
 * this task rather than during it, so it lands on the next round instead of being
 * cleared here unlooked-at (`appearance/changed.ts`).
 */
const settle = (): void => {
  const started = performance.now();
  try {
    settleWork();
  } finally {
    handledChanges();
    // Said only where it took long enough to be felt (`diagnostics.ts`)
    say('settling', performance.now() - started);
  }
};

/**
 * The work itself: everything that has to be looked at again once the DOM has stopped
 * changing. The jobs are independent, so a failure in one lets the rest proceed. An
 * exception escaping upward would leave neither the markers nor the judging running, and
 * the whole extension would look dead.
 */
const settleWork = (): void => {
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

/**
 * A single Observer for the whole deck.
 * Not being per column, it needs no re-attaching as columns are created and destroyed.
 */
const observe = (): void => {
  // Rather than judging on every change, wait a little and pick up the unjudged cells
  // together. X inserts in bulk while scrolling, and handling them one at a time cannot
  // keep up. How long to wait is `pace.ts`'s to answer, from what the last round cost
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

  /*
   * A scope changing width moves nothing in the page, so the Observer above hears nothing
   * about it — and everything measured inside that scope has just been thrown away
   * (`appearance/apply.ts`). Without this the page would go on showing what it was given
   * at the old width until a post happened to arrive.
   */
  askForASettling(soon);
};

export const updateSettings = (settings: Settings): void => {
  const started = performance.now();
  timed('appearance', () => adopt(settings));
  timed('judge', judgeAllAndCheck);
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
