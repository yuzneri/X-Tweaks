/**
 * Keeping the compose form open after a post, and putting the hashtags back into it.
 *
 * X Pro closes the form and empties the box the moment a post goes out. For a run of
 * posts carrying the same tags that means opening it and typing them again every time.
 *
 * Nothing here reaches into X's own state. The form is opened again the way a person
 * would — by pressing the button that opened it in the first place — and the tags go in
 * through the browser's own text input. What that costs is that every step can fail, and
 * each one that does simply leaves X Pro to behave as it always has.
 */
import { hashtagsIn, restoredText } from './hashtags.ts';
import { createsPost } from './signal.ts';
import { restoresHashtags, type ComposeSettings } from '../settings/schema.ts';
import { COLUMN_SELECTOR } from '../columns/registry.ts';

/** The drawer, as marked by X Pro. Shared with the column options (see `composeDrawer`) */
const DRAWER = '[data-testid="drawerAnimatedDiv"]';
/**
 * The boxes written in. A thread has one per part (`tweetTextarea_0`, `_1`, …).
 *
 * Being editable is part of what is asked for, and not by way of belt and braces: X Pro
 * wraps each box in `tweetTextarea_0_label` and `tweetTextarea_0RichTextInputContainer`,
 * which the marker alone would match first. Landing on one of those means text typed
 * into thin air and the same words counted three times over.
 */
const EDITOR = '[data-testid^="tweetTextarea_"][contenteditable="true"]';
/**
 * A post rendered inside the drawer, which is what a reply or a quote shows above the
 * box. Its presence says this is not the plain "new post" form, and nothing here applies.
 */
const SHOWN_POST = '[data-testid="tweet"]';

/** How often the states below are looked at while waiting for one of them */
const POLL_MS = 50;
/**
 * How long the form is given to close after a post was sent. Measured at about 230ms
 * from the request finishing; a post that fails leaves the form open and runs this out,
 * which is exactly how a failure is told apart from a success.
 */
const CLOSE_WITHIN_MS = 3000;
/** How long one press is given to bring the form back */
const OPEN_WITHIN_MS = 300;
/**
 * How many times the button is pressed before giving up. While the form is open X Pro
 * disables that button, and right after the form goes the button may not have been
 * drawn as enabled again, so the first press can land on nothing.
 */
const PRESS_ATTEMPTS = 3;
/** How long the box inside a reopened form is waited for */
const EDITOR_WITHIN_MS = 1000;
/** How long the button that opens the form is given to start taking presses again */
const ENABLED_WITHIN_MS = 1500;
/** How long the box is given to accept focus. The form slides in, and cannot be typed into until it has */
const FOCUS_WITHIN_MS = 1500;
/**
 * How long the caret is kept in front of the tags. Short on purpose: the moment it holds,
 * this stops, and anything longer would be pulling the caret back from under someone who
 * had already started typing.
 */
const CARET_WITHIN_MS = 400;
/**
 * How recently the form must have been seen for a post to be taken as coming from it.
 *
 * It only has to outlast the request (measured at about 430ms), with room to spare for a
 * slow line. Longer than this and a reply sent shortly after a compose form was abandoned
 * would be mistaken for a post from that form.
 */
const SEEN_WITHIN_MS = 10_000;

const PREFIX_STYLE = 'color:#1d9bf0;font-weight:bold';

type Hooks = { log: (...args: unknown[]) => void };

let settings: ComposeSettings = { reopen: false, keepHashtags: false };
let hooks: Hooks = { log: () => {} };

/**
 * The thing pressed to open the compose form, remembered so it can be pressed again.
 *
 * The button carries no marker of its own and its label changes with the interface
 * language, so it is not looked up — it is recognised by having been pressed. This is
 * how the settings entry points already tell one menu from another (`panel/menu.ts`).
 */
let opener: Element | null = null;

/**
 * What was written, kept up to date while typing. By the time a post is sent the box may
 * already be empty, so it cannot be read then.
 *
 * It is held against the form it was written in. A form abandoned unposted leaves its
 * text behind here, and a post made without typing anything — a photo on its own needs
 * no words — would otherwise be handed the tags from that abandoned draft. Every opening
 * of the form is a new element, so the old one stops matching by itself.
 */
let written: { drawer: Element; text: string } | null = null;
/**
 * The compose form as it was last seen, with what was in it.
 *
 * Measured on the real thing: **by the time a post shows up in the page's resource timing,
 * the form is no longer there to be found**. The request finishes after X has already
 * taken the form away, so looking for it at that moment finds nothing and the whole
 * feature falls silent.
 *
 * So it is written down on every settling of the DOM instead, while the form is still
 * open, and the post is followed using that.
 */
let lastSeen: { drawer: Element; text: string; at: number } | null = null;
/**
 * The tags from the last post, waiting for a form to go into.
 *
 * Only filled while the form is left to close: where it is opened again they go straight
 * back in and nothing has to wait. It is held in memory alone — a reload drops it, which
 * is right for something this short-lived.
 */
let pending: string | null = null;

/** Set while a post is being followed through, so a thread's several requests act once */
let acting = false;

/**
 * The compose form, or null when it is not open.
 * The marker on the drawer is shared with the column options, so the box inside it is
 * what identifies the form. A reply or a quote is left alone.
 */
export const composeDrawer = (): Element | null => {
  for (const drawer of document.querySelectorAll(DRAWER)) {
    if (!drawer.querySelector(EDITOR)) continue;
    if (drawer.querySelector(SHOWN_POST)) continue;
    return drawer;
  }
  return null;
};

/**
 * Whether anything here has work to do. Either switch on is enough: one brings the form back,
 * the other keeps the tags, and both need what was written to be read before it goes.
 */
const watching = (): boolean => settings.reopen || restoresHashtags(settings);

/** Everything written in the form. A thread's parts are joined so tags in any of them are found */
const textIn = (drawer: Element): string =>
  Array.from(drawer.querySelectorAll(EDITOR))
    .map((editor) => editor.textContent ?? '')
    .join('\n');

/** Waits for something to turn up, giving up after `within`. Resolves to null on giving up */
const waitFor = <T>(look: () => T | null, within: number): Promise<T | null> =>
  new Promise((settle) => {
    const started = performance.now();
    const tick = (): void => {
      const found = look();
      if (found !== null) {
        settle(found);
        return;
      }
      if (performance.now() - started >= within) {
        settle(null);
        return;
      }
      setTimeout(tick, POLL_MS);
    };
    tick();
  });

/** Waits for the form to go away. True when it did, false when it was still there */
const waitUntilClosed = (drawer: Element, within: number): Promise<boolean> =>
  waitFor(() => (drawer.isConnected ? null : true), within).then((gone) => gone === true);

/** Whether the button is refusing presses, however X Pro says so */
const isDisabled = (button: HTMLElement): boolean =>
  (button instanceof HTMLButtonElement && button.disabled) ||
  button.getAttribute('aria-disabled') === 'true';

/**
 * Presses the remembered button until the form comes back.
 * A button that is no longer in the document cannot be pressed, and there is no second
 * way to open the form, so that is where this gives up.
 */
const pressOpener = async (): Promise<Element | null> => {
  const button = opener;
  if (!(button instanceof HTMLElement) || !button.isConnected) return null;
  for (let attempt = 0; attempt < PRESS_ATTEMPTS; attempt++) {
    /*
     * X Pro keeps this button disabled while the form is up, and it is not put back the
     * moment the form goes. A press then does nothing whatsoever, so the attempts would
     * be spent on nothing — waiting for it to come back is what makes the retries count.
     */
    await waitFor(() => (isDisabled(button) ? null : true), ENABLED_WITHIN_MS);
    button.click();
    const drawer = await waitFor(composeDrawer, OPEN_WITHIN_MS);
    if (drawer) return drawer;
  }
  hooks.log('The button that opens the compose form would not bring it back', {
    stillDisabled: isDisabled(button),
  });
  return null;
};

/** Where the caret goes: the start of the text, not the start of the element */
const firstTextNode = (root: Node): Node =>
  document.createTreeWalker(root, NodeFilter.SHOW_TEXT).nextNode() ?? root;

/** Whether the caret is sitting at the very start of the box */
const caretIsAtStart = (selection: Selection, editor: Element): boolean =>
  selection.isCollapsed &&
  selection.anchorOffset === 0 &&
  selection.anchorNode === firstTextNode(editor);

/**
 * Moves the caret in front of the tags, and makes it stay there.
 *
 * The box keeps its own idea of where the caret is and puts it back as it settles after
 * the text goes in, so setting it once lands it at the end again a moment later. It is
 * moved, then watched, and moved again until it holds or the wait runs out.
 *
 * `Selection.modify` is asked first: it is the browser's own caret movement, the same one
 * a Home key press goes through, and an editor watching for the caret to move is more
 * likely to follow it than a range set behind its back. Where it is missing, the range is
 * set directly.
 */
const putCaretAtStart = async (editor: Element): Promise<boolean> => {
  const held = await waitFor(() => {
    const selection = document.getSelection();
    if (!selection) return null;
    // Checked before moving, so what is seen is where the caret settled last time round
    if (caretIsAtStart(selection, editor)) return true;

    const modify = (selection as Selection & { modify?: (...args: string[]) => void }).modify;
    if (typeof modify === 'function') {
      modify.call(selection, 'move', 'backward', 'lineboundary');
      return null;
    }
    const range = document.createRange();
    range.setStart(firstTextNode(editor), 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return null;
  }, CARET_WITHIN_MS);
  return held === true;
};

/**
 * Puts the tags into the reopened box and leaves it ready to type in.
 *
 * The box is a rich text editor holding its own copy of what it shows, so writing to the
 * DOM does not reach it. `execCommand` is deprecated but it is the one way left to enter
 * text the way a keypress does; a synthesised `beforeinput` is untrusted and ignored.
 * The caret ends up in front of the tags, which is where the body gets typed.
 */
const restore = async (drawer: Element, text: string): Promise<boolean> => {
  /*
   * With nothing to put back there is nothing to wait for. The box is nudged towards the
   * focus and that is the end of it — waiting on focus here would report a failure over
   * hashtags that were never going in.
   */
  if (text === '') {
    const editor = drawer.querySelector(EDITOR);
    if (editor instanceof HTMLElement) editor.focus();
    return true;
  }

  /*
   * Text goes wherever the focus actually is, not where it was meant to go, so the box
   * has to be shown to hold it before a single character is written. Without the check,
   * a `focus()` that did not take would spill the tags into whatever else was focused —
   * a reply being written, the search box. Not writing them costs nothing.
   *
   * Two things stop a single `focus()` from taking, and both pass on their own shortly:
   *   - the form slides in (`drawerAnimatedDiv`), and a box inside something still
   *     animating does not take focus
   *   - X replaces the box while the form settles, and the one held here is then a
   *     leftover that can be focused all day without anything happening
   *
   * So the box is looked up again on each attempt, and asked again, until the focus is
   * seen to be inside it. Anywhere inside counts: what matters is where the text will
   * land, not which node within the box holds the caret.
   */
  const focused = await waitFor(() => {
    const editor = drawer.querySelector(EDITOR);
    if (!(editor instanceof HTMLElement)) return null;
    editor.focus();
    return editor.contains(document.activeElement) ? editor : null;
  }, FOCUS_WITHIN_MS);

  if (!focused) {
    const active = document.activeElement;
    hooks.log('The box would not take focus, so the hashtags were left out', {
      focusIsOn:
        active === null
          ? 'nothing'
          : `${active.tagName.toLowerCase()} ${active.getAttribute('data-testid') ?? ''}`.trim(),
    });
    return false;
  }

  document.execCommand('insertText', false, text);
  // The tags are in either way; where the caret ended up is worth knowing but not worth
  // calling the whole thing a failure over
  if (!(await putCaretAtStart(focused))) {
    hooks.log('The tags went in, but the caret would not stay in front of them');
  }
  return true;
};

/**
 * Follows a post through: waits for the form to close, brings it back, and puts the tags in.
 *
 * The post has to have come from the compose form. Replies and quotes send the same
 * request, and without that condition every reply would open the compose form and drop
 * the reply's tags into it. That form is usually gone by now, so it is the one written
 * down while it was open (`noticeComposeForm`) that decides.
 */
const followPost = async (): Promise<void> => {
  if (!watching() || acting) return;
  const drawer = formForPost();
  if (!drawer) return;

  acting = true;
  try {
    /*
     * What was written, taken from whichever record still has it. The box is emptied and
     * the form taken away before this runs, so nothing can be read from the page itself.
     */
    const text =
      written?.drawer === drawer
        ? written.text
        : lastSeen?.drawer === drawer
          ? lastSeen.text
          : textIn(drawer);
    /*
     * One remembered form serves one post. Left in place, the next post from anywhere —
     * a reply typed a moment later — would be followed as if it had come from this form.
     */
    lastSeen = null;
    const tags = restoresHashtags(settings) ? restoredText(hashtagsIn(text)) : '';

    // A post that did not go through leaves the form open, and nothing should happen
    if (!(await waitUntilClosed(drawer, CLOSE_WITHIN_MS))) {
      hooks.log('The compose form stayed open, so the post is taken to have failed');
      return;
    }

    /*
     * The form was left to close, as asked. The tags are kept instead, and go into the
     * next compose form the user opens (`restorePending`). Opening it here to hold them
     * would be doing the very thing the other switch was turned off to avoid.
     */
    if (!settings.reopen) {
      pending = tags === '' ? null : tags;
      written = null;
      hooks.log('Left the compose form closed', {
        hashtags: pending ?? 'none kept',
      });
      return;
    }

    const reopened = await pressOpener();
    if (!reopened) {
      hooks.log('Could not open the compose form again; leaving it closed');
      return;
    }

    // Only that the box is there at all; `restore` looks it up again for itself, since X
    // may have replaced it by then
    if (!(await waitFor(() => reopened.querySelector(EDITOR), EDITOR_WITHIN_MS))) {
      hooks.log('The compose form came back without a box to write in');
      return;
    }

    if (await restore(reopened, tags)) {
      hooks.log('Brought the compose form back', { hashtags: tags === '' ? 'none' : tags });
    } else {
      hooks.log('The compose form came back but would not take the hashtags');
    }
    written = null;
  } finally {
    acting = false;
  }
};

/**
 * The button that opens the compose form, found rather than remembered.
 *
 * Used when nothing was seen being pressed — the form was already open when the extension
 * started, or it was opened from the keyboard. While the form is open X Pro disables that
 * button, and it is the only disabled button outside the columns and outside the form
 * itself (the form's own "Post" button is inside it). Nothing here reads a label, so it
 * holds in any interface language.
 */
const findOpener = (): Element | null => {
  const disabled = [...document.querySelectorAll('button[disabled], button[aria-disabled="true"]')];
  const outside = disabled.filter(
    (button) => !button.closest(DRAWER) && !button.closest(COLUMN_SELECTOR)
  );
  /*
   * Only when there is exactly one. This button gets pressed later, and pressing the
   * wrong one does whatever that button does. With two candidates there is no way to
   * choose between them, and doing nothing costs only that the form is not brought back.
   */
  return outside.length === 1 ? outside[0]! : null;
};

/**
 * Writes down the compose form while it is still there.
 *
 * Called on every settling of the DOM. Everything this module does afterwards runs from
 * what is written down here, because none of it can be read once a post has gone out.
 */
export const noticeComposeForm = (): void => {
  const drawer = composeDrawer();
  if (!drawer) return;
  lastSeen = { drawer, text: textIn(drawer), at: performance.now() };
  // The form is open, so the button that opens it is disabled and can be picked out
  if (opener === null || !opener.isConnected) opener = findOpener();
};

/** The form to follow a post from: the one open now, or the one seen a moment ago */
const formForPost = (): Element | null => {
  const open = composeDrawer();
  if (open) return open;
  if (lastSeen === null || performance.now() - lastSeen.at > SEEN_WITHIN_MS) return null;
  return lastSeen.drawer;
};

/**
 * Puts the tags from the last post into a compose form that has just been opened by hand.
 *
 * Called on every settling of the DOM, so it has to be cheap and it has to be sure:
 *   - nothing is waiting → nothing to do
 *   - a form is in the middle of being reopened after a post (`acting`) → that path puts
 *     the tags in itself
 *   - the box already has something in it → whatever it is, it is not ours to overwrite.
 *     This also covers the form reopening with the tags already in
 *
 * The tags are let go of whether or not they went in. Trying again on the next settling
 * would mean fighting whatever stopped it, several times a second.
 */
export const restorePending = (): void => {
  if (pending === null || acting) return;
  const drawer = composeDrawer();
  if (!drawer) return;
  if (!drawer.querySelector(EDITOR) || textIn(drawer) !== '') return;

  const tags = pending;
  pending = null;
  /*
   * Waiting for the box to take focus makes this a promise, but the caller is the DOM
   * settling and has nothing to wait for. `pending` is already let go of, so nothing can
   * start a second attempt while this one is still running.
   */
  void restore(drawer, tags).then((put) => {
    if (put) hooks.log('Put the kept hashtags into the form', { hashtags: tags });
    else hooks.log('The compose form would not take the kept hashtags');
  });
};

/**
 * Remembers what was pressed, in case it opened the compose form.
 *
 * Whether it did cannot be told at the moment of the press, so the form is looked for
 * shortly afterwards. A press inside the form itself, or one made while it is already
 * open, cannot be the thing that opened it.
 */
export const rememberTrigger = (target: Element | null): void => {
  /*
   * Remembered whether or not anything is switched on at the time.
   *
   * The switches can be flipped from inside the form itself, so by the time "open the form
   * open" is on, the press that opened that form is long past. Gating this on the setting
   * meant the very first post after switching it on had nothing to press, and the form
   * closed as if the feature did not exist.
   */
  if (!target || target.closest(DRAWER)) return;
  /*
   * The button that opens the form sits in the rail, never inside a column. Ruling
   * columns out is not tidiness: a press there could be remembered by coincidence — the
   * form opened from the keyboard a moment later — and pressing it again would remove a
   * column or clear its posts.
   */
  if (target.closest(COLUMN_SELECTOR)) return;
  const button = target.closest('button, a, [role="button"]');
  if (!button || composeDrawer()) return;
  void waitFor(composeDrawer, OPEN_WITHIN_MS).then((drawer) => {
    if (drawer) opener = button;
  });
};

/** Keeps track of what is being written, since the box is emptied before this can read it */
const watchTyping = (): void => {
  document.addEventListener(
    'input',
    (event) => {
      if (!watching()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const drawer = target.closest(DRAWER);
      // Only the compose form. The text of a reply is none of this module's business
      if (!drawer || drawer !== composeDrawer()) return;
      written = { drawer, text: textIn(drawer) };
    },
    true
  );
};

/**
 * Watches for a post being sent.
 *
 * The page's own requests show up in its resource timing, which a content script shares,
 * so this needs nothing of X's internals and no code running in the page.
 * `buffered` is off so that requests made before this started do not arrive as news.
 */
const watchPosts = (): void => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!createsPost(entry.name)) continue;
      /*
       * One line saying everything the decision rests on. Without it, "nothing happened"
       * gives no way to tell a post that went unnoticed from one that was noticed and
       * then dropped for want of a form or a button to press.
       * Only while something is switched on: with both off there is nothing to explain,
       * and a line on every post would be noise in everyone else's console.
       */
      if (!watching()) continue;
      hooks.log('A post was sent', {
        reopen: settings.reopen,
        keepHashtags: settings.keepHashtags,
        composeForm: composeDrawer() !== null ? 'open' : formForPost() !== null ? 'just gone' : 'none',
        knowsHowToReopen: opener !== null,
      });
      followPost().catch((error) => {
        console.log(
          '%c[X Tweaks]%c Failed to follow the post through',
          PREFIX_STYLE,
          'color:#ef4444',
          error
        );
      });
    }
  });
  observer.observe({ type: 'resource', buffered: false });
};

export const updateSettings = (next: ComposeSettings): void => {
  settings = next;
  // Nothing is kept from what was typed once neither switch wants it
  if (!watching()) written = null;
  // Tags waiting for a form are dropped the moment they stop being wanted
  if (!restoresHashtags(next)) pending = null;
};

export const start = (initial: ComposeSettings, given: Hooks): void => {
  hooks = given;
  updateSettings(initial);
  watchTyping();
  watchPosts();
};
