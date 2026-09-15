/**
 * An answer read out of the page, held for the rest of the task it was read in.
 *
 * Some questions are asked of the whole page — every column body, every drawer — and asked
 * several times over in one round of work, each asking a walk of the page. The answer is
 * held until the task ends: only X changes what such a question finds, and a round of ours
 * runs in a task of its own (`filter/engine.ts`) where nothing of X's runs, so nothing can
 * change the answer before the microtask lets go of it. A handler of ours sharing a task with
 * X's own (a press) gets the same guarantee only for what it asks before X's handler runs.
 */
export const heldForTheTask = <T>(read: () => T): (() => T) => {
  let held: { value: T } | null = null;
  return () => {
    if (held) return held.value;
    const found = { value: read() };
    held = found;
    queueMicrotask(() => {
      held = null;
    });
    return found.value;
  };
};
