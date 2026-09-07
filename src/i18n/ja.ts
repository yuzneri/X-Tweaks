/** The Japanese messages. Annotated with `Messages`, so a missing or extra key falls to the type checker */
import type { Messages } from './en.ts';

/** The age units, used both as the option names and in the condition's sentence */
const AGE_UNITS = { minutes: '分', hours: '時間', days: '日' };

export const ja: Messages = {
  language: {
    label: '表示言語',
    auto: '自動',
    ja: '日本語',
    en: 'English',
  },

  genericAlts: {
    label: '説明のない画像にXが入れる文言',
    note:
      '1行に1つ。画像説明のテキストを表示しないワードを設定します。'
  },

  traits: {
    repost: 'リポスト',
    quote: '引用',
    reply: 'リプライ',
    communityNote: 'コミュニティノート',
    communityNoteRating: 'コミュニティノートの評価待ち',
    pollOpen: 'アンケート（受付中）',
    pollClosed: 'アンケート（結果）',
    linkCard: 'リンクカード',
    space: 'スペース',
    article: '記事',
    ad: '広告',
    media: '画像・動画',
  },

  countMetrics: {
    reply: 'リプライ',
    repost: 'リポスト',
    like: 'いいね',
    view: '表示',
    textLength: '本文の文字数',
    hashtag: 'ハッシュタグの数',
    mention: 'メンションの数',
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
    age: (value, unit) => `投稿が${value}${AGE_UNITS[unit]}より古い`,
    // Both directions take the number itself in, so they read as 以上 / 以下
    count: (name, value, direction) => `${name}が${value}${direction === 'atMost' ? '以下' : '以上'}`,
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
    views: 'ビュー',
    /** サーフェス全体のエントリ。そのサイトに属するが、どのスコープにも属さない設定の置き場 */
    whole: (name: string) => `${name}全体`,
    /** x.com のビューの名前。記録にはキーだけを持ち、表示名はここで決める（言語を変えれば追従する） */
    viewNames: {
      home: 'ホーム',
      notifications: '通知',
      bookmarks: 'ブックマーク',
      list: 'リスト',
    },
    viewsEmpty: 'ビューがまだありません。x.comを開くと、見たビューがここに並びます。',
    notDetectingX: 'x.comを開いていないので、最新の情報ではありません。',
    missingView: '（いま見ていないビュー）',
    unknownView: '（まだ見ていないビュー）',
    global: 'グローバル',
    accounts: 'アカウント',
    accountsOn: (site: string) => `${site}のアカウント`,
    columns: 'カラム',
    unassignedGroup: '未割り当て',
    notDetecting:
      'pro.x.comを開いていないので、最新の情報ではありません。',
    accountsEmpty:
      'まだアカウントが見つかっていません。pro.x.comかx.comを開くと、ここに並びます。',
    columnsEmpty:
      'カラムがまだ1本もありません。pro.x.comを開くと、表示中のデッキのカラムがここに並びます。',
    columnMissing: '見つかりません',
    unnamedColumn: '（名前のないカラム）',
    missingColumn: '（見つからないカラム）',
    unknownColumn: '（見つけていないカラム）',
    // アカウントは両サイトに跨るので、カラムとビューを分けて数える。
    // 片方が 0 のときはその側を出さない
    scopeCount: (columns: number, views: number) =>
      [columns ? `カラム${columns}個` : null, views ? `ビュー${views}個` : null]
        .filter((part) => part !== null)
        .join('・'),
    nth: (n: number) => `${n}番目`,
    /** What a deck is called when its name is unreadable. Names depend on the UI language, whereas a number never breaks */
    deckNth: (n: number) => `デッキ${n}`,
    deckShowing: '表示中',
    columnEntry: 'このカラムの設定',
  },

  surfaces: {
    label: '設定する画面',
    common: '共通',
    pro: 'X Pro',
    x: 'x.com',
    meta: 'その他',
  },

  meta: {
    settings: '設定',
    about: '情報',
    version: 'バージョン',
    source: 'ソースコード',
    issues: '不具合の報告',
    issuesLink: 'GitHubのIssues',
    license: 'ライセンス',
    privacy: 'プライバシー',
    privacyNote:
      'この拡張機能はどこにも通信しません。設定はこの端末の中だけに保存され、外に出ることはありません。',
    policy: 'プライバシーポリシー',
  },

  tabs: {
    label: '設定の種類',
    filter: 'フィルタ',
    appearance: '外観',
    /**
     * 投稿まわりの設定。タブとしては無くなった（X Pro 全体のページに移った）が、
     * 投稿フォームに添える切り替えの塊の名前として今も使う（`compose/switches.ts`）
     */
    compose: '投稿',
    effective: '適用中の設定',
    /**
     * サイトのページの4つ目。タイムラインに出る、ポストではないものが入る
     * （x.com は先頭の投稿ボックスと新着、両サイトは X が差し込むもの）。
     * 3つ目の「外枠」と対になる
     */
    inTimeline: 'タイムラインの中',
  },

  compose: {
    label: '投稿フォーム',
    reopen: {
      label: '投稿フォームを開き直す',
      note: '投稿フォームを開き直して、次を書ける状態にします。',
    },
    keepHashtags: {
      label: 'ハッシュタグを残す',
      note:
        '投稿後に書いたタグを次の投稿フォームに入れます。',
    },
  },

  injected: {
    label: 'ポスト以外の差し込み',
    hint:
      'Xがタイムラインに差し込む、ポストではないものの設定です。',
    whoToFollow: {
      label: 'おすすめユーザー',
      note:
        '外すと、タイムライン横のものも一緒に消えます。',
    },
    discoverMore: {
      label: 'もっと見つける',
      note: '会話そのものは残ります。',
    },
  },

  xChrome: {
    label: '外枠',
    nav: {
      label: '左の項目',
      items: {
        explore: '話題を検索',
        follow: 'フォローする',
        messages: 'チャット',
        grok: 'Grok',
        history: '履歴（ブックマーク・いいね）',
        creatorStudio: 'クリエイタースタジオ',
        articles: '記事',
        premium: 'プレミアム',
        profile: 'プロフィール',
        postButton: 'ポストボタン',
      },
    },
    menu: {
      label: '「もっと見る」の中',
      items: {
        lists: 'リスト',
        communities: 'コミュニティ',
        communityNotes: 'コミュニティノート',
        business: 'ビジネス',
        ads: '広告',
        spaces: 'スペースを作成',
        mutedKeyword: 'ミュートするキーワードを追加',
        settings: '設定とプライバシー',
      },
    },
    wideTimeline: {
      label: 'タイムラインを広げる',
      note:
        '検索窓も含めて右の項目を消し、タイムラインを広げます。',
    },
    rail: {
      label: '右の項目',
      items: {
        premium: 'プレミアムの勧誘',
        news: '本日のニュース',
        trends: 'トレンド',
        relevantPeople: '関連性の高いユーザー',
        footer: '利用規約などのリンク',
      },
    },
    drawers: {
      label: '右下の項目',
      items: { grok: 'Grok', chat: 'チャット' },
    },
    timeline: { label: 'タイムラインの先頭' },
    composeBox: {
      label: 'タイムライン上の投稿フォーム',
      note: '外しても、返信フォームは残ります。',
    },
    autoNewPosts: {
      label: '新着を自動で読み込む',
    },
  },

  search: {
    label: '検索',
    form: {
      label: '右に詳細検索フォームを出す',
      note:
        '検索窓の下に出ます。検索窓はそのまま残ります。'
        + '検索結果のページでは、X自身の検索フィルターと入れ替わります。',
      noteWide:
        '右の項目を消しているあいだは出せません。置く場所がありません。',
    },

    fields: {
      all: 'すべてのキーワードを含む',
      exact: 'キーワード全体を含む',
      any: 'いずれかのキーワードを含む',
      none: 'キーワードを含まない',
      hashtags: 'ハッシュタグを含む',

      from: 'このアカウントの投稿',
      to: 'このアカウントへの返信',
      mentioning: 'このアカウントに言及',
      exclude: '除く',

      verified: '認証済みアカウント',
      links: 'リンク',
      images: '画像',
      videos: '動画',
      choices: { any: 'どちらでも', include: 'あるものだけ', exclude: '除く' },

      replies: '返信',
      repliesAny: 'どちらでも',
      repliesOnly: '返信だけ',
      repliesExclude: '返信を除く',

      lang: '言語',
      langAny: 'すべての言語',

      minReplies: '返信数の下限',
      minFaves: 'いいね数の下限',
      minRetweets: 'リポスト数の下限',

      since: 'この日から',
      until: 'この日まで',

      tab: '表示',
      tabs: { top: '話題のポスト', live: '最新', user: 'アカウント', media: 'メディア', list: 'リスト' },
      followedOnly: 'フォローしているアカウントだけ',
      nearbyOnly: '近くの場所だけ',

      go: '検索',
      reset: 'クリア',

      leaveOutNote:
        '表示された結果に対して行います。',
      excludeReposts: 'リポストを非表示',
      excludeHashtags: 'ハッシュタグを含む投稿を非表示',
      excludeNameOnly: '表示名のみに引っかかった投稿を非表示',
      excludeHandleOnly: 'ユーザーIDのみに引っかかった投稿を非表示',
    },

    groups: {
      accounts: 'アカウント',
      filters: 'フィルター',
      engagement: '反応の数',
      dates: '期間',
    },
  },

  effective: {
    hint:
      'このカラムに実際に適用される内容です。',
    hintView:
      'このビューに実際に適用される内容です。',
    from: {
      global: 'グローバル',
      account: 'アカウント',
      surface: 'このサイト',
      surfaceAccount: 'サイトのアカウント',
      column: 'このカラム',
      view: 'このビュー',
    },
    unset: '指定なし',
    rules: 'ルール',
    // 英語が 'No rules here' と場所を名指さないのに合わせる。段の呼び名を出さずに済む
    noRules: 'ルールはありません',
    disabled: '無効',
    filterStopped: 'フィルタを止めているので、下のルールはどれも効きません。',
    appearanceStopped: '外観を止めているので、下の指定はどれも効きません。',
    appearance: '外観',
  },

  forget: {
    column: {
      action: 'このカラムを削除',
      confirm: '設定も一緒に削除します。元に戻せません。',
    },
    view: {
      action: 'このビューを削除',
      confirm: '設定も一緒に削除します。元に戻せません。',
    },
    confirmYes: '設定ごと消す',
    confirmNo: 'やめる',
  },
  unassigned: {
    badge: '未割り当て',
    configured: '設定あり',
    chooseTarget: '移動先を選ぶ',
    remove: 'この設定を削除',
    account: {
      notFound: '対応するアカウントが見つかりません',
      moveTo: 'いまあるアカウントに移す',
      noTargets: '移せるアカウントがありません',
      skipConfigured: 'すでに設定があるアカウントは、上書きを避けるため選択できません。',
    },
    column: {
      notFound: '対応するカラムが見つかりません',
      moveTo: 'いまあるカラムに移す',
      noTargets: '移せるカラムがありません',
      skipConfigured: 'すでに設定があるカラムは、上書きを避けるため選択できません。',
    },
    view: {
      notFound: '対応するビューが見つかりません',
      moveTo: 'いまあるビューに移す',
      noTargets: '移せるビューがありません',
      skipConfigured: 'すでに設定があるビューは、上書きを避けるため選択できません。',
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
      '外観を適用していないので、下の指定は無効です。',
  },

  transfer: {
    open: '設定の入出力',
    legend: '設定のJSON',
    hint:
      'アカウント名・カラム名・見たビューが入ります。人に渡す前に中身を確かめてください。' +
      'この欄に貼り付けて読み込むこともできます。',
    save: 'ファイルに保存',
    copy: 'コピー',
    copied: 'コピーしました',
    copyFailed: 'コピーできませんでした。上の欄からコピーしてください',
    close: '閉じる',
    choose: 'ファイルを選ぶ',
    load: 'この内容で設定を置き換える',
    confirm: 'いまの設定をすべて置き換えます。元に戻せません。',
    confirmYes: '置き換える',
    confirmNo: 'やめる',
    loaded: '読み込みました',
    forget: '見つけたカラムとビューの記録を消す',
    forgotten: '記録を消しました。pro.x.comやx.comを開き直すと、改めて作り直します',
    forgetFailed: '記録を消せませんでした。この画面を開き直してからもう一度お試しください',
    errors: {
      badJson: (detail: string) => `JSONとして読めません（${detail}）`,
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
      '設定内容をすべて満たす投稿に、ルールを適用します。',
    actionHints: {
      collapse: '投稿を1行にまとめます。「表示」を押すと元に戻ります。',
      hide: '投稿ごと削除します。',
      highlight: '投稿の背景に色を付けます。',
      emphasize: '一致した文字だけに色を付けます。',
      nothing: 'その投稿への指定を、上位の範囲のものまで含めて止めます。',
    },
    empty: 'まだルールがありません',
    orderScopes: { pro: 'カラム', x: 'ビュー', both: 'カラム・ビュー' },
    orderHint: (scope: string) =>
      '上から順に見て、最初に一致したルールを使います。' +
      `範囲は狭いほうから順に見ます（${scope} → サイトのアカウント → サイト → アカウント → グローバル）。` +
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
      self: '自分自身',
    },
    negate: '条件を反転',
    ageLabel: '投稿の古さ',
    ageUnits: AGE_UNITS,
    ageError: '1以上の整数を入力してください',
    countDirections: { atLeast: '以上', atMost: '以下' },
    countError: '0以上の整数を入力してください',
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
    unset: '未指定（Xの標準）',
    error: 'カラーコードは#rrggbbか、不透明度を含む#rrggbbaaの形式で入力してください',
    picker: {
      clear: '消す',
      close: '閉じる',
      open: 'カラーピッカーを開く',
      closeLabel: 'カラーピッカーを閉じる',
      clearLabel: '選んだ色を消す',
      marker: (s: string, v: string) => `鮮やかさ${s}、明るさ${v}`,
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
    hint: '空欄・未指定の項目は、X Proの表示のままになります。',
    hintX: '空欄・未指定の項目は、x.comの表示のままになります。',
    columnWidth: 'カラムの幅',
    columnGroup: {
      legend: 'カラム',
      hint: 'カラムがあるのはX Proだけです。',
    },
    compact: 'ポストを詰める',
    compactOn: '詰める',
    compactOff: 'そのまま',
    fontSize: '本文の字の大きさ',
    maxLines: '本文の行数の上限',
    lines: '行',
    wordsShown: '説明や引用を出す文字数',
    characters: '字',
    rawCounts: 'リプライ・リポスト・いいね・表示の件数',
    rawCountsOn: '丸めない',
    rawCountsOff: 'Xのまま',
    collapseNewlines: '本文の改行',
    collapseNewlinesOn: '改行を削除',
    collapseNewlinesOff: 'そのまま',
    colors: {
      legend: '配色',
      columnHeader: 'カラム名の帯の背景',
      background: 'タイムラインの中の背景',
      backgroundNote: 'X Proではカラムの中の背景',
      columnTitle: 'カラム名',
      name: '投稿者の名前',
      text: '本文',
      meta: '薄い文字（時刻・件数・返信先）',
      link: 'リンク',
      border: '投稿と投稿の境目の線',
      composeBackground: '投稿フォームの背景',
      pageBackground: 'タイムラインの外側の背景',
      pageNote: 'x.comだけにあります',
    },
    autoContrast: 'ハイライトで文字が読めないとき',
    autoContrastOn: '文字色を直す',
    autoContrastOff: '何もしない',
    highlightBase: 'ハイライトの色を重ねる先',
    highlightBases: {
      column: 'タイムラインの中の背景',
      theme: 'Xの背景',
    },
    timeFormat: '時刻の表示',
    timeFormats: {
      relative: 'そのまま',
      absolute: '日付と時刻',
      both: '両方',
    },
    timeAbsolute: (year, month, day, hour, minute) =>
      `${year === null ? '' : `${year}年`}${month}月${day}日 ${hour}:${minute}`,
    timeClock: (hour, minute) => `${hour}:${minute}`,
    timeParens: { open: ' (', close: ')' },
    media: {
      maxThumbHeight: 'サムネイルの高さの上限',
      style: '画像と動画の表示',
      styles: {
        show: 'そのまま',
        caption: '説明を追加',
        text: 'テキスト',
        mark: 'マーク',
        hidden: '表示しない',
      },
      captionNth: (nth: number, description: string): string => `${nth}枚目：${description}`,
    },
    cardStyle: 'リンクカードと記事の表示',
    quoteStyle: '引用ポストの表示',
    attachmentStyles: {
      show: 'そのまま',
      text: 'テキスト',
      mark: 'マーク',
      hidden: '表示しない',
    },
    cardParens: { open: '（', close: '）' },
  },

  size: {
    unit: 'px',
    unset: '未指定',
    inheritedLabel: (label: string, value: string, unit: string) =>
      `${label}（未指定。上位の設定の${value}${unit}が適用されます）`,
    error: '整数のピクセル数を入力するか、空欄にしてください',
  },

  status: {
    saved: '保存しました',
    saveFailed: '保存できませんでした',
  },

  unreadable: {
    newer: (stored, supported) =>
      `保存されている設定の形式（version ${stored}）が、この拡張の対応する形式` +
      `（version ${supported}）より新しいため読み込めません。` +
      `設定は保存されたまま残っています。拡張を更新してください。`,
    older: (stored, supported) =>
      `保存されている設定の形式（version ${stored}）は、この拡張の形式` +
      `（version ${supported}）と互換性がないため、初期状態で始めました。`,
  },

  unset: '未指定',

  cleared: {
    short: 'Xのまま',
    label: (item: string) => `${item}をXの表示のままにする`,
    note: '上の範囲で指定された値を使わず、Xの表示のままにします。',
  },

  title: 'X Tweaksの設定',

  panel: {
    close: '設定を閉じる',
  },

  health: {
    cell: '投稿の見分け方が変わったようです。フィルタも外観も適用されていません。',
    post: '投稿の読み取り方が変わったようです。フィルタが適用されていません。',
    column:
      'カラムの見分け方が変わったようです。カラムごとの設定が効きません。',
    text:
      '本文の読み取り方が変わったようです。' +
      '本文ルールを止めています。',
    hint: 'X側の作りが戻れば自動で直ります。pro.x.comを開き直すと確かめ直します。',
  },
  adGuardNotice:
    '広告と判定される投稿が多すぎたため、広告ルールを一時的に止めました。',

  pausedNotice:
    '拡張機能を一時的に止めています。' +
    'ツールバーのアイコンから再開できます。',

  popup: {
    openPanel: 'このページで設定を開く',
    openOptions: '設定のページを開く',
    running: 'pro.x.comで動いています',
    paused: '一時的に適用をしていません',
    pause: '一時的に止める',
    resume: '再開する',
    saveFailed: '切り替えられませんでした。ブラウザを開き直してからもう一度お試しください',
  },
};
