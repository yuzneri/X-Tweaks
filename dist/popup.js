"use strict";
(() => {
  // src/panel/message.ts
  var OPEN_PANEL = "xpro-tweaks:open-panel";

  // src/i18n/en.ts
  var AGE_UNITS = {
    minutes: "minutes",
    hours: "hours",
    days: "days"
  };
  var AGE_NOUN = { minutes: "minute", hours: "hour", days: "day" };
  var en = {
    language: {
      label: "Language",
      auto: "Auto (follow the browser)",
      ja: "日本語",
      en: "English"
    },
    /**
     * The post traits usable as conditions. They are the option names and also appear in
     * a condition's description.
     * The negated form is not held here, since conditions.trait attaches it.
     */
    traits: {
      repost: "Repost",
      quote: "Quote",
      reply: "Reply",
      communityNote: "With a Community Note",
      communityNoteRating: "With a Community Note to rate",
      pollOpen: "With a poll still open",
      pollClosed: "With a finished poll",
      linkCard: "With a link card",
      space: "With a Space",
      article: "With an Article",
      ad: "Ad or promoted post",
      media: "With a photo or video"
    },
    /**
     * How one condition is phrased. It appears both in rule names and as the note in the list.
     *
     * The assembly lives in the dictionary: how negation attaches and what the word order
     * is both change with the language, and concatenating on the caller's side cannot be
     * translated fully.
     */
    conditions: {
      text: (target, pattern, mode, negate) => {
        if (mode === "self") return `${target} ${negate ? "is not" : "is"} the author`;
        const verb = mode === "exact" ? negate ? "is not" : "is" : mode === "regex" ? negate ? "does not match" : "matches" : negate ? "does not contain" : "contains";
        return `${target} ${verb} “${pattern}”`;
      },
      trait: (name, negate) => negate ? `not ${name}` : name,
      /**
       * How old a post is, measured from the moment of judging.
       * With both a direction and a negation, there are four phrasings
       */
      age: (value, unit, direction, negate) => {
        const span = `${value} ${AGE_NOUN[unit]}${value === 1 ? "" : "s"}`;
        const verb = direction === "older" ? negate ? "is not older than" : "is older than" : negate ? "is not newer than" : "is newer than";
        return `the post ${verb} ${span}`;
      },
      /** A rule matches only when every condition holds (AND) */
      and: " and "
    },
    actions: {
      collapse: "Collapse",
      hide: "Hide",
      highlight: "Highlight",
      emphasize: "Emphasize",
      nothing: "Do nothing"
    },
    /** The button shown under a post cut off by the line limit. It follows X's wording */
    showMore: "Show more",
    placeholder: {
      /** Shown in the author's place when the author could not be read */
      post: "Post",
      show: "Show"
    },
    /** Where settings apply (the "tiers" of the design notes; that word is never shown on screen) */
    tiers: {
      label: "Where settings apply",
      global: "Global",
      accounts: "Account",
      columns: "Column",
      /** Settings with nothing to match, collected across the tiers */
      unassignedGroup: "Not assigned",
      notDetecting: "pro.x.com is not open, so the current state is unknown. What follows are the columns found earlier.",
      accountsEmpty: "No account found yet. Open pro.x.com and the accounts behind your columns will show up here.",
      columnsEmpty: "No column here yet. Open pro.x.com and the columns of the deck on screen will show up here.",
      /** A column with settings that was not found in the deck when it was reopened */
      columnMissing: "not found",
      /** When the columns are visible but not one of them could be identified */
      columnsUnidentified: "Your columns are open, but none of them could be identified, so per-column settings cannot be shown. Reloading pro.x.com usually fixes this.",
      unnamedColumn: "(column with no name)",
      missingColumn: "(column not found right now)",
      unknownColumn: "(column not found yet)",
      columnCount: (n) => `${n} ${n === 1 ? "column" : "columns"}`,
      nth: (n) => `no. ${n}`,
      deckNth: (n) => `Deck ${n}`,
      deckShowing: "showing",
      /** The accessible name of the entry point placed in a column header */
      columnEntry: "Settings for this column"
    },
    tabs: {
      label: "What to set",
      filter: "Filter",
      appearance: "Appearance",
      /** The result of merging the three tiers. Shown only while a column is selected */
      effective: "What applies"
    },
    effective: {
      hint: "What actually applies to this column, after combining the global, account and column settings. Nothing here can be edited — go to the tier it comes from.",
      from: { global: "Global", account: "Account", column: "This column" },
      unset: "Not set",
      rules: "Rules, in the order they are read",
      noRules: "No rule applies here",
      /** Disabled rules are listed too. This screen is for tracing "why is this not applying", so seeing that they exist helps */
      disabled: "off",
      filterStopped: "Filtering is off, so no rule below applies.",
      appearanceStopped: "Appearance is off, so nothing below applies.",
      appearance: "Appearance"
    },
    /** What happens to settings with nothing to match */
    forget: {
      action: "Remove this column from the list",
      hint: "Tidies up a column you deleted. If the column is still there, it comes back the next time it is found. The extension cannot tell deletion from being scrolled out of view.",
      confirm: "The settings for this column go with it. This cannot be undone.",
      confirmYes: "Remove with its settings",
      confirmNo: "Cancel"
    },
    unassigned: {
      badge: "Unassigned",
      configured: "Configured",
      chooseTarget: "Choose where to move it",
      remove: "Delete these settings",
      account: {
        notFound: "No matching account. The settings are kept.",
        moveTo: "Move these settings to an account that exists now",
        noTargets: "No account to move them to",
        skipConfigured: "Accounts that already have settings are left out, to avoid overwriting them."
      },
      column: {
        notFound: "No matching column. The settings are kept.",
        moveTo: "Move these settings to a column that exists now",
        noTargets: "No column to move them to",
        skipConfigured: "Columns that already have settings are left out, to avoid overwriting them."
      }
    },
    filterToggle: {
      label: "Filtering",
      on: "Apply",
      off: "Do not apply"
    },
    transfer: {
      open: "Import / export",
      legend: "Settings as JSON",
      /** The contents reveal things about the user's setup, so they get a look before passing it on */
      hint: "This includes your account names and column names. Check it before sharing. You can also paste settings here and load them.",
      save: "Save to a file",
      copy: "Copy",
      copied: "Copied",
      /** The clipboard can be refused. Do not fail silently */
      copyFailed: "Could not copy. Select the text above and copy it yourself.",
      close: "Close",
      choose: "Choose a file",
      load: "Replace my settings with this",
      /** Replacing cannot be undone, so it is confirmed once */
      confirm: "This replaces every setting you have. It cannot be undone.",
      confirmYes: "Replace",
      confirmNo: "Cancel",
      loaded: "Loaded",
      forget: "Forget the detected columns",
      forgotten: "Forgotten. Reload pro.x.com to rebuild it from the columns that are there",
      forgetFailed: "Could not forget it. Reopen this page and try again",
      errors: {
        badJson: (detail) => `Not valid JSON (${detail})`,
        notOurs: "This is not a settings file from this extension",
        badVersion: (version, supported) => `These settings are in a different format (version ${version}) from what this extension reads (version ${supported}), so they cannot be loaded`,
        /** A file can turn out to be unreadable (deleted, or no permission) */
        badFile: "Could not read that file"
      }
    },
    appearanceToggle: {
      label: "Appearance",
      on: "Apply",
      off: "Do not apply",
      /** Keeps the dimmed values below from reading as "what is in effect" while it is off */
      stoppedHint: "Appearance is off here, so nothing below is applied. What you set is still saved, and takes effect when you turn it back on."
    },
    rules: {
      legend: "Rules",
      hint: "Pick what the post is, then fill in only the boxes you want to match on. Picking a kind of post adds the boxes that go with it. The rule applies to posts that meet everything you filled in.",
      /**
       * The description of the selected action. Only the selected one is shown, next to
       * where the action is chosen.
       * All five listed at the top of the screen would be out of sight at the moment of
       * choosing. Hiding cannot be undone, so it has to be clear before the choice is made.
       */
      actionHints: {
        collapse: "Folds the post into a single line; press “Show” to bring it back.",
        hide: "Removes the post entirely, with no way to open it again.",
        highlight: "Keeps the post and tints its background.",
        emphasize: "Tints only the matched text.",
        nothing: "Stops every rule for that post, including the ones above this tier."
      },
      empty: "No rule yet",
      /**
       * The order in the list is the order rules are judged in.
       * This is the one description always shown on the filter tab, so the order across
       * tiers is gathered here as well.
       */
      orderHint: "Rules are read from the top, and the first one that matches decides what happens. Across tiers they are read column first, then account, then global. “Do nothing” ends the decision right there.",
      moveUp: (label) => `Move ${label} up`,
      moveDown: (label) => `Move ${label} down`,
      /** What a text condition looks at. Phrased as "whose" and "what" so it reads naturally */
      targets: {
        text: "the text",
        quotedText: "the quoted text",
        screenName: "the user ID",
        displayName: "the display name",
        repostedBy: "the reposter’s user ID",
        quotedScreenName: "the quoted user ID",
        quotedDisplayName: "the quoted display name",
        replyTo: "the reply-to user ID",
        pollChoice: "a poll choice",
        cardDomain: "the link domain",
        cardTitle: "the card headline",
        spaceName: "the Space name",
        articleText: "the article headline and intro"
      },
      /** An empty box means not filtering on that target */
      anyPlaceholder: "any",
      /**
       * The choice of not filtering in that box (the same word is used for traits and text).
       * A trait-only rule has "Any" for the text, and a text-only rule has "Any" for the trait
       */
      any: "Any",
      modes: {
        contains: "Contains",
        exact: "Matches exactly",
        regex: "Regular expression",
        /** Compares against that post's own author. It carries no pattern */
        self: "Is the author"
      },
      negate: "Not",
      ageLabel: "Post age",
      ageUnits: AGE_UNITS,
      ageDirections: { older: "older than", newer: "newer than" },
      ageError: "Enter a whole number of 1 or more",
      /** The per-rule on/off. A switch for stopping a rule temporarily rather than deleting it */
      enabled: "On",
      modeLabel: "How to match",
      traitLabel: "What the post is",
      actionLabel: "What to do on a match",
      namePlaceholder: "rule name (optional)",
      caseSensitive: "Match case",
      /** The button opening the add form. No input boxes are shown until it is pressed */
      openForm: "Add a rule",
      /** The button closing the add form. It means something different from "Cancel", which abandons an edit */
      closeForm: "Close",
      add: "Add",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      remove: "Delete",
      /** The single confirmation before deleting */
      removeConfirm: "Delete this rule? This cannot be undone.",
      removeYes: "Delete",
      removeNo: "Keep it",
      errors: {
        /** When neither a trait nor any text was given: it would match every post */
        noCondition: "Pick what the post is, or fill in at least one box",
        badRegex: (detail) => `Not a valid regular expression (${detail})`,
        duplicate: "That rule already exists",
        /** When "Emphasize" is chosen for a rule with nothing to paint */
        noEmphasisTarget: "Emphasize needs a condition on something written on screen — that is where the matched characters get tinted. Who reposted, poll choices, text inside cards or Spaces, and “is the author” cannot be tinted"
      }
    },
    /** Color input */
    color: {
      label: "Color",
      /**
       * The short dimmed text inside the box (only 116px wide). It says no more than
       * where the color came from.
       * The color itself is shown by the swatch beside it, and longer explanations go to
       * `title` and the accessible name.
       */
      unsetShort: "Not set",
      fallbackShort: "default",
      inheritedShort: "inherited",
      /** Shows the color actually used when the box is empty */
      fallback: (color) => `default (${color})`,
      /** A color coming down from a wider scope. Unlike a default, it can be traced and changed */
      inherited: (color) => `from a wider scope (${color})`,
      /** What an empty box means in fields with no stand-in color (the appearance palette) */
      unset: "Not set (X Pro default)",
      error: "Enter a color code as #rrggbb, or #rrggbbaa to include opacity",
      /** The picker's (Coloris) messages */
      picker: {
        clear: "Clear",
        close: "Close",
        open: "Open the color picker",
        closeLabel: "Close the color picker",
        clearLabel: "Clear the selected color",
        marker: (s, v) => `Saturation ${s}, brightness ${v}`,
        hue: "Hue",
        alpha: "Opacity",
        input: "Color code",
        format: "Format",
        swatch: "Color swatch",
        instruction: "Pick saturation and brightness. Use the arrow keys to move."
      }
    },
    /** Appearance. Every item left empty or unset keeps the way X Pro shows it */
    appearance: {
      legend: "Size and display",
      hint: "Anything left empty or unset keeps the way X Pro shows it.",
      columnWidth: "Column width",
      fontSize: "Post text size",
      maxLines: "Post text line limit",
      lines: "lines",
      colors: {
        legend: "Colors",
        columnHeader: "Behind the column name",
        background: "Column background",
        columnTitle: "Column name",
        name: "Author name",
        text: "Post text",
        meta: "Secondary text (times, counts, reply-to)",
        link: "Links and “Show more”",
        border: "Line between posts"
      },
      autoContrast: "When a highlight makes text unreadable",
      autoContrastOn: "Fix the text color",
      autoContrastOff: "Leave it alone",
      /** What a highlight color is laid over */
      highlightBase: "Blend highlights over",
      highlightBases: {
        column: "The column background",
        theme: "X’s background (ignore the column color)"
      },
      /** How a post's time is shown */
      timeFormat: "Time display",
      timeFormats: {
        relative: "As X shows it",
        absolute: "Date and time",
        both: "Both"
      },
      /**
       * How a post's time is written. The order of the date parts changes with the
       * language, so it lives in the dictionary.
       * `year` is null for the current year (omitted)
       */
      timeAbsolute: (year, month, day, hour, minute) => {
        const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const date = `${MONTHS[month - 1]} ${day}${year === null ? "" : ` ${year}`}`;
        return `${date}, ${hour}:${minute}`;
      },
      /** Today's posts show the clock time alone (under "both", the relative time in parentheses fills in the date) */
      timeClock: (hour, minute) => `${hour}:${minute}`,
      /**
       * The characters wrapping X's relative time under "both". Halfwidth in both
       * languages, with a space in front.
       * The values are identical for now, but how parentheses are used can differ by
       * language, so they stay in the dictionary
       */
      timeParens: { open: " (", close: ")" },
      media: {
        maxThumbHeight: "Largest thumbnail height",
        collapse: "Photos and videos",
        collapseOn: "Do not show",
        collapseOff: "Show"
      }
    },
    /** Sizes entered in px */
    size: {
      unit: "px",
      unset: "Not set",
      /**
       * The value coming down from a wider scope when the box is empty.
       * The box is narrow, so the dimmed text shows only the number; the explanation for
       * screen readers lives in `inheritedLabel`.
       */
      inheritedLabel: (label, value, unit) => `${label} (not set; inherits ${value} ${unit} from a wider scope)`,
      error: "Enter a whole number of pixels, or leave it empty"
    },
    /** The notice shown briefly in a corner of the screen */
    status: {
      /** The same wording is used when a save from another screen arrives */
      saved: "Saved",
      saveFailed: "Could not save. What you see here is not stored yet"
    },
    /** When the stored format version differs and cannot be read */
    unreadable: {
      newer: (stored, supported) => `The saved settings use format version ${stored}, which is newer than the version this extension supports (${supported}), so they cannot be read. Your settings are still saved. Please update the extension.`,
      older: (stored, supported) => `The saved settings use format version ${stored}; this extension uses version ${supported}, and the two are not compatible, so it started from the defaults. The old settings are still stored and are replaced only once you change something here.`
    },
    /** Not set (on toggle-style rules, inheriting the setting from above) */
    unset: "Not set",
    title: "X Pro Tweaks settings",
    /** The panel that opens inside pro.x.com */
    panel: {
      close: "Close the settings"
    },
    /** The notice when one of X's markers breaks. What stops differs per marker, so each has its own sentence */
    health: {
      cell: "The way posts are marked seems to have changed. Neither filters nor appearance apply.",
      post: "The way posts are read seems to have changed. Filters do not apply.",
      column: "The way columns are identified seems to have changed. Per-column settings do not apply (account and global settings still do).",
      text: 'The way post text is read seems to have changed. Rules that look at text are off (otherwise a "does not contain" condition would match every post).',
      hint: "This clears itself once X changes back. Reload pro.x.com to check again."
    },
    adGuardNotice: "Too many posts looked like ads, so the ad rules were turned off to avoid hiding everything. Reload pro.x.com to try again.",
    /**
     * The notice shown on the settings screen while the extension is paused.
     * Being paused is shown only in the popup, so without this there is nothing on screen
     * to say why the settings have no effect
     */
    pausedNotice: "The extension is paused, so nothing here is applied. Your changes are still saved. Resume it from the toolbar icon.",
    /** The popup on the toolbar icon */
    popup: {
      openPanel: "Open the settings here",
      openOptions: "Open the settings page",
      /** States which one it currently is. A toggle alone does not say what the state was before pressing */
      running: "Running on pro.x.com",
      paused: "Paused — nothing is applied",
      pause: "Pause",
      resume: "Resume",
      saveFailed: "Could not switch. Reopen the browser and try again"
    }
  };

  // src/i18n/ja.ts
  var AGE_UNITS2 = { minutes: "分", hours: "時間", days: "日" };
  var ja = {
    language: {
      label: "表示言語",
      auto: "自動（ブラウザに合わせる）",
      ja: "日本語",
      en: "English"
    },
    traits: {
      repost: "リポスト",
      quote: "引用",
      reply: "リプライ",
      communityNote: "コミュニティノート付き",
      communityNoteRating: "コミュニティノートの評価待ち",
      pollOpen: "アンケート（回答受付中）",
      pollClosed: "アンケート（結果）",
      linkCard: "リンクカード付き",
      space: "スペース付き",
      article: "記事付き",
      ad: "広告・プロモ",
      media: "画像・動画あり"
    },
    conditions: {
      text: (target, pattern, mode, negate) => {
        if (mode === "self") return `${target}が自分自身${negate ? "でない" : ""}`;
        const suffix = mode === "exact" ? negate ? "と一致しない" : "と完全に一致" : mode === "regex" ? negate ? "に一致しない" : "に一致" : negate ? "を含まない" : "を含む";
        return `${target}が「${pattern}」${suffix}`;
      },
      trait: (name, negate) => negate ? `${name}ではない` : name,
      // How old a post is, shaped to read as "the post is older than one hour"
      age: (value, unit, direction, negate) => {
        const suffix = direction === "older" ? negate ? "より古くない" : "より古い" : negate ? "より新しくない" : "より新しい";
        return `投稿が${value}${AGE_UNITS2[unit]}${suffix}`;
      },
      and: " かつ "
    },
    actions: {
      collapse: "折りたたむ",
      hide: "非表示",
      highlight: "ハイライト",
      emphasize: "強調",
      nothing: "何もしない"
    },
    showMore: "さらに表示",
    placeholder: {
      post: "投稿",
      show: "表示"
    },
    tiers: {
      label: "設定の範囲",
      global: "グローバル",
      accounts: "アカウント",
      columns: "カラム",
      unassignedGroup: "未割り当て",
      notDetecting: "pro.x.com を開いていないので、いまの状態は分かりません。並んでいるのは前に見つけたカラムです。",
      accountsEmpty: "まだアカウントが見つかっていません。pro.x.com を開くと、カラムの所属アカウントがここに並びます。",
      columnsEmpty: "カラムがまだ1本もありません。pro.x.com を開くと、表示中のデッキのカラムがここに並びます。",
      columnMissing: "見つかりません",
      columnsUnidentified: "カラムは開いていますが、1本も見分けられなかったため、カラムごとの設定を出せません。pro.x.com を再読み込みすると直ることがあります。",
      unnamedColumn: "（名前のないカラム）",
      missingColumn: "（いま見つからないカラム）",
      unknownColumn: "（まだ見つけていないカラム）",
      columnCount: (n) => `カラム ${n} 個`,
      nth: (n) => `${n} 番目`,
      /** What a deck is called when its name is unreadable. Names depend on the UI language, whereas a number never breaks */
      deckNth: (n) => `デッキ ${n}`,
      deckShowing: "表示中",
      columnEntry: "このカラムの設定"
    },
    tabs: {
      label: "設定の種類",
      filter: "フィルタ",
      appearance: "見た目",
      effective: "適用中の設定"
    },
    effective: {
      hint: "グローバル・アカウント・カラムの設定をまとめた、このカラムに実際に適用される内容です。ここでは変えられません。直すときは、由来として出ている範囲へ移ってください。",
      from: { global: "グローバル", account: "アカウント", column: "このカラム" },
      unset: "指定なし",
      rules: "ルール（判定する順）",
      noRules: "このカラムに効くルールはありません",
      disabled: "無効",
      filterStopped: "フィルタを止めているので、下のルールはどれも効きません。",
      appearanceStopped: "外観を止めているので、下の指定はどれも効きません。",
      appearance: "見た目"
    },
    /** Removes one column from the record of detected columns */
    forget: {
      action: "このカラムを一覧から消す",
      hint: "消したカラムを片付けます。まだ残っているカラムなら、次に見つけたときまた並びます。X 側で消したかどうかは拡張からは分からないので、この操作でしか消せません。",
      confirm: "このカラムの設定も一緒に消えます。元に戻せません。",
      confirmYes: "設定ごと消す",
      confirmNo: "やめる"
    },
    unassigned: {
      badge: "未割り当て",
      configured: "設定あり",
      chooseTarget: "移す先を選ぶ",
      remove: "この設定を削除",
      account: {
        notFound: "対応するアカウントが見つかりません。設定は残してあります",
        moveTo: "この設定を、いまあるアカウントに移す",
        noTargets: "移せるアカウントがありません",
        skipConfigured: "すでに設定があるアカウントは、上書きを避けるため移す先に出しません。"
      },
      column: {
        notFound: "対応するカラムが見つかりません。設定は残してあります",
        moveTo: "この設定を、いまあるカラムに移す",
        noTargets: "移せるカラムがありません",
        skipConfigured: "すでに設定があるカラムは、上書きを避けるため移す先に出しません。"
      }
    },
    filterToggle: {
      label: "フィルタの適用",
      on: "適用する",
      off: "適用しない"
    },
    appearanceToggle: {
      label: "外観の適用",
      on: "適用する",
      off: "適用しない",
      stoppedHint: "ここでは外観を適用していないので、下の指定はどれも効きません。指定はそのまま保存され、「適用する」に戻したときに効きます。"
    },
    transfer: {
      open: "設定の入出力",
      legend: "設定の JSON",
      hint: "アカウント名とカラム名が入ります。人に渡す前に中身を確かめてください。この欄に貼り付けて読み込むこともできます。",
      save: "ファイルに保存",
      copy: "コピー",
      copied: "コピーしました",
      copyFailed: "コピーできませんでした。上の欄を選んでコピーしてください",
      close: "閉じる",
      choose: "ファイルを選ぶ",
      load: "この内容で設定を置き換える",
      confirm: "いまの設定をすべて置き換えます。元に戻せません。",
      confirmYes: "置き換える",
      confirmNo: "やめる",
      loaded: "読み込みました",
      /** Columns that are out of sight are never deleted automatically, so tidying up is done by hand */
      forget: "検出したカラムの記録を消す",
      forgotten: "記録を消しました。pro.x.com を開き直すと、いま在るカラムから作り直します",
      forgetFailed: "記録を消せませんでした。この画面を開き直してからもう一度お試しください",
      errors: {
        badJson: (detail) => `JSON として読めません（${detail}）`,
        notOurs: "この拡張の設定ファイルではありません",
        badVersion: (version, supported) => `設定の形式（version ${version}）が、この拡張の扱う形式（version ${supported}）と違うため読み込めません`,
        badFile: "ファイルを読めませんでした"
      }
    },
    rules: {
      legend: "ルール",
      hint: "投稿の種類を選び、絞りたい欄だけを埋めます。種類を選ぶと、その種類に関わる欄が増えます。埋めた内容をすべて満たす投稿に一致します。",
      actionHints: {
        collapse: "投稿を1行にまとめます。「表示」を押すと元に戻ります。",
        hide: "投稿ごと消します。開き直す方法はありません。",
        highlight: "投稿を残したまま背景に色を付けます。",
        emphasize: "一致した文字だけに色を付けます。",
        nothing: "その投稿への指定を、上位の範囲のものまで含めて止めます。"
      },
      empty: "まだルールがありません",
      orderHint: "上から順に見て、最初に一致したルールの動作を使います。範囲をまたぐときは、カラム設定 → アカウント設定 → グローバル設定の順に見ます。「何もしない」に一致すると、そこで判定が終わります。",
      moveUp: (label) => `${label}を上へ`,
      moveDown: (label) => `${label}を下へ`,
      targets: {
        text: "本文",
        quotedText: "引用元の本文",
        screenName: "ユーザーID",
        displayName: "表示名",
        repostedBy: "リポストした人のID",
        quotedScreenName: "引用元の投稿者のID",
        quotedDisplayName: "引用元の投稿者の表示名",
        replyTo: "返信先のID",
        pollChoice: "アンケートの選択肢",
        cardDomain: "リンク先のドメイン",
        cardTitle: "カードの見出し",
        spaceName: "スペースの名前",
        articleText: "記事の見出しと書き出し"
      },
      anyPlaceholder: "すべて",
      any: "すべて",
      modes: {
        contains: "含む",
        exact: "完全に一致",
        regex: "正規表現",
        /** Compares against that post's own author. It carries no pattern */
        self: "自分自身"
      },
      negate: "条件を反転",
      ageLabel: "投稿の古さ",
      ageUnits: AGE_UNITS2,
      ageDirections: { older: "より古い", newer: "より新しい" },
      ageError: "1 以上の整数を入力してください",
      enabled: "有効",
      modeLabel: "一致方法",
      traitLabel: "投稿の種類",
      actionLabel: "一致したときの動作",
      namePlaceholder: "ルール名（省略可）",
      caseSensitive: "大文字小文字を区別",
      openForm: "ルールを追加",
      closeForm: "閉じる",
      add: "追加",
      save: "保存",
      cancel: "取消",
      edit: "編集",
      remove: "削除",
      removeConfirm: "このルールを削除します。元に戻せません。",
      removeYes: "削除する",
      removeNo: "やめる",
      errors: {
        noCondition: "投稿の種類を選ぶか、どれか1つの欄を埋めてください",
        badRegex: (detail) => `正規表現として読めません（${detail}）`,
        duplicate: "すでに同じルールがあります",
        noEmphasisTarget: "「強調」には、画面に文字として出ている対象を見る条件が要ります（そこで一致した文字に色を付けます）。リポストした人・アンケートの選択肢・カードやスペースの文字と、「自分自身」の指定には色を付けられません"
      }
    },
    color: {
      label: "色",
      unsetShort: "未指定",
      fallbackShort: "既定",
      inheritedShort: "上位",
      fallback: (color) => `既定（${color}）`,
      inherited: (color) => `上位の設定（${color}）`,
      unset: "未指定（X Pro 標準）",
      error: "カラーコードは #rrggbb か、不透明度を含む #rrggbbaa の形式で入力してください",
      picker: {
        clear: "消す",
        close: "閉じる",
        open: "カラーピッカーを開く",
        closeLabel: "カラーピッカーを閉じる",
        clearLabel: "選んだ色を消す",
        marker: (s, v) => `鮮やかさ ${s}、明るさ ${v}`,
        hue: "色あい",
        alpha: "不透明度",
        input: "カラーコード",
        format: "形式",
        swatch: "色の見本",
        instruction: "鮮やかさと明るさを選びます。上下左右のキーで動かせます。"
      }
    },
    appearance: {
      legend: "大きさと表示",
      hint: "空欄・未指定の項目は、X Pro の表示のままになります。",
      columnWidth: "カラムの幅",
      fontSize: "本文の字の大きさ",
      maxLines: "本文の行数の上限",
      lines: "行",
      colors: {
        legend: "配色",
        columnHeader: "カラム名の帯の背景",
        background: "カラムの背景",
        columnTitle: "カラム名",
        name: "投稿者の名前",
        text: "本文",
        meta: "薄い文字（時刻・件数・返信先）",
        link: "リンクと「さらに表示」",
        border: "投稿と投稿の境目の線"
      },
      autoContrast: "ハイライトで文字が読めなくなったとき",
      autoContrastOn: "文字の色を自動で直す",
      autoContrastOff: "何もしない",
      highlightBase: "ハイライトの色を重ねる先",
      highlightBases: {
        column: "カラムの背景",
        theme: "X の背景（カラムの色を無視）"
      },
      timeFormat: "時刻の表示",
      timeFormats: {
        relative: "X の表示のまま",
        absolute: "日付と時刻",
        both: "両方"
      },
      timeAbsolute: (year, month, day, hour, minute) => `${year === null ? "" : `${year}年`}${month}月${day}日 ${hour}:${minute}`,
      timeClock: (hour, minute) => `${hour}:${minute}`,
      timeParens: { open: " (", close: ")" },
      media: {
        maxThumbHeight: "サムネイルの高さの上限",
        collapse: "画像と動画の表示",
        collapseOn: "表示しない",
        collapseOff: "表示する"
      }
    },
    size: {
      unit: "px",
      unset: "未指定",
      inheritedLabel: (label, value, unit) => `${label}（未指定。上位の設定の ${value}${unit} が適用されます）`,
      error: "整数のピクセル数を入力するか、空欄にしてください"
    },
    status: {
      // The same wording is used when a save from another screen arrives
      saved: "保存しました",
      // The state where what is on screen and what is stored disagree
      saveFailed: "保存できませんでした。この画面に見えている設定はまだ保存されていません"
    },
    unreadable: {
      newer: (stored, supported) => `保存されている設定の形式（version ${stored}）が、この拡張の対応する形式（version ${supported}）より新しいため読み込めません。設定は保存されたまま残っています。拡張を更新してください。`,
      older: (stored, supported) => `保存されている設定の形式（version ${stored}）は、この拡張の形式（version ${supported}）と互換性がないため、初期状態で始めました。以前の設定は保存されたまま残っていて、ここで何かを変えたときに置き換わります。`
    },
    unset: "未指定",
    title: "X Pro Tweaks の設定",
    panel: {
      close: "設定を閉じる"
    },
    /** The broken markers of X. What stops differs per marker, so each is described separately */
    health: {
      cell: "投稿の見分け方が変わったようです。フィルタも外観も適用されていません。",
      post: "投稿の読み取り方が変わったようです。フィルタが適用されていません。",
      column: "カラムの見分け方が変わったようです。カラムごとの設定が効きません（アカウントとグローバルの設定は効いています）。",
      text: "本文の読み取り方が変わったようです。本文を見るルールを止めています（止めないと、打ち消しの条件がすべての投稿に一致します）。",
      hint: "X 側の作りが戻れば自動で直ります。pro.x.com を開き直すと確かめ直します。"
    },
    adGuardNotice: "広告と判定される投稿が多すぎたため、すべて消してしまわないように広告のルールを止めました。pro.x.com を再読み込みすると、また判定を試します。",
    pausedNotice: "拡張を一時的に止めています。ここでの設定は保存されますが、いまは効きません。ツールバーのアイコンから再開できます。",
    popup: {
      openPanel: "このページで設定を開く",
      openOptions: "設定のページを開く",
      running: "pro.x.com で動いています",
      paused: "止めています（何も適用していません）",
      pause: "一時的に止める",
      resume: "再開する",
      saveFailed: "切り替えられませんでした。ブラウザを開き直してからもう一度お試しください"
    }
  };

  // src/i18n/index.ts
  var LOCALES = ["ja", "en"];
  var LANGUAGES = ["auto", ...LOCALES];
  var isLanguage = (v) => LANGUAGES.includes(v);
  var MESSAGES = { ja, en };
  var messagesFor = (locale) => MESSAGES[locale];
  var resolveLocale = (language, browserLanguage) => {
    if (language !== "auto") return language;
    return browserLanguage.toLowerCase().startsWith("ja") ? "ja" : "en";
  };
  var localeOf = (language) => resolveLocale(language, navigator.language);

  // src/settings/schema.ts
  var SCHEMA_VERSION = 3;
  var ACTIONS = {
    COLLAPSE: "collapse",
    // fold it up
    HIDE: "hide",
    // remove it without a trace
    HIGHLIGHT: "highlight",
    // keep it shown, with a background color
    EMPHASIZE: "emphasize",
    // color only the matched characters
    NOTHING: "nothing"
    // stop every setting for this post (those of upper tiers included)
  };
  var TRAIT_KEYS = [
    "repost",
    "quote",
    "reply",
    "communityNote",
    "communityNoteRating",
    "pollOpen",
    "pollClosed",
    "linkCard",
    "space",
    "article",
    "ad",
    "media"
  ];
  var HIGHLIGHT_BASES = ["column", "theme"];
  var isHighlightBase = (v) => HIGHLIGHT_BASES.includes(v);
  var TIME_FORMATS = ["relative", "absolute", "both"];
  var isTimeFormat = (v) => TIME_FORMATS.includes(v);
  var MATCH_TARGETS = [
    "text",
    "quotedText",
    "screenName",
    "displayName",
    "repostedBy",
    "quotedScreenName",
    "quotedDisplayName",
    "replyTo",
    "pollChoice",
    "cardDomain",
    "cardTitle",
    "spaceName",
    "articleText"
  ];
  var isScreenNameTarget = (target) => target === "screenName" || target === "repostedBy" || target === "quotedScreenName" || target === "replyTo";
  var MATCH_MODES = ["contains", "exact", "regex", "self"];
  var isSelfMode = (mode) => mode === "self";
  var canCompareToSelf = (target) => isScreenNameTarget(target) && target !== "screenName";
  var MINUTES_IN = { minutes: 1, hours: 60, days: 60 * 24 };
  var isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  var rec = (v) => isRecord(v) ? v : {};
  var arr = (v) => Array.isArray(v) ? v : [];
  var str = (v) => typeof v === "string" ? v : null;
  var bool = (v) => typeof v === "boolean" ? v : null;
  var size = (v) => typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null;
  var isAction = (v) => Object.values(ACTIONS).includes(v);
  var HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  var hexColor = (v) => typeof v === "string" && HEX_COLOR_PATTERN.test(v) ? v.toLowerCase() : null;
  var isTarget = (v) => MATCH_TARGETS.includes(v);
  var isMode = (v) => MATCH_MODES.includes(v);
  var isTraitKey = (v) => TRAIT_KEYS.includes(v);
  var condition = (v) => {
    const o = rec(v);
    const negate = bool(o.negate) ?? false;
    if (o.kind === "trait") {
      return isTraitKey(o.trait) ? { kind: "trait", trait: o.trait, negate } : null;
    }
    if (o.kind === "age") {
      const minutes = o.minutes;
      if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes <= 0) return null;
      const direction = o.direction === "newer" ? "newer" : "older";
      return { kind: "age", direction, minutes, negate };
    }
    if (o.kind !== "text") return null;
    const target = isTarget(o.target) ? o.target : "text";
    const mode = isMode(o.mode) ? o.mode : "contains";
    if (isSelfMode(mode)) {
      return canCompareToSelf(target) ? { kind: "text", target, mode, pattern: "", caseSensitive: false, negate } : null;
    }
    const pattern = str(o.pattern);
    if (!pattern) return null;
    return {
      kind: "text",
      target,
      mode,
      pattern,
      caseSensitive: bool(o.caseSensitive) ?? false,
      negate
    };
  };
  var rule = (v) => {
    const o = rec(v);
    const conditions = arr(o.conditions).map(condition).filter(isPresent);
    if (conditions.length === 0) return null;
    return {
      id: str(o.id) ?? newRuleId(),
      conditions,
      action: isAction(o.action) ? o.action : ACTIONS.COLLAPSE,
      color: hexColor(o.color),
      label: str(o.label) ?? "",
      // Settings with no on/off are taken as never having been meant to be stopped, and are enabled
      enabled: bool(o.enabled) ?? true
    };
  };
  var syncOrder = (order, rules) => {
    const ids = new Set(rules.map((rule2) => rule2.id));
    const kept = [];
    const seen = /* @__PURE__ */ new Set();
    for (const raw of arr(order)) {
      const id = str(raw);
      if (!id || !ids.has(id) || seen.has(id)) continue;
      seen.add(id);
      kept.push(id);
    }
    return [...kept, ...rules.map((rule2) => rule2.id).filter((id) => !seen.has(id))];
  };
  var isPresent = (v) => v !== null;
  var fillNode = (v) => {
    const node = rec(v);
    const filter = rec(node.filter);
    const appearance = rec(node.appearance);
    const colors = rec(appearance.colors);
    const media = rec(appearance.media);
    const rules = {
      enabled: bool(filter.enabled),
      rules: arr(filter.rules).map(rule).filter(isPresent)
    };
    return {
      filter: { ...rules, order: syncOrder(filter.order, rules.rules) },
      appearance: {
        enabled: bool(appearance.enabled),
        columnWidth: size(appearance.columnWidth),
        fontSize: size(appearance.fontSize),
        maxLines: size(appearance.maxLines),
        colors: {
          background: hexColor(colors.background),
          text: hexColor(colors.text),
          name: hexColor(colors.name),
          meta: hexColor(colors.meta),
          link: hexColor(colors.link),
          border: hexColor(colors.border),
          columnTitle: hexColor(colors.columnTitle),
          columnHeader: hexColor(colors.columnHeader)
        },
        media: {
          maxThumbHeight: size(media.maxThumbHeight),
          collapse: bool(media.collapse)
        },
        timeFormat: isTimeFormat(appearance.timeFormat) ? appearance.timeFormat : null,
        autoContrast: bool(appearance.autoContrast),
        highlightBase: isHighlightBase(appearance.highlightBase) ? appearance.highlightBase : null
      }
    };
  };
  var nodeMap = (v) => Object.fromEntries(Object.entries(rec(v)).map(([key, node]) => [key, fillNode(node)]));
  var fillAll = (v) => {
    const stored = rec(v);
    return {
      version: SCHEMA_VERSION,
      language: isLanguage(stored.language) ? stored.language : "auto",
      global: fillNode(stored.global),
      accounts: nodeMap(stored.accounts),
      columns: nodeMap(stored.columns)
    };
  };
  var emptySettings = () => fillAll(void 0);
  var newRuleId = () => crypto.randomUUID();

  // src/settings/storage.ts
  var api = typeof browser !== "undefined" ? browser : chrome;
  var STORAGE_KEY = "settings";
  var PAUSED_KEY = "paused";
  var load = async () => {
    const stored = (await api.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
    if (stored === void 0 || stored === null) {
      return { settings: emptySettings(), unreadable: null };
    }
    const version = stored.version;
    if (version !== SCHEMA_VERSION) {
      const stamped = typeof version === "number" ? version : 0;
      return {
        settings: emptySettings(),
        unreadable: { version: stamped, newer: stamped > SCHEMA_VERSION }
      };
    }
    return { settings: fillAll(stored), unreadable: null };
  };
  var fillPaused = (v) => v === true;
  var loadPaused = async () => fillPaused((await api.storage.local.get(PAUSED_KEY))[PAUSED_KEY]);
  var savePaused = async (paused) => {
    await api.storage.local.set({ [PAUSED_KEY]: paused });
  };

  // src/popup.tsx
  var api2 = typeof browser !== "undefined" ? browser : chrome;
  var root = document.getElementById("app");
  if (!root) throw new Error("ポップアップのマウント先が見つかりません");
  var button = (label, onClick) => {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.addEventListener("click", onClick);
    return el;
  };
  var main = async () => {
    const [{ settings }, startPaused] = await Promise.all([load(), loadPaused()]);
    const messages = messagesFor(localeOf(settings.language));
    document.documentElement.lang = localeOf(settings.language);
    document.title = messages.title;
    const title = document.createElement("p");
    title.className = "popup-title";
    title.textContent = messages.title;
    let paused = startPaused;
    const state = document.createElement("p");
    state.className = "popup-state";
    state.setAttribute("role", "status");
    const toggle = button("", () => void flip());
    const failure = document.createElement("p");
    failure.className = "popup-failed";
    failure.setAttribute("role", "alert");
    failure.textContent = messages.popup.saveFailed;
    failure.hidden = true;
    const show = () => {
      state.textContent = paused ? messages.popup.paused : messages.popup.running;
      state.classList.toggle("paused", paused);
      toggle.textContent = paused ? messages.popup.resume : messages.popup.pause;
    };
    const flip = async () => {
      paused = !paused;
      show();
      toggle.disabled = true;
      try {
        await savePaused(paused);
        failure.hidden = true;
      } catch {
        paused = !paused;
        show();
        failure.hidden = false;
      } finally {
        toggle.disabled = false;
      }
    };
    show();
    const openOptions = () => {
      void api2.runtime.openOptionsPage();
      window.close();
    };
    const openPanel = async () => {
      const [tab] = await api2.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === void 0) {
        openOptions();
        return;
      }
      try {
        await api2.tabs.sendMessage(tab.id, { type: OPEN_PANEL });
        window.close();
      } catch {
        openOptions();
      }
    };
    root.append(
      title,
      state,
      toggle,
      failure,
      button(messages.popup.openPanel, () => void openPanel()),
      button(messages.popup.openOptions, openOptions)
    );
  };
  void main();
})();
