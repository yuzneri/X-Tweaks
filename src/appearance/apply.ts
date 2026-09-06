/**
 * Applies the appearance settings: sets the markers the CSS targets and puts the built
 * CSS into a single `<style>`. Only attributes are added, so removing them restores the
 * original.
 *
 * Which elements hold one scope, and where its name is drawn, is the surface's business
 * (`surface/`). Nothing here names a column or a deck.
 */
import { surface } from '../surface/index.ts';
import {
  accountOfPicture,
  altTextOf,
  ARTICLE,
  authorOf,
  cardTextOf,
  CELL_SELECTOR,
  displayNameOf,
  isOutermostMedia,
  LINK_CARD,
  ownTextOf,
  PHOTO,
  quoteFrameOf,
  showsOwnAltButton,
  VIDEO,
  X_SHOW_MORE,
} from '../filter/post.ts';
import { descriptionOf, learnGenericAlts, type PhotoAlt } from './alt.ts';
import { changedCells, changeEverything, noticeChange, watchChanges } from './changed.ts';
import { counted, noted, pageCaughtUp, saidIfSlow, timed } from '../diagnostics.ts';
import { measureAgainIn, MEASURE_MS } from '../filter/pace.ts';
import { atAQuietMoment } from '../quiet.ts';
import { appearanceFor, type ColumnScope } from '../settings/resolve.ts';
import {
  cardStyleOf,
  isCompact,
  layoutKey,
  mediaStyleOf,
  quoteStyleOf,
  timeFormatOf,
  type AppearanceNode,
  type AttachmentStyle,
  withoutColumnItems,
  type MediaStyle,
  type Settings,
} from '../settings/schema.ts';
import {
  colorInStyle,
  lineFrom,
  lineTextFrom,
  moreThanShown,
  partFor,
  shortLineFrom,
  wordsShown,
  ATTACHMENT_CLASS,
  ATTACHMENT_CUT_CLASS,
  ATTACHMENT_MARK_CLASS,
  ATTACHMENT_WORDS_CLASS,
  MARK_CLASS,
  type LinePart,
  type LineParts,
} from './card.ts';
import { timeTextFrom } from './time.ts';
import { limitFor, needsFrame, setsHeight, wrapsBox } from './frame.ts';
import type { Messages } from '../i18n/index.ts';
import { composeColors, pageColor } from './compose-colors.ts';
import {
  buildCss,
  chromeCss,
  columnKey,
  composeCss,
  injectedCss,
  pageCss,
  CAPTION_CLASS,
  CAPTION_MORE_CLASS,
  CAPTION_OPEN_CLASS,
  CAPTION_TEXT_CLASS,
  CARD_MOVED_ATTR,
  COLUMN_ATTR,
  MEDIA_MARKED_ATTR,
  HEADER_ATTR,
  MORE_CLASS,
  OPENED_ATTR,
  OPENED_CLASS,
  MEDIA_FRAME_ATTR,
  TIME_ATTR,
  TODAY_ATTR,
  MEDIA_TARGETS,
  type ColumnAppearance,
} from './css.ts';

const STYLE_ID = 'xpro-tweaks-appearance-style';

/**
 * Marks each scope, the bar carrying its name, and whether it holds a post opened to be
 * read. The marker goes on the range covering one whole scope; marking only its body
 * leaves the header stranded in black.
 *
 * The marker's value is the target key, not the position in the order. Using the
 * position would carry the width and the colors straight over to the neighboring
 * column when the deck is switched.
 * The bar is not searched for again while its marker is still there: the cost of
 * searching turns into a delay in judging new posts.
 */
export const stampColumns = (): void => {
  /** The ranges enumerated this round. A marker outside them is a leftover from something that is no longer a scope, so it comes off */
  const live: Element[] = [];
  const on = surface();

  on.scopeElements().forEach((element) => {
    const value = columnKey(on.scopeOfElement(element));
    const scope = on.rangeOf(element);
    if (scope.getAttribute(COLUMN_ATTR) !== value) scope.setAttribute(COLUMN_ATTR, value);
    live.push(scope);

    /*
     * Asked every round: a post is opened and closed without the scope changing at all.
     * Not written while it already says so, the same as the marker above. The CSS targets
     * this attribute, so writing it costs a style recalculation over the whole scope
     */
    const opened = on.opened(scope);
    if (opened !== scope.hasAttribute(OPENED_ATTR)) {
      if (opened) scope.setAttribute(OPENED_ATTR, '');
      else scope.removeAttribute(OPENED_ATTR);
      /*
       * Everything the passes decide inside this scope turns on it, and the scope is not
       * a post, so nothing about this reaches the watch on the posts (`changed.ts`)
       */
      changeEverything();
    }

    const marked = scope.querySelector(`[${HEADER_ATTR}]`);
    if (marked && on.bandStillValid(marked, scope)) return;
    // When searching again, clear every marker in this range before setting one.
    // Two of them left in place make a color with opacity darker further in
    scope.querySelectorAll(`[${HEADER_ATTR}]`).forEach((el) => el.removeAttribute(HEADER_ATTR));
    on.bandOf(scope)?.setAttribute(HEADER_ATTR, '');
  });

  // Clear markers in ranges that are no longer scopes. The loop above only touches
  // the ranges it enumerated, so a stranded marker would keep the bar painted
  document.querySelectorAll(`[${HEADER_ATTR}]`).forEach((el) => {
    if (!live.some((scope) => scope.contains(el))) el.removeAttribute(HEADER_ATTR);
  });
};

/** The media anywhere on the page. What a picture says for itself is not a per-column matter */
const MEDIA_ANYWHERE = MEDIA_TARGETS.join(', ');

/** Text in a post. Walking up past an ancestor containing this would shrink the body along with it */
const TEXT_SELECTOR = '[data-testid="tweetText"], [data-testid="User-Name"]';

/** A post's body text. What the line limit and "Show more" apply to */
const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';

/** The quote frame: the container that jumps to the original post when clicked, with the quoted content beneath it */
const QUOTE_SELECTOR = '[role="link"]';

/** The post proper within a cell. Where the quote frame is looked for */
const TWEET_SELECTOR = '[data-testid="tweet"]';

/** Limit on how far to walk up looking for the frame. Above this we are into the cell's own layout */
const MAX_ANCESTORS = 12;

/**
 * Finds the frame that sets the media's height.
 *
 * Among the ancestors that wrap the box at the same height, takes the outermost
 * one that sets the height, or, failing that, the outermost wrapping one.
 * The job here is walking up and measuring; deciding from the measurements is
 * `frame.ts`.
 */
const frameOf = (media: Element, limit: number): Element | null => {
  const box = media.getBoundingClientRect();
  if (!needsFrame(box.height, limit)) return null;

  let wrapper: Element | null = null;
  let decider: Element | null = null;

  let el = media.parentElement;
  for (let i = 0; el && i < MAX_ANCESTORS; el = el.parentElement, i++) {
    if (el.hasAttribute(COLUMN_ATTR) || el.matches(CELL_SELECTOR)) break;
    if (el.querySelector(TEXT_SELECTOR)) break;
    if (!wrapsBox(box.height, el.getBoundingClientRect().height)) break;
    wrapper = el;
    const style = getComputedStyle(el);
    if (setsHeight(style.aspectRatio, style.paddingBottom, box.height)) decider = el;
  }
  return decider ?? wrapper;
};

/**
 * The same answer as `frameOf`, worked out without writing to the page first, and whether
 * X has drawn the media at all.
 *
 * `frameOf` takes what our rules are doing off the box before reading it, and a write
 * between two readings makes the browser work the page out again — measured on a real
 * timeline at 90 to 175ms a round, however few pictures the round was measuring. This
 * reads instead what the media sits in: our rules are on the box, but the thing above it
 * that decides its height is left alone until it is marked, so its own height is the one
 * X would draw.
 *
 * Checked against `frameOf` on the real site before it was trusted with anything: the two
 * agreed on every picture being seen for the first time. Where the frame already carries
 * our marker the walk below is not attempted at all, for the reason given there.
 */
const frameAround = (media: Element, limit: number): { frame: Element | null; drawn: boolean } => {
  /*
   * What the media sits in, nearest first, as far up as a frame could be — and not media
   * itself. Our rules are on every box X marks as media, and a box we have taken off the
   * page or capped cannot say how tall another would be drawn: X puts one inside another
   * (a video is marked twice over, `filter/post.ts`), so these really do turn up in the
   * walk rather than only at the bottom of it.
   */
  const above: Element[] = [];
  for (let el = media.parentElement, i = 0; el && i < MAX_ANCESTORS; el = el.parentElement, i++) {
    if (el.hasAttribute(COLUMN_ATTR) || el.matches(CELL_SELECTOR)) break;
    if (el.querySelector(TEXT_SELECTOR)) break;
    if (!el.matches(MEDIA_ANYWHERE)) above.push(el);
  }

  /*
   * A frame already marked is the answer, and no reading below it can improve on it.
   * Everything inside a marked frame is drawn to the height our own rules impose on it
   * (`css.ts`: the frame's height is replaced, and its contents are held to it), so a walk
   * from the media would compare X's shape against ours and find nothing that fits —
   * answering "no frame at all", which takes the marker off and opens the frame up empty
   * on a timeline whose reader asked for no pictures.
   */
  const marked = above.find((el) => el.hasAttribute(MEDIA_FRAME_ATTR));
  if (marked) return { frame: marked, drawn: true };

  // Nothing of ours on any of them, so what is on screen is X's own
  const height = (above[0] ?? media).getBoundingClientRect().height;
  if (!needsFrame(height, limit)) return { frame: null, drawn: height > 0 };

  let wrapper: Element | null = null;
  let decider: Element | null = null;
  for (const el of above) {
    if (!wrapsBox(height, el.getBoundingClientRect().height)) break;
    wrapper = el;
    if (declaresHeight(el, height)) decider = el;
  }
  return { frame: decider ?? wrapper, drawn: true };
};

/**
 * Whether this element is the one that decides the height, from what X wrote on it as much
 * as from what is on screen.
 *
 * A percentage `padding-bottom` is resolved against the width here rather than handed to
 * `setsHeight`, which compares lengths: read off the element, `56.25%` arrives as the
 * string it was written as, and `56.25` beside a height in the hundreds says "sets no
 * height" about the very element that sets it.
 */
const declaresHeight = (el: Element, height: number): boolean => {
  const shown = getComputedStyle(el);
  const own = (el as HTMLElement).style;
  const padding = own.paddingBottom.endsWith('%')
    ? `${(el.getBoundingClientRect().width * parseFloat(own.paddingBottom)) / 100}px`
    : own.paddingBottom || shown.paddingBottom;
  return setsHeight(own.aspectRatio || shown.aspectRatio, padding, height);
};

/** One scope on screen, with the appearance that applies inside it */
type MarkedColumn = { element: Element; appearance: AppearanceNode };

/**
 * The scopes on screen, each with its appearance.
 *
 * Every pass that marks something walks these rather than the whole page, and asks each
 * scope for what is inside it. Going the other way — every picture, every body, every
 * cell on the page, each walking back up to find its scope and then searching the list
 * for that scope's appearance — costs a walk and a search per element, and there are
 * hundreds of them on a timeline.
 */
const columnsOnScreen = (columns: ColumnAppearance[]): MarkedColumn[] => {
  const byKey = new Map(columns.map((column) => [column.key, column.appearance]));
  const found: MarkedColumn[] = [];
  document.querySelectorAll(`[${COLUMN_ATTR}]`).forEach((element) => {
    const appearance = byKey.get(element.getAttribute(COLUMN_ATTR) ?? '');
    if (!appearance) return;
    // Its width is what everything inside it wraps at, so a change to it is what makes
    // the measurements taken inside it worth taking again
    watchSize(element);
    found.push({ element, appearance });
  });
  return found;
};

const clearMediaFrames = (): void =>
  document.querySelectorAll(`[${MEDIA_FRAME_ATTR}]`).forEach((el) => el.removeAttribute(MEDIA_FRAME_ATTR));

/**
 * The posts in one scope that this round has to look at, and where to search for what
 * they hold.
 *
 * A round that was told which posts changed searches those posts; one that was told
 * nothing — the settings moved, or the safety round came due — searches the whole scope.
 * Which it is comes from `changed.ts`, and is the same answer for every pass in a settling.
 */
const cellsIn = (element: Element, changed: Set<Element> | null): Element[] =>
  changed === null
    ? [...element.querySelectorAll(CELL_SELECTOR)]
    : [...changed].filter((cell) => element.contains(cell));

/** The same, as places to search rather than posts to work on */
const rootsIn = (element: Element, changed: Set<Element> | null): Element[] =>
  changed === null ? [element] : cellsIn(element, changed);

/**
 * The same, for a round that is going to measure: the posts left waiting for it come
 * back in as well.
 *
 * Only the two passes that measure ask for this. Bringing what is waiting into every
 * pass would have them work out a post's lines and captions again for no reason — the
 * post has not changed, it is only that nobody has measured it yet.
 */
const rootsToMeasure = (element: Element, changed: Set<Element> | null): Element[] =>
  changed === null
    ? [element]
    : [...new Set([...changed, ...toMeasure])].filter((cell) => element.contains(cell));

/**
 * Where to take a mark off again.
 *
 * A round working from the changed posts must only tidy up inside them: a sweep of the
 * whole page would take the marks off every post it did not look at this time.
 */
const sweepIn = (changed: Set<Element> | null): (Element | Document)[] =>
  changed === null ? [document] : [...changed];

/*
 * ---- What was measured, and when it stops being true --------------------------------
 *
 * Two of the passes below have to measure the page: the media frames walk up asking how
 * tall each box is drawn, and the "Show more" asks whether a body has more text than its
 * limit shows. Both force the browser to lay the page out then and there, and both used
 * to ask again for every picture and every body on every settling — which on a timeline
 * of several hundred posts is what made the page stop responding (measured: ~860ms of a
 * settling, over 90% of it in `getBoundingClientRect`, `clientHeight` and
 * `getComputedStyle`).
 *
 * So what was measured is remembered per element. The element itself is the key: X
 * builds a post anew when it redraws one, and a new element has nothing remembered
 * about it, which is the same answer as measuring it again.
 *
 * What the memory cannot see is the page changing around an element that stayed put.
 * Three things do that, and each has its own answer:
 *   - the settings for its scope changed the way it is drawn: the measurement carries
 *     which settings it was taken under (`measuredUnder`), so it stands or falls with
 *     them — and with them alone, leaving the scopes beside it untouched
 *   - a scope changed size: `remeasureEverything`, because everything in it wraps
 *     differently at another width. Watched on the scopes themselves rather than on the
 *     window, so that a column widened where it stands — by our own setting, by X Pro's,
 *     or by the window — is caught the same way
 *   - a picture finished loading: that one picture is forgotten, not the page — pictures
 *     arrive one at a time while the reader scrolls, and forgetting everything each time
 *     one did would leave nothing remembered at all
 */

/*
 * Measuring waits (`filter/pace.ts` decides how long). What needs it is remembered and
 * answered together, and what is waiting keeps whatever it was given last — a picture
 * already capped stays capped, a button already there stays there — so the wait shows as
 * a mark arriving late on something new, never as one flickering on something already on
 * screen.
 */

/*
 * When the last round of measuring ran. Before any has, it is not "the beginning of
 * time" but "long enough ago": the clock behind it starts at nothing when the page loads
 * (`performance.now()`), so a zero here would hold the first round back by the whole of
 * the wait, on the one occasion there is most to measure.
 */
let lastMeasured = Number.NEGATIVE_INFINITY;

/** How long this page has earned between rounds of measuring, from what the last one cost */
let measureWait = MEASURE_MS;

/** The posts with something still to measure. Looked at again on a later round */
const toMeasure = new Set<Element>();

/** Whether a round of measuring is already booked for the next quiet moment */
let booked = false;

/** The wait put in front of a booking, where the page has not earned its next round yet */
let waitingToBook: ReturnType<typeof setTimeout> | null = null;

/** Whether the round now running is that booked one */
let inTheBookedRound = false;

/** Whether the round now running actually measured anything */
let measured = false;

/**
 * Measures at the next moment the browser has nothing else to do with the page.
 *
 * Two frames out rather than one: a callback on the next frame runs *before* that frame
 * is laid out, so it would be reading a page our own writes had just made stale — which
 * is the forced layout this is here to avoid. A callback on the frame after that finds
 * the page laid out and painted, and reading it costs nothing.
 *
 * A background tab never gets there, and nothing in it wants measuring: it comes back
 * when the tab does.
 *
 * A round asked for before the page has earned it waits out the difference on the clock
 * first. Booking it straight away would put it two frames out, where it would find its
 * turn still not come, do the whole round's walking for nothing, and book itself again —
 * once every couple of frames until the wait ran out, which on a page slow enough to have
 * earned a long wait is a hundred rounds of exactly the work the wait exists to prevent.
 */
const measureSoon = (): void => {
  if (booked || waitingToBook !== null) return;
  const owed = Math.max(0, measureWait - (performance.now() - lastMeasured));
  if (owed > 0) {
    waitingToBook = setTimeout(() => {
      waitingToBook = null;
      measureSoon();
    }, owed);
    return;
  }
  booked = true;
  atAQuietMoment(() => {
    booked = false;
    inTheBookedRound = true;
    measured = false;
    const started = performance.now();
    try {
      // What the passes below read the page for pays, on the first reading, for whatever
      // has been written since it was last drawn — X's own writes as much as ours. Asked
      // for here it stands on its own line rather than landing on the first pass that
      // happens to read (`diagnostics.ts`). Only a round that is going to read asks
      if (mayMeasure()) pageCaughtUp();
      stampMediaFrames();
    } finally {
      inTheBookedRound = false;
      // What it cost is what it earns before the next one (`filter/pace.ts`)
      if (measured) measureWait = measureAgainIn(performance.now() - started);
      // Its own round, so what it cost is reported as its own rather than landing on
      // whatever prints next (`diagnostics.ts`)
      saidIfSlow('measuring what arrived', performance.now() - started, (message, style) =>
        logSlow?.(message, style)
      );
    }
  });
};

/**
 * Whether this round may measure.
 *
 * Only the booked round measures — the one that runs once the browser has laid the page
 * out — and only when the page has had the time it earned since the last one. Nothing is
 * let through early, a change the reader made included: what waits on a measurement is a
 * picture keeping its full height, or a "Show more" arriving late, and neither is worth a
 * page that stops answering.
 */
const mayMeasure = (): boolean => inTheBookedRound && performance.now() - lastMeasured >= measureWait;

/** Notes that a post has something still to be measured, and keeps it for a later round */
const measureLater = (element: Element): void => {
  const cell = element.closest(CELL_SELECTOR);
  if (cell) toMeasure.add(cell);
};

/** What was measured for one medium, and the state of the page it was measured in */
const frames = new WeakMap<Element, { key: string; frame: Element | null }>();

/** What was measured for one body, and the state of the page it was measured in */
const overflows = new WeakMap<Element, { key: string; over: boolean }>();

/**
 * Which round of measurements is current. Everything measured under an earlier one is
 * measured again the next time it is asked for.
 */
let generation = 0;

/**
 * What a measurement was taken under: the round, and how the scope it sits in is drawn.
 *
 * The scope's own share of it is what keeps a change to one scope off the others. A deck
 * comes back a column at a time, and every column arriving rewrites the stylesheet —
 * measured against the page as a whole, that would mean measuring every picture and every
 * body on screen again, five or ten times over, while the reader waits.
 */
const measuredUnder = (appearance: AppearanceNode): string =>
  `${generation}|${layoutKey(appearance)}`;

/** What hidden media is remembered under. It stands apart from every measurement */
const HIDDEN_KEY = 'hidden';

const remeasureEverything = (): void => {
  generation++;
};

/** How wide each watched scope was when it was last looked at */
const widths = new WeakMap<Element, number>();

/**
 * Watches the scopes for a change of *width*.
 *
 * The height is ignored on purpose. A timeline grows taller with every batch of posts
 * that arrives — on x.com the scope itself is what grows — and treating that as a reason
 * to measure the page again would throw the memory away exactly while scrolling, which is
 * the one time it is worth having. Nothing measured here follows the height: what a body
 * wraps at and how tall a picture is drawn both follow the width.
 *
 * The first answer for a scope says how wide it already is, which is not a change: it is
 * ignored, and only a scope that later changes width has what was measured in it dropped.
 */
const sizes = new ResizeObserver((entries) => {
  let changed = false;
  for (const entry of entries) {
    const width = entry.contentRect.width;
    const known = widths.get(entry.target);
    widths.set(entry.target, width);
    /*
     * The first word about a scope is not news. A scope is watched the moment it is seen,
     * and the answer that comes back says how wide it already was — nothing was measured
     * under any other width. Taking it for a change is what made a deck coming back a
     * column at a time measure every picture on screen again for each one that arrived.
     */
    if (known !== undefined && known !== width) changed = true;
  }
  if (!changed) return;
  remeasureEverything();
  /*
   * A width changing moves nothing in the page, so nothing tells the passes to look
   * again: they are told here. Without it, everything in the scope would go on showing
   * what it was given at the old width until something else happened to it.
   */
  changeEverything();
  // Saying what has to be looked at again is not the same as anything looking. What runs
  // the passes is a settling, and only `filter/engine.ts` starts one
  settleAgain?.();
});

/** How to ask for a settling. Set by whoever runs them (`filter/engine.ts`) */
let settleAgain: (() => void) | null = null;

export const askForASettling = (ask: () => void): void => {
  settleAgain = ask;
};

/**
 * The scopes being watched. Held to be let go of: an Observer keeps what it watches
 * alive, so a column X has taken off the page would stay in memory — with every post in
 * it — for as long as the tab is open.
 */
const watching = new Set<Element>();

const watchSize = (element: Element): void => {
  if (watching.has(element)) return;
  watching.add(element);
  sizes.observe(element);
};

/** Lets go of the scopes that have left the page. Cheap: a deck holds a handful of them */
const forgetGoneScopes = (): void => {
  for (const element of watching) {
    if (element.isConnected) continue;
    sizes.unobserve(element);
    watching.delete(element);
  }
};

let watchingLoads = false;

/** Subscribes to what makes a measurement stale. Called before the first one is taken */
const watchMeasurements = (): void => {
  if (watchingLoads) return;
  watchingLoads = true;
  /*
   * A picture's height is only known once it has loaded, and until then it measures as
   * "not drawn yet". Caught on the way down because `load` does not bubble: a listener
   * on `document` still sees it in the capture phase, which is one listener for every
   * picture on the page rather than one apiece.
   */
  document.addEventListener(
    'load',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      frames.delete(target.closest(MEDIA_ANYWHERE) ?? target);
      // Forgetting what was measured is not enough on its own: the post it is in has to
      // be looked at again for anyone to ask (`changed.ts`)
      noticeChange(target);
    },
    true
  );
};

/**
 * X's own words for a picture nobody described (`appearance/alt.ts` says how they are
 * recognised).
 *
 * Kept here rather than worked out afresh each time: X has one such word per kind of
 * media and per interface language, and what is on screen at any one moment may not
 * repeat enough to show them.
 */
let genericAlts: ReadonlySet<string> = new Set();

/**
 * The words in force, from the settings.
 *
 * The learning never stops, because the words turn up one at a time: X has a different
 * one for a photo and for a video, and a page that shows plenty of the first may show
 * none of the second. Stopping at the first word found would leave the others out for
 * good. Nothing here is ever rewritten or dropped, only added to, so a word written by
 * hand stands as it was written.
 */
export const useGenericAlts = (words: readonly string[]): void => {
  genericAlts = new Set(words);
};

/**
 * The marker on a picture whose `title` is ours. No rule targets it: it is here so that
 * the tooltip can be taken off again without touching a `title` X may put there itself.
 */
const ALT_ATTR = 'data-xpro-alt';

/**
 * Puts the description written for a picture where it can be read: the tooltip on the
 * picture itself.
 *
 * Not a setting of its own. X carries the description but shows it nowhere on X Pro, so
 * there is nothing to weigh up — reading it is the only thing this can do, and a picture
 * nobody described is left untouched.
 *
 * Every picture on the page, not only those inside a scope: the description belongs to
 * the picture rather than to the column it happens to stand in, and nothing about it is
 * set per scope.
 *
 * Ours is marked, so that a description gone from a picture X has reused for another post
 * takes the tooltip with it, while a `title` that was never ours is never touched.
 *
 * The learning rides along on the same walk, both wanting the same thing of every picture.
 * Answers with X's own words where this round added one, for the caller to keep
 * (`content.ts`). null the rest of the time, which is every round once they are known.
 */
export const stampAltTitles = (): readonly string[] | null => {
  /** Every picture and what it says. Read once: walking the page is the whole cost here */
  const read: [Element, string | null][] = [];
  const unknown: PhotoAlt[] = [];
  // A round told which posts changed reads the pictures in those; a full round reads the
  // page, which is also where a picture standing outside any post is picked up
  for (const where of sweepIn(changedCells())) {
    where.querySelectorAll(MEDIA_ANYWHERE).forEach((picture) => {
      const alt = altTextOf(picture);
      read.push([picture, alt]);
      /*
       * Whose post a picture is on is only ever asked to prove a word is X's, so a word
       * already known to be one is not chased any further. That leaves the chasing to the
       * few pictures somebody described, and to the rounds before the words are known.
       */
      if (alt !== null && !genericAlts.has(alt))
        unknown.push({ alt, account: accountOfPicture(picture) });
    });
  }

  const before = genericAlts.size;
  genericAlts = learnGenericAlts(unknown, genericAlts);
  const learned = genericAlts.size > before ? [...genericAlts] : null;

  for (const [picture, alt] of read) {
    const description = descriptionOf(alt, genericAlts);
    if (description !== null) {
      // Written only where it would say something else: the same description goes back on
      // the same picture on every settling, and X keeps a picture for as long as the post
      // it is on stays on screen
      if (!picture.hasAttribute(ALT_ATTR)) picture.setAttribute(ALT_ATTR, '');
      if (picture.getAttribute('title') !== description) picture.setAttribute('title', description);
    } else if (picture.hasAttribute(ALT_ATTR)) {
      picture.removeAttribute(ALT_ATTR);
      picture.removeAttribute('title');
    }
  }
  return learned;
};

/**
 * Takes those tooltips off again. Called where the extension is paused: what it does is
 * not driven by the settings, so applying empty ones does not reach it (`content.ts`).
 */
export const clearAltTitles = (): void =>
  document.querySelectorAll(`[${ALT_ATTR}]`).forEach((picture) => {
    picture.removeAttribute(ALT_ATTR);
    picture.removeAttribute('title');
  });

const clearTimes = (): void =>
  document.querySelectorAll(`[${TIME_ATTR}]`).forEach((el) => {
    el.removeAttribute(TIME_ATTR);
    el.removeAttribute(TODAY_ATTR);
  });

/**
 * Renders a post's time in absolute form and sets it as a marker on the `time`'s parent.
 * Only the marker is set; X's own text is untouched and CSS decides how it is shown.
 * A redraw by X takes the marker with it, but this runs on every settling, so it is set again.
 */
const restampTimes = (
  columns: ColumnAppearance[],
  messages: Messages,
  changed: Set<Element> | null
): void => {
  const now = new Date();
  /** The times marked this round. What carries a marker outside them has it taken off */
  const marked = new Set<Element>();

  for (const { element, appearance } of columnsOnScreen(columns)) {
    // Under "both" only the clock time is added. X already shows either a relative
    // time or a month and day, so the clock time is what is missing; adding the date
    // as well steals width from the ID and hides it in narrow columns
    if (timeFormatOf(appearance.timeFormat) === 'relative') continue;
    for (const root of rootsIn(element, changed)) {
      root.querySelectorAll('time').forEach((time) => {
        const shown = timeTextFrom(time.getAttribute('datetime'), now, messages);
        // An unreadable time gets no marker. Marking it produces an empty `::after`,
        // which reads as the timestamp having vanished
        if (!shown) return;
        const parent = time.parentElement;
        if (!parent) return;
        marked.add(parent);
        /*
         * Written only where it would say something else. The marker is what the CSS
         * draws, so writing the same value again costs a style recalculation over that
         * post for nothing — and a post's time only changes when the minute does.
         */
        if (parent.getAttribute(TIME_ATTR) !== shown.text) parent.setAttribute(TIME_ATTR, shown.text);
        if (shown.today !== parent.hasAttribute(TODAY_ATTR)) {
          if (shown.today) parent.setAttribute(TODAY_ATTR, '');
          else parent.removeAttribute(TODAY_ATTR);
        }
  });
    }
  }

  // What was marked under a setting that no longer asks for it, or in a scope that is no
  // longer one, is stripped. Everything else is left exactly as it was
  for (const where of sweepIn(changed)) {
    where.querySelectorAll(`[${TIME_ATTR}]`).forEach((el) => {
      if (marked.has(el)) return;
      el.removeAttribute(TIME_ATTR);
      el.removeAttribute(TODAY_ATTR);
    });
  }
};

/**
 * Sets the media frame markers again. They are redone because a stale marker left
 * over from a tighter limit would keep that frame shrunk.
 */
const restampMediaFrames = (
  columns: ColumnAppearance[],
  changed: Set<Element> | null,
  measuring: boolean
): void => {
  /** The frames that should carry the marker at the end of this round */
  const wanted = new Set<Element>();
  /** The media nothing is remembered about. Measured together, and only if there are any */
  const unmeasured: { media: Element; limit: number; key: string }[] = [];

  for (const { element, appearance } of columnsOnScreen(columns)) {
    // How the limit is derived lives in `limitFor` alone. null means this scope wants no marker
    const limit = limitFor(appearance);
    if (limit === null) continue;
    /*
     * What is asked of hidden media is not a height but whether X drew it at all, and that
     * answer does not turn on how wide the column is or on anything else measured this
     * round — so it is kept until the media itself is replaced, or the scope stops hiding.
     *
     * It has to be. Once the frame carries the marker our rules take it off the page
     * altogether, and reading it again would find nothing drawn and take the marker back
     * off, putting the picture on a timeline the reader asked to have none.
     */
    const key = limit === 0 ? HIDDEN_KEY : measuredUnder(appearance);
    for (const root of measuring ? rootsToMeasure(element, changed) : rootsIn(element, changed)) {
      root.querySelectorAll(MEDIA_ANYWHERE).forEach((media) => {
        const known = frames.get(media);
        if (known && known.key === key) {
          if (known.frame) wanted.add(known.frame);
          return;
        }
        if (!measuring) {
          /*
           * Not measured yet, and this round is not the one to do it. What it was given
           * before stands: a frame already marked keeps its marker rather than losing it
           * for a round and getting it back
           */
          measureLater(media);
          const marked = media.closest(`[${MEDIA_FRAME_ATTR}]`);
          if (marked) wanted.add(marked);
          return;
        }
        unmeasured.push({ media, limit, key });
      });
    }
  }

  /**
   * Measures one and remembers it.
   *
   * A box drawn at no height is not remembered. It is not "short enough to leave alone",
   * it is a post folded away by a rule or not drawn yet, and remembering it would leave
   * the picture uncapped when the post is opened again ("Show").
   */
  const measure = ({ media, limit, key }: { media: Element; limit: number; key: string }): void => {
    if (media.getBoundingClientRect().height === 0) return;
    const frame = frameOf(media, limit);
    frames.set(media, { key, frame });
    if (frame) wanted.add(frame);
  };

  /*
   * What our own rules are doing to the box has to be out of the way before it can be
   * measured, or the height read back is the one we imposed rather than the one X would
   * draw — and taking it off is a write, which makes the browser lay the whole page out
   * again before the next reading. That is the expensive part of a round, not the reading.
   *
   * Where the rules take the media off the timeline altogether, nothing is taken off at
   * all: what is asked is only whether the media is drawn, and the frame around it is
   * still there to be read (`frameAround`).
   *
   * Where the rules cap the height, the cap still comes off the few boxes about to be
   * measured, inline so that only those boxes are affected.
   */
  const capped: typeof unmeasured = [];
  const hidden: typeof unmeasured = [];
  for (const one of unmeasured) (one.limit === 0 ? hidden : capped).push(one);

  // Counted apart because what each costs the page is not the same thing: one writes to
  // the page and pays for it, the other only reads
  counted('pictures uncapped', capped.length);
  counted('pictures read', hidden.length);
  if (capped.length > 0) {
    /*
     * Two things of ours stand between the box and its own height, and both come off
     * before any of it is read — all of them first, so the browser lays the page out
     * twice over rather than once per picture.
     *
     * The cap on the box itself is taken off inline, which reaches that box alone. The
     * marker on the frame around it has to go altogether: the frame's rule replaces its
     * height with the one we chose, and a picture measured under it reads back as exactly
     * the limit, which is not "too tall" — so it would lose the frame it needs. What is
     * still wanted is marked again below, out of what this round measures.
     */
    /** The frames the markers came off, so they can go back on if the reading falls over */
    const bared: Element[] = [];
    for (const { media } of capped) {
      for (
        let frame = media.closest(`[${MEDIA_FRAME_ATTR}]`);
        frame !== null;
        frame = frame.parentElement?.closest(`[${MEDIA_FRAME_ATTR}]`) ?? null
      ) {
        frame.removeAttribute(MEDIA_FRAME_ATTR);
        bared.push(frame);
      }
    }
    const inline = capped.map(({ media }) => {
      const el = media as HTMLElement;
      const had = el.style.getPropertyValue('max-height');
      const priority = el.style.getPropertyPriority('max-height');
      el.style.setProperty('max-height', 'none', 'important');
      return { el, had, priority };
    });
    let read = false;
    try {
      for (const one of capped) measure(one);
      read = true;
    } finally {
      /*
       * Put back however the measuring ended. An `!important` of ours left on the box
       * outlives the stylesheet's own cap, so a reading that threw would leave that
       * picture at full height for as long as the page is open, with nothing to put it
       * right again.
       */
      for (const { el, had, priority } of inline) {
        if (had === '') el.style.removeProperty('max-height');
        else el.style.setProperty('max-height', had, priority);
      }
      /*
       * The markers likewise. Where the reading finished, the sweep below decides which of
       * them are still wanted; where it did not, that sweep is not reached either, and
       * leaving them off would put every picture this round had capped back at full height
       * until a later round measured it again.
       */
      if (!read) for (const frame of bared) frame.setAttribute(MEDIA_FRAME_ATTR, '');
    }
  }

  /*
   * Hidden media is read rather than measured. What decides the answer is whether X has
   * drawn it at all, and the frame it sits in says that without a rule of ours being
   * touched: switching the whole stylesheet off and on again to ask the box itself costs
   * the browser two passes over every element on the page — 90 to 175ms on a real deck,
   * however few pictures had arrived.
   */
  for (const { media, limit, key } of hidden) {
    const { frame, drawn } = frameAround(media, limit);
    if (frame) {
      /*
       * A frame, whether it was read out of the page or was already marked. A marked one
       * answers at no height at all — our rules have taken it off the page — and that is
       * still the answer: dropping it here would take the marker off and put the picture
       * back on a timeline whose reader asked for none.
       */
      frames.set(media, { key, frame });
      wanted.add(frame);
      continue;
    }
    /*
     * No frame, and nothing drawn: a picture X has not got to yet, or a post folded away.
     * Nothing is remembered — what is kept under `HIDDEN_KEY` is kept for as long as the
     * media stands, and this answer would be wrong the moment X draws it — so it is looked
     * at again on a later round.
     */
    if (!drawn) continue;
    // Drawn, and nothing around it is a frame. That answer holds while the media does
    frames.set(media, { key, frame: null });
  }

  // Written after everything has been measured, and only where the marker is not already
  // as it should be: a write between two measurements costs another pass over the page
  for (const where of sweepIn(changed)) {
    where.querySelectorAll(`[${MEDIA_FRAME_ATTR}]`).forEach((marked) => {
      if (!wanted.has(marked)) marked.removeAttribute(MEDIA_FRAME_ATTR);
    });
  }
  for (const frame of wanted) {
    if (!frame.hasAttribute(MEDIA_FRAME_ATTR)) frame.setAttribute(MEDIA_FRAME_ATTR, '');
  }
};

/**
 * The button that opens the compose form, in X Pro's side rail.
 *
 * X paints it with the color the user picked, the same one it draws links in, and it is
 * there whether or not anything on screen happens to carry a link.
 * The rail is found by a marker of X Pro's own, and the button within it by being the
 * only one X paints a background on. Its label ("Post") changes with the interface
 * language and is not used.
 */
const COMPOSE_BUTTON_SELECTOR =
  'div:has(> [data-tourstep="side-nav-decks"]) button[style*="background-color"]';

/**
 * One of X's own links in a post, where the same color arrives as the text color.
 * Read when the button cannot be found, so that a change to the rail costs the color
 * rather than losing it.
 * Ours are left out: with a color of our own on them, the one written last time would be
 * read back as X's and would stay behind after the user picked another.
 */
const X_LINK_SELECTOR = `[${COLUMN_ATTR}] ${TWEET_TEXT_SELECTOR} a[style*="color:"]:not(.${ATTACHMENT_CLASS})`;

const styleOf = (selector: string): string | null =>
  document.querySelector(selector)?.getAttribute('style') ?? null;

/**
 * Reads the color X draws its links in, at most once per settling.
 *
 * One place anywhere is enough: the color is one setting for the whole of X, not
 * something a column decides. Reading per column would leave a column that happens to
 * hold no link showing a different color from the one beside it.
 * null when neither can be found, and what would have been painted is left to inherit
 * as before.
 */
const linkColorReader = (): (() => string | null) => {
  let read: string | null | undefined;
  return () => {
    if (read === undefined) {
      read =
        colorInStyle(styleOf(COMPOSE_BUTTON_SELECTOR), 'background-color') ??
        colorInStyle(styleOf(X_LINK_SELECTOR));
    }
    return read;
  };
};

/**
 * Draws what the extension added in the color X draws its own links in, so it reads as a
 * link rather than as body text.
 * Written inline, which the appearance's own link color still beats: that rule carries
 * `!important`. With no color to read, X's own is left to the stylesheet's fallback.
 */
const paintLikeLink = (el: HTMLElement, readLinkColor: () => string | null): void => {
  const color = readLinkColor();
  if (color === null) el.style.removeProperty('color');
  else if (el.style.color !== color) el.style.color = color;
};

/**
 * Colors one line by whether it opens anything.
 *
 * A card's line is a link and is drawn like one. A quote, an article, a photo have
 * nowhere to go — the frame X draws them in carries no address — so they stay in the
 * body's own color: painting them like links would promise a click that does nothing.
 */
const paintLine = (el: HTMLElement, line: Line, readLinkColor: () => string | null): void => {
  if (line.href === null) el.style.removeProperty('color');
  else paintLikeLink(el, readLinkColor);
};

const trimmed = (el: Element | null | undefined): string | null => el?.textContent?.trim() || null;

/**
 * What a card says. Which layout X drew it in is `cardTextOf`'s business, so that the
 * line put into the post and the "the card's domain is ○○" rules read one card alike.
 */
const cardPartsOf = (card: Element): LineParts => {
  const { domain, title } = cardTextOf(card);
  return { source: domain, words: title };
};

/**
 * The post a quote holds: what it says, and who wrote it.
 * The name comes with the ID, the way X writes them side by side: the ID alone often
 * says nothing about who it is, and the name alone is not unique.
 */
const quotePartsOf = (frame: Element): LineParts => {
  const author = authorOf(frame);
  const name = displayNameOf(frame);
  const who = [name, author === null ? null : `@${author}`].filter((part) => part !== null);
  const body = frame.querySelector(TWEET_TEXT_SELECTOR);
  return {
    // Only what the quoted post says. A quote of a post with a photo has a mark of ours
    // in that body, put there on an earlier settling, and reading it back would carry
    // the mark into this line and its tooltip
    words: body === null ? null : ownTextOf(body).trim() || null,
    source: who.length > 0 ? who.join(' ') : null,
  };
};

/**
 * The body a thing belongs to: the last one written before it.
 * Something inside a quote frame then lands on the quoted body, where it is shown.
 */
const bodyBefore = (el: Element, cell: Element): Element | null => {
  let found: Element | null = null;
  for (const text of cell.querySelectorAll(TWEET_TEXT_SELECTOR)) {
    if (text.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) found = text;
  }
  return found;
};

/**
 * The address to hand the line. Only `http(s)` is taken: the value comes out of the
 * page, and writing whatever it holds into an `href` of ours would carry a
 * `javascript:` URL along with it.
 */
const linkTargetOf = (card: Element): string | null => {
  const href = card.querySelector('a[href]')?.getAttribute('href') ?? null;
  return href && /^https?:\/\//i.test(href) ? href : null;
};

/**
 * One line to put into a post.
 * `source` is what it stands for and gets marked as moved; a photo has none, since the
 * whole column's media is hidden by a rule rather than one element at a time.
 */
type Line = {
  anchor: Element;
  source: Element | null;
  /**
   * What the line stands for, in the order it hangs off the post. A card, an article or a
   * quote is one of these; a post's photos are one apiece, so that what was written for a
   * picture follows that picture's own mark.
   */
  parts: LinePart[];
  /**
   * Whether the words are drawn dim: they are about the post rather than of it — the
   * description given to a picture, a quoted post's text. A card's headline is not, being
   * a link and drawn as one.
   */
  dim: boolean;
  /**
   * Whether the style asked for the mark alone. Then the words missing from the line are
   * not being held back but declined, and no "Show more" is wanted to undo that
   * (`ATTACHMENT_CUT_CLASS`).
   */
  terse: boolean;
  href: string | null;
  /** Whether it stands for the post's photos or videos, which are hidden per post */
  media?: true;
};

/** Whether that style asks for what it names to be put into the post as a line */
const movesCards = (style: AttachmentStyle): boolean => style === 'text' || style === 'mark';
const movesMedia = (style: MediaStyle): boolean => style === 'text' || style === 'mark';

/**
 * What hangs off a post, in the order the lines go in: the cards first, then the
 * article, then the photos and videos.
 *
 * The two sides are asked for separately. The cards and the photos are two settings, and
 * a post can well have its cards turned into text while its photos stay on screen.
 */
const linesIn = (
  cell: Element,
  quote: Element | null,
  appearance: AppearanceNode,
  messages: Messages,
  /** X's own words for a picture nobody described, so that they are not passed on as one */
  generic: ReadonlySet<string>
): Line[] => {
  const cardStyle = cardStyleOf(appearance.cardStyle);
  const quoteStyle = quoteStyleOf(appearance.quoteStyle);
  const mediaStyle = mediaStyleOf(appearance.media.style);
  const lines: Line[] = [];
  /**
   * The mark-only style shows the mark and keeps the words for the tooltip.
   * Asked of both settings: they are named apart, but `mark` means the same in each.
   */
  const shown = (style: AttachmentStyle | MediaStyle, words: string | null): string | null =>
    style === 'mark' ? null : words;

  if (movesCards(cardStyle)) {
    for (const card of cell.querySelectorAll(LINK_CARD)) {
      const parts = cardPartsOf(card);
      lines.push({
        anchor: card,
        source: card,
        parts: [
          partFor('link', shown(cardStyle, shortLineFrom(parts, messages, appearance.wordsShown)), lineTextFrom(parts, messages)),
        ],
        // A headline is a link, and is drawn like one
        dim: false,
        terse: cardStyle === 'mark',
        href: linkTargetOf(card),
      });
    }

    const article = cell.querySelector(ARTICLE);
    if (article) {
      // The headline sits in the block next to the cover image; the opening follows it
      // and is left behind, being a paragraph rather than a title
      const parts: LineParts = {
        words: trimmed(article.nextElementSibling?.children[0]),
        source: null,
      };
      lines.push({
        anchor: article,
        // The frame carries the border and is what has to go, not the cover image alone
        source: article.parentElement,
        parts: [
          partFor('article', shown(cardStyle, shortLineFrom(parts, messages, appearance.wordsShown)), lineTextFrom(parts, messages)),
        ],
        dim: false,
        terse: cardStyle === 'mark',
        href: null,
      });
    }
  }

  /*
   * The quoted post, under a setting of its own. X Pro's frame is a `div` with no
   * address on it, so the line carries no link: the quoted post is reached by opening
   * the post, where everything is shown as it was.
   */
  if (quote && movesCards(quoteStyle)) {
    const parts = quotePartsOf(quote);
    lines.push({
      anchor: quote,
      source: quote,
      parts: [
        partFor('quote', shown(quoteStyle, shortLineFrom(parts, messages, appearance.wordsShown)), lineTextFrom(parts, messages)),
      ],
      // Somebody else's post, said in their words rather than this post's
      dim: true,
      terse: quoteStyle === 'mark',
      href: null,
    });
  }

  if (movesMedia(mediaStyle)) {
    // A photo and a video are marked separately: which one hung off the post is worth knowing
    for (const [kind, selector] of [
      ['photo', PHOTO],
      ['video', VIDEO.join(', ')],
    ] as const) {
      /*
       * One video answers to both of X's markers, so only the outer one is counted:
       * otherwise its description goes into the line twice (`isOutermostMedia`).
       *
       * A quoted post's pictures are not this post's, and are left out of both the count
       * and the words. Counted, they made the post look as though it carried more; and
       * their descriptions, set down in the quoting post, read as the quoting author's.
       * The quoted post stands for itself, under its own setting.
       */
      const pictures = [...cell.querySelectorAll(selector)]
        .filter(isOutermostMedia)
        .filter((picture) => quote === null || !quote.contains(picture));
      // One line per kind, however many there are: each picture gets a mark of its own
      // inside it, so a post with four photos carries four marks on the one line
      const first = pictures[0];
      if (!first) continue;
      /*
       * A mark apiece, each carrying what that picture's author wrote for it: the words
       * shown beside it, cut to the length a line has room for, and the whole of them in
       * the tooltip. A picture nobody described has neither, and its mark stands alone —
       * which is what says "there was a fourth photo, and nothing was written for it".
       */
      const parts = pictures.map((picture) => {
        const said: LineParts = { words: descriptionOf(altTextOf(picture), generic), source: null };
        return partFor(
          kind,
          shown(mediaStyle, shortLineFrom(said, messages, appearance.wordsShown)),
          lineTextFrom(said, messages)
        );
      });
      lines.push({
        anchor: first,
        source: null,
        parts,
        // What the author wrote about the picture, not what the post says
        dim: true,
        terse: mediaStyle === 'mark',
        href: null,
        media: true,
      });
    }
  }

  return lines;
};

/**
 * How the lines go into one body: what parts them from the post's own words, whether the
 * words they carry are dropped in favour of the mark alone, and whether they stand outside
 * the body rather than at the end of it.
 *
 * They always go after the post's own words. Putting them in front was tried, to keep them
 * out of reach of the line limit's cut, but a mark standing before the post's first words
 * reads as part of them; and where the limit did not reach, the same line sat at the other
 * end instead, so which end it was on told the reader nothing.
 *
 * `outside` is what keeps them from being cut instead. A line inside the body is counted
 * by `-webkit-line-clamp` along with the post's words, and a body limited to a line or two
 * is filled by those words alone — the mark then goes with everything past the cut, and a
 * post whose photos are hidden shows no sign of ever having had one. Outside the body the
 * cut cannot reach it, and the order reads as it should: the words, the mark, then the
 * "Show more" that opens the rest.
 */
type Placement = { lead: string; marksOnly: boolean; full: boolean; outside: boolean };

/**
 * What comes before a line at the end of a body: a break, always.
 *
 * It needs something in front, or it butts against the last word, and a line of its own is
 * where it reads best. Where the post's own line breaks are being folded into spaces, this
 * one is folded along with them by the same rule (`white-space: normal`), so the setting
 * still gets the single paragraph it asks for.
 */
const LEAD = '\n';

/** Where the post has no body, the line stands on its own with nothing around it to answer to */
const ON_ITS_OWN: Placement = { lead: '', marksOnly: false, full: false, outside: false };

/**
 * What the lines say in one body, and whether they stand outside it.
 *
 * Both follow from one thing: whether the post is being shown cut short.
 *
 * A post that is cut gets marks alone, standing outside the body. Alone, because a post
 * showing a line or two of its own words has no room for a headline that can take three
 * more; outside, because `-webkit-line-clamp` counts whatever is inside the body and a
 * body already filled by the post's own words would take the mark away with the rest.
 *
 * Cut covers X's own doing as well as ours. X shortens a long post whether or not a limit
 * of ours is set, and a post cut by X while our line spelled out a whole description
 * underneath read as though the two belonged to different posts.
 *
 * Opened, everything is shown as it was written — the words come back and the line goes
 * back inside the body, where it reads as part of the post. Both buttons lead here: ours,
 * and X's own, which `listenToXShowMore` watches for.
 */
const placementFor = (body: Element, cell: Element, appearance: AppearanceNode): Placement => {
  /*
   * Opened by "Show more": the words go in whole. Nothing is being saved room for any
   * more, so cutting them to the length a line has room for would only hold back what the
   * press asked to see.
   */
  if (cell.classList.contains(OPENED_CLASS)) {
    return { lead: LEAD, marksOnly: false, full: true, outside: false };
  }
  // Our limit spares the body inside a quote (matching `textOutsideQuote` in css.ts)
  const ourLimit = appearance.maxLines !== null && !body.closest(QUOTE_SELECTOR);
  // X's own cut is asked of the whole cell, the way `wantsShowMore` asks it
  const cut = ourLimit || cell.querySelector(X_SHOW_MORE) !== null;
  return cut
    ? { lead: '', marksOnly: true, full: false, outside: true }
    : { lead: LEAD, marksOnly: false, full: false, outside: false };
};

/** The line's text: the break that parts it from the body, then what it has to say */
const textFor = (line: Line, where: Placement): string =>
  `${where.lead}${lineFrom(line.parts, where)}`;

/** The tooltips a line's marks carry, in order, as one string to compare against */
const titlesIn = (titles: readonly (string | null)[]): string => titles.map((t) => t ?? '').join('\u0000');

/**
 * Whether that element already says what the line says.
 * The tooltips are looked for on the marks inside, which is where they are put.
 */
const matches = (el: Element, line: Line, where: Placement): boolean =>
  el.textContent === textFor(line, where) &&
  (el.getAttribute('href') ?? null) === line.href &&
  titlesIn([...el.querySelectorAll(`.${ATTACHMENT_MARK_CLASS}`)].map((m) => m.getAttribute('title'))) ===
    // Compared against the tooltips this shape would put on, not against every one the
    // parts could carry: a mark opened out has said its whole piece and keeps none
    titlesIn(line.parts.map((part) => (moreThanShown(part, where) ? part.title : null)));

/**
 * Builds the element for one line: an `a` where there is something to open, a `span` where
 * there is not, holding the mark and — where they are shown — the words after it.
 *
 * The two are separate elements so that each can be treated on its own: the tooltip goes
 * on the mark, where it is the only way to the whole of what the line stands for, and not
 * on the words, where it would repeat under the pointer what is already being read. The
 * words of a picture or a quote are drawn dim, being about the post rather than of it.
 */
const lineElement = (line: Line, where: Placement): HTMLElement => {
  const el = document.createElement(line.href === null ? 'span' : 'a');
  if (el instanceof HTMLAnchorElement && line.href !== null) {
    el.href = line.href;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  }
  fillLine(el, line, where);
  return el;
};

/** Puts the marks and the words into a line, replacing whatever it held */
const fillLine = (el: HTMLElement, line: Line, where: Placement): void => {
  const shows = line.parts.some((part) => wordsShown(part, where) !== null);
  // Told apart however it came to be the marks alone — the style asking for it, the post
  // being shown cut short, or there being no words to show in the first place
  el.className = shows ? ATTACHMENT_CLASS : `${ATTACHMENT_CLASS} ${MARK_CLASS}`;
  /*
   * Whether anything is being kept from the reader, which is what a "Show more" is put in
   * for (`wantsShowMore`). Not the same as "the line is not saying everything": under the
   * mark-only style the words were declined rather than held back, and a button offering
   * to undo the setting would be answering a question nobody asked.
   */
  if (!line.terse && line.parts.some((part) => moreThanShown(part, where))) {
    el.classList.add(ATTACHMENT_CUT_CLASS);
  }
  el.replaceChildren();
  if (where.lead !== '') el.append(where.lead);

  line.parts.forEach((part, i) => {
    // Parted from the one before it, unless the marks are run together with nothing between
    if (i > 0 && shows) el.append(' ');
    const mark = document.createElement('span');
    mark.className = ATTACHMENT_MARK_CLASS;
    mark.textContent = part.mark;
    /*
     * A mark says more than it is showing where it stands alone, and where the words
     * beside it were cut to the length a line has room for. Only then is there anything to
     * put on it: a tooltip repeating what is already on screen says nothing.
     */
    /*
     * A tooltip goes on exactly where the mark has more to say than it is showing: on the
     * mark alone, and only while something is still held back. What opens it out is the
     * "Show more" under the post (`addShowMore`), which is put there for our lines as well
     * as for a body the limit cut.
     */
    if (moreThanShown(part, where)) mark.title = part.title!;
    el.append(mark);

    const words = wordsShown(part, where);
    if (words !== null) {
      const said = document.createElement('span');
      if (line.dim) said.className = ATTACHMENT_WORDS_CLASS;
      said.textContent = words;
      el.append(' ', said);
    }
  });
};



/**
 * The lines the extension put for one body, wherever they were put: inside it, or standing
 * after it. Both places are searched because the line limit decides which one is used, and
 * a limit set or lifted has to find the ones left at the other.
 */
const linesOf = (body: Element): Element[] => {
  const inside = [...body.querySelectorAll(`.${ATTACHMENT_CLASS}`)];
  const after: Element[] = [];
  for (
    let el = body.nextElementSibling;
    el !== null && el.classList.contains(ATTACHMENT_CLASS);
    el = el.nextElementSibling
  ) {
    after.push(el);
  }
  return [...inside, ...after];
};

/**
 * The last thing the extension put after that body, or the body itself where it put
 * nothing. What the "Show more" goes under, so that the order reads words, mark, button.
 */
const lastLineAfter = (body: Element): Element => {
  let last: Element = body;
  for (
    let el = body.nextElementSibling;
    el !== null && el.classList.contains(ATTACHMENT_CLASS);
    el = el.nextElementSibling
  ) {
    last = el;
  }
  return last;
};

/**
 * The block a photo or a video occupies: the outermost thing around it that holds no
 * text of the post. It is the same range `frameOf` walks, without the measuring.
 *
 * A line put before this one lands where the media was and stays outside everything the
 * hiding reaches — the box, and the frame the height limit marks. Going by the frame's
 * marker instead would depend on it having been set already, and a frame that only
 * appears once the media has loaded would leave the line hidden inside it.
 */
const mediaBlockOf = (media: Element, cell: Element): Element => {
  let block = media;
  for (let el = media.parentElement; el && el !== cell; el = el.parentElement) {
    if (el.querySelector(TEXT_SELECTOR)) break;
    block = el;
  }
  return block;
};

/**
 * Where a line goes when the post has no body to put it in: in front of the thing it
 * stands for, so it is left where that thing was.
 * For a card that is the frame around it (`source`), which is what gets hidden.
 */
const insertionPoint = (line: Line, cell: Element): Element =>
  line.source ?? mediaBlockOf(line.anchor, cell);

/**
 * Puts what hangs off each post into the post itself, as a line of text apiece, and
 * marks what the line came from so the CSS can take it away.
 *
 * The line goes inside the body, so it follows the body's size and color and is cut by
 * the line limit along with it, and it carries the link where there is one to carry.
 * A post with no body — a photo posted on its own, an article — takes its lines where
 * what they stand for was, so nothing is left saying nothing.
 */
const restampAttachments = (
  columns: ColumnAppearance[],
  messages: Messages,
  readLinkColor: () => string | null,
  generic: ReadonlySet<string>,
  changed: Set<Element> | null
): void => {
  /** The lines and the sources that belong to this round. Anything else is left over */
  const live = new Set<Element>();

  for (const { element, appearance } of columnsOnScreen(columns)) {
    /*
     * The scopes with a post opened stand down, as they do in the CSS (`OPENED_ATTR`):
     * that post is there to be read, and its card stays on screen. Putting a line in as
     * well would say the same thing twice.
     */
    if (element.hasAttribute(OPENED_ATTR)) continue;
    const cardStyle = cardStyleOf(appearance.cardStyle);
    const quoteStyle = quoteStyleOf(appearance.quoteStyle);
    const mediaStyle = mediaStyleOf(appearance.media.style);
    if (!movesCards(cardStyle) && quoteStyle === 'show' && !movesMedia(mediaStyle)) continue;
    for (const cell of cellsIn(element, changed)) {
      // Found once for the cell: the line for it, and the taking away of it, both need it
      const tweet = cell.querySelector(TWEET_SELECTOR);
      const quote = tweet && quoteFrameOf(tweet);
      /*
       * A quote set to not show is taken away without a line. It cannot be done in the CSS
       * as the cards are: a quote frame is told apart by the avatar inside it not being the
       * author's, and no selector can say that
       */
      if (quote && quoteStyle === 'hidden') {
        quote.setAttribute(CARD_MOVED_ATTR, '');
        live.add(quote);
      }

      const lines = linesIn(cell, quote, appearance, messages, generic);
      if (lines.length === 0) continue;

      /** The lines that go into a body, gathered per body: a quoted card goes into the quoted body */
      const inBodies = new Map<Element, Line[]>();
      /** The rest, which stand where what they came from was */
      const onTheirOwn: Line[] = [];
      for (const line of lines) {
        const body = bodyBefore(line.anchor, cell);
        if (body) inBodies.set(body, [...(inBodies.get(body) ?? []), line]);
        else onTheirOwn.push(line);
      }

      for (const [body, wanted] of inBodies) {
        // Decided per body: the body inside a quote is outside our limit altogether
        const where = placementFor(body, cell, appearance);
        // Wherever they were put last time. The limit coming or going moves them, and the
        // ones left at the other place have to be found to be taken away
        const existing = linesOf(body);
        /*
         * Left as they are while they still say the same thing. Rebuilding them on every
         * settling would take the text away from under a selection or a click.
         * Compared as a whole rather than one by one: with the count or the order changed,
         * which of them to keep is not worth working out.
         */
        const same =
          existing.length === wanted.length &&
          existing.every((el, i) => matches(el, wanted[i]!, where));
        if (!same) existing.forEach((el) => el.remove());
        const put = wanted.map((line, i) => {
          const el = same ? (existing[i] as HTMLElement) : lineElement(line, where);
          paintLine(el, line, readLinkColor);
          live.add(el);
          return el;
        });
        // Outside they go straight after the body, in the order they were built; inside they
        // go at its end. Either way the "Show more" is put under them (`addShowMore`)
        if (!same) {
          if (where.outside) body.after(...put);
          else put.forEach((el) => body.append(el));
        }
      }

      for (const line of onTheirOwn) {
        const point = insertionPoint(line, cell);
        // The one that would already be in that place, kept for the same reason as above
        const before = point.previousElementSibling;
        const standing =
          before instanceof HTMLElement &&
          before.classList.contains(ATTACHMENT_CLASS) &&
          matches(before, line, ON_ITS_OWN);
        const el = standing ? (before as HTMLElement) : lineElement(line, ON_ITS_OWN);
        if (!standing) point.before(el);
        paintLine(el, line, readLinkColor);
        live.add(el);
      }

      for (const line of lines) {
        if (!line.source) continue;
        line.source.setAttribute(CARD_MOVED_ATTR, '');
        live.add(line.source);
      }
      /*
       * The media has no one element to take away — a post can hold four photos — so the
       * post is marked instead and the rule hides what is inside it
       */
      if (lines.some((line) => line.media)) {
        cell.setAttribute(MEDIA_MARKED_ATTR, '');
        live.add(cell);
      }
    }
  }

  clearAttachments(live, sweepIn(changed));
};

/**
 * Takes away the lines and the markers that no longer belong to something being moved.
 * Left in place, a post would keep a line while what it stood for is back on screen.
 */
const clearAttachments = (
  live: Set<Element> = new Set(),
  where: (Element | Document)[] = [document]
): void => {
  for (const root of where) {
    root.querySelectorAll(`.${ATTACHMENT_CLASS}`).forEach((line) => {
      if (!live.has(line)) line.remove();
    });
    root.querySelectorAll(`[${CARD_MOVED_ATTR}]`).forEach((source) => {
      if (!live.has(source)) source.removeAttribute(CARD_MOVED_ATTR);
    });
    root.querySelectorAll(`[${MEDIA_MARKED_ATTR}]`).forEach((cell) => {
      if (!live.has(cell)) cell.removeAttribute(MEDIA_MARKED_ATTR);
    });
    /*
     * A post working from the changed ones is itself one of the places to tidy, and the
     * marker it carries is on the post rather than inside it
     */
    if (root instanceof Element && !live.has(root)) root.removeAttribute(MEDIA_MARKED_ATTR);
  }
};

/**
 * Writes under a picture the description its author gave it.
 *
 * The tooltip `stampAltTitles` puts on the picture says the same thing and takes up no
 * room saying it, but it says it only to a pointer: a `title` cannot be reached at all on
 * a screen there is nothing but a finger for. This is that same text put where it is
 * simply read, in the columns whose setting asks for it.
 *
 * One caption to a block of media rather than one to a picture. X lays four photos out as
 * boxes it positions itself, and a line of text dropped between them would land inside
 * that layout; so a post's descriptions share the one caption, a line apiece, in the order
 * the pictures hang off the post.
 *
 * Not held back where a post is opened, unlike the rules that take things off a timeline
 * (`OPENED_ATTR`): those stand down because the post was opened to be read, which is a
 * reason to leave this one running — it adds words rather than removing anything.
 *
 * Folded to a couple of lines, with a button under it where there is more. Of the
 * descriptions people were seen to write, most ran to several lines and the longest to
 * some 900 characters, so a caption laid out in full would bury the timeline it is meant
 * to be read alongside.
 */
const restampCaptions = (
  columns: ColumnAppearance[],
  messages: Messages,
  readLinkColor: () => string | null,
  changed: Set<Element> | null
): void => {
  /**
   * The quote frame of a cell, asked at most once for each.
   *
   * Finding one means searching the post (`quoteFrameOf`), so only the cells that got as
   * far as holding a described picture are ever asked.
   */
  const quoteFrames = new Map<Element, Element | null>();
  const quotedIn = (cell: Element): Element | null => {
    if (!quoteFrames.has(cell)) {
      const tweet = cell.querySelector(TWEET_SELECTOR);
      quoteFrames.set(cell, tweet ? quoteFrameOf(tweet) : null);
    }
    return quoteFrames.get(cell) ?? null;
  };

  /**
   * What goes under each block: which picture of that block each description belongs to,
   * how much of it a caption shows, and the whole of it for once it is opened out.
   *
   * Cut to the same length the line put into a post is cut to (`shortLineFrom`), so that
   * the two ways of showing a description show the same amount of it.
   */
  const blocks = new Map<Element, { nth: number; short: string; full: string }[]>();
  /** How many pictures each block holds, described or not. What the numbering counts against */
  const counts = new Map<Element, number>();
  /*
   * Walked a column at a time, because how much of a description goes on screen is that
   * column's own setting (`wordsShown`). Gathering every column's pictures in one sweep
   * would leave each of them to be traced back to a column afterwards.
   */
  for (const { element, appearance } of columnsOnScreen(columns)) {
    if (mediaStyleOf(appearance.media.style) !== 'caption') continue;
    for (const root of rootsIn(element, changed)) {
      root.querySelectorAll(MEDIA_ANYWHERE).forEach((picture) => {
        // A video answers to both of X's markers; counted twice it would write its
        // description out twice under the one picture
        if (!isOutermostMedia(picture)) return;
        const cell = picture.closest(CELL_SELECTOR);
        if (!cell) return;
        /*
         * A quoted post's picture is left alone. The words written for it are the quoted
         * author's, and set down in the quoting post they read as the quoting author's — the
         * one place a description can say the wrong thing about who said it.
         */
        if (quotedIn(cell)?.contains(picture)) return;
        const block = mediaBlockOf(picture, cell);
        /*
         * Counted before the description is looked at, so the number says which picture this
         * is among all of them. Counting only the described ones would call the third
         * picture of four "the first" whenever the two before it carried nothing.
         */
        const nth = (counts.get(block) ?? 0) + 1;
        counts.set(block, nth);
        // A picture nobody described has nothing to say, and takes no caption. X's own word
        // for one is not a description (`appearance/alt.ts`)
        const description = descriptionOf(altTextOf(picture), genericAlts);
        if (description === null) return;
        const said: LineParts = { words: description, source: null };
        const short = shortLineFrom(said, messages, appearance.wordsShown);
        const full = lineTextFrom(said, messages);
        if (short === null || full === null) return;
        blocks.set(block, [...(blocks.get(block) ?? []), { nth, short, full }]);
      });
    }
  }

  /** The captions this round put in or kept. The rest stand under a picture that no longer says anything */
  const live = new Set<Element>();
  for (const [block, written] of blocks) {
    // Where X offers the description itself, it is left to X. Asked once the block is
    // known, and only of the blocks that had something to say (`showsOwnAltButton`)
    if (showsOwnAltButton(block)) continue;
    /*
     * Which picture each description belongs to, but only where the post carries more than
     * one. With a single picture the caption sits under the thing it describes and saying
     * "the first" adds nothing; with four in a grid, an unlabelled run of lines leaves the
     * reader to guess which is which — and the pictures nobody described leave gaps in it.
     */
    const many = (counts.get(block) ?? 0) > 1;
    const said = (nth: number, description: string): string =>
      many ? messages.appearance.media.captionNth(nth, description) : description;
    const short = written.map((one) => said(one.nth, one.short)).join('\n');
    const full = written.map((one) => said(one.nth, one.full)).join('\n');
    const next = block.nextElementSibling;
    const standing =
      next instanceof HTMLElement && next.classList.contains(CAPTION_CLASS) ? next : null;
    const caption = standing ?? captionElement();
    if (!standing) block.after(caption);
    const words = caption.querySelector(`.${CAPTION_TEXT_CLASS}`);
    if (!words) continue;
    /*
     * A caption showing neither of these stands under a picture X has since put another
     * post's in, so whatever was opened was opened on words that are no longer there.
     */
    const stale = words.textContent !== short && words.textContent !== full;
    if (stale) caption.classList.remove(CAPTION_OPEN_CLASS);
    const opened = caption.classList.contains(CAPTION_OPEN_CLASS);
    const text = opened ? full : short;
    // Rewritten only where the words changed, so that a selection is not taken out from
    // under the reader on every settling
    if (words.textContent !== text) words.textContent = text;
    live.add(caption);
    /*
     * The button, only while something is being held back. Nothing is measured to know
     * that: the two texts differ exactly when the cut took something off, which is the
     * same test the line put into a post is judged by.
     */
    showMore(caption, !opened && short !== full, messages, readLinkColor, () => {
      caption.classList.add(CAPTION_OPEN_CLASS);
      words.textContent = full;
    });
  }
  clearCaptions(live, sweepIn(changed));
};

/** A caption, empty. The words go in a box of their own so the fold cannot reach the button */
const captionElement = (): HTMLElement => {
  const caption = document.createElement('div');
  caption.className = CAPTION_CLASS;
  const words = document.createElement('div');
  words.className = CAPTION_TEXT_CLASS;
  /*
   * The words are kept out of the accessibility tree.
   *
   * The picture's own `alt` already carries them, and carries them unfolded. This copy is
   * for someone looking at a screen with no pointer to hover with; read out as well, it
   * would only say the same description twice over.
   *
   * The marker goes on the words alone and not on the caption around them. The button is
   * focusable, and a focusable thing inside an `aria-hidden` range can be reached by the
   * keyboard while being announced as nothing at all — worse than the repetition this is
   * here to stop.
   */
  words.setAttribute('aria-hidden', 'true');
  caption.append(words);
  return caption;
};

/**
 * Puts the button under a caption holding something back, and takes it away again where
 * there is nothing left to open — the caption was opened, or the words were replaced by
 * shorter ones that go in whole.
 */
/**
 * What each caption's button does, refreshed every round.
 *
 * A button kept from an earlier round would otherwise open the words it was built with,
 * and X puts another post's picture in a box it has finished with — the caption is
 * rewritten for the new one while the button still holds what the old one said.
 */
const opens = new WeakMap<Element, () => void>();

const showMore = (
  caption: HTMLElement,
  folded: boolean,
  messages: Messages,
  readLinkColor: () => string | null,
  open: () => void
): void => {
  const existing = caption.querySelector(`.${CAPTION_MORE_CLASS}`);
  if (!folded) {
    existing?.remove();
    return;
  }
  // Already there: the words it opens are set again — they belong to whatever picture
  // stands above it now — and the color is looked at, in case X's was changed
  if (existing instanceof HTMLElement) {
    opens.set(existing, open);
    paintLikeLink(existing, readLinkColor);
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = CAPTION_MORE_CLASS;
  button.textContent = messages.showMore;
  paintLikeLink(button, readLinkColor);
  opens.set(button, open);
  button.addEventListener('click', (event) => {
    // Both sites open the post when anything inside it is clicked, and this button is
    // inside one. Without this the description opens and the post opens over the top of it
    event.stopPropagation();
    // Looked up rather than closed over, so that it is this round's words that open
    opens.get(button)?.();
    button.remove();
  });
  caption.append(button);
};

/**
 * Takes away the captions that no longer belong under a picture. Left in place, one would
 * describe whatever X reused that box for.
 */
const clearCaptions = (
  live: Set<Element> = new Set(),
  where: (Element | Document)[] = [document]
): void => {
  for (const root of where) {
    root.querySelectorAll(`.${CAPTION_CLASS}`).forEach((caption) => {
      if (!live.has(caption)) caption.remove();
    });
  }
};

/** The height of one line. Estimated from the font size when `line-height` is `normal` */
const lineHeightOf = (text: Element): number => {
  const style = getComputedStyle(text);
  const lineHeight = parseFloat(style.lineHeight);
  return Number.isFinite(lineHeight) ? lineHeight : parseFloat(style.fontSize) * 1.2;
};

/**
 * Whether that body wants a "Show more" under it.
 *
 * Every reason not to have one is gathered here, because each of them is also a reason
 * to take away the one that is already there. A button standing under a body that is no
 * longer cut off says there is more to read where there is not, and the ways a body
 * stops being cut off — the column has a post opened in it, the posts get packed, the
 * limit is lifted — arrive long after the button was put in.
 */
const wantsShowMore = (
  text: Element,
  appearance: AppearanceNode,
  measuring: boolean
): boolean | null => {
  // Body text inside a quote is outside the limit (matching the targets in css.ts).
  // A scope with a post opened is too, and is turned away by the caller, which knows
  // the scope without having to walk up from the body to find it
  if (text.closest(QUOTE_SELECTOR)) return false;
  const cell = text.closest(CELL_SELECTOR);
  if (!cell || cell.classList.contains(OPENED_CLASS)) return false;
  // Nothing is added to a cell that has X's own "Show more". Two side by side would
  // mean pressing both to get the full text. X sometimes brings one out later, so in
  // that case the added button is withdrawn
  if (cell.querySelector(X_SHOW_MORE)) return false;

  /*
   * A line of ours holding something back wants the button too, and wants it whether or
   * not a limit was ever set on the body. A description of a couple of hundred characters
   * shows its first eighty, and on a post nothing else cut short there would otherwise be
   * nothing to press: the rest would be in the tooltip alone, out of reach of a finger.
   *
   * Told from the marker the line is given when it holds something back
   * (`ATTACHMENT_CUT_CLASS`), which is narrower than "carries a tooltip": the mark-only
   * style keeps its tooltip while wanting no button.
   */
  if (linesOf(text).some((line) => line.classList.contains(ATTACHMENT_CUT_CLASS))) return true;

  if (appearance.maxLines === null) return false;
  // Measured last: it costs a layout, and everything above is a lookup
  return overflowsLimit(text, appearance, appearance.maxLines, measuring);
};

/**
 * Whether that body holds more than the limit shows.
 *
 * Being cut off is not enough; the text must also have reached the limit. Where X itself
 * truncates the body, the text is "overflowing" as well, and a 5-line limit would
 * collapse it at 2. This also guards against the height wobbling mid-render.
 *
 * Measured once and remembered (see "What was measured"). What is remembered alongside is
 * how long the words were and what limit they were measured against: X puts another
 * post's words in a body it has finished with, and the answer for those is not this one.
 *
 * A body drawn at no height is not remembered. It is not short, it is not on screen yet,
 * and remembering "it fits" would leave the button off once it appears.
 */
const overflowsLimit = (
  text: Element,
  appearance: AppearanceNode,
  maxLines: number,
  measuring: boolean
): boolean | null => {
  const key = `${measuredUnder(appearance)}|${text.textContent?.length ?? 0}`;
  const known = overflows.get(text);
  if (known && known.key === key) return known.over;
  // Nothing to say yet: the caller leaves this body as it found it (see `MEASURE_MS`)
  if (!measuring) {
    measureLater(text);
    return null;
  }

  counted('bodies measured', 1);
  const height = text.clientHeight;
  if (height === 0) return false;
  const reachesLimit = height >= (maxLines - 0.5) * lineHeightOf(text);
  const over = reachesLimit && text.scrollHeight > height + 2;
  overflows.set(text, { key, over });
  return over;
};

/**
 * Puts a "Show more" under body text cut off by the line limit, and takes it away again
 * where it is no longer wanted.
 * Whether it is cut off can only be measured (CSS alone cannot show the button on
 * overflowing posts only). Clicking adds a class to that cell, lifting the CSS
 * limit for that cell alone.
 */
const addShowMore = (
  columns: ColumnAppearance[],
  messages: Messages,
  readLinkColor: () => string | null,
  changed: Set<Element> | null,
  measuring: boolean
): void => {
  /*
   * Every body is decided before any of them is written to. Deciding costs a measurement
   * (`overflowsLimit`), and a write in between makes the next measurement wait for the
   * page to be laid out again — with a body decided and written one after the other, a
   * timeline of several hundred posts pays that hundreds of times over.
   */
  const decided: {
    text: Element;
    under: Element;
    existing: HTMLElement | null;
    wanted: boolean | null;
  }[] = [];
  for (const { element, appearance } of columnsOnScreen(columns)) {
    // A scope with a post opened has no limit to open out of, and neither has one with
    // the posts packed (see `wantsShowMore`). Asked once here rather than per body
    const wants = !element.hasAttribute(OPENED_ATTR) && !isCompact(appearance.compact);
    const where = measuring ? rootsToMeasure(element, changed) : rootsIn(element, changed);
    for (const root of where) {
      root.querySelectorAll(TWEET_TEXT_SELECTOR).forEach((text) => {
        /*
         * The button belongs under everything the extension put after the body, not directly
         * under the body: with the marks standing out there too, the order to read is the
         * post's words, then the mark, then the way to open the rest.
         */
        const under = lastLineAfter(text);
        const next = under.nextElementSibling;
        const existing =
          next instanceof HTMLElement && next.classList.contains(MORE_CLASS) ? next : null;
        decided.push({
          text,
          under,
          existing,
          wanted: wants ? wantsShowMore(text, appearance, measuring) : false,
        });
      });
    }
  }

  for (const { text, under, existing, wanted } of decided) {
    // No answer yet: this body is left exactly as it was found (see `MEASURE_MS`)
    if (wanted === null) continue;
    if (!wanted) {
      // A button put in before the marks were is not where it belongs any more, so it is
      // looked for past them as well as under them
      (existing ?? strayShowMore(text))?.remove();
      continue;
    }
    // Already there: only the color is looked at again, in case X's was changed
    if (existing) {
      paintLikeLink(existing, readLinkColor);
      continue;
    }
    // One left above the marks from an earlier round is moved down rather than doubled
    strayShowMore(text)?.remove();

    const cell = text.closest(CELL_SELECTOR);
    if (!cell) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = MORE_CLASS;
    button.textContent = messages.showMore;
    paintLikeLink(button, readLinkColor);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      cell.classList.add(OPENED_CLASS);
      // The words come back in and the marks move back inside the body, which is this
      // post's line being built again — the class alone is not something the watch sees
      noticeChange(cell);
      button.remove();
    });
    under.after(button);
  }
};

/**
 * A "Show more" sitting directly under the body while the marks stand below it — left
 * there by a round before those marks went in. It is taken away and put back in order.
 */
const strayShowMore = (text: Element): Element | null => {
  const next = text.nextElementSibling;
  return next !== null && next.classList.contains(MORE_CLASS) ? next : null;
};

/**
 * When X's own "Show more" is pressed, lift our limit for that cell too.
 * X's truncation and ours overlap, so lifting only one still leaves the text short.
 * A single capturing listener on `document` is enough (it arrives even if X stops
 * the event further in).
 */
let listening = false;
const listenToXShowMore = (): void => {
  if (listening) return;
  listening = true;
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const cell = target.closest(X_SHOW_MORE)?.closest(CELL_SELECTOR);
      if (!cell) return;
      cell.classList.add(OPENED_CLASS);
      // The same as our own button: what the post shows changed, its content did not
      noticeChange(cell);
    },
    true
  );
};

/**
 * Where to say something about a slow round of measuring. Handed over at startup, because
 * this side has no screen and no logger of its own (`filter/engine.ts` has both).
 */
let logSlow: ((message: string, style: string) => void) | null = null;

export const sayWhereSlow = (log: (message: string, style: string) => void): void => {
  logSlow = log;
};

/** The per-column appearances applied most recently. Used to re-mark on every settling */
let lastColumns: ColumnAppearance[] = [];
let lastMessages: Messages | null = null;

/**
 * Sets the media frame markers again (called on every settling of the DOM).
 * It measures sizes, so it only measures when some tier sets a height limit, and only
 * what has not been measured already (see "What was measured").
 */
export const stampMediaFrames = (): void => {
  watchMeasurements();
  forgetGoneScopes();
  /*
   * Which posts this round has to look at. Asked once and handed to every pass: they must
   * agree about it, or one of them would tidy up after a post another never looked at
   */
  /*
   * The booked round is not a settling: it was called to measure what was waiting, so it
   * looks at those posts and nothing else — and leaves the settlings' own bookkeeping
   * (`changed.ts`) alone, since what changed since the last settling is still theirs to
   * deal with.
   */
  const changed = inTheBookedRound ? new Set(toMeasure) : changedCells();
  if (changed === null) noted('every post');
  else counted('posts looked at', changed.size);
  /*
   * Whether anything gets measured this round, decided once and handed to both passes
   * that do it: measuring is one cost for the page however many answers come out of it,
   * so the two of them share a round rather than taking one each (see `MEASURE_MS`)
   */
  const measuring = mayMeasure();
  if (measuring) noted('measured');
  // The time markers are set again on the same occasion. When every tier says
  // "as X shows it", they are stripped so that no marker of ours is left in X's DOM
  // even though no rule targets them
  if (
    lastMessages &&
    lastColumns.some((column) => timeFormatOf(column.appearance.timeFormat) !== 'relative')
  ) {
    timed('· times', () => restampTimes(lastColumns, lastMessages!, changed));
  } else {
    clearTimes();
  }
  // Whether even one column needs markers. How the limit is derived lives in `limitFor` alone
  const needsFrames = lastColumns.some((column) => limitFor(column.appearance) !== null);
  if (needsFrames) {
    timed('· media frames', () => restampMediaFrames(lastColumns, changed, measuring));
  } else {
    // Once every tier drops the limit, strip the markers set earlier too.
    // Turning the extension off replaces the settings with empty ones, which arrives here
    clearMediaFrames();
  }
  /**
   * X's link color, read at most once per settling and only if something is drawn in it.
   * Both the lines put into posts and the "Show more" buttons follow it
   */
  const readLinkColor = linkColorReader();
  // The lines put into posts are redone on the same occasion: X redraws a post and takes
  // ours with it. Once no column asks for them, the ones already put in are taken away
  /** Whether any column is having lines put into its posts. Both passes below turn on it */
  const stampsLines = lastColumns.some(
    (column) =>
      movesCards(cardStyleOf(column.appearance.cardStyle)) ||
      // Every quote style but X's own needs the pass: the frame is marked there, both
      // to put its line in and to take it away
      quoteStyleOf(column.appearance.quoteStyle) !== 'show' ||
      movesMedia(mediaStyleOf(column.appearance.media.style))
  );
  if (lastMessages && stampsLines) {
    /*
     * Watched from here as well as from the line limit below. A post X cut short takes the
     * mark alone even where no limit of ours is set (`placementFor`), and pressing X's own
     * "Show more" is then the only way back to the words — the listener is what turns that
     * press into the mark being opened out.
     */
    listenToXShowMore();
    timed('· lines', () =>
      restampAttachments(lastColumns, lastMessages!, readLinkColor, genericAlts, changed)
    );
  } else {
    clearAttachments();
  }
  /*
   * The captions written under pictures, redone on the same occasion and for the same
   * reason as the lines: X redraws a post and takes ours away with it.
   * After the frames above, so that a caption is measured around a picture already given
   * its final height rather than one still to be marked.
   */
  if (
    lastMessages &&
    lastColumns.some((column) => mediaStyleOf(column.appearance.media.style) === 'caption')
  ) {
    timed('· captions', () => restampCaptions(lastColumns, lastMessages!, readLinkColor, changed));
  } else {
    clearCaptions();
  }
  /*
   * The "Show more" is wanted for two reasons, and either is enough: a body the line limit
   * cut, and a line of ours showing less than it has (`wantsShowMore`). The second happens
   * with no limit set at all, so the pass cannot be held behind one.
   */
  if (
    lastMessages &&
    (stampsLines || lastColumns.some((column) => column.appearance.maxLines !== null))
  ) {
    listenToXShowMore();
    timed('· show more', () =>
      addShowMore(lastColumns, lastMessages!, readLinkColor, changed, measuring)
    );
  } else {
    // Once every tier drops the limit, remove the buttons added earlier too
    document.querySelectorAll(`.${MORE_CLASS}`).forEach((button) => button.remove());
  }
  if (measuring) {
    /*
     * Both passes that measure have had their turn, so what was waiting for them is let
     * go of — including anything they did not get to, which is a post in a scope that no
     * longer asks to be measured at all
     */
    measured = true;
    lastMeasured = performance.now();
    toMeasure.clear();
  } else if (toMeasure.size > 0) {
    measureSoon();
  }
};

const styleElement = (): HTMLStyleElement => {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.append(style);
  return style;
};

/**
 * Applies the appearance again for the current arrangement of columns. Called when
 * the settings change and when columns come and go.
 * Identical content is not rewritten (rewriting makes the browser rebuild the style).
 */
export const applyAppearance = (
  settings: Settings,
  scopes: ColumnScope[],
  messages: Messages
): void => {
  /*
   * Every post is marked again: what a line says follows settings that never reach the
   * stylesheet (how much of a description goes on screen, above all). What was *measured*
   * is a different question, answered below — it follows how the page is drawn, which is
   * the stylesheet itself.
   */
  watchChanges();
  changeEverything();
  stampColumns();

  // Columns sharing a key share their rules, so they are folded into one.
  // Without folding, columns of the same account standing side by side would emit
  // the same rules over and over
  const columns: ColumnAppearance[] = [];
  const seen = new Set<string>();
  /*
   * The tiers above are shared by both sites, so they can hold items that only mean
   * something where a scope is a column. They are dropped here rather than refused when
   * written: written on X Pro they do apply, and this is the one place that knows which
   * site the settings are being applied on
   */
  const here = surface().hasColumns ? (node: AppearanceNode) => node : withoutColumnItems;
  for (const scope of scopes) {
    const key = columnKey(scope);
    if (seen.has(key)) continue;
    seen.add(key);
    columns.push({ key, appearance: here(appearanceFor(settings, scope)) });
  }
  /*
   * The page's own furniture belongs to the site rather than to any scope, and only
   * x.com has any. Written out here rather than left to match nothing on X Pro: which
   * site is being drawn on is known in this one place, and saying so beats relying on
   * selectors happening to miss.
   */
  const chrome = surface().id === 'x' ? chromeCss(settings.xChrome) : '';
  /*
   * What X slips into a timeline is answered per site rather than per scope, so it is
   * written once here instead of coming out of `columnRules` per key
   */
  const injected = injectedCss(settings.injected[surface().id]);
  /*
   * The form a new post is written in, and the page behind x.com. Both are written from
   * the settings rather than from what is on screen: the form comes and goes as it is
   * used, and rebuilding the stylesheet each time it opened would cost a repaint for
   * nothing. `appearance/compose-mark.ts` puts the account on the form; these rules wait
   * for it.
   */
  const { colors, except } = composeColors(settings, surface().id);
  const compose = composeCss(colors, except);
  const page = surface().id === 'x' ? pageCss(pageColor(columns)) : '';
  const css = [buildCss(columns, messages.appearance.timeParens), injected, chrome, compose, page]
    .filter((part) => part !== '')
    .join('\n');

  const style = styleElement();
  if (style.textContent !== css) style.textContent = css;

  lastColumns = columns;
  lastMessages = messages;
  stampMediaFrames();
};
