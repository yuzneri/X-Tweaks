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
    auto: 'Auto',
    ja: '日本語',
    en: 'English',
  },

  /**
   * X's own words for a picture nobody described. Kept beside the language: both are
   * about what X shows rather than what the extension does
   */
  genericAlts: {
    label: "X's word for a picture with no description",
    note:
      'One to a line, worked out from the pages you read. A line written here is left as ' +
      'written; a line deleted comes back if a page shows the same word again.',
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
    communityNote: 'Community Note',
    communityNoteRating: 'Community Note to rate',
    pollOpen: 'Poll (open)',
    pollClosed: 'Poll (finished)',
    linkCard: 'Link card',
    space: 'Space',
    article: 'Article',
    ad: 'Ad',
    media: 'Photo or video',
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
    views: 'Views',
    /** The whole-site entry: where the settings live that belong to a site rather than any scope in it */
    whole: (name: string) => `All of ${name}`,
    /** The names of x.com's views. Only the key is recorded; the name is decided here, so it follows the language */
    viewNames: {
      home: 'Home',
      notifications: 'Notifications',
      bookmarks: 'Bookmarks',
      list: 'List',
    },
    viewsEmpty: 'No view yet. Open x.com and the views you visit are listed here.',
    notDetectingX: 'x.com is not open, so this may not be up to date.',
    missingView: '(a view you are not on)',
    unknownView: '(a view not visited yet)',
    global: 'Global',
    accounts: 'Account',
    /** The accounts as a tier of one site. Named with the site, the tier above being called 'Account' too */
    accountsOn: (site: string) => `Accounts on ${site}`,
    columns: 'Column',
    /** Settings with nothing to match, collected across the tiers */
    unassignedGroup: 'Not assigned',
    notDetecting: 'pro.x.com is not open, so this is not up to date.',
    accountsEmpty:
      'No account found yet. Open pro.x.com or x.com and they will show up here.',
    columnsEmpty:
      'No column here yet. Open pro.x.com and the columns of the deck on screen will show up here.',
    /** A column with settings that was not found in the deck when it was reopened */
    columnMissing: 'not found',
    unnamedColumn: '(column with no name)',
    missingColumn: '(column not found right now)',
    unknownColumn: '(column not found yet)',
    scopeCount: (columns: number, views: number) =>
      [
        columns ? `${columns} ${columns === 1 ? 'column' : 'columns'}` : null,
        views ? `${views} ${views === 1 ? 'view' : 'views'}` : null,
      ]
        .filter((part) => part !== null)
        .join(', '),
    nth: (n: number) => `no. ${n}`,
    deckNth: (n: number) => `Deck ${n}`,
    deckShowing: 'showing',
    /** The accessible name of the entry point placed in a column header */
    columnEntry: 'Settings for this column',
  },

  surfaces: {
    label: 'Which screen',
    common: 'Both',
    pro: 'X Pro',
    x: 'x.com',
    meta: 'More',
  },

  meta: {
    settings: 'Settings',
    about: 'About',
    version: 'Version',
    source: 'Source code',
    issues: 'Reporting a problem',
    issuesLink: 'GitHub issues',
    license: 'License',
    privacy: 'Privacy',
    privacyNote:
      'This extension talks to nobody. Your settings stay on this device and never leave it.',
    policy: 'Privacy policy',
  },

  tabs: {
    label: 'What to set',
    filter: 'Filter',
    appearance: 'Appearance',
    /**
     * The posting settings. No longer a tab of its own — they live under the X Pro
     * whole-site entry — but the word still names the group of switches put beside the
     * compose form (`compose/switches.ts`)
     */
    compose: 'Posting',
    /** The result of merging the tiers. Shown only while a column or a view is selected */
    effective: 'What applies',
    /**
     * The fourth tab on a site's page. What appears in a timeline without being a post:
     * on x.com the box at its head and the new-posts bar, on both sites what X slips in.
     * The pair of "Around the timeline", the tab before it
     */
    inTimeline: 'In the timeline',
  },

  compose: {
    label: 'The compose form',
    reopen: {
      label: 'Open the compose form again',
      note: 'Opens the compose form again, ready to type the next post into.',
    },
    keepHashtags: {
      label: 'Put the hashtags back',
      note: 'Puts the tags that were written into the next compose form.',
    },
  },

  /** What X slips into a timeline that is not a post. Offered for either site */
  injected: {
    label: 'Insertions other than posts',
    hint: 'What X slips into a timeline that is not a post.',
    whoToFollow: {
      label: 'Accounts X suggests following',
      note: 'Clearing it takes the one beside the timeline too.',
    },
    discoverMore: {
      label: '“Discover more”',
      note: 'The conversation itself stays.',
    },
  },

  /**
   * The page x.com draws around the timeline. The names of the items are X's own, so they
   * are decided here and follow the language, the way `tiers.viewNames` are.
   */
  xChrome: {
    /**
     * What stands around the timeline, as one word. Used as a tab name, so it is kept
     * short — the groups inside name the parts (the items down the left, the rail).
     */
    label: 'Around the timeline',
    nav: {
      label: 'The items on the left',
      items: {
        explore: 'Explore',
        follow: 'Follow',
        messages: 'Chat',
        grok: 'Grok',
        history: 'History (bookmarks, likes)',
        creatorStudio: 'Creator Studio',
        articles: 'Articles',
        /** X names it Premium for somebody who has not subscribed and Premium+ for somebody who has */
        premium: 'Premium',
        profile: 'Profile',
        postButton: 'Post button',
      },
    },
    menu: {
      label: 'Inside the “More” menu',
      items: {
        lists: 'Lists',
        communities: 'Communities',
        communityNotes: 'Community Notes',
        business: 'Business',
        ads: 'Ads',
        spaces: 'Create your Space',
        mutedKeyword: 'Add muted word',
        settings: 'Settings and privacy',
      },
    },
    wideTimeline: {
      label: 'Widen the timeline',
      note: 'Takes the items on the right away, search box and all, and widens the timeline.',
    },
    rail: {
      label: 'The items on the right',
      items: {
        premium: 'The pitch for Premium',
        news: 'Today’s News',
        trends: 'What’s happening',
        relevantPeople: 'Relevant people',
        footer: 'Terms, privacy and the rest',
      },
    },
    drawers: {
      label: 'The items in the bottom-right corner',
      items: { grok: 'Grok', chat: 'Chat' },
    },
    /** A group inside the "In the timeline" tab: the two that stand at its head */
    timeline: { label: 'The head of the timeline' },
    composeBox: {
      label: 'The compose form on the timeline',
      note: 'The reply form stays either way.',
    },
    autoNewPosts: {
      label: 'Bring new posts in by itself',
    },
  },

  /**
   * The detailed search form. It stands in its own box beside the items on the right
   * rather than among them: those are things x.com draws and this is a thing put there,
   * and a switch reading "add this" among switches reading "keep this" would be read as
   * one of them.
   */
  search: {
    label: 'Search',
    form: {
      label: 'Put a detailed search form on the right',
      note:
        'Goes under the search box, which stays as it is. On a search results page it ' +
        'takes the place of X’s own search filters, which it already covers.',
      /** Shown in place of `note` while the rail has been taken away */
      noteWide: 'Not while the items on the right are taken away: there is nowhere to put it.',
    },

    /**
     * The form's own fields, as they read in the rail.
     *
     * Worded as what the reader wants rather than as X's operator names. Somebody who
     * knows `min_faves:` can write it into the first field and have it reach X untouched;
     * the point of the rest is to be usable without knowing any of them.
     */
    fields: {
      all: 'All of these keywords',
      exact: 'This keyword as a whole',
      any: 'Any of these keywords',
      none: 'None of these keywords',
      hashtags: 'These hashtags',

      from: 'From these accounts',
      to: 'Replying to these accounts',
      mentioning: 'Mentioning these accounts',
      /** The one word shared by the three account fields, each having the same switch */
      exclude: 'Exclude',

      verified: 'Verified accounts',
      links: 'Links',
      images: 'Photos',
      videos: 'Videos',
      /** How each of those four is asked for */
      choices: { any: 'Either way', include: 'Only these', exclude: 'Leave out' },

      replies: 'Replies',
      repliesAny: 'Either way',
      repliesOnly: 'Only replies',
      repliesExclude: 'Leave replies out',

      lang: 'Language',
      langAny: 'Any language',

      minReplies: 'Replies, at least',
      minFaves: 'Likes, at least',
      minRetweets: 'Reposts, at least',

      /**
       * Each names both of the controls beside it, the day and the time within it: the
       * time carries no label of its own (`Span`).
       */
      since: 'From',
      until: 'Until',

      tab: 'Show',
      /** X's own tabs, worded as X words them */
      tabs: { top: 'Top', live: 'Latest', user: 'People', media: 'Media', list: 'Lists' },
      followedOnly: 'Only accounts you follow',
      nearbyOnly: 'Only near you',

      go: 'Search',
      reset: 'Clear',

      /**
       * The four X has no operator for. They are done to the results after they arrive,
       * which is what the note says — a reader who does not know that would take them for
       * part of the search and wonder why they are gone on the next visit.
       */
      leaveOutNote: 'Done to the results on screen.',
      excludeReposts: 'Hide reposts',
      excludeHashtags: 'Hide posts with a hashtag',
      excludeNameOnly: 'Hide posts that matched the display name only',
      excludeHandleOnly: 'Hide posts that matched the user ID only',
    },

    /** The folded groups. Folded because the rail is narrow and the open form is tall */
    groups: {
      accounts: 'Accounts',
      filters: 'Filters',
      engagement: 'How much it got',
      dates: 'When',
    },
  },

  effective: {
    hint: 'What actually applies to this column.',
    hintView: 'What actually applies to this view.',
    // `view` is not a tier of its own: it is what `column` is called on x.com
    from: {
      global: 'Global',
      account: 'Account',
      // Which site it is, the page it is read on says
      surface: 'This site',
      /** The account and the site together: the tier that holds one account's exception on one site */
      surfaceAccount: 'Account on this site',
      column: 'This column',
      view: 'This view',
    },
    unset: 'Not set',
    rules: 'Rules',
    noRules: 'No rules',
    /** Disabled rules are listed too. This screen is for tracing "why is this not applying", so seeing that they exist helps */
    disabled: 'off',
    filterStopped: 'Filtering is off, so no rule below applies.',
    appearanceStopped: 'Appearance is off, so nothing below applies.',
    appearance: 'Appearance',
  },

  /** What happens to settings with nothing to match */
  forget: {
    column: {
      action: 'Delete this column',
      confirm: 'Its settings are deleted with it. This cannot be undone.',
    },
    view: {
      action: 'Delete this view',
      confirm: 'Its settings are deleted with it. This cannot be undone.',
    },
    confirmYes: 'Remove with its settings',
    confirmNo: 'Cancel',
  },
  unassigned: {
    badge: 'Unassigned',
    configured: 'Configured',
    chooseTarget: 'Choose where to move it',
    remove: 'Delete these settings',
    account: {
      notFound: 'No matching account',
      moveTo: 'Move to an account that exists now',
      noTargets: 'No account to move them to',
      skipConfigured: 'Accounts that already have settings cannot be chosen, to avoid overwriting them.',
    },
    column: {
      notFound: 'No matching column',
      moveTo: 'Move to a column that exists now',
      noTargets: 'No column to move them to',
      skipConfigured: 'Columns that already have settings cannot be chosen, to avoid overwriting them.',
    },
    view: {
      notFound: 'No matching view',
      moveTo: 'Move to a view that exists now',
      noTargets: 'No view to move them to',
      skipConfigured: 'Views that already have settings cannot be chosen, to avoid overwriting them.',
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
      'This includes your account names, column names and the views you visited. ' +
      'Check it before sharing. ' +
      'You can also paste settings here and load them.',
    save: 'Save to a file',
    copy: 'Copy',
    copied: 'Copied',
    /** The clipboard can be refused. Do not fail silently */
    copyFailed: 'Could not copy. Copy it from the box above.',
    close: 'Close',
    choose: 'Choose a file',
    load: 'Replace my settings with this',
    /** Replacing cannot be undone, so it is confirmed once */
    confirm: 'This replaces every setting you have. It cannot be undone.',
    confirmYes: 'Replace',
    confirmNo: 'Cancel',
    loaded: 'Loaded',
    forget: 'Forget the columns and views found',
    forgotten: 'Forgotten. Reload pro.x.com or x.com to build it again',
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
    stoppedHint: 'Appearance is off, so nothing below takes effect.',
  },

  rules: {
    legend: 'Rules',
    hint: 'The rule applies to posts that meet everything set here.',
    /**
     * The description of the selected action. Only the selected one is shown, next to
     * where the action is chosen.
     * All five listed at the top of the screen would be out of sight at the moment of
     * choosing. Hiding cannot be undone, so it has to be clear before the choice is made.
     */
    actionHints: {
      collapse: 'Folds the post into a single line; press “Show” to bring it back.',
      hide: 'Deletes the post.',
      highlight: 'Tints the post’s background.',
      emphasize: 'Tints only the matched text.',
      nothing: 'Stops every rule for that post, including the ones above this tier.',
    },
    empty: 'No rule yet',
    /**
     * The order in the list is the order rules are judged in.
     * This is the one description always shown on the filter tab, so the order across
     * tiers is gathered here as well.
     */
    /** The innermost tier's name, as it reads inside the sentence below */
    orderScopes: { pro: 'column', x: 'view', both: 'column or view' },
    orderHint: (scope: string) =>
      'Rules are read from the top, and the first one that matches is used. ' +
      `Narrower scopes are read first (${scope} → account on this site → site → account → global). ` +
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
        'Emphasize needs a condition on something written on screen. ' +
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
    unset: "Not set (X's own)",
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
    hintX: 'Anything left empty or unset keeps the way x.com shows it.',
    columnWidth: 'Column width',
    /**
     * The three groups below are named after what they are about, not after where they
     * work. Named for the range ("X Pro only"), a group has nothing left to say on that
     * site's own page, and its contents move into the groups above — so the same item
     * would sit in a different place depending on the page it is read on.
     * The range is said in the hint instead, which is the same sentence on every page.
     */
    columnGroup: {
      legend: 'Columns',
      hint: 'Only X Pro has columns, so this is what a column of X Pro looks like.',
    },
    compact: 'Pack the posts',
    compactOn: 'Packed',
    compactOff: 'As they are',
    fontSize: 'Post text size',
    maxLines: 'Post text line limit',
    lines: 'lines',
    /**
     * How much of a description, a quoted post or a headline goes on screen — one setting
     * for the line put into a post and for the caption under a picture. 80 when unset.
     */
    wordsShown: 'Characters shown of a description or quote',
    characters: 'characters',
    collapseNewlines: 'Line breaks in the post text',
    collapseNewlinesOn: 'Fold each into a space',
    collapseNewlinesOff: 'As they are',
    colors: {
      legend: 'Colors',
      columnHeader: 'Behind the column name',
      /**
       * One name for both sites. X Pro's columns each hold a timeline, so the word is true
       * on either, and it saves the same setting from being called two different things
       * depending on the page it is read on.
       */
      background: 'Background inside the timeline',
      /** Said on every page, so that the name above does not have to change per site */
      backgroundNote: 'Inside a column on X Pro',
      columnTitle: 'Column name',
      name: 'Author name',
      text: 'Post text',
      meta: 'Secondary text (times, counts, reply-to)',
      link: 'Links',
      border: 'Line between posts',
      composeBackground: 'Compose form background',
      pageBackground: 'Background outside the timeline',
      /** Why the row is missing on X Pro: there is no page there to paint */
      pageNote: 'Only x.com has one',
    },
    autoContrast: 'When a highlight makes text unreadable',
    autoContrastOn: 'Fix the text color',
    autoContrastOff: 'Nothing',
    /** What a highlight color is laid over */
    highlightBase: 'Blend highlights over',
    highlightBases: {
      /** The same name the color field uses, so the two read as the one thing */
      column: 'Background inside the timeline',
      theme: 'X’s own',
    } as { column: string; theme: string },
    /** How a post's time is shown */
    timeFormat: 'Time display',
    timeFormats: {
      relative: 'As it is',
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
      /** How photos and videos are shown. The line goes into the post, where they were */
      style: 'Photos and videos',
      /**
       * "Text" is the description written for the picture. A picture with none takes the
       * mark alone. The caption is the same words with the picture kept, written under
       * it where a finger can reach them — a tooltip cannot be
       */
      styles: {
        show: 'As they are',
        caption: 'Add the description',
        text: 'Text',
        mark: 'A mark',
        hidden: 'Not shown',
      } as { show: string; caption: string; text: string; mark: string; hidden: string },
      /**
       * Which picture a description belongs to, written only where a post carries more
       * than one. X allows a post one video and no more, so anything numbered is a photo.
       */
      captionNth: (nth: number, description: string): string => `Picture ${nth}: ${description}`,
    },
    /**
     * How the things that hang off a post are shown: a link card, an article, a quoted
     * post. The middle one runs what X already writes as text into the post, following
     * the body
     */
    cardStyle: 'Link cards and articles',
    /** A quoted post. Its own setting, with the same four ways of showing it */
    quoteStyle: 'Quoted posts',
    attachmentStyles: {
      show: 'As they are',
      text: 'Text',
      mark: 'A mark',
      hidden: 'Not shown',
    } as { show: string; text: string; mark: string; hidden: string },
    /**
     * What wraps the domain written after a card's headline. Fullwidth in Japanese,
     * where they carry their own spacing, so the values differ by language
     */
    cardParens: { open: ' (', close: ')' } as { open: string; close: string },
    /**
     * The block of accounts X slips into a timeline, and shows beside it on x.com. Named
     * by what it is rather than by X's own heading, which is worded per UI language
     */
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
    saveFailed: 'Could not save',
  },

  /** When the stored format version differs and cannot be read */
  unreadable: {
    newer: (stored: number, supported: number) =>
      `The saved settings use format version ${stored}, which is newer than the version ` +
      `this extension supports (${supported}), so they cannot be read. ` +
      `Your settings are still saved. Please update the extension.`,
    older: (stored: number, supported: number) =>
      `The saved settings use format version ${stored}; this extension uses version ` +
      `${supported}, and the two are not compatible, so it started from the defaults.`,
  },

  /** Not set (on toggle-style rules, inheriting the setting from above) */
  unset: 'Not set',

  /**
   * Putting one item back to how X shows it, cancelling what an upper range set. It
   * appears on the colour and size fields. The row is narrow, so the visible words are
   * short and what it means goes to `title` and the accessible name.
   */
  cleared: {
    short: 'As X',
    label: (item: string) => `Keep ${item} as X shows it`,
    note: 'Ignores the value set by a wider range and keeps X’s own display.',
  },

  title: 'X Tweaks settings',

  /** The panel that opens inside pro.x.com */
  panel: {
    close: 'Close the settings',
  },

  /** The notice when one of X's markers breaks. What stops differs per marker, so each has its own sentence */
  health: {
    cell: 'The way posts are marked seems to have changed. Neither filters nor appearance apply.',
    post: 'The way posts are read seems to have changed. Filters do not apply.',
    column: 'The way columns are identified seems to have changed. Per-column settings do not apply',
    text: 'The way post text is read seems to have changed. Rules that read text are off.',
    hint: 'This clears itself once X changes back. Reload pro.x.com to check again.',
  },
  adGuardNotice:
    'Too many posts looked like ads, so the ad rules were turned off for now.',

  /**
   * The notice shown on the settings screen while the extension is paused.
   * Being paused is shown only in the popup, so without this there is nothing on screen
   * to say why the settings have no effect
   */
  pausedNotice: 'The extension is paused for now. Resume it from the toolbar icon.',

  /** The popup on the toolbar icon */
  popup: {
    openPanel: 'Open the settings here',
    openOptions: 'Open the settings page',
    /** States which one it currently is. A toggle alone does not say what the state was before pressing */
    running: 'Running on pro.x.com',
    paused: 'Paused for now',
    pause: 'Pause',
    resume: 'Resume',
    saveFailed: 'Could not switch. Reopen the browser and try again',
  },
};

/** The shape of a dictionary. `ja.ts` is annotated with this */
export type Messages = typeof en;
