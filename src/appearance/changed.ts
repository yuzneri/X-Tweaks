/**
 * Which posts changed since the marking passes last looked at them.
 *
 * The passes re-assert: every settling they work out afresh what each post should carry
 * and put it back, so that a redraw by X cannot leave the extension's marks behind. What
 * that costs is a walk over every post on the page, and a timeline holds hundreds — the
 * work is done again for a post nothing has happened to since the last time.
 *
 * So the page says which posts to look at. Anything that could change what a pass would
 * decide is watched: nodes coming and going, the words themselves, and the handful of
 * attributes the passes read (a picture's description, a post's time). A post nothing
 * touched keeps what it was given.
 *
 * Re-asserting is not given up, only narrowed. Everything is looked at again when the
 * settings or the columns change, when a scope has a post opened in it, and — whatever
 * the watch reported — every couple of seconds, so that anything this cannot see puts
 * itself right within a moment rather than staying wrong until the page is reloaded.
 */
import { CELL_SELECTOR } from '../filter/post.ts';

/** The posts that changed. Read through `changedCells`, which may answer "all of them" */
const cells = new Set<Element>();

/** Whether everything is to be looked at, whatever the watch has to say. True at the start */
let everything = true;

/**
 * How long to go on the watch alone before looking at everything again.
 *
 * Insurance rather than a schedule. The watch covers what X does to a post, but not what
 * nobody thought to watch for — so a full round is run every so often, and anything left
 * wrong is put right within a couple of seconds. At around 20ms a full round on a deck of
 * several hundred posts, that is about one percent of the time.
 */
const FULL_MS = 2000;

// Never, rather than the moment the page loaded: the clock starts at nothing, and a zero
// would say the last full round had only just happened (`appearance/apply.ts`)
let lastFull = Number.NEGATIVE_INFINITY;

/**
 * What was decided for the settling now running.
 *
 * The passes ask separately and must be told the same thing: half of them working from
 * the changed posts while the other half works from all of them would leave the two sides
 * disagreeing about what is on the page. `undefined` means "not decided yet".
 */
let answer: Set<Element> | null | undefined;

/**
 * The posts to look at, or null for all of them.
 *
 * Every pass in a settling gets the same answer, and the answer is thrown away when the
 * settling is done (`handledChanges`).
 */
export const changedCells = (): Set<Element> | null => {
  if (answer !== undefined) return answer;
  const full = everything || performance.now() - lastFull >= FULL_MS;
  if (full) lastFull = performance.now();
  answer = full ? null : cells;
  return answer;
};

/**
 * Everything is to be looked at again.
 *
 * Called where what a pass would decide changed without the page changing: the settings,
 * the arrangement of columns, or a scope coming to hold a post opened to be read. The
 * answer already given in this settling is dropped, so a pass that has not run yet is
 * told the new one.
 */
export const changeEverything = (): void => {
  everything = true;
  answer = undefined;
};

/**
 * The posts the page has changed since the last settling, whatever this round was told
 * to look at.
 *
 * Apart from `changedCells` on purpose: that one answers "what is this round working
 * on", and says "all of them" for a round that came round on its own. This one answers
 * "what has actually changed", which is what anything holding on to what a post said
 * needs in order to know when to let go (`filter/engine.ts`).
 */
export const postsTouched = (): ReadonlySet<Element> => cells;

/**
 * The post this node is part of has to be looked at again.
 *
 * For what the watch cannot see by itself: the extension changing what a post shows
 * without changing what it holds, and a picture finishing loading — which changes how
 * tall it is drawn without touching the page at all.
 */
export const noticeChange = (node: Node): void => {
  const from = node instanceof Element ? node : node.parentElement;
  const cell = from?.closest(CELL_SELECTOR);
  if (cell) cells.add(cell);
};

/**
 * The settling is over: what it was told about has been dealt with.
 *
 * Called at the end of a settling, while the passes' own writes are still to be reported.
 * A change is reported to the watch after the task that made it, so what the passes wrote
 * lands on the *next* round rather than being cleared here unlooked-at — and what X wrote
 * while they were running lands there too, rather than being lost.
 */
export const handledChanges = (): void => {
  everything = false;
  answer = undefined;
  cells.clear();
};

let watching = false;

/**
 * Starts the watch. Called once, before the first pass runs.
 *
 * The attributes are named one by one rather than watched wholesale: X writes to `class`
 * and `style` constantly and none of the passes reads either, while the ones below are read —
 * the description written for a picture (`alt`, `aria-label`), the time a post was made
 * (`datetime`), the picture itself (`src`), what X calls a thing (`data-testid`), where a
 * link goes (`href`) and what a thing is for (`role`) — seven in all.
 *
 * The last two are here because a post is read through them — which post a picture belongs
 * to, who wrote it, whether a poll is open — and what is read is kept until the post is
 * reported as changed (`filter/engine.ts`). Left out, a post X rewrote in place without
 * touching anything else would keep its old reading for as long as the page is open: the
 * safety net below does not reach that far, it only decides which posts a round looks at.
 */
export const watchChanges = (): void => {
  if (watching) return;
  watching = true;

  new MutationObserver((records) => {
    for (const record of records) {
      noticeChange(record.target);
      // A post arriving is reported on the container it was put in, so the posts
      // themselves are picked out of what was added
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(CELL_SELECTOR)) cells.add(node);
        else node.querySelectorAll(CELL_SELECTOR).forEach((cell) => cells.add(cell));
      }
    }
  }).observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: ['alt', 'aria-label', 'datetime', 'src', 'data-testid', 'href', 'role'],
  });
};
