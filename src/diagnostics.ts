/**
 * What a round of work cost, said out loud when it cost enough to be felt.
 *
 * A page that stops answering does so on somebody else's machine, on a deck nobody else has,
 * so the page says it itself: which part of the round was the heavy one, and how much there
 * was of whatever it was working on. A page behaving itself says nothing, and after one slow
 * round is reported the rest are counted rather than printed.
 *
 * A part named with a leading `·` ran inside the part before it, so its time is counted
 * twice: once on its own, once in the whole it belongs to.
 */

/**
 * Long enough to be worth saying something about: three frames (16ms each). Below that a
 * round is lost among the page's own work; at this length a reader scrolling sees the page
 * hesitate.
 */
const SLOW_MS = 50;

/** Whether a round took long enough to be worth saying anything about */
export const feltAsSlow = (took: number): boolean => took >= SLOW_MS;

/** How long to stay quiet after saying something */
const QUIET_MS = 1000;

/** What each part of the round took, in the order the parts ran */
let phases: { name: string; ms: number }[] = [];

/** The same for work spread over a round — judging one post, say — added into one number */
const spent = new Map<string, number>();

/** How much there was of what the round worked on, added up as it went */
const counts = new Map<string, number>();

/** Anything about the round worth saying that is not a number */
const notes = new Set<string>();

// Never, rather than the moment the page loaded, so that the first slow round is said
// rather than swallowed as one that came too soon after the last (`appearance/apply.ts`)
let lastSaid = Number.NEGATIVE_INFINITY;
let unsaid = 0;
/** The longest of the rounds that went unsaid, so a quiet window cannot hide the worst one */
let worstUnsaid = 0;

/** Times one part of a round */
export const timed = <T>(name: string, step: () => T): T => {
  const started = performance.now();
  try {
    return step();
  } finally {
    phases.push({ name, ms: performance.now() - started });
  }
};

/** Adds to the time spent on something that happens over and over within a round */
export const spentOn = (name: string, ms: number): void => {
  spent.set(name, (spent.get(name) ?? 0) + ms);
};

/** Adds to how much of something a round dealt with (posts looked at, pictures measured) */
export const counted = (name: string, n: number): void => {
  if (n > 0) counts.set(name, (counts.get(name) ?? 0) + n);
};

/** Says something about the round that is not a number ("every post", say) */
export const noted = (what: string): void => {
  notes.add(what);
};

/**
 * Makes the browser work out what it has been putting off, and says how much there was.
 *
 * A round that reads the page back pays, on its first reading, for everything written since
 * the page was last drawn — X's writes as much as ours. Left alone that lands on whichever
 * reading came first and reads as if the reading were expensive: "one picture measured,
 * 240ms". Asked for here it stands on its own line, and what is left is the round's own.
 *
 * It adds no work: the reading that follows forces the same pass, and the drawing after that
 * would have forced it anyway.
 */
export const pageCaughtUp = (): void => {
  const started = performance.now();
  document.documentElement.getBoundingClientRect();
  spentOn('· the page catching up', performance.now() - started);
};

const line = (what: string, took: number): string => {
  // A part that ran more than once in the round is added up, not listed twice
  const total = new Map(spent);
  for (const phase of phases) total.set(phase.name, (total.get(phase.name) ?? 0) + phase.ms);
  const parts = [...total]
    .filter(([, ms]) => ms >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([name, ms]) => `${name} ${Math.round(ms)}ms`);
  const sizes = [...notes, ...[...counts].map(([name, n]) => `${name} ${n}`)];
  const missed =
    unsaid > 0
      ? ` (+${unsaid} more since the last of these, worst ${Math.round(worstUnsaid)}ms)`
      : '';
  return (
    `⏱ ${Math.round(took)}ms ${what}${missed}` +
    (sizes.length > 0 ? ` — ${sizes.join(', ')}` : '') +
    (parts.length > 0 ? ` | ${parts.join(', ')}` : '')
  );
};

/**
 * The round is over: says what it cost if that was enough to be felt, and forgets it either
 * way. `what` names what set the round going, which is what a reader wants first.
 */
export const saidIfSlow = (
  what: string,
  took: number,
  log: (message: string, style: string) => void
): void => {
  const now = performance.now();
  if (feltAsSlow(took)) {
    if (now - lastSaid >= QUIET_MS) {
      log(line(what, took), 'color:#f59e0b');
      lastSaid = now;
      unsaid = 0;
      worstUnsaid = 0;
    } else {
      unsaid += 1;
      worstUnsaid = Math.max(worstUnsaid, took);
    }
  }
  phases = [];
  spent.clear();
  counts.clear();
  notes.clear();
};
