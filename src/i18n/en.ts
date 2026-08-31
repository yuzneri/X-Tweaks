/**
 * The English messages. This dictionary is the reference for the type, and `ja.ts` is
 * annotated with it.
 * Messages embedding a number are functions: concatenating on the caller's side cannot
 * be translated into languages with a different word order.
 */

/** The sentences pluralize with the number, so they are built separately from the option names */
const AGE_UNITS: { minutes: string; hours: string; days: string } = {
  minutes: 'minutes',
  hours: 'hours',
  days: 'days',
};
const AGE_NOUN = { minutes: 'minute', hours: 'hour', days: 'day' } as const;

export const en = {
  language: {
    label: 'Language',
    auto: 'Auto (follow the browser)',
    ja: '日本語',
    en: 'English',
  },

  /**
   * The post traits usable as conditions. They are the option names and also appear in
   * a condition's description.
   * The negated form is not held here, since conditions.trait attaches it.
   */
  traits: {
    repost: 'Repost',
    quote: 'Quote',
    reply: 'Reply',
    communityNote: 'With a Community Note',
    communityNoteRating: 'With a Community Note to rate',
    pollOpen: 'With a poll still open',
    pollClosed: 'With a finished poll',
    linkCard: 'With a link card',
    space: 'With a Space',
    article: 'With an Article',
    ad: 'Ad or promoted post',
    media: 'With a photo or video',
  },

  /**
   * How one condition is phrased. It appears both in rule names and as the note in the list.
   *
   * The assembly lives in the dictionary: how negation attaches and what the word order
   * is both change with the language, and concatenating on the caller's side cannot be
   * translated fully.
   */
  conditions: {
    text: (target: string, pattern: string, mode: string, negate: boolean) => {
      // "Is the author" carries no pattern, so the quotes would come out empty
      if (mode === 'self') return `${target} ${negate ? 'is not' : 'is'} the author`;
      const verb =
        mode === 'exact'
          ? negate
            ? 'is not'
            : 'is'
          : mode === 'regex'
            ? negate
              ? 'does not match'
              : 'matches'
            : negate
              ? 'does not contain'
              : 'contains';
      return `${target} ${verb} “${pattern}”`;
    },
    trait: (name: string, negate: boolean) => (negate ? `not ${name}` : name),
    /**
     * How old a post is, measured from the moment of judging.
     * With both a direction and a negation, there are four phrasings
     */
    age: (
      value: number,
      unit: keyof typeof AGE_NOUN,
      direction: string,
      negate: boolean
    ): string => {
      const span = `${value} ${AGE_NOUN[unit]}${value === 1 ? '' : 's'}`;
      const verb =
        direction === 'older'
          ? negate
            ? 'is not older than'
            : 'is older than'
          : negate
            ? 'is not newer than'
            : 'is newer than';
      return `the post ${verb} ${span}`;
    },
    /** A rule matches only when every condition holds (AND) */
    and: ' and ',
  },

  actions: {
    collapse: 'Collapse',
    hide: 'Hide',
    highlight: 'Highlight',
    emphasize: 'Emphasize',
    nothing: 'Do nothing',
  },

  /** The button shown under a post cut off by the line limit. It follows X's wording */
  showMore: 'Show more',

  placeholder: {
    /** Shown in the author's place when the author could not be read */
    post: 'Post',
    show: 'Show',
  },

  /** Where settings apply (the "tiers" of the design notes; that word is never shown on screen) */
  tiers: {
    label: 'Where settings apply',
    global: 'Global',
    accounts: 'Account',
    columns: 'Column',
    /** Settings with nothing to match, collected across the tiers */
    unassignedGroup: 'Not assigned',
    notDetecting:
      'pro.x.com is not open, so the current state is unknown. ' +
      'What follows are the columns found earlier.',
    accountsEmpty:
      'No account found yet. Open pro.x.com and the accounts behind your columns will show up here.',
    columnsEmpty:
      'No column here yet. Open pro.x.com and the columns of the deck on screen will show up here.',
    /** A column with settings that was not found in the deck when it was reopened */
    columnMissing: 'not found',
    /** When the columns are visible but not one of them could be identified */
    columnsUnidentified:
      'Your columns are open, but none of them could be identified, so per-column settings ' +
      'cannot be shown. Reloading pro.x.com usually fixes this.',
    unnamedColumn: '(column with no name)',
    missingColumn: '(column not found right now)',
    unknownColumn: '(column not found yet)',
    columnCount: (n: number) => `${n} ${n === 1 ? 'column' : 'columns'}`,
    nth: (n: number) => `no. ${n}`,
    deckNth: (n: number) => `Deck ${n}`,
    deckShowing: 'showing',
    /** The accessible name of the entry point placed in a column header */
    columnEntry: 'Settings for this column',
  },

  tabs: {
    label: 'What to set',
    filter: 'Filter',
    appearance: 'Appearance',
    /** What the compose form does. Shown only on the global settings */
    compose: 'Posting',
    /** The result of merging the three tiers. Shown only while a column is selected */
    effective: 'What applies',
  },

  compose: {
    hint:
      'What the compose form does once a post has gone out. Left alone it does what X Pro ' +
      'does: the form closes and the box is emptied.',
    reopen: {
      label: 'Open the compose form again',
      note: 'X Pro closes the form on posting. This opens it again, ready to type the next post into.',
    },
    keepHashtags: {
      label: 'Put the hashtags back',
      note:
        'The tags that were written go into the next compose form, with the caret waiting ' +
        'in front of them: the form that is opened again if that is set, or the next one ' +
        'opened by hand if it is not.',
    },
  },

  effective: {
    hint:
      'What actually applies to this column, after combining the global, account ' +
      'and column settings. Nothing here can be edited — go to the tier it comes from.',
    from: { global: 'Global', account: 'Account', column: 'This column' },
    unset: 'Not set',
    rules: 'Rules, in the order they are read',
    noRules: 'No rule applies here',
    /** Disabled rules are listed too. This screen is for tracing "why is this not applying", so seeing that they exist helps */
    disabled: 'off',
    filterStopped: 'Filtering is off, so no rule below applies.',
    appearanceStopped: 'Appearance is off, so nothing below applies.',
    appearance: 'Appearance',
  },

  /** What happens to settings with nothing to match */
  forget: {
    action: 'Remove this column from the list',
    hint:
      'Tidies up a column you deleted. If the column is still there, it comes back ' +
      'the next time it is found. The extension cannot tell deletion from being scrolled out of view.',
    confirm: 'The settings for this column go with it. This cannot be undone.',
    confirmYes: 'Remove with its settings',
    confirmNo: 'Cancel',
  },
  unassigned: {
    badge: 'Unassigned',
    configured: 'Configured',
    chooseTarget: 'Choose where to move it',
    remove: 'Delete these settings',
    account: {
      notFound: 'No matching account. The settings are kept.',
      moveTo: 'Move these settings to an account that exists now',
      noTargets: 'No account to move them to',
      skipConfigured: 'Accounts that already have settings are left out, to avoid overwriting them.',
    },
    column: {
      notFound: 'No matching column. The settings are kept.',
      moveTo: 'Move these settings to a column that exists now',
      noTargets: 'No column to move them to',
      skipConfigured: 'Columns that already have settings are left out, to avoid overwriting them.',
    },
  },

  filterToggle: {
    label: 'Filtering',
    on: 'Apply',
    off: 'Do not apply',
  },

  transfer: {
    open: 'Import / export',
    legend: 'Settings as JSON',
    /** The contents reveal things about the user's setup, so they get a look before passing it on */
    hint:
      'This includes your account names and column names. Check it before sharing. ' +
      'You can also paste settings here and load them.',
    save: 'Save to a file',
    copy: 'Copy',
    copied: 'Copied',
    /** The clipboard can be refused. Do not fail silently */
    copyFailed: 'Could not copy. Select the text above and copy it yourself.',
    close: 'Close',
    choose: 'Choose a file',
    load: 'Replace my settings with this',
    /** Replacing cannot be undone, so it is confirmed once */
    confirm: 'This replaces every setting you have. It cannot be undone.',
    confirmYes: 'Replace',
    confirmNo: 'Cancel',
    loaded: 'Loaded',
    forget: 'Forget the detected columns',
    forgotten: 'Forgotten. Reload pro.x.com to rebuild it from the columns that are there',
    forgetFailed: 'Could not forget it. Reopen this page and try again',
    errors: {
      badJson: (detail: string) => `Not valid JSON (${detail})`,
      notOurs: 'This is not a settings file from this extension',
      badVersion: (version: string, supported: number) =>
        `These settings are in a different format (version ${version}) ` +
        `from what this extension reads (version ${supported}), so they cannot be loaded`,
      /** A file can turn out to be unreadable (deleted, or no permission) */
      badFile: 'Could not read that file',
    },
  },

  appearanceToggle: {
    label: 'Appearance',
    on: 'Apply',
    off: 'Do not apply',
    /** Keeps the dimmed values below from reading as "what is in effect" while it is off */
    stoppedHint:
      'Appearance is off here, so nothing below is applied. ' +
      'What you set is still saved, and takes effect when you turn it back on.',
  },

  rules: {
    legend: 'Rules',
    hint:
      'Pick what the post is, then fill in only the boxes you want to match on. ' +
      'Picking a kind of post adds the boxes that go with it. ' +
      'The rule applies to posts that meet everything you filled in.',
    /**
     * The description of the selected action. Only the selected one is shown, next to
     * where the action is chosen.
     * All five listed at the top of the screen would be out of sight at the moment of
     * choosing. Hiding cannot be undone, so it has to be clear before the choice is made.
     */
    actionHints: {
      collapse: 'Folds the post into a single line; press “Show” to bring it back.',
      hide: 'Removes the post entirely, with no way to open it again.',
      highlight: 'Keeps the post and tints its background.',
      emphasize: 'Tints only the matched text.',
      nothing: 'Stops every rule for that post, including the ones above this tier.',
    },
    empty: 'No rule yet',
    /**
     * The order in the list is the order rules are judged in.
     * This is the one description always shown on the filter tab, so the order across
     * tiers is gathered here as well.
     */
    orderHint:
      'Rules are read from the top, and the first one that matches decides what happens. ' +
      'Across tiers they are read column first, then account, then global. ' +
      '“Do nothing” ends the decision right there.',
    moveUp: (label: string) => `Move ${label} up`,
    moveDown: (label: string) => `Move ${label} down`,
    /** What a text condition looks at. Phrased as "whose" and "what" so it reads naturally */
    targets: {
      text: 'the text',
      quotedText: 'the quoted text',
      screenName: 'the user ID',
      displayName: 'the display name',
      repostedBy: 'the reposter’s user ID',
      quotedScreenName: 'the quoted user ID',
      quotedDisplayName: 'the quoted display name',
      replyTo: 'the reply-to user ID',
      pollChoice: 'a poll choice',
      cardDomain: 'the link domain',
      cardTitle: 'the card headline',
      spaceName: 'the Space name',
      articleText: 'the article headline and intro',
    },
    /** An empty box means not filtering on that target */
    anyPlaceholder: 'any',
    /**
     * The choice of not filtering in that box (the same word is used for traits and text).
     * A trait-only rule has "Any" for the text, and a text-only rule has "Any" for the trait
     */
    any: 'Any',
    modes: {
      contains: 'Contains',
      exact: 'Matches exactly',
      regex: 'Regular expression',
      /** Compares against that post's own author. It carries no pattern */
      self: 'Is the author',
    },
    negate: 'Not',
    ageLabel: 'Post age',
    ageUnits: AGE_UNITS,
    ageDirections: { older: 'older than', newer: 'newer than' } as {
      older: string;
      newer: string;
    },
    ageError: 'Enter a whole number of 1 or more',

    /** The per-rule on/off. A switch for stopping a rule temporarily rather than deleting it */
    enabled: 'On',
    modeLabel: 'How to match',
    traitLabel: 'What the post is',
    actionLabel: 'What to do on a match',
    namePlaceholder: 'rule name (optional)',
    caseSensitive: 'Match case',
    /** The button opening the add form. No input boxes are shown until it is pressed */
    openForm: 'Add a rule',
    /** The button closing the add form. It means something different from "Cancel", which abandons an edit */
    closeForm: 'Close',
    add: 'Add',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    remove: 'Delete',
    /** The single confirmation before deleting */
    removeConfirm: 'Delete this rule? This cannot be undone.',
    removeYes: 'Delete',
    removeNo: 'Keep it',
    errors: {
      /** When neither a trait nor any text was given: it would match every post */
      noCondition: 'Pick what the post is, or fill in at least one box',
      badRegex: (detail: string) => `Not a valid regular expression (${detail})`,
      duplicate: 'That rule already exists',
      /** When "Emphasize" is chosen for a rule with nothing to paint */
      noEmphasisTarget:
        'Emphasize needs a condition on something written on screen — ' +
        'that is where the matched characters get tinted. ' +
        'Who reposted, poll choices, text inside cards or Spaces, ' +
        'and “is the author” cannot be tinted',
    },
  },

  /** Color input */
  color: {
    label: 'Color',
    /**
     * The short dimmed text inside the box (only 116px wide). It says no more than
     * where the color came from.
     * The color itself is shown by the swatch beside it, and longer explanations go to
     * `title` and the accessible name.
     */
    unsetShort: 'Not set',
    fallbackShort: 'default',
    inheritedShort: 'inherited',
    /** Shows the color actually used when the box is empty */
    fallback: (color: string) => `default (${color})`,
    /** A color coming down from a wider scope. Unlike a default, it can be traced and changed */
    inherited: (color: string) => `from a wider scope (${color})`,
    /** What an empty box means in fields with no stand-in color (the appearance palette) */
    unset: 'Not set (X Pro default)',
    error: 'Enter a color code as #rrggbb, or #rrggbbaa to include opacity',
    /** The picker's (Coloris) messages */
    picker: {
      clear: 'Clear',
      close: 'Close',
      open: 'Open the color picker',
      closeLabel: 'Close the color picker',
      clearLabel: 'Clear the selected color',
      marker: (s: string, v: string) => `Saturation ${s}, brightness ${v}`,
      hue: 'Hue',
      alpha: 'Opacity',
      input: 'Color code',
      format: 'Format',
      swatch: 'Color swatch',
      instruction: 'Pick saturation and brightness. Use the arrow keys to move.',
    },
  },

  /** Appearance. Every item left empty or unset keeps the way X Pro shows it */
  appearance: {
    legend: 'Size and display',
    hint: 'Anything left empty or unset keeps the way X Pro shows it.',
    columnWidth: 'Column width',
    // What happens to the buttons belongs in the label rather than in the options: the label
    // wraps, while the widest option decides the select's width and pushes the row past a narrow panel
    compact: 'How tightly posts sit (repost and like move up beside the name)',
    compactOn: 'Pack them in',
    compactOff: 'Leave them as they are',
    fontSize: 'Post text size',
    maxLines: 'Post text line limit',
    lines: 'lines',
    collapseNewlines: 'Line breaks in the post text',
    collapseNewlinesOn: 'Fold each into a space',
    collapseNewlinesOff: 'Keep them',
    colors: {
      legend: 'Colors',
      columnHeader: 'Behind the column name',
      background: 'Column background',
      columnTitle: 'Column name',
      name: 'Author name',
      text: 'Post text',
      meta: 'Secondary text (times, counts, reply-to)',
      link: 'Links and “Show more”',
      border: 'Line between posts',
    },
    autoContrast: 'When a highlight makes text unreadable',
    autoContrastOn: 'Fix the text color',
    autoContrastOff: 'Leave it alone',
    /** What a highlight color is laid over */
    highlightBase: 'Blend highlights over',
    highlightBases: {
      column: 'The column background',
      theme: 'X’s background (ignore the column color)',
    } as { column: string; theme: string },
    /** How a post's time is shown */
    timeFormat: 'Time display',
    timeFormats: {
      relative: 'As X shows it',
      absolute: 'Date and time',
      both: 'Both',
    } as { relative: string; absolute: string; both: string },
    /**
     * How a post's time is written. The order of the date parts changes with the
     * language, so it lives in the dictionary.
     * `year` is null for the current year (omitted)
     */
    timeAbsolute: (
      year: number | null,
      month: number,
      day: number,
      hour: string,
      minute: string
    ): string => {
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const date = `${MONTHS[month - 1]} ${day}${year === null ? '' : ` ${year}`}`;
      return `${date}, ${hour}:${minute}`;
    },
    /** Today's posts show the clock time alone (under "both", the relative time in parentheses fills in the date) */
    timeClock: (hour: string, minute: string): string => `${hour}:${minute}`,
    /**
     * The characters wrapping X's relative time under "both". Halfwidth in both
     * languages, with a space in front.
     * The values are identical for now, but how parentheses are used can differ by
     * language, so they stay in the dictionary
     */
    timeParens: { open: ' (', close: ')' } as { open: string; close: string },
    media: {
      maxThumbHeight: 'Largest thumbnail height',
      collapse: 'Photos and videos',
      collapseOn: 'Do not show',
      collapseOff: 'Show',
    },
  },

  /** Sizes entered in px */
  size: {
    unit: 'px',
    unset: 'Not set',
    /**
     * The value coming down from a wider scope when the box is empty.
     * The box is narrow, so the dimmed text shows only the number; the explanation for
     * screen readers lives in `inheritedLabel`.
     */
    inheritedLabel: (label: string, value: string, unit: string) =>
      `${label} (not set; inherits ${value} ${unit} from a wider scope)`,
    error: 'Enter a whole number of pixels, or leave it empty',
  },

  /** The notice shown briefly in a corner of the screen */
  status: {
    /** The same wording is used when a save from another screen arrives */
    saved: 'Saved',
    saveFailed: 'Could not save. What you see here is not stored yet',
  },

  /** When the stored format version differs and cannot be read */
  unreadable: {
    newer: (stored: number, supported: number) =>
      `The saved settings use format version ${stored}, which is newer than the version ` +
      `this extension supports (${supported}), so they cannot be read. ` +
      `Your settings are still saved. Please update the extension.`,
    older: (stored: number, supported: number) =>
      `The saved settings use format version ${stored}; this extension uses version ` +
      `${supported}, and the two are not compatible, so it started from the defaults. ` +
      `The old settings are still stored and are replaced only once you change something here.`,
  },

  /** Not set (on toggle-style rules, inheriting the setting from above) */
  unset: 'Not set',

  title: 'X Pro Tweaks settings',

  /** The panel that opens inside pro.x.com */
  panel: {
    close: 'Close the settings',
  },

  /** The notice when one of X's markers breaks. What stops differs per marker, so each has its own sentence */
  health: {
    cell: 'The way posts are marked seems to have changed. Neither filters nor appearance apply.',
    post: 'The way posts are read seems to have changed. Filters do not apply.',
    column:
      'The way columns are identified seems to have changed. Per-column settings do not apply '
      + '(account and global settings still do).',
    text:
      'The way post text is read seems to have changed. Rules that look at text are off ' +
      '(otherwise a "does not contain" condition would match every post).',
    hint: 'This clears itself once X changes back. Reload pro.x.com to check again.',
  },
  adGuardNotice:
    'Too many posts looked like ads, so the ad rules were turned off to avoid hiding ' +
    'everything. Reload pro.x.com to try again.',

  /**
   * The notice shown on the settings screen while the extension is paused.
   * Being paused is shown only in the popup, so without this there is nothing on screen
   * to say why the settings have no effect
   */
  pausedNotice:
    'The extension is paused, so nothing here is applied. ' +
    'Your changes are still saved. Resume it from the toolbar icon.',

  /** The popup on the toolbar icon */
  popup: {
    openPanel: 'Open the settings here',
    openOptions: 'Open the settings page',
    /** States which one it currently is. A toggle alone does not say what the state was before pressing */
    running: 'Running on pro.x.com',
    paused: 'Paused — nothing is applied',
    pause: 'Pause',
    resume: 'Resume',
    saveFailed: 'Could not switch. Reopen the browser and try again',
  },
};

/** The shape of a dictionary. `ja.ts` is annotated with this */
export type Messages = typeof en;
