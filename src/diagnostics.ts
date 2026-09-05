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

/** Long enough to be noticed as a stutter rather than a pause between frames */
const SLOW_MS = 100;

/** Whether a round took long enough to be worth saying anything about */
export const feltAsSlow = (took: number): boolean => took >= SLOW_MS;

/** How long to stay quiet after saying something */
const QUIET_MS = 3000;

/** What each part of the round took, in the order the parts ran */
let phases: { name: string; ms: number }[] = [];

/** How much there was of what the round worked on, added up as it went */
const counts = new Map<string, number>();

/** Anything about the round worth saying that is not a number */
const notes = new Set<string>();

let lastSaid = 0;
let unsaid = 0;

/** Times one part of a round. The cost of asking the clock twice is nothing beside what it measures */
export const timed = <T>(name: string, step: () => T): T => {
  const started = performance.now();
  try {
    return step();
  } finally {
    phases.push({ name, ms: performance.now() - started });
  }
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
  const parts = phases
    .filter((phase) => phase.ms >= 1)
    .sort((a, b) => b.ms - a.ms)
    .map((phase) => `${phase.name} ${Math.round(phase.ms)}ms`);
  const sizes = [...notes, ...[...counts].map(([name, n]) => `${name} ${n}`)];
  const missed = unsaid > 0 ? ` (+${unsaid} more since the last of these)` : '';
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
    } else {
      unsaid += 1;
    }
  }
  phases = [];
  counts.clear();
  notes.clear();
};
