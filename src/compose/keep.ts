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

const PREFIX_STYLE = 'color:#1d9bf0;font-weight:bold';

type Hooks = { log: (...args: unknown[]) => void };

let settings: ComposeSettings = { keepOpen: false, keepHashtags: false };
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

/** Set while a post is being followed through, so a thread's several requests act once */
let acting = false;

/**
 * The compose form, or null when it is not open.
 * The marker on the drawer is shared with the column options, so the box inside it is
 * what identifies the form. A reply or a quote is left alone.
 */
const composeDrawer = (): Element | null => {
  for (const drawer of document.querySelectorAll(DRAWER)) {
    if (!drawer.querySelector(EDITOR)) continue;
    if (drawer.querySelector(SHOWN_POST)) continue;
    return drawer;
  }
  return null;
};

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

/**
 * Presses the remembered button until the form comes back.
 * A button that is no longer in the document cannot be pressed, and there is no second
 * way to open the form, so that is where this gives up.
 */
const reopen = async (): Promise<Element | null> => {
  if (!(opener instanceof HTMLElement) || !opener.isConnected) return null;
  for (let attempt = 0; attempt < PRESS_ATTEMPTS; attempt++) {
    opener.click();
    const drawer = await waitFor(composeDrawer, OPEN_WITHIN_MS);
    if (drawer) return drawer;
  }
  return null;
};

/** Where the caret goes: the start of the text, not the start of the element */
const firstTextNode = (root: Node): Node =>
  document.createTreeWalker(root, NodeFilter.SHOW_TEXT).nextNode() ?? root;

const putCaretAtStart = (editor: Element): void => {
  const selection = document.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStart(firstTextNode(editor), 0);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Puts the tags into the reopened box and leaves it ready to type in.
 *
 * The box is a rich text editor holding its own copy of what it shows, so writing to the
 * DOM does not reach it. `execCommand` is deprecated but it is the one way left to enter
 * text the way a keypress does; a synthesised `beforeinput` is untrusted and ignored.
 * The caret ends up in front of the tags, which is where the body gets typed.
 */
const restore = (editor: Element, text: string): boolean => {
  if (!(editor instanceof HTMLElement)) return false;
  editor.focus();
  if (text === '') return true;
  /*
   * Text goes wherever the focus actually is, not where it was meant to go. Without this
   * check, a `focus()` that did not take would spill the tags into whatever else was
   * focused — a reply being written, the search box. Not writing them costs nothing.
   */
  if (document.activeElement !== editor) return false;
  document.execCommand('insertText', false, text);
  putCaretAtStart(editor);
  return true;
};

/**
 * Follows a post through: waits for the form to close, brings it back, and puts the tags in.
 *
 * The form has to be open at the moment the request is seen. Replies and quotes send the
 * same request, and without that condition every reply would open the compose form and
 * drop the reply's tags into it.
 */
const followPost = async (): Promise<void> => {
  if (!settings.keepOpen || acting) return;
  const drawer = composeDrawer();
  if (!drawer) return;

  acting = true;
  try {
    // Read now: once the form goes, there is nothing left to read it from
    const text = written?.drawer === drawer ? written.text : textIn(drawer);
    const tags = restoresHashtags(settings) ? restoredText(hashtagsIn(text)) : '';

    // A post that did not go through leaves the form open, and nothing should happen
    if (!(await waitUntilClosed(drawer, CLOSE_WITHIN_MS))) return;

    const reopened = await reopen();
    if (!reopened) {
      hooks.log('Could not open the compose form again; leaving it closed');
      return;
    }

    const editor = await waitFor(() => reopened.querySelector(EDITOR), EDITOR_WITHIN_MS);
    if (!editor) {
      hooks.log('The compose form came back without a box to write in');
      return;
    }

    if (!restore(editor, tags)) {
      hooks.log('The compose form came back but would not take the hashtags');
    }
    written = null;
  } finally {
    acting = false;
  }
};

/**
 * Remembers what was pressed, in case it opened the compose form.
 *
 * Whether it did cannot be told at the moment of the press, so the form is looked for
 * shortly afterwards. A press inside the form itself, or one made while it is already
 * open, cannot be the thing that opened it.
 */
export const rememberTrigger = (target: Element | null): void => {
  if (!settings.keepOpen || !target || target.closest(DRAWER)) return;
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
      if (!settings.keepOpen) return;
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
      followPost().catch((error) => {
        console.log(
          '%c[X Pro Tweaks]%c Failed to keep the compose form open',
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
  // Nothing is kept from what was typed once the feature is switched off
  if (!next.keepOpen) written = null;
};

export const start = (initial: ComposeSettings, given: Hooks): void => {
  hooks = given;
  updateSettings(initial);
  watchTyping();
  watchPosts();
};
