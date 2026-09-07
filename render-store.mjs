/**
 * Renders the listing images under store/ for the Chrome Web Store.
 *
 * The options page reads its settings from storage, so it needs the extension context.
 * Instead of loading the extension, this builds a page that stubs `storage.local` and runs
 * dist/options.js as it is: the screen is the real one, only the settings inside it are samples.
 *
 * The promo tile is drawn from icons/icon.svg, the same way the icons are rasterized.
 *
 * Usage: node render-store.mjs [path to chrome]
 */
import { execFileSync } from 'node:child_process';
import { cpSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fillDetected } from './src/settings/detected.ts';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'store');
const CHROME = process.argv[2] ?? 'google-chrome';

const rule = (id, conditions, action, color, enabled = true) => ({
  id,
  conditions,
  action,
  color,
  label: '',
  enabled,
});

// Labels are left empty on purpose: the rule names are then generated from the conditions,
// so they follow the display language and the screenshots need no per-language sample data.
const settings = {
  version: 3,
  language: 'auto',
  global: {
    filter: {
      enabled: null,
      rules: [
        rule('r1', [{ kind: 'trait', trait: 'ad', negate: false }], 'hide', null),
        rule(
          'r2',
          [
            {
              kind: 'text',
              target: 'text',
              mode: 'contains',
              pattern: 'giveaway',
              caseSensitive: false,
              negate: false,
            },
          ],
          'collapse',
          null
        ),
        rule('r3', [{ kind: 'trait', trait: 'repost', negate: false }], 'highlight', '#00ba7c26'),
        rule('r4', [{ kind: 'age', minutes: 1440 }], 'collapse', null, false),
      ],
      order: ['r1', 'r2', 'r3', 'r4'],
    },
    appearance: {
      columnWidth: 380,
      fontSize: 14,
      maxLines: 6,
      colors: { background: '#15202b', meta: '#8b98a5' },
      media: { maxThumbHeight: 180 },
    },
  },
  accounts: {},
  columns: {},
};

// Made-up accounts and columns. Nothing here comes from a real timeline.
const detected = {
  currentGroupId: 'd1',
  groups: [
    {
      surface: 'pro',
      id: 'd1',
      name: 'Work',
      scopes: [
        { key: 'c1', account: 'alice', title: 'Home' },
        { key: 'c2', account: 'alice', title: 'Notifications' },
        { key: 'c3', account: 'bob', title: 'Search: release' },
      ],
    },
    { surface: 'pro', id: 'd2', name: 'Reading', scopes: [] },
    // x.com groups its views under one heading of its own (see `surface/x.ts`)
    {
      surface: 'x',
      id: 'all',
      name: null,
      scopes: [
        { key: 'view:home', account: 'alice', title: null },
        { key: 'view:notifications', account: 'alice', title: null },
      ],
    },
  ],
};

/*
 * The stub is plain data, so nothing checks it against the shape the settings screen reads.
 * It has already gone stale once: after the record grew a `surface` and turned decks into
 * groups, the old shape was dropped on the floor and every listing image came out showing
 * an empty settings screen. Run it through the same normalization the screen uses, and
 * stop if anything was dropped.
 */
const kept = fillDetected(detected);
if (kept.groups.length !== detected.groups.length || kept.currentGroupId === null) {
  throw new Error(
    `The stub no longer matches what the settings screen reads: ` +
      `${kept.groups.length} of ${detected.groups.length} groups survived. See settings/detected.ts.`
  );
}
for (const [i, group] of detected.groups.entries()) {
  if (kept.groups[i].scopes.length !== group.scopes.length) {
    throw new Error(`Group ${group.id} lost scopes in normalization. See settings/detected.ts.`);
  }
}

/** Stands in for storage.local. The options page touches no other extension API. */
const stub = `
<script>
(() => {
  const store = new Map(Object.entries(${JSON.stringify({ settings, detected })}));
  const listeners = [];
  globalThis.browser = {
    storage: {
      local: {
        get: async (key) => (store.has(key) ? { [key]: store.get(key) } : {}),
        set: async (items) => {
          for (const [k, v] of Object.entries(items)) store.set(k, v);
        },
        remove: async (key) => void store.delete(key),
      },
      onChanged: {
        addListener: (fn) => listeners.push(fn),
        removeListener: (fn) => listeners.splice(listeners.indexOf(fn), 1),
      },
    },
  };
})();
</script>
`;

/** Presses the appearance tab once the page has drawn. Which tab is open lives only in the page. */
const openAppearance = `
<script>
(() => {
  const timer = setInterval(() => {
    const tab = [...document.querySelectorAll('.tab')]
      .find((b) => ['Appearance', '外観'].includes(b.textContent.trim()));
    if (!tab) return;
    tab.click();
    clearInterval(timer);
  }, 50);
})();
</script>
`;

const work = mkdtempSync(join(tmpdir(), 'xpro-store-'));
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, 'dist'), work, { recursive: true });
copyFileSync(join(ROOT, 'icons', 'icon.svg'), join(work, 'icon.svg'));

const options = readFileSync(join(work, 'options.html'), 'utf8');
const withScripts = (extra) =>
  options.replace('<script src="options.js"></script>', `${stub}<script src="options.js"></script>${extra}`);
writeFileSync(join(work, 'filter.html'), withScripts(''));
writeFileSync(join(work, 'appearance.html'), withScripts(openAppearance));

// The tile sits next to the store listing, so its ground is X's dim theme
writeFileSync(
  join(work, 'tile.html'),
  `<!doctype html><html><body style="margin:0">
<div style="width:440px;height:280px;background:#15202b;display:flex;flex-direction:column;
            justify-content:center;gap:18px;padding:0 36px;box-sizing:border-box;
            font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#f7f9f9">
  <img src="icon.svg" width="72" height="72" style="display:block">
  <div>
    <div style="font-size:30px;font-weight:700;letter-spacing:-0.01em">X Tweaks</div>
    <div style="font-size:15px;line-height:1.5;color:#8b98a5;margin-top:8px">
      Filter the X Pro and x.com<br>timelines, and change how they look
    </div>
  </div>
</div>
</body></html>`
);

/** `lang` also goes in through the environment: the page picks the language up from the browser */
const shoot = (name, page, width, height, lang) => {
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      `--lang=${lang}`,
      `--window-size=${width},${height}`,
      `--screenshot=${join(OUT, name)}`,
      // The page renders asynchronously; this waits for it instead of racing the shot
      '--virtual-time-budget=3000',
      join(work, page),
    ],
    { stdio: 'ignore', env: { ...process.env, LANGUAGE: lang, LC_ALL: lang } }
  );
  console.log(`store/${name}`);
};

shoot('screenshot-filter-en.png', 'filter.html', 1280, 800, 'en-US');
shoot('screenshot-appearance-en.png', 'appearance.html', 1280, 800, 'en-US');
shoot('screenshot-filter-ja.png', 'filter.html', 1280, 800, 'ja-JP');
shoot('screenshot-appearance-ja.png', 'appearance.html', 1280, 800, 'ja-JP');
shoot('promo-tile-440x280.png', 'tile.html', 440, 280, 'en-US');

rmSync(work, { recursive: true, force: true });
