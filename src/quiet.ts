/**
 * Work put off until the browser has nothing else to do with the page.
 *
 * Reading a colour or a size out of the page makes the browser work out its styles and
 * its layout first, and after anything has been written that means doing it for the whole
 * page. Asked in the middle of a round of work, that pass lands in the extension's own
 * task and the page stops answering for as long as it takes. Asked once the browser has
 * laid the page out and painted it, there is
 * nothing to work out and the reading costs nothing.
 *
 * Two frames out rather than one: a callback on the next frame runs *before* that frame
 * is laid out, so it would be reading a page our own writes had just made stale. A
 * callback on the frame after that finds the page as the reader is seeing it.
 *
 * A background tab never gets there, which is the right answer for everything that waits
 * here: nothing is being drawn, so nothing needs measuring, and the work happens when the
 * tab comes back.
 */

/** What is waiting, in the order it was asked for */
let waiting: (() => void)[] = [];

let booked = false;

/** Where a job that fell over is reported. Set by whoever has somewhere to report it */
let report: ((error: unknown) => void) | null = null;

export const sayWhatFellOver = (say: (error: unknown) => void): void => {
  report = say;
};

export const atAQuietMoment = (work: () => void): void => {
  waiting.push(work);
  if (booked) return;
  booked = true;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      booked = false;
      const due = waiting;
      waiting = [];
      for (const one of due) {
        /*
         * Each on its own. Letting one fall over take the rest with it is worse here than
         * anywhere else: what waits here books itself for the next quiet moment from
         * inside its own callback, so a job that never runs is a job that is never booked
         * again — measuring stops for the life of the page, and nothing says so.
         */
        try {
          one();
        } catch (error) {
          // Saying so must not be able to stop the rest either, which is the whole point
          try {
            report?.(error);
          } catch {
            // Nowhere left to say it
          }
        }
      }
    })
  );
};
