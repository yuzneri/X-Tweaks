/**
 * Reflects the judgement in the DOM. All it adds are classes and, when collapsing, a
 * single placeholder. Nodes are neither removed nor stashed away, so nothing competes
 * with X's own re-rendering.
 */
import { ACTIONS, type HighlightBase } from '../settings/schema.ts';
import type { Messages } from '../i18n/index.ts';
import { backgroundBehind } from '../appearance/background.ts';
import { layer, parseColor } from '../appearance/contrast.ts';
import { COLUMN_ATTR } from '../appearance/css.ts';
import type { Decision, Verdict } from './decide.ts';
import { counted, spentOn } from '../diagnostics.ts';
import { mark, unmark } from './emphasis.ts';
import { clearReadable, markReadableLater } from './readable.ts';

const COLLAPSED = 'xpro-collapsed';
/** Hidden: no placeholder either, the whole cell is taken out of the display */
const HIDDEN = 'xpro-hidden';
const HIGHLIGHTED = 'xpro-highlighted';
const PLACEHOLDER = 'xpro-placeholder';
const COLOR_VAR = '--xpro-highlight';

/**
 * What the colour now on a post was worked out from: the colour the rule asked for, what
 * it was laid over, and the colours the scope paints (`paintKey`).
 *
 * Compositing means measuring what is behind the post, which is a walk up to the root
 * asking each ancestor what it is painted in — about a millisecond a post on the real
 * site, and a change to the rules asks it of every highlighted post on the page. What is
 * behind a post does not change while it sits there, so the answer is kept here and used
 * again until something repaints the page.
 */
const COLOR_FROM = 'data-xpro-highlight-from';

/** The posts whose highlight colour still has to be composited, and what from */
const composing = new Map<Element, { rule: string; from: string; look: Look }>();

/**
 * Works out the colour every post that was waiting is to be highlighted in, and lays it
 * on. Answers how many there were.
 *
 * Called once at the end of a round of judging (`filter/engine.ts`), for the reason the
 * words are (`filter/readable.ts`): every post is read before any of them is written to,
 * so the round costs the browser one pass over the page's styles rather than one a post.
 */
export const composeWaiting = (): number => {
  if (composing.size === 0) return 0;
  const posts = [...composing];
  composing.clear();

  const laid = posts.map(([cell, want]) => ({
    cell,
    want,
    color:
      want.look.highlightBase === 'theme'
        ? (overThemeColor(cell, want.rule) ?? want.rule)
        : want.rule,
  }));
  for (const { cell, want, color } of laid) {
    (cell as HTMLElement).style.setProperty(COLOR_VAR, color);
    cell.setAttribute(COLOR_FROM, want.from);
    if (want.look.adjustContrast) markReadableLater(cell, color);
    else clearReadable(cell);
  }
  return laid.length;
};

/**
 * Cells opened with the "Show" button, remembered so a re-judgement does not collapse
 * them again. They are held in a WeakSet rather than as a DOM class so the decision
 * survives X redrawing the same cell and wiping the class.
 */
const expanded = new WeakSet<Element>();

export const isExpandedByUser = (cell: Element): boolean => expanded.has(cell);
export type Look = {
  adjustContrast: boolean;
  highlightBase: HighlightBase;
  /** The colours this scope paints, as one string (`paintKey`). What a composited colour is kept against */
  paint: string;
};

/**
 * An opaque color: the highlight color composited with the column background skipped.
 * null when it cannot be measured.
 *
 * CSS alone cannot ignore exactly one ancestor's background, so the backdrop with that
 * one skipped is measured here and composited. X's theme colors are not hard-coded:
 * measuring by walking up handles dark, dim and light with the same code.
 */
const overThemeColor = (cell: Element, color: string): string | null => {
  const column = cell.closest(`[${COLUMN_ATTR}]`);
  // A post opened outside the columns (the detail panel and the like) has no layer to skip
  if (column === null) return null;
  const highlight = parseColor(color);
  if (highlight === null) return null;
  // Measuring from the cell itself would count the color laid on this cell last time as backdrop
  const parent = cell.parentElement;
  if (parent === null) return null;
  const base = backgroundBehind(parent, column);
  if (base === null) return null;
  const { r, g, b } = layer(base, highlight);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * The placeholder standing in for a folded-away post, if it has one.
 *
 * Asked only where the post is folded, because that is the only state one exists in:
 * looking for it is a search through the post, and a post as X builds one holds hundreds
 * of elements.
 */
const placeholderOf = (cell: Element): HTMLElement | null =>
  cell.classList.contains(COLLAPSED)
    ? cell.querySelector<HTMLElement>(`:scope > .${PLACEHOLDER}`)
    : null;

/**
 * Undoes only the display decisions (collapse, hide, highlight). Emphasis is not touched
 * here.
 *
 * A post that carries none of them is left where it stands. On a change to the rules that
 * is most of the page — every post nothing matched — and the undoing is a search through
 * a post for what was never put there. The placeholder rides along with the class that
 * puts it in, so where there is no class there is nothing to take out either.
 */
const resetDecision = (cell: Element): void => {
  const classes = cell.classList;
  if (classes.contains(COLLAPSED) || classes.contains(HIDDEN) || classes.contains(HIGHLIGHTED)) {
    // Before the classes go: which of them is on is how the placeholder is found at all
    placeholderOf(cell)?.remove();
    classes.remove(COLLAPSED, HIDDEN, HIGHLIGHTED);
    (cell as HTMLElement).style.removeProperty(COLOR_VAR);
    cell.removeAttribute(COLOR_FROM);
  }
  clearReadable(cell);
};

/** Removes only what the extension added, restoring the original display */
export const reset = (cell: Element): void => {
  resetDecision(cell);
  // Emphasis adds nothing to the DOM, so dropping the registered ranges restores it
  unmark(cell);
};

const buildPlaceholder = (
  cell: Element,
  decision: Decision,
  author: string | null,
  messages: Messages
): HTMLElement => {
  const placeholder = document.createElement('div');
  placeholder.className = PLACEHOLDER;

  const summary = document.createElement('span');
  summary.className = 'xpro-placeholder-text';
  // A rule name the user typed, and an author name read from X. Both go in via textContent
  summary.textContent = author ? `@${author}` : messages.placeholder.post;

  const reason = document.createElement('span');
  reason.className = 'xpro-placeholder-reason';
  reason.textContent = decision.label;

  const show = document.createElement('button');
  show.type = 'button';
  show.className = 'xpro-placeholder-show';
  show.textContent = messages.placeholder.show;
  show.addEventListener('click', (event) => {
    event.stopPropagation();
    // There is no way to collapse it again; it stays open until the page is reloaded
    expanded.add(cell);
    reset(cell);
  });

  placeholder.append(summary, reason, show);
  return placeholder;
};

/**
 * Reflects the judgement on a cell. A null `decision` returns it to having nothing applied.
 * A cell already in that state is not touched (nothing competes with X's re-rendering).
 */
export const apply = (
  cell: Element,
  verdict: Verdict,
  author: string | null,
  messages: Messages,
  look: Look
): void => {
  // Timed apart from the emphasis below: one writes the post's own state, the other
  // paints inside its words, and they cost quite different things (`diagnostics.ts`)
  const started = performance.now();
  showDecision(cell, verdict.decision, author, messages, look);
  const painted = performance.now();
  spentOn('· deciding how to show', painted - started);

  /*
   * Emphasis is an action that does not change how a post is shown, so it is applied
   * separately from the others, collapsed posts included.
   * It is painted after the display is decided because making text readable requires
   * measuring the color behind it, and painting first would measure the background of
   * the state one step back.
   */
  mark(cell, verdict.emphases, look.adjustContrast);
  spentOn('· emphasis', performance.now() - painted);
};

/** Applies only the display decision (collapse, hide, highlight). Emphasis is `apply`'s separate concern */
const showDecision = (
  cell: Element,
  decision: Decision | null,
  author: string | null,
  messages: Messages,
  look: Look
): void => {
  const started = performance.now();
  if (!decision) {
    resetDecision(cell);
    spentOn('· nothing applies', performance.now() - started);
    return;
  }

  if (decision.action === ACTIONS.HIGHLIGHT) {
    placeholderOf(cell)?.remove();
    cell.classList.remove(COLLAPSED, HIDDEN);
    cell.classList.add(HIGHLIGHTED);
    /*
     * With "X's own backdrop" chosen as the base, the colour laid down is the rule's
     * composited with the column background skipped, which means reading what is behind
     * the post. That reading, and the one the words need, are both left to the end of the
     * round (`composeWaiting`): the post has just been written to, and a colour read back
     * from it now would make the browser work out the page's styles again — once per post
     * rather than once per round.
     */
    const from = `${decision.color}|${look.highlightBase}|${look.paint}`;
    if (cell.getAttribute(COLOR_FROM) === from) {
      // Worked out before, and nothing behind the post has moved since
      const color = (cell as HTMLElement).style.getPropertyValue(COLOR_VAR) || decision.color;
      if (look.adjustContrast) markReadableLater(cell, color);
      else clearReadable(cell);
    } else {
      composing.set(cell, { rule: decision.color, from, look });
    }
    spentOn('· highlighting', performance.now() - started);
    return;
  }

  // A cell decided to stay open is neither re-collapsed nor hidden when the rules change
  if (expanded.has(cell)) return;

  cell.classList.remove(HIGHLIGHTED);
  (cell as HTMLElement).style.removeProperty(COLOR_VAR);
  cell.removeAttribute(COLOR_FROM);
  clearReadable(cell);

  if (decision.action === ACTIONS.HIDE) {
    // Hiding has no "Show" button, so it needs no placeholder either
    placeholderOf(cell)?.remove();
    cell.classList.remove(COLLAPSED);
    cell.classList.add(HIDDEN);
    spentOn('· hiding', performance.now() - started);
    return;
  }

  cell.classList.remove(HIDDEN);

  const existing = placeholderOf(cell);
  if (existing) {
    // If the matching rule changed, only the reason is swapped out
    const reason = existing.querySelector('.xpro-placeholder-reason');
    if (reason && reason.textContent !== decision.label) reason.textContent = decision.label;
  } else {
    cell.prepend(buildPlaceholder(cell, decision, author, messages));
  }
  cell.classList.add(COLLAPSED);
  spentOn('· collapsing', performance.now() - started);
};
