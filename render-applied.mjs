/**
 * Renders the listing images that show the extension in effect, under store/.
 *
 * The timeline is made up here rather than captured from X. A saved page would put real
 * people's posts into a store listing, and the point of the image is the tint, not whose
 * posts are under it. The icons are drawn here too, in the shapes every client uses for
 * reply, repost and like, rather than copied out of X's own artwork.
 *
 * What paints the tint is the extension's own stylesheet, read from source: a cell gets
 * the class and the color variable that `filter/apply.ts` sets, and `filter/styles.css`
 * does the rest. So the image cannot drift from what ships without the rule changing too.
 *
 * Usage: node render-applied.mjs [path to chrome]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'store');
const CHROME = process.argv[2] ?? 'google-chrome';

/** The rules the extension injects for the filter. Read from source, not copied */
const FILTER_CSS = readFileSync(join(ROOT, 'src', 'filter', 'styles.css'), 'utf8');

/**
 * The color the settings listing image carries on its "Repost → Highlight" rule.
 * The two images then read as one: the rule, and what it does.
 */
const HIGHLIGHT = '#00ba7c26';

/** X's "dim" theme, the middle of its three. The promo tile uses the same ground */
const THEME = {
  bg: '#15202b',
  fg: '#f7f9f9',
  muted: '#8b98a5',
  border: '#38444d',
  accent: '#1d9bf0',
  field: '#202e3a',
};

/**
 * Made-up posts. The names follow the ones the tests use, so nothing here can be taken
 * for a real account. `repostedBy` is what the highlight rule matches on.
 */
const POSTS = {
  ja: [
    { who: 'アリス', id: 'alice', at: '12分', body: '新しいレンズが届いた。週末に試してくる。', media: true },
    {
      who: 'ボブ',
      id: 'bob',
      at: '38分',
      body: '長い関数を分けるとき、名前が思いつかないなら分け方のほうが間違っている。',
      repostedBy: 'アリス',
    },
    { who: 'キャロル', id: 'carol', at: '1時間', body: '在庫の締め切りが今日までなのを今知った。' },
    {
      who: 'デイヴ',
      id: 'dave',
      at: '2時間',
      body: '古い端末を引っぱり出したら、電池が膨らんでいた。処分の仕方を調べている。',
      repostedBy: 'キャロル',
    },
    { who: 'アリス', id: 'alice', at: '3時間', body: '味噌汁に入れる具の順番、ずっと適当だった。' },
    { who: 'エリン', id: 'erin', at: '4時間', body: '積んでいた本を数えたら二十七冊あった。今月は買わない。' },
    {
      who: 'フランク',
      id: 'frank',
      at: '5時間',
      body: '設定画面は、機能を並べる場所ではなく、迷いを減らす場所だと思う。',
      repostedBy: 'エリン',
    },
    { who: 'グレース', id: 'grace', at: '6時間', body: '駅前の古い喫茶店、来月で閉めるらしい。' },
    { who: 'ボブ', id: 'bob', at: '8時間', body: '雨。走るのはやめて、たまった録画を消化する。' },
    {
      who: 'キャロル',
      id: 'carol',
      at: '9時間',
      body: 'バグの再現手順が書いてあるだけで、直る速さが変わる。',
      repostedBy: 'グレース',
    },
    { who: 'デイヴ', id: 'dave', at: '11時間', body: '包丁を研いだ。切れると料理が早い。', media: true },
    { who: 'エリン', id: 'erin', at: '13時間', body: '寝る前に画面を見ない日を作ってみたら、たしかに寝つきが違った。' },
    { who: 'フランク', id: 'frank', at: '15時間', body: '譜面台を買った。立って弾くと肩の力が抜ける。' },
    {
      who: 'アリス',
      id: 'alice',
      at: '17時間',
      body: '写真は撮った枚数より、見返した枚数のほうが効く気がする。',
      repostedBy: 'ボブ',
    },
    { who: 'グレース', id: 'grace', at: '19時間', body: '苗を植え替えた。根がびっしりで鉢が小さすぎた。' },
    { who: 'ボブ', id: 'bob', at: '21時間', body: '古い設定ファイルを消した。使っていないものが半分あった。' },
    {
      who: 'デイヴ',
      id: 'dave',
      at: '22時間',
      body: '道具を買い替える前に、なぜそれを選んだかを思い出すようにしている。',
      repostedBy: 'フランク',
    },
    { who: 'キャロル', id: 'carol', at: '昨日', body: '朝の電車を一本早くしたら、席に座れて本が読める。' },
  ],
  en: [
    {
      who: 'Alice',
      id: 'alice',
      at: '12m',
      body: 'The new lens turned up. Trying it out at the weekend.',
      media: true,
    },
    {
      who: 'Bob',
      id: 'bob',
      at: '38m',
      body: 'If you cannot name the pieces you split a long function into, the split is wrong.',
      repostedBy: 'Alice',
    },
    { who: 'Carol', id: 'carol', at: '1h', body: 'Only just noticed the stock cut-off is today.' },
    {
      who: 'Dave',
      id: 'dave',
      at: '2h',
      body: 'Dug out an old handset and the battery has swollen. Reading up on how to get rid of it.',
      repostedBy: 'Carol',
    },
    { who: 'Alice', id: 'alice', at: '3h', body: 'I have been guessing at the order things go into soup.' },
    { who: 'Erin', id: 'erin', at: '4h', body: 'Counted the unread pile: twenty-seven. Not buying any this month.' },
    {
      who: 'Frank',
      id: 'frank',
      at: '5h',
      body: 'A settings screen is not a place to list features. It is a place to remove hesitation.',
      repostedBy: 'Erin',
    },
    { who: 'Grace', id: 'grace', at: '6h', body: 'The old cafe by the station closes next month.' },
    { who: 'Bob', id: 'bob', at: '8h', body: 'Raining. Skipping the run and working through the recordings.' },
    {
      who: 'Carol',
      id: 'carol',
      at: '9h',
      body: 'Just writing down the steps to reproduce changes how fast a bug gets fixed.',
      repostedBy: 'Grace',
    },
    { who: 'Dave', id: 'dave', at: '11h', body: 'Sharpened the knives. Cooking goes quicker when they cut.', media: true },
    { who: 'Erin', id: 'erin', at: '13h', body: 'Tried a day without screens before bed. It did make a difference.' },
    { who: 'Frank', id: 'frank', at: '15h', body: 'Bought a music stand. Playing standing up takes the tension out.' },
    {
      who: 'Alice',
      id: 'alice',
      at: '17h',
      body: 'I suspect how often you look back at photos matters more than how many you take.',
      repostedBy: 'Bob',
    },
    { who: 'Grace', id: 'grace', at: '19h', body: 'Repotted the seedlings. The roots had filled the whole thing.' },
    { who: 'Bob', id: 'bob', at: '21h', body: 'Deleted the old config files. Half of them were unused.' },
    {
      who: 'Dave',
      id: 'dave',
      at: '22h',
      body: 'Before replacing a tool I try to remember why I picked it in the first place.',
      repostedBy: 'Frank',
    },
    {
      who: 'Carol',
      id: 'carol',
      at: 'yesterday',
      body: 'One train earlier and there is a seat, and a seat means reading.',
    },
  ],
};

const WORDS = {
  ja: {
    repost: (who) => `${who}さんがリポストしました`,
    home: 'ホーム',
    forYou: 'おすすめ',
    following: 'フォロー中',
    nav: ['ホーム', '話題を検索', '通知', 'メッセージ', 'ブックマーク', 'プロフィール'],
    post: 'ポストする',
    columns: ['ホーム', '通知', '検索: 写真'],
    trends: 'いまどうしてる？',
    trend: (n) => `${n} 件のポスト`,
    tags: ['#写真', '#自作キーボード', '#朝活'],
    search: '検索',
    alt: '画像',
  },
  en: {
    repost: (who) => `${who} reposted`,
    home: 'Home',
    forYou: 'For you',
    following: 'Following',
    nav: ['Home', 'Explore', 'Notifications', 'Messages', 'Bookmarks', 'Profile'],
    post: 'Post',
    columns: ['Home', 'Notifications', 'Search: photography'],
    trends: 'What’s happening',
    trend: (n) => `${n} posts`,
    tags: ['#photography', '#keyboards', '#mornings'],
    search: 'Search',
    alt: 'ALT',
  },
};

/**
 * A color pair per made-up account. Drawn as a two-tone circle: a photograph cannot be
 * used, and a flat disc with a letter reads as the placeholder it is.
 */
const AVATAR = {
  alice: ['#7856ff', '#1d9bf0'],
  bob: ['#00ba7c', '#0a8f66'],
  carol: ['#f91880', '#ff7a00'],
  dave: ['#ff7a00', '#ffd400'],
  erin: ['#1d9bf0', '#00ba7c'],
  frank: ['#ffd400', '#ff7a00'],
  grace: ['#e0245e', '#7856ff'],
};

/** Who carries the blue check. A couple is enough to read as a timeline rather than a mock-up */
const VERIFIED = new Set(['alice', 'frank']);

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const localize = (value, lang) => value.toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US');

/**
 * The numbers under a post. Derived from the position, so the two languages line up and
 * the image comes out the same every time it is rendered.
 */
const counts = (i, lang) => {
  const n = (seed, span, base) => localize(base + ((i * seed) % span), lang);
  return [n(7, 40, 3), n(13, 120, 5), n(37, 800, 24), n(911, 9000, 1200)];
};

/**
 * The action row's shapes — a bubble, two arrows, a heart, a bar chart, an arrow out of a
 * tray — drawn here rather than taken from X.
 */
const ICONS = {
  reply:
    'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4h-.5A.5.5 0 0 1 4 14.5z',
  repost: 'M6 5h8a3 3 0 0 1 3 3v6m0 0 2.5-2.5M17 14l-2.5-2.5M18 19h-8a3 3 0 0 1-3-3V10m0 0-2.5 2.5M7 10l2.5 2.5',
  like: 'M12 20s-7.5-4.6-9.3-9.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 9.3 4.2C19.5 15.4 12 20 12 20z',
  views: 'M4 20v-7M9.3 20V8M14.7 20v-4M20 20V4',
  share: 'M12 3v11M12 3 8.5 6.5M12 3l3.5 3.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13',
  edit: 'M4 20l1-4 10-10 3 3-10 10zM15 6l3 3',
};

/** The side navigation's icons, in the order `WORDS.nav` lists them */
const NAV_ICONS = [
  'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM16 16l5 5',
  'M12 3a6 6 0 0 1 6 6v4l2 3H4l2-3V9a6 6 0 0 1 6-6zM10 19a2 2 0 0 0 4 0',
  'M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM3.5 6l8.5 7 8.5-7',
  'M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V21l-6-4-6 4z',
  'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
];

const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;

/** The check beside a name. Filled rather than stroked, so it reads at 16px */
const CHECK =
  `<svg class="check" viewBox="0 0 24 24" aria-hidden="true">` +
  `<path fill="${THEME.accent}" stroke="none" d="M12 1.5l2.6 2.2 3.4-.3.6 3.4 3 1.7-1.5 3.1 1.5 3.1-3 1.7-.6 3.4-3.4-.3L12 22.5l-2.6-2.2-3.4.3-.6-3.4-3-1.7L3.9 12 2.4 8.9l3-1.7.6-3.4 3.4.3z"/>` +
  `<path fill="${THEME.bg}" stroke="none" d="M10.9 15.4 7.6 12.1l1.3-1.3 2 2 4.2-4.2 1.3 1.3z"/></svg>`;

/**
 * One post. The shape follows X's own — a cell wrapping an `article` — because the
 * stylesheet puts the post proper back to transparent so the tint on the cell shows.
 */
const cell = (post, i, words, lang) => {
  const tinted = post.repostedBy !== undefined;
  const [reply, repost, like, views] = counts(i, lang);
  const [from, to] = AVATAR[post.id];
  return `
    <div data-testid="cellInnerDiv" class="cell${tinted ? ' xpro-highlighted' : ''}"${
      tinted ? ` style="--xpro-highlight: ${HIGHLIGHT}"` : ''
    }>
      ${
        tinted
          ? `<div class="reposted">${icon(ICONS.repost)}<span>${escape(
              words.repost(post.repostedBy)
            )}</span></div>`
          : ''
      }
      <article>
        <div class="avatar" style="background: linear-gradient(135deg, ${from}, ${to})">${escape(
          post.who.slice(0, 1)
        )}</div>
        <div class="post">
          <div class="who"><b>${escape(post.who)}</b>${
            VERIFIED.has(post.id) ? CHECK : ''
          }<span>@${post.id}</span><span>·</span><span>${escape(post.at)}</span>
            <div class="more"><i></i><i></i><i></i></div>
          </div>
          <p>${escape(post.body)}</p>
          ${
            post.media
              ? `<div class="media" style="background: linear-gradient(150deg, ${from}, ${to})"><span class="alt">${escape(
                  words.alt
                )}</span></div>`
              : ''
          }
          <div class="actions">
            <span>${icon(ICONS.reply)}${reply}</span>
            <span>${icon(ICONS.repost)}${repost}</span>
            <span>${icon(ICONS.like)}${like}</span>
            <span>${icon(ICONS.views)}${views}</span>
            <span>${icon(ICONS.share)}</span>
          </div>
        </div>
      </article>
    </div>`;
};

const BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0; background: ${THEME.bg}; color: ${THEME.fg};
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  svg {
    width: 18px; height: 18px; fill: none; stroke: currentColor;
    stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round;
  }
  .cell { border-bottom: 1px solid ${THEME.border}; }
  .cell article { display: flex; gap: 12px; padding: 12px 16px; background: ${THEME.bg}; }
  .reposted {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px 0 44px; color: ${THEME.muted}; font-size: 13px; font-weight: 700;
  }
  .reposted svg { width: 16px; height: 16px; stroke-width: 2; }
  .avatar {
    flex: none; width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255, 255, 255, .92); font-size: 17px; font-weight: 700;
  }
  .post { flex: 1; min-width: 0; }
  .who { display: flex; align-items: center; gap: 4px; }
  .who b { font-weight: 700; }
  .who span { color: ${THEME.muted}; }
  .who .check { width: 16px; height: 16px; }
  .more { margin-left: auto; display: flex; gap: 3px; padding-left: 8px; }
  .more i { width: 3px; height: 3px; border-radius: 50%; background: ${THEME.muted}; }
  .post p { margin: 1px 0 0; }
  .media {
    margin-top: 12px; height: 170px; border-radius: 16px;
    border: 1px solid ${THEME.border}; position: relative; overflow: hidden;
  }
  .media .alt {
    position: absolute; left: 10px; bottom: 10px; padding: 1px 6px; border-radius: 4px;
    background: rgba(0, 0, 0, .6); color: #fff; font-size: 11px; font-weight: 700;
  }
  .actions {
    display: flex; justify-content: space-between; max-width: 425px;
    margin-top: 12px; color: ${THEME.muted}; font-size: 13px;
  }
  .actions span { display: flex; align-items: center; gap: 7px; }
  .head { padding: 15px 16px; font-weight: 700; font-size: 17px; border-bottom: 1px solid ${THEME.border}; }
  .tabs { display: flex; border-bottom: 1px solid ${THEME.border}; }
  .tabs div { flex: 1; padding: 16px 0 0; text-align: center; color: ${THEME.muted}; font-weight: 600; }
  .tabs div.on { color: ${THEME.fg}; font-weight: 700; }
  .tabs b {
    display: block; height: 4px; width: 56px; margin: 15px auto 0;
    border-radius: 999px; background: ${THEME.accent};
  }
  .tabs div:not(.on) b { background: none; }
`;

/** x.com: the side navigation, the timeline down the middle, and the trends beside it */
const xPage = (lang) => {
  const words = WORDS[lang];
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
  ${BASE_CSS}
  .page { display: grid; grid-template-columns: 275px 600px 1fr; max-width: 1290px; margin: 0 auto; }
  nav { padding: 4px 8px; border-right: 1px solid ${THEME.border}; }
  nav .logo { font-size: 27px; padding: 12px; line-height: 1; }
  nav a {
    display: flex; align-items: center; gap: 18px;
    padding: 11px 12px; margin: 2px 0; border-radius: 999px;
    font-size: 20px; text-decoration: none; color: ${THEME.fg};
  }
  nav a svg { width: 24px; height: 24px; }
  nav a.on { font-weight: 700; }
  nav .btn {
    margin: 16px 4px; padding: 15px; border-radius: 999px;
    background: ${THEME.fg}; color: ${THEME.bg};
    text-align: center; font-weight: 700; font-size: 16px;
  }
  main { border-right: 1px solid ${THEME.border}; }
  aside { padding: 8px 0 0 26px; }
  aside .search {
    display: flex; align-items: center; gap: 12px; color: ${THEME.muted};
    padding: 11px 16px; border-radius: 999px; background: ${THEME.field};
  }
  aside .box { margin-top: 14px; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 12px 16px; }
  aside h2 { margin: 0 0 4px; font-size: 20px; }
  aside .trend { padding: 8px 0; }
  aside .trend b { display: block; font-weight: 700; }
  aside .trend span { color: ${THEME.muted}; font-size: 13px; }
  ${FILTER_CSS}
  </style>
  <div class="page">
    <nav>
      <div class="logo">𝕏</div>
      ${words.nav
        .map(
          (item, i) =>
            `<a href="#"${i === 0 ? ' class="on"' : ''}>${icon(NAV_ICONS[i])}${escape(item)}</a>`
        )
        .join('')}
      <div class="btn">${escape(words.post)}</div>
    </nav>
    <main data-testid="primaryColumn">
      <div class="head">${escape(words.home)}</div>
      <div class="tabs">
        <div class="on">${escape(words.forYou)}<b></b></div>
        <div>${escape(words.following)}<b></b></div>
      </div>
      ${POSTS[lang]
        .slice(0, 6)
        .map((post, i) => cell(post, i, words, lang))
        .join('')}
    </main>
    <aside>
      <div class="search">${icon(NAV_ICONS[1])}${escape(words.search)}</div>
      <div class="box">
        <h2>${escape(words.trends)}</h2>
        ${words.tags
          .map(
            (tag, i) =>
              `<div class="trend"><b>${escape(tag)}</b><span>${escape(
                words.trend(localize(1204 + i * 731, lang))
              )}</span></div>`
          )
          .join('')}
      </div>
    </aside>
  </div>`;
};

/** X Pro: the rail, then columns side by side. The tint lands the same way in each */
const proPage = (lang) => {
  const words = WORDS[lang];
  const posts = POSTS[lang];
  const column = (name, path, list, from) => `
    <section class="column">
      <div class="head">${icon(path)}${escape(name)}</div>
      ${list.map((post, i) => cell(post, from + i, words, lang)).join('')}
    </section>`;
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
  ${BASE_CSS}
  .deck { display: flex; height: 800px; }
  .rail {
    flex: none; width: 68px; border-right: 1px solid ${THEME.border};
    display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 14px 0;
    color: ${THEME.muted};
  }
  .rail .logo { color: ${THEME.fg}; font-size: 24px; line-height: 1; }
  .rail .btn {
    width: 40px; height: 40px; border-radius: 50%; background: ${THEME.accent}; color: #fff;
    display: flex; align-items: center; justify-content: center;
  }
  .rail svg { width: 22px; height: 22px; }
  .column { flex: none; width: 380px; border-right: 1px solid ${THEME.border}; overflow: hidden; }
  .column .head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; font-size: 15px; }
  .column .head svg { width: 17px; height: 17px; color: ${THEME.muted}; }
  .column article { padding: 10px 14px; }
  .column .avatar { width: 33px; height: 33px; font-size: 14px; }
  .column .who, .column .who span { font-size: 14px; }
  .column .who .check { width: 14px; height: 14px; }
  .column p { font-size: 14px; }
  .column .actions { max-width: none; margin-top: 8px; font-size: 12px; }
  .column .actions svg { width: 16px; height: 16px; }
  .column .reposted { padding: 8px 14px 0 40px; font-size: 12px; }
  .column .media { height: 120px; }
  ${FILTER_CSS}
  </style>
  <div class="deck">
    <div class="rail">
      <div class="logo">𝕏</div>
      <div class="btn">${icon(ICONS.edit)}</div>
      ${[0, 2, 3, 1].map((n) => icon(NAV_ICONS[n])).join('')}
    </div>
    ${column(words.columns[0], NAV_ICONS[0], posts.slice(0, 6), 0)}
    ${column(words.columns[1], NAV_ICONS[2], posts.slice(6, 12), 6)}
    ${column(words.columns[2], NAV_ICONS[1], posts.slice(12), 12)}
  </div>`;
};

const work = mkdtempSync(join(tmpdir(), 'xpro-applied-'));
mkdirSync(OUT, { recursive: true });

const shoot = (name, html, lang) => {
  const page = join(work, `${name}.html`);
  writeFileSync(page, html);
  execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1280,800',
      '--virtual-time-budget=2000',
      `--lang=${lang}`,
      `--screenshot=${join(OUT, name)}`,
      page,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
  console.log(`store/${name}`);
};

for (const lang of ['en', 'ja']) {
  shoot(`applied-x-${lang}.png`, xPage(lang), lang === 'ja' ? 'ja-JP' : 'en-US');
  shoot(`applied-pro-${lang}.png`, proPage(lang), lang === 'ja' ? 'ja-JP' : 'en-US');
}

rmSync(work, { recursive: true, force: true });
