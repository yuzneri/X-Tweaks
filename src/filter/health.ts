/**
 * The watch on whether X's markers are broken.
 *
 * Absence is never a conclusion. X Pro renders late, so "not drawn yet" and "broken"
 * show up in the same shape (no marker). Broken is only concluded from the shape where
 * something is drawn but the marker that should accompany it is the only thing missing.
 */

/** The markers being watched. Each one breaking takes out a different range of behavior */
export const MARKERS = ['cell', 'post', 'text', 'column'] as const;
export type Marker = (typeof MARKERS)[number];

/**
 * What was counted. `articles` is counted by its ARIA role, so it survives X renaming a
 * marker, and that is what makes "there are posts but the cell marker is unreadable"
 * distinguishable.
 */
export type Tally = { articles: number; cells: number; posts: number; texts: number };

export const emptyTally = (): Tally => ({ articles: 0, cells: 0, posts: 0, texts: 0 });

/**
 * How many to see before deciding, kept equal to the ad guard's number.
 * A floor against jumping to conclusions right after opening, or while looking at
 * empty columns only.
 */
const SAMPLE = 20;

/**
 * Lists the broken markers.
 *
 * When an upper level breaks there is no way to count the lower ones, so several never
 * come up at once (with zero cells, `posts` never reaches its floor). Only the topmost
 * breakage is listed.
 */
export const brokenMarkers = (tally: Tally): Marker[] => {
  const broken: Marker[] = [];
  // There are elements that look like posts, but not one unit to judge
  if (tally.articles >= SAMPLE && tally.cells === 0) broken.push('cell');
  // There are units to judge, but not one can be read
  if (tally.cells >= SAMPLE && tally.posts === 0) broken.push('post');
  // They can be read, but not one post has body text
  if (tally.posts >= SAMPLE && tally.texts === 0) broken.push('text');
  return broken;
};

/**
 * Whether columns exist but not one `columnId` resolves. Getting none out of three
 * attempts means "cannot be obtained" rather than "not yet", so no floor on the count
 * is needed.
 * Nothing is switched off when it breaks; it is watched only to report that the column
 * tier has stopped applying.
 */
export const columnsUnresolved = (total: number, resolved: number): boolean =>
  total > 0 && resolved === 0;

/**
 * Whether to stop the rules that read the body text when the body marker is broken.
 * The reason to stop them is not that they do too little but that they do too much:
 * with the body unreadable, "the body does not contain ○○" matches every post and the
 * whole timeline disappears.
 */
export const textRulesStopped = (broken: readonly Marker[]): boolean => broken.includes('text');

/** Whether the list of markers changed. Only a change is reported again */
export const sameMarkers = (a: readonly Marker[], b: readonly Marker[]): boolean =>
  a.length === b.length && a.every((marker, index) => marker === b[index]);
