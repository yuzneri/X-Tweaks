/**
 * Marking the form a new post is written in with the account it will post as.
 *
 * The colour of that form is answered by the account rather than by the column or the
 * view on screen (`ACCOUNT_COLORS` in `settings/schema.ts` says why), and no scope the
 * extension already marks reaches it: on X Pro the form is a drawer standing beside the
 * deck, on x.com it is a dialog opening over the page. So the form is marked here and
 * `appearance/css.ts` writes one rule per account against that mark.
 *
 * The account is read from the form's own avatar. Every one of the three shapes carries
 * it — measured on the saved pages, the drawer, the modal and the box at the head of
 * x.com's timeline each hold the signed-in account's avatar — so which site is being
 * looked at never has to be asked.
 */
import { AVATAR_NAME, avatarNameOf } from '../filter/post.ts';
import { COMPOSE_ATTR, COMPOSE_FORM_SELECTOR, safeInSelector } from './css.ts';

/**
 * The value X writes on an avatar it has no user for. The chat and Grok drawers carry
 * those, and taken as a name it would make an account nobody has (`surface/x.ts` refuses
 * it for the same reason).
 */
const UNKNOWN = 'unknown';

/**
 * The name to mark a form with, or null where there is nothing to mark it with.
 *
 * `"` and `\` are dropped for the reason `columnKey` drops them: the value is written
 * into an attribute selector as a string.
 */
export const markFor = (name: string | null): string | null => {
  if (name === null || name === UNKNOWN) return null;
  const safe = safeInSelector(name);
  return safe === '' ? null : safe;
};

/**
 * The account a form will post as, or null while it cannot be read.
 *
 * The first avatar in the form, in document order, which is the one X draws beside the
 * box being typed in. A form can hold other people's avatars — a quoted post brings its
 * author's along — and those come later, inside the quote.
 */
const accountOf = (form: Element): string | null =>
  markFor(avatarNameOf(form.querySelector(AVATAR_NAME)));

/**
 * How much of the form an element has to cover to count as one of its surfaces.
 *
 * Wide enough to be a panel or a row of one, rather than a chip standing in it: the
 * button that sends the post and the avatar beside the box both paint themselves, and
 * painting those would colour in X's own controls instead of the sheet behind them.
 */
const SURFACE_WIDTH = 0.5;
const SURFACE_HEIGHT_PX = 24;

/**
 * Whether X paints anything at all here, rather than letting what is behind show through.
 *
 * Judged on the alpha rather than on the colour reading `rgba(0, 0, 0, 0)`. X writes
 * fully clear whites too — `rgba(255, 255, 255, 0)` sits over the box being typed in —
 * and taking those for paint marks a surface that shows nothing.
 */
export const paintsColor = (color: string): boolean => {
  if (color === 'transparent' || color === '') return false;
  const alpha = /^rgba\(.*,\s*([\d.]+)\s*\)$/.exec(color);
  return alpha === null || Number(alpha[1]) > 0;
};

const paints = (el: Element): boolean => paintsColor(getComputedStyle(el).backgroundColor);

/**
 * What to colour in one form: the surfaces X paints inside it, or the form itself where
 * X paints none.
 *
 * The form is not always what is painted. x.com's post window is a `dialog` that paints
 * nothing, holding a panel of its own size that paints `rgb(20, 20, 20)` — colouring the
 * dialog puts the colour behind that panel, where none of it shows (measured on the live
 * site). The box at the head of the timeline is the same story in more pieces: the rows
 * it is built from carry their own.
 *
 * Which element X paints is a question about the page as it stands, so it is asked here
 * rather than written into a selector — the same reason the account is read here rather
 * than reached for in CSS. A saved page cannot answer it either: what paints comes from
 * a stylesheet that saving did not keep, so the modal reads as transparent there and
 * would have this walk stop at the form.
 */
const surfacesOf = (form: Element): Element[] => {
  const at = form.getBoundingClientRect();
  // The form counts among its own surfaces. X Pro's drawer paints itself and holds a
  // painted panel as well; leaving the form out marked only the panel, and the drawer
  // around it went back to black
  const surfaces = [form, ...form.querySelectorAll('*')].filter((el) => {
    const box = el.getBoundingClientRect();
    return box.width >= at.width * SURFACE_WIDTH && box.height >= SURFACE_HEIGHT_PX && paints(el);
  });
  // Nothing paints: the colour goes on the form and shows over whatever is behind it
  return surfaces.length > 0 ? surfaces : [form];
};

/**
 * Puts the mark on every form on screen, and takes it off one whose account cannot be
 * read any more.
 *
 * Called on every settling. X leaves a form in the page after it closes, so a mark set
 * once would go stale; setting it again each time costs one lookup that finds nothing
 * while nothing is being written.
 */
export const markComposeForms = (): void => {
  const wanted = new Map<Element, string>();
  for (const form of document.querySelectorAll(COMPOSE_FORM_SELECTOR)) {
    const account = accountOf(form);
    if (account === null) continue;
    for (const surface of surfacesOf(form)) wanted.set(surface, account);
  }

  // Anything marked last time that is no longer a surface loses the mark, so a form that
  // changed shape — the window opening over the box, say — leaves nothing coloured behind
  for (const marked of document.querySelectorAll(`[${COMPOSE_ATTR}]`)) {
    if (!wanted.has(marked)) marked.removeAttribute(COMPOSE_ATTR);
  }
  for (const [surface, account] of wanted) {
    // Written only when it changes: setting an attribute to what it already holds still
    // counts as a change to anything watching the page, and this runs on every settling
    if (surface.getAttribute(COMPOSE_ATTR) !== account) surface.setAttribute(COMPOSE_ATTR, account);
  }
};

/** Takes every mark off. Used when the extension is paused, so nothing it set is left behind */
export const clearComposeMarks = (): void => {
  for (const form of document.querySelectorAll(`[${COMPOSE_ATTR}]`)) {
    form.removeAttribute(COMPOSE_ATTR);
  }
};
