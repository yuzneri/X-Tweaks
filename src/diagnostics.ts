/**
 * What a round of work cost, said out loud when it cost enough to be felt.
 *
 * Nothing here changes what the extension does. It is here because a page that stops
 * answering does so on somebody else's machine, on a deck nobody else has: measuring a
 * page built to look like X answers what X's own page would have to be asked. So the page
 * says it itself — which part of the round was the heavy one, and how much there was of
 * whatever it was working on.
 *
 * A page behaving itself says nothing at all: only a round long enough to be noticed is
 * reported, and after one is said the rest are counted rather than printed, so a bad
 * patch leaves one line and a number instead of a scrolling console.
 *
 * A part named with a leading `·` ran inside the part named before it, so its time is
 * counted twice over — once on its own, and once in the whole it belongs to.
 */

/**
 * Long enough to be worth saying something about.
 *
 * Below a frame's worth of time (16ms) nothing can be felt, and everything above it takes
 * something away from the page: a round at this length is not yet a stutter, but it is
 * where one starts. Kept low enough that a round which improved can be seen to have
 * improved, rather than simply falling silent.
 */
const SLOW_MS = 30;

/** Whether a round took long enough to be worth saying anything about */
export const feltAsSlow = (took: number): boolean => took >= SLOW_MS;

/** How long to stay quiet after saying something */
const QUIET_MS = 1000;

/** What each part of the round took, in the order the parts ran */
let phases: { name: string; ms: number }[] = [];

/**
 * The same, for work that happens a little at a time all over a round: a part of judging
 * one post, say, which happens hundreds of times and is worth seeing as one number.
 */
const spent = new Map<string, number>();

/** How much there was of what the round worked on, added up as it went */
const counts = new Map<string, number>();

/** Anything about the round worth saying that is not a number */
const notes = new Set<string>();

let lastSaid = 0;
let unsaid = 0;
/** The longest of the rounds that went unsaid, so a quiet window cannot hide the worst one */
let worstUnsaid = 0;

/** Times one part of a round. The cost of asking the clock twice is nothing beside what it measures */
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
 * The round is over. Says what it cost if that was enough to be felt, and forgets it
 * either way.
 *
 * `what` names the round in a few words — what set it going, which is the first thing
 * anyone reading the line wants to know.
 */
export const saidIfSlow = (
  what: string,
  took: number,
  log: (message: string, style: string) => void
): void => {
  const now = Date.now();
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
