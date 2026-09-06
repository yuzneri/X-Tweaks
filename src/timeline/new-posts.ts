/**
 * Bringing in the posts that have arrived, without waiting to be asked.
 *
 * x.com holds new posts back and floats a button over the timeline offering them. This
 * presses that button, so the timeline fills itself the way X Pro's columns do.
 *
 * x.com only. X Pro brings its columns up to date on its own, and the mark this goes by
 * (`pillLabel`) appears there too, so which site is being read has to be asked rather
 * than left to the selector.
 *
 * When to go at the button is `timing.ts`'s to answer; what is here is the page.
 */
import { nextGo } from './timing.ts';

/** The words X puts on the button. The button itself carries no mark of its own */
const PILL = '[data-testid="pillLabel"]';

type Hooks = { log: (...args: unknown[]) => void };

let on = false;
let hooks: Hooks = { log: () => {} };

/** Goes had at the offer now standing, and when the last one was */
let goes = 0;
let lastGo = 0;

/** Whether the wait has been mentioned for the offer now standing. One line per offer, not per settling */
let told = false;

/**
 * Whether X has closed the offer over.
 *
 * X leaves the button in the page with nothing to offer and shuts it away rather than
 * removing it, so "is it in the DOM" is not the question. Two ways of shutting are looked
 * for: `display: none` anywhere at or above it, and the words being drawn at no size.
 *
 * The size is taken from the words rather than from anything holding them. Measured, the
 * words go from 135x20 to nothing when X shuts the offer; a wrapper around them can sit
 * at no size either way, its contents being positioned out of the flow, and asking one of
 * those would answer "shut" while the button was plainly on screen.
 *
 * A fast path, not the whole answer. X may shut it in some way neither of these sees,
 * which is why a standing offer is gone at again after `RETRY_MS` rather than only when
 * this says it went.
 */
const closed = (label: Element): boolean => {
  const at = label.getBoundingClientRect();
  if (at.width === 0 && at.height === 0) return true;
  for (let el: Element | null = label; el && el !== document.body; el = el.parentElement) {
    if (getComputedStyle(el).display === 'none') return true;
  }
  return false;
};

/** The button, or null while X is offering nothing */
const offer = (): HTMLElement | null => {
  const label = document.querySelector(`[data-testid="primaryColumn"] ${PILL}`);
  if (!label || closed(label)) return null;
  const button = label.closest('[role="button"]');
  return button instanceof HTMLElement ? button : null;
};

/**
 * Where to send the press.
 *
 * A real press lands on whatever is drawn topmost at that spot, which for a control built
 * the way X builds one is usually an element *inside* the `role="button"`. An event sent
 * at the button travels outwards from there and never reaches a listener sitting further
 * in, which looks exactly like the press being ignored.
 *
 * The point is the middle of the words rather than the middle of the button. A button can
 * be laid out wider than what it draws — a row that stretches with its container, holding
 * its words at one end — and its middle then falls on empty space belonging to the button
 * itself, which puts the aim back outside the very element it was meant to find.
 */
const aim = (button: HTMLElement): { target: Element; x: number; y: number } => {
  const drawn = button.querySelector(PILL) ?? button;
  const at = drawn.getBoundingClientRect();
  const x = at.left + at.width / 2;
  const y = at.top + at.height / 2;
  const topmost = document.elementFromPoint(x, y);
  return { target: topmost && button.contains(topmost) ? topmost : button, x, y };
};

/**
 * Presses it the way a finger would. `click()` alone sends one bare `click`, and a
 * control built the way X builds its own may act on the press instead.
 */
const press = (button: HTMLElement): void => {
  const { target, x, y } = aim(button);
  const shared = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: x,
    clientY: y,
    // A press of the main button, counted as the first of a run. Some controls read both
    button: 0,
    detail: 1,
  };
  target.dispatchEvent(new PointerEvent('pointerdown', { ...shared, isPrimary: true, buttons: 1 }));
  target.dispatchEvent(new MouseEvent('mousedown', { ...shared, buttons: 1 }));
  target.dispatchEvent(new PointerEvent('pointerup', { ...shared, isPrimary: true, buttons: 0 }));
  target.dispatchEvent(new MouseEvent('mouseup', { ...shared, buttons: 0 }));
  target.dispatchEvent(new MouseEvent('click', shared));
};

/**
 * The other way in, which X writes on the button itself: "press the period key to move to
 * the new posts". Tried on the second go, on the chance that what X listens for is the
 * key rather than the button.
 *
 * Sent at the body so it is not taken for typing. A page with the caret in a text box is
 * left alone: the key would go into the box instead, and X does not act on it there.
 */
const pressPeriod = (): void => {
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    (active.isContentEditable || active.closest('input, textarea'))
  ) {
    return;
  }
  const init = {
    key: '.',
    code: 'Period',
    keyCode: 190,
    which: 190,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  document.body.dispatchEvent(new KeyboardEvent('keydown', init));
  document.body.dispatchEvent(new KeyboardEvent('keyup', init));
};

/**
 * Called on every settling of the page. Cheap while nothing is on offer: one lookup that
 * finds nothing.
 *
 * What to do is `timing.ts`'s to say; what is left here is reading the page and acting.
 */
export const takeNewPosts = (): void => {
  if (!on) return;
  const button = offer();
  if (!button) {
    goes = 0;
    told = false;
    return;
  }

  // Elapsed time, so from the clock that only moves forward: a wall clock corrected
  // backwards would hold the retry off by however far it moved (`filter/pace.ts`)
  const now = performance.now();
  const go = nextGo({ goes, lastGo }, now, { scrollY: window.scrollY });
  if (go === 'later') {
    // Said once per offer, so scrolling through a long timeline does not fill the console
    if (!told) {
      told = true;
      hooks.log(
        `New posts are waiting; taking them once you are back at the top (${Math.round(window.scrollY)}px down)`
      );
    }
    return;
  }
  if (go === 'wait') return;

  lastGo = now;
  goes += 1;
  if (go === 'period') {
    hooks.log('The offer is still up; trying the period key X names on the button');
    pressPeriod();
    return;
  }
  // Only the first go is worth a line. Past that the offer is standing for a reason this
  // cannot see, and saying so every few seconds would bury everything else in the console
  if (goes === 1) hooks.log('Taking the new posts X was holding back');
  press(button);
};

/** Hands over the logger. Called once, before anything is read */
export const startNewPosts = (given: Hooks): void => {
  hooks = given;
};

/** The settings changed. Turning it off forgets the standing offer, so turning it back on starts clean */
export const updateNewPosts = (auto: boolean): void => {
  // Said on the way in, so that "nothing happened" can be told from "it never started"
  if (auto && !on) hooks.log('Watching for the posts X holds back');
  on = auto;
  if (!on) {
    goes = 0;
    told = false;
  }
};
