/**
 * Renders the listing images that show the extension in effect, under store/.
 *
 * The timeline is made up here rather than captured from X. A saved page would put real
 * people's posts into a store listing, and the point of the image is the tint, not whose
 * posts are under it.
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
};

/**
 * Made-up posts. The names follow the ones the tests use, so nothing here can be taken
 * for a real account.
 */
const POSTS = {
  ja: [
    { who: 'アリス', id: 'alice', at: '12分', body: '新しいレンズが届いた。週末に試してくる。' },
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
    { who: 'デイヴ', id: 'dave', at: '11時間', body: '包丁を研いだ。切れると料理が早い。' },
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
    { who: 'Alice', id: 'alice', at: '12m', body: 'The new lens turned up. Trying it out at the weekend.' },
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
    { who: 'Dave', id: 'dave', at: '11h', body: 'Sharpened the knives. Cooking goes quicker when they cut.' },
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
    { who: 'Carol', id: 'carol', at: 'yesterday', body: 'One train earlier and there is a seat, and a seat means reading.' },
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
  },
  en: {
    repost: (who) => `${who} reposted`,
    home: 'Home',
    forYou: 'For you',
    following: 'Following',
    nav: ['Home', 'Explore', 'Notifications', 'Messages', 'Bookmarks', 'Profile'],
    post: 'Post',
    columns: ['Home', 'Notifications', 'Search: photography'],
  },
};

/** A ring of colors for the made-up avatars, so the rows are told apart without photographs */
const AVATAR = {
  alice: '#7856ff',
  bob: '#00ba7c',
  carol: '#f91880',
  dave: '#ff7a00',
  erin: '#1d9bf0',
  frank: '#ffd400',
  grace: '#e0245e',
};

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * One post. The shape follows X's own — a cell wrapping an `article` — because the
 * stylesheet puts the post proper back to transparent so the tint on the cell shows.
 */
const cell = (post, words) => {
  const tinted = post.repostedBy !== undefined;
  return `
    <div data-testid="cellInnerDiv" class="cell${tinted ? ' xpro-highlighted' : ''}"${
      tinted ? ` style="--xpro-highlight: ${HIGHLIGHT}"` : ''
    }>
      ${tinted ? `<div class="reposted">⇄ ${escape(words.repost(post.repostedBy))}</div>` : ''}
      <article>
        <div class="avatar" style="background: ${AVATAR[post.id]}">${escape(post.who.slice(0, 1))}</div>
        <div class="post">
          <div class="who">
            <b>${escape(post.who)}</b><span>@${post.id}</span><span>·&nbsp;${escape(post.at)}</span>
          </div>
          <p>${escape(post.body)}</p>
          <div class="actions"><span>↩</span><span>⇄</span><span>♡</span><span>⤴</span></div>
        </div>
      </article>
    </div>`;
};

const BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0; background: ${THEME.bg}; color: ${THEME.fg};
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
  }
  .cell { border-bottom: 1px solid ${THEME.border}; }
  .cell article { display: flex; gap: 12px; padding: 12px 16px; background: ${THEME.bg}; }
  .reposted { padding: 8px 16px 0 60px; color: ${THEME.muted}; font-size: 13px; font-weight: 600; }
  .avatar {
    flex: none; width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: #fff;
  }
  .post { flex: 1; min-width: 0; }
  .who { display: flex; gap: 5px; align-items: baseline; font-size: 15px; }
  .who span { color: ${THEME.muted}; font-size: 14px; }
  .post p { margin: 2px 0 0; }
  .actions { display: flex; gap: 64px; margin-top: 10px; color: ${THEME.muted}; font-size: 14px; }
  .head {
    padding: 14px 16px; font-weight: 700; font-size: 17px;
    border-bottom: 1px solid ${THEME.border};
  }
  .tabs { display: flex; border-bottom: 1px solid ${THEME.border}; }
  .tabs div {
    flex: 1; padding: 14px 0; text-align: center; color: ${THEME.muted}; font-weight: 600; font-size: 14px;
  }
  .tabs div.on { color: ${THEME.fg}; box-shadow: inset 0 -3px 0 ${THEME.accent}; }
`;

/** x.com: the side navigation, the timeline down the middle, and the trends beside it */
const xPage = (lang) => {
  const words = WORDS[lang];
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
  ${BASE_CSS}
  .page { display: grid; grid-template-columns: 260px 600px 1fr; max-width: 1280px; margin: 0 auto; }
  nav { padding: 8px 12px; border-right: 1px solid ${THEME.border}; }
  nav .logo { font-size: 26px; padding: 8px 12px; }
  nav a { display: block; padding: 11px 12px; font-size: 19px; text-decoration: none; color: ${THEME.fg}; }
  nav .btn {
    margin: 12px 4px; padding: 13px; border-radius: 999px; background: ${THEME.fg}; color: ${THEME.bg};
    text-align: center; font-weight: 700;
  }
  main { border-right: 1px solid ${THEME.border}; }
  aside { padding: 12px 20px; }
  aside .box { border: 1px solid ${THEME.border}; border-radius: 16px; padding: 14px 16px; }
  aside h2 { margin: 0 0 10px; font-size: 19px; }
  aside .trend { color: ${THEME.muted}; font-size: 13px; padding: 6px 0; }
  aside .trend b { display: block; color: ${THEME.fg}; font-size: 15px; }
  ${FILTER_CSS}
  </style>
  <div class="page">
    <nav>
      <div class="logo">𝕏</div>
      ${words.nav.map((item) => `<a href="#">${escape(item)}</a>`).join('')}
      <div class="btn">${escape(words.post)}</div>
    </nav>
    <main data-testid="primaryColumn">
      <div class="head">${escape(words.home)}</div>
      <div class="tabs"><div class="on">${escape(words.forYou)}</div><div>${escape(words.following)}</div></div>
      ${POSTS[lang].slice(0, 7).map((post) => cell(post, words)).join('')}
    </main>
    <aside>
      <div class="box">
        <h2>${lang === 'ja' ? 'いまどうしてる？' : 'What’s happening'}</h2>
        <div class="trend"><b>#${lang === 'ja' ? '写真' : 'photography'}</b>1,204 ${lang === 'ja' ? '件のポスト' : 'posts'}</div>
        <div class="trend"><b>#${lang === 'ja' ? '自作キーボード' : 'keyboards'}</b>842 ${lang === 'ja' ? '件のポスト' : 'posts'}</div>
      </div>
    </aside>
  </div>`;
};

/** X Pro: the rail, then columns side by side. The tint lands the same way in each */
const proPage = (lang) => {
  const words = WORDS[lang];
  const posts = POSTS[lang];
  const column = (name, list) => `
    <section class="column">
      <div class="head">${escape(name)}</div>
      ${list.map((post) => cell(post, words)).join('')}
    </section>`;
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
  ${BASE_CSS}
  .deck { display: flex; height: 800px; }
  .rail {
    flex: none; width: 68px; border-right: 1px solid ${THEME.border};
    display: flex; flex-direction: column; align-items: center; gap: 22px; padding: 14px 0;
    font-size: 22px; color: ${THEME.muted};
  }
  .rail .logo { color: ${THEME.fg}; }
  .rail .btn {
    width: 40px; height: 40px; border-radius: 50%; background: ${THEME.accent}; color: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
  }
  .column { flex: none; width: 380px; border-right: 1px solid ${THEME.border}; overflow: hidden; }
  .column .head { font-size: 15px; padding: 12px 16px; }
  .column article { padding: 10px 14px; }
  .column .avatar { width: 33px; height: 33px; font-size: 14px; }
  .column .who { font-size: 14px; }
  .column .who span { font-size: 13px; }
  .column p { font-size: 14px; }
  .column .actions { gap: 40px; }
  .column .reposted { padding-left: 53px; font-size: 12px; }
  ${FILTER_CSS}
  </style>
  <div class="deck">
    <div class="rail">
      <div class="logo">𝕏</div>
      <div class="btn">✎</div>
      <div>⌂</div><div>♡</div><div>✉</div><div>⌕</div>
    </div>
    ${column(words.columns[0], posts.slice(0, 6))}
    ${column(words.columns[1], posts.slice(6, 12))}
    ${column(words.columns[2], posts.slice(12))}
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
