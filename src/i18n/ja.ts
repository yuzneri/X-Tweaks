/** The Japanese messages. Annotated with `Messages`, so a missing or extra key falls to the type checker */
import type { Messages } from './en.ts';

/** The age units, used both as the option names and in the condition's sentence */
const AGE_UNITS = { minutes: '分', hours: '時間', days: '日' };

export const ja: Messages = {
  language: {
    label: '表示言語',
    auto: '自動（ブラウザに合わせる）',
    ja: '日本語',
    en: 'English',
  },

  traits: {
    repost: 'リポスト',
    quote: '引用',
    reply: 'リプライ',
    communityNote: 'コミュニティノート付き',
    communityNoteRating: 'コミュニティノートの評価待ち',
    pollOpen: 'アンケート（回答受付中）',
    pollClosed: 'アンケート（結果）',
    linkCard: 'リンクカード付き',
    space: 'スペース付き',
    article: '記事付き',
    ad: '広告・プロモ',
    media: '画像・動画あり',
  },

  conditions: {
    text: (target, pattern, mode, negate) => {
      // "Is the author" carries no pattern, so the corner brackets would come out empty
      if (mode === 'self') return `${target}が自分自身${negate ? 'でない' : ''}`;
      const suffix =
        mode === 'exact'
          ? negate
            ? 'と一致しない'
            : 'と完全に一致'
          : mode === 'regex'
            ? negate
              ? 'に一致しない'
              : 'に一致'
            : negate
              ? 'を含まない'
              : 'を含む';
      return `${target}が「${pattern}」${suffix}`;
    },
    trait: (name, negate) => (negate ? `${name}ではない` : name),
    // How old a post is, shaped to read as "the post is older than one hour"
    age: (value, unit, direction, negate) => {
      const suffix =
        direction === 'older'
          ? negate
            ? 'より古くない'
            : 'より古い'
          : negate
            ? 'より新しくない'
            : 'より新しい';
      return `投稿が${value}${AGE_UNITS[unit]}${suffix}`;
    },
    and: ' かつ ',
  },

  actions: {
    collapse: '折りたたむ',
    hide: '非表示',
    highlight: 'ハイライト',
    emphasize: '強調',
    nothing: '何もしない',
  },

  showMore: 'さらに表示',

  placeholder: {
    post: '投稿',
    show: '表示',
  },

  tiers: {
    label: '設定の範囲',
    global: 'グローバル',
    accounts: 'アカウント',
    columns: 'カラム',
    unassignedGroup: '未割り当て',
    notDetecting:
      'pro.x.com を開いていないので、いまの状態は分かりません。' +
      '並んでいるのは前に見つけたカラムです。',
    accountsEmpty:
      'まだアカウントが見つかっていません。pro.x.com を開くと、カラムの所属アカウントがここに並びます。',
    columnsEmpty:
      'カラムがまだ1本もありません。pro.x.com を開くと、表示中のデッキのカラムがここに並びます。',
    columnMissing: '見つかりません',
    columnsUnidentified:
      'カラムは開いていますが、1本も見分けられなかったため、カラムごとの設定を出せません。' +
      'pro.x.com を再読み込みすると直ることがあります。',
    unnamedColumn: '（名前のないカラム）',
    missingColumn: '（いま見つからないカラム）',
    unknownColumn: '（まだ見つけていないカラム）',
    columnCount: (n: number) => `カラム ${n} 個`,
    nth: (n: number) => `${n} 番目`,
    /** What a deck is called when its name is unreadable. Names depend on the UI language, whereas a number never breaks */
    deckNth: (n: number) => `デッキ ${n}`,
    deckShowing: '表示中',
    columnEntry: 'このカラムの設定',
  },

  tabs: {
    label: '設定の種類',
    filter: 'フィルタ',
    appearance: '見た目',
    effective: '適用中の設定',
  },

  effective: {
    hint:
      'グローバル・アカウント・カラムの設定をまとめた、このカラムに実際に適用される内容です。' +
      'ここでは変えられません。直すときは、由来として出ている範囲へ移ってください。',
    from: { global: 'グローバル', account: 'アカウント', column: 'このカラム' },
    unset: '指定なし',
    rules: 'ルール（判定する順）',
    noRules: 'このカラムに効くルールはありません',
    disabled: '無効',
    filterStopped: 'フィルタを止めているので、下のルールはどれも効きません。',
    appearanceStopped: '外観を止めているので、下の指定はどれも効きません。',
    appearance: '見た目',
  },

  /** Removes one column from the record of detected columns */
  forget: {
    action: 'このカラムを一覧から消す',
    hint:
      '消したカラムを片付けます。まだ残っているカラムなら、次に見つけたときまた並びます。' +
      'X 側で消したかどうかは拡張からは分からないので、この操作でしか消せません。',
    confirm: 'このカラムの設定も一緒に消えます。元に戻せません。',
    confirmYes: '設定ごと消す',
    confirmNo: 'やめる',
  },
  unassigned: {
    badge: '未割り当て',
    configured: '設定あり',
    chooseTarget: '移す先を選ぶ',
    remove: 'この設定を削除',
    account: {
      notFound: '対応するアカウントが見つかりません。設定は残してあります',
      moveTo: 'この設定を、いまあるアカウントに移す',
      noTargets: '移せるアカウントがありません',
      skipConfigured: 'すでに設定があるアカウントは、上書きを避けるため移す先に出しません。',
    },
    column: {
      notFound: '対応するカラムが見つかりません。設定は残してあります',
      moveTo: 'この設定を、いまあるカラムに移す',
      noTargets: '移せるカラムがありません',
      skipConfigured: 'すでに設定があるカラムは、上書きを避けるため移す先に出しません。',
    },
  },

  filterToggle: {
    label: 'フィルタの適用',
    on: '適用する',
    off: '適用しない',
  },

  appearanceToggle: {
    label: '外観の適用',
    on: '適用する',
    off: '適用しない',
    stoppedHint:
      'ここでは外観を適用していないので、下の指定はどれも効きません。' +
      '指定はそのまま保存され、「適用する」に戻したときに効きます。',
  },

  transfer: {
    open: '設定の入出力',
    legend: '設定の JSON',
    hint:
      'アカウント名とカラム名が入ります。人に渡す前に中身を確かめてください。' +
      'この欄に貼り付けて読み込むこともできます。',
    save: 'ファイルに保存',
    copy: 'コピー',
    copied: 'コピーしました',
    copyFailed: 'コピーできませんでした。上の欄を選んでコピーしてください',
    close: '閉じる',
    choose: 'ファイルを選ぶ',
    load: 'この内容で設定を置き換える',
    confirm: 'いまの設定をすべて置き換えます。元に戻せません。',
    confirmYes: '置き換える',
    confirmNo: 'やめる',
    loaded: '読み込みました',
    /** Columns that are out of sight are never deleted automatically, so tidying up is done by hand */
    forget: '検出したカラムの記録を消す',
    forgotten: '記録を消しました。pro.x.com を開き直すと、いま在るカラムから作り直します',
    forgetFailed: '記録を消せませんでした。この画面を開き直してからもう一度お試しください',
    errors: {
      badJson: (detail: string) => `JSON として読めません（${detail}）`,
      notOurs: 'この拡張の設定ファイルではありません',
      badVersion: (version: string, supported: number) =>
        `設定の形式（version ${version}）が、この拡張の扱う形式（version ${supported}）と` +
        `違うため読み込めません`,
      badFile: 'ファイルを読めませんでした',
    },
  },

  rules: {
    legend: 'ルール',
    hint:
      '投稿の種類を選び、絞りたい欄だけを埋めます。' +
      '種類を選ぶと、その種類に関わる欄が増えます。' +
      '埋めた内容をすべて満たす投稿に一致します。',
    actionHints: {
      collapse: '投稿を1行にまとめます。「表示」を押すと元に戻ります。',
      hide: '投稿ごと消します。開き直す方法はありません。',
      highlight: '投稿を残したまま背景に色を付けます。',
      emphasize: '一致した文字だけに色を付けます。',
      nothing: 'その投稿への指定を、上位の範囲のものまで含めて止めます。',
    },
    empty: 'まだルールがありません',
    orderHint:
      '上から順に見て、最初に一致したルールの動作を使います。' +
      '範囲をまたぐときは、カラム設定 → アカウント設定 → グローバル設定の順に見ます。' +
      '「何もしない」に一致すると、そこで判定が終わります。',
    moveUp: (label: string) => `${label}を上へ`,
    moveDown: (label: string) => `${label}を下へ`,
    targets: {
      text: '本文',
      quotedText: '引用元の本文',
      screenName: 'ユーザーID',
      displayName: '表示名',
      repostedBy: 'リポストした人のID',
      quotedScreenName: '引用元の投稿者のID',
      quotedDisplayName: '引用元の投稿者の表示名',
      replyTo: '返信先のID',
      pollChoice: 'アンケートの選択肢',
      cardDomain: 'リンク先のドメイン',
      cardTitle: 'カードの見出し',
      spaceName: 'スペースの名前',
      articleText: '記事の見出しと書き出し',
    },
    anyPlaceholder: 'すべて',
    any: 'すべて',
    modes: {
      contains: '含む',
      exact: '完全に一致',
      regex: '正規表現',
      /** Compares against that post's own author. It carries no pattern */
      self: '自分自身',
    },
    negate: '条件を反転',
    ageLabel: '投稿の古さ',
    ageUnits: AGE_UNITS,
    ageDirections: { older: 'より古い', newer: 'より新しい' },
    ageError: '1 以上の整数を入力してください',
    enabled: '有効',
    modeLabel: '一致方法',
    traitLabel: '投稿の種類',
    actionLabel: '一致したときの動作',
    namePlaceholder: 'ルール名（省略可）',
    caseSensitive: '大文字小文字を区別',
    openForm: 'ルールを追加',
    closeForm: '閉じる',
    add: '追加',
    save: '保存',
    cancel: '取消',
    edit: '編集',
    remove: '削除',
    removeConfirm: 'このルールを削除します。元に戻せません。',
    removeYes: '削除する',
    removeNo: 'やめる',
    errors: {
      noCondition: '投稿の種類を選ぶか、どれか1つの欄を埋めてください',
      badRegex: (detail: string) => `正規表現として読めません（${detail}）`,
      duplicate: 'すでに同じルールがあります',
      noEmphasisTarget:
        '「強調」には、画面に文字として出ている対象を見る条件が要ります' +
        '（そこで一致した文字に色を付けます）。' +
        'リポストした人・アンケートの選択肢・カードやスペースの文字と、' +
        '「自分自身」の指定には色を付けられません',
    },
  },

  color: {
    label: '色',
    unsetShort: '未指定',
    fallbackShort: '既定',
    inheritedShort: '上位',
    fallback: (color: string) => `既定（${color}）`,
    inherited: (color: string) => `上位の設定（${color}）`,
    unset: '未指定（X Pro 標準）',
    error: 'カラーコードは #rrggbb か、不透明度を含む #rrggbbaa の形式で入力してください',
    picker: {
      clear: '消す',
      close: '閉じる',
      open: 'カラーピッカーを開く',
      closeLabel: 'カラーピッカーを閉じる',
      clearLabel: '選んだ色を消す',
      marker: (s: string, v: string) => `鮮やかさ ${s}、明るさ ${v}`,
      hue: '色あい',
      alpha: '不透明度',
      input: 'カラーコード',
      format: '形式',
      swatch: '色の見本',
      instruction: '鮮やかさと明るさを選びます。上下左右のキーで動かせます。',
    },
  },

  appearance: {
    legend: '大きさと表示',
    hint: '空欄・未指定の項目は、X Pro の表示のままになります。',
    columnWidth: 'カラムの幅',
    fontSize: '本文の字の大きさ',
    maxLines: '本文の行数の上限',
    lines: '行',
    colors: {
      legend: '配色',
      columnHeader: 'カラム名の帯の背景',
      background: 'カラムの背景',
      columnTitle: 'カラム名',
      name: '投稿者の名前',
      text: '本文',
      meta: '薄い文字（時刻・件数・返信先）',
      link: 'リンクと「さらに表示」',
      border: '投稿と投稿の境目の線',
    },
    autoContrast: 'ハイライトで文字が読めなくなったとき',
    autoContrastOn: '文字の色を自動で直す',
    autoContrastOff: '何もしない',
    highlightBase: 'ハイライトの色を重ねる先',
    highlightBases: {
      column: 'カラムの背景',
      theme: 'X の背景（カラムの色を無視）',
    },
    timeFormat: '時刻の表示',
    timeFormats: {
      relative: 'X の表示のまま',
      absolute: '日付と時刻',
      both: '両方',
    },
    timeAbsolute: (year, month, day, hour, minute) =>
      `${year === null ? '' : `${year}年`}${month}月${day}日 ${hour}:${minute}`,
    timeClock: (hour, minute) => `${hour}:${minute}`,
    timeParens: { open: ' (', close: ')' },
    media: {
      maxThumbHeight: 'サムネイルの高さの上限',
      collapse: '画像と動画の表示',
      collapseOn: '表示しない',
      collapseOff: '表示する',
    },
  },

  size: {
    unit: 'px',
    unset: '未指定',
    inheritedLabel: (label: string, value: string, unit: string) =>
      `${label}（未指定。上位の設定の ${value}${unit} が適用されます）`,
    error: '整数のピクセル数を入力するか、空欄にしてください',
  },

  status: {
    // The same wording is used when a save from another screen arrives
    saved: '保存しました',
    // The state where what is on screen and what is stored disagree
    saveFailed: '保存できませんでした。この画面に見えている設定はまだ保存されていません',
  },

  unreadable: {
    newer: (stored, supported) =>
      `保存されている設定の形式（version ${stored}）が、この拡張の対応する形式` +
      `（version ${supported}）より新しいため読み込めません。` +
      `設定は保存されたまま残っています。拡張を更新してください。`,
    older: (stored, supported) =>
      `保存されている設定の形式（version ${stored}）は、この拡張の形式` +
      `（version ${supported}）と互換性がないため、初期状態で始めました。` +
      `以前の設定は保存されたまま残っていて、ここで何かを変えたときに置き換わります。`,
  },

  unset: '未指定',

  title: 'X Pro Tweaks の設定',

  panel: {
    close: '設定を閉じる',
  },

  /** The broken markers of X. What stops differs per marker, so each is described separately */
  health: {
    cell: '投稿の見分け方が変わったようです。フィルタも外観も適用されていません。',
    post: '投稿の読み取り方が変わったようです。フィルタが適用されていません。',
    column:
      'カラムの見分け方が変わったようです。カラムごとの設定が効きません'
      + '（アカウントとグローバルの設定は効いています）。',
    text:
      '本文の読み取り方が変わったようです。' +
      '本文を見るルールを止めています（止めないと、打ち消しの条件がすべての投稿に一致します）。',
    hint: 'X 側の作りが戻れば自動で直ります。pro.x.com を開き直すと確かめ直します。',
  },
  adGuardNotice:
    '広告と判定される投稿が多すぎたため、すべて消してしまわないように広告のルールを止めました。' +
    'pro.x.com を再読み込みすると、また判定を試します。',

  pausedNotice:
    '拡張を一時的に止めています。ここでの設定は保存されますが、いまは効きません。' +
    'ツールバーのアイコンから再開できます。',

  popup: {
    openPanel: 'このページで設定を開く',
    openOptions: '設定のページを開く',
    running: 'pro.x.com で動いています',
    paused: '止めています（何も適用していません）',
    pause: '一時的に止める',
    resume: '再開する',
    saveFailed: '切り替えられませんでした。ブラウザを開き直してからもう一度お試しください',
  },
};
