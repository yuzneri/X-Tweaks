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
 * Three frames' worth of time (16ms each). Below that a round is lost among the page's own
 * work and nothing can be felt; at this length a reader scrolling can see the page hesitate.
 * Low enough to catch a round on its way to becoming a stutter, high enough that a page
 * behaving itself says nothing at all.
 */
const SLOW_MS = 50;

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

// Never, rather than the moment the page loaded, so that the first slow round is said
// rather than swallowed as one that came too soon after the last (`appearance/apply.ts`)
let lastSaid = Number.NEGATIVE_INFINITY;
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

/**
 * Makes the browser work out what it has been putting off, and says how much there was.
 *
 * A round that reads the page back pays, on its first reading, for everything written
 * since the page was last drawn — X's own writes as much as ours, and a live timeline
 * writes constantly. Left alone, that cost lands on whichever reading happened to come
 * first and reads as if the reading itself were expensive: "one picture measured, 240ms".
 *
 * Asked for here, before the round starts, it stands on its own line. What is left over
 * afterwards is the round's own — including a pass the round made necessary by writing
 * between two of its own readings, which shows up as a second round catching up again.
 *
 * It adds no work: the reading that follows forces the same pass, and the drawing after
 * that would have forced it anyway. A page with nothing outstanding answers at once.
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
