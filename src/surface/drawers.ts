/**
 * X Pro's drawers: the panel that slides in for the column options and for the compose form
 * alike, marked the same way for both. Which is which is the asker's business (`panel/`,
 * `compose/`); this is only where they are, found once a task for all of them (`held.ts`).
 */
import { heldForTheTask } from '../held.ts';

export const DRAWER = '[data-testid="drawerAnimatedDiv"]';

export const drawers = heldForTheTask((): Element[] =>
  Array.from(document.querySelectorAll(DRAWER))
);
