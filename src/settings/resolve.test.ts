import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  CLEARABLE_ITEMS,
  emptyNode,
  emptySettings,
  fillAll,
  fillNode,
  type AppearanceNode,
  type ClearableItem,
  type Rule,
  type Settings,
  type SettingsNode,
} from './schema.ts';
import {
  appearanceFor,
  enabledAt,
  inheritedFor,
  resolve,
  ruleSourceOf,
  sourceOf,
  tiersFor,
  type Tier,
} from './resolve.ts';

/** A rule that collapses posts whose body contains the pattern. The id is the pattern itself, to make it easy to follow */
const keyword = (pattern: string, patch: Partial<Rule> = {}): Rule => ({
  id: pattern,
  conditions: [
    { kind: 'text', target: 'text', mode: 'contains', pattern, caseSensitive: false, negate: false },
  ],
  action: ACTIONS.COLLAPSE,
  color: null,
  label: '',
  enabled: true,
  ...patch,
});

/** Writes a rule's conditions out on one line, for comparison */
const conditionsOf = (rule: Rule): string =>
  rule.conditions
    .map((c) =>
      c.kind === 'text'
        ? `${c.target}:${c.mode}:${c.pattern}`
        : c.kind === 'age'
          ? `age:${c.minutes}`
          : c.kind === 'count'
            ? `count:${c.metric}:${c.direction}:${c.count}`
            : `trait:${c.trait}`
    )
    .join(',');

/** Builds one tier, overwriting only the items given */
const node = (patch: (n: SettingsNode) => void): SettingsNode => {
  const n = emptyNode();
  patch(n);
  return n;
};

const settings = (patch: (s: Settings) => void): Settings => {
  const s = emptySettings();
  patch(s);
  return s;
};

const scope = { account: 'alice', surface: null, columnId: 'col-1' };

test('どの段にも設定が無ければ、グローバル段だけを見る', () => {
  const s = emptySettings();
  assert.equal(tiersFor(s, scope).length, 1);
  assert.deepEqual(resolve(s, scope), emptyNode());
});

test('アカウント段・カラム段は、設定を持つときだけ合成に加わる', () => {
  const s = settings((s) => {
    s.accounts.alice = emptyNode();
    s.columns['col-1'] = emptyNode();
  });
  assert.equal(tiersFor(s, scope).length, 3);
  // For a different account or column, that tier is not added
  assert.equal(tiersFor(s, { account: 'bob', surface: null, columnId: 'col-9' }).length, 1);
  // With neither known (a post outside the columns), only global
  assert.equal(tiersFor(s, { account: null, surface: null, columnId: null }).length, 1);
});

test('サイトの段は、アカウントの下・カラムの上に入る', () => {
  const s = settings((s) => {
    s.global.appearance.fontSize = 14;
    s.accounts.alice = node((n) => (n.appearance.fontSize = 15));
    s.surfaces.x.appearance.fontSize = 16;
    s.columns['col-1'] = node((n) => (n.appearance.fontSize = 17));
  });
  const at = (scope: Parameters<typeof resolve>[1]) => resolve(s, scope).appearance.fontSize;
  // The column is the innermost, so it wins over the site
  assert.equal(at({ account: 'alice', surface: 'x', columnId: 'col-1' }), 17);
  // Without a column, the site wins over the account. This order is what lets a colour
  // that follows an account everywhere be taken back on one of the two sites
  assert.equal(at({ account: 'alice', surface: 'x', columnId: null }), 16);
  // The other site sets nothing of its own, so the account's stands
  assert.equal(at({ account: 'alice', surface: 'pro', columnId: null }), 15);
});

test('サイトのアカウントの段は、サイトの下・カラムの上に入る', () => {
  const s = settings((s) => {
    s.global.appearance.fontSize = 14;
    s.accounts.alice = node((n) => (n.appearance.fontSize = 15));
    s.surfaces.x.appearance.fontSize = 16;
    s.surfaceAccounts.x.alice = node((n) => (n.appearance.fontSize = 17));
    s.columns['col-1'] = node((n) => (n.appearance.fontSize = 18));
  });
  const at = (scope: Parameters<typeof resolve>[1]) => resolve(s, scope).appearance.fontSize;
  // The column is still innermost
  assert.equal(at({ account: 'alice', surface: 'x', columnId: 'col-1' }), 18);
  // Without a column, the pair wins over the site it is on and the account it is of
  assert.equal(at({ account: 'alice', surface: 'x', columnId: null }), 17);
  // Another account on the same site is untouched by it
  assert.equal(at({ account: 'bob', surface: 'x', columnId: null }), 16);
  // The same account on the other site is untouched too
  assert.equal(at({ account: 'alice', surface: 'pro', columnId: null }), 15);
});

test('一方のアカウントだけ、片方のサイトで打ち消せる', () => {
  // The user's own case: the colour an account carries everywhere is kept off X Pro for
  // that account alone, while the other account's colour stays
  const s = settings((s) => {
    s.accounts.alice = node((n) => (n.appearance.colors.background = '#aa0000'));
    s.accounts.bob = node((n) => (n.appearance.colors.background = '#0000bb'));
    s.surfaceAccounts.pro.bob = node((n) => (n.appearance.cleared = ['colors.background']));
  });
  const at = (account: string, surface: 'pro' | 'x') =>
    resolve(s, { account, surface, columnId: null }).appearance.colors.background;
  assert.equal(at('alice', 'pro'), '#aa0000');
  assert.equal(at('bob', 'pro'), null);
  // Neither account is touched on the other site
  assert.equal(at('alice', 'x'), '#aa0000');
  assert.equal(at('bob', 'x'), '#0000bb');
});

test('アカウントかサイトのどちらかが欠ければ、掛け合わせの段は加わらない', () => {
  const s = settings((s) => {
    s.surfaceAccounts.x.alice = node((n) => (n.appearance.fontSize = 17));
  });
  // A view whose account could not be read, and the whole-account scope the settings screen asks about
  assert.equal(tiersFor(s, { account: null, surface: 'x', columnId: null }).length, 2);
  assert.equal(tiersFor(s, { account: 'alice', surface: null, columnId: null }).length, 1);
  assert.equal(
    resolve(s, { account: null, surface: 'x', columnId: null }).appearance.fontSize,
    null
  );
});

test('掛け合わせの段は、書かれているアカウントのぶんだけ加わる', () => {
  // Unlike the site tier, which is always there for both sites, this one is a map and is
  // tidied away with the accounts
  const s = settings((s) => {
    s.surfaceAccounts.x.alice = node((n) => (n.appearance.fontSize = 17));
  });
  assert.equal(tiersFor(s, { account: 'alice', surface: 'x', columnId: null }).length, 3);
  assert.equal(tiersFor(s, { account: 'bob', surface: 'x', columnId: null }).length, 2);
});

test('サイトが決まらないスコープでは、サイトの段は加わらない', () => {
  // The settings screen asks about a whole account, which reaches both sites
  const s = settings((s) => {
    s.surfaces.x.appearance.fontSize = 16;
    s.surfaces.pro.appearance.fontSize = 18;
  });
  assert.equal(tiersFor(s, { account: null, surface: null, columnId: null }).length, 1);
  assert.equal(
    resolve(s, { account: null, surface: null, columnId: null }).appearance.fontSize,
    null
  );
});

test('サイトの段は、空でも合成に加わる（間引きの対象ではない）', () => {
  // There are exactly two sites and they never go away, so unlike the accounts and the
  // columns there is no key to tidy up. Merging an empty tier changes nothing
  const s = emptySettings();
  assert.equal(tiersFor(s, { account: null, surface: 'x', columnId: null }).length, 2);
  assert.deepEqual(resolve(s, { account: null, surface: 'x', columnId: null }), emptyNode());
});

test('ルールは3段ぶんが累積する', () => {
  const s = settings((s) => {
    s.global.filter.rules = [keyword('あ')];
    s.accounts.alice = node((n) => {
      n.filter.rules = [
        keyword('い'),
        keyword('spam', {
          id: 'u1',
          conditions: [
            { kind: 'text', target: 'screenName', mode: 'exact', pattern: 'spam', caseSensitive: false, negate: false },
          ],
        }),
      ];
    });
    s.columns['col-1'] = node((n) => {
      n.filter.rules = [keyword('う')];
    });
  });
  const merged = resolve(s, scope);
  assert.deepEqual(merged.filter.rules.map((r) => r.id), ['あ', 'い', 'u1', 'う']);
  // The conditions stay with their own rules as they are strung together
  assert.deepEqual(merged.filter.rules.map(conditionsOf), [
    'text:contains:あ',
    'text:contains:い',
    'screenName:exact:spam',
    'text:contains:う',
  ]);
});

test('サイトのルールも累積し、判定の順はカラムの次に来る', () => {
  const s = fillAll(
    settings((s) => {
      s.global.filter.rules = [keyword('あ')];
      s.accounts.alice = node((n) => (n.filter.rules = [keyword('い')]));
      s.surfaces.x.filter.rules = [keyword('え')];
      s.columns['col-1'] = node((n) => (n.filter.rules = [keyword('う')]));
    })
  );
  const merged = resolve(s, { account: 'alice', surface: 'x', columnId: 'col-1' });
  // The order across the tiers is read from the innermost outwards, so the site's rule
  // is seen before the account's. Nothing new is needed to cancel one: a lower tier's
  // 「何もしない」 already stops what stands above it
  assert.deepEqual(merged.filter.order, ['う', 'え', 'い', 'あ']);
});

test('上位の指定は、下位に置いた「何もしない」のルールで打ち消す', () => {
  // It is not an override of an effective value: it stops because the lower tier's rule is seen first
  const s = fillAll(
    settings((s) => {
      s.global.filter.rules = [keyword('あ')];
      s.columns['col-1'] = node((n) => {
        n.filter.rules = [keyword('あ', { id: 'stop', action: ACTIONS.NOTHING })];
      });
    })
  );
  const merged = resolve(s, scope);
  // The cancelling rule comes first in the order
  assert.deepEqual(merged.filter.order, ['stop', 'あ']);
  assert.equal(merged.filter.rules.find((r) => r.id === 'stop')?.action, ACTIONS.NOTHING);
  // In another column the global rule stays as it is
  assert.deepEqual(resolve(s, { account: 'alice', surface: null, columnId: 'col-2' }).filter.order, ['あ']);
});

test('フィルタの適用停止も上書き継承に従う', () => {
  const s = settings((s) => {
    // Switched off at the account tier, and back on for one column
    s.accounts.alice = node((n) => { n.filter.enabled = false; });
    s.columns['col-1'] = node((n) => { n.filter.enabled = true; });
  });
  assert.equal(resolve(s, scope).filter.enabled, true);
  assert.equal(resolve(s, { account: 'alice', surface: null, columnId: 'col-2' }).filter.enabled, false);
  // With no account identified, that tier does not apply
  assert.equal(resolve(s, { account: null, surface: null, columnId: null }).filter.enabled, null);
});

test('外観は項目ごとに上書き継承する', () => {
  const s = settings((s) => {
    s.global.appearance.columnWidth = 300;
    s.global.appearance.colors.background = '#111111';
    s.accounts.alice = node((n) => { n.appearance.columnWidth = 400; });
  });
  const merged = resolve(s, scope);
  assert.equal(merged.appearance.columnWidth, 400);
  // Items left untouched stay global
  assert.equal(merged.appearance.colors.background, '#111111');
  assert.equal(merged.appearance.fontSize, null);
});

test('外観の項目は1つ残らず継承する。合成が項目を列挙しているため', () => {
  // The merging names every item by hand. An item added to the settings but forgotten
  // there would silently stop being inherited, with only that one item falling back to
  // X Pro's own. Compared against the shape itself, so a new item is covered without
  // touching this test
  const filled = {
    enabled: false,
    columnWidth: 300,
    compact: true,
    fontSize: 13,
    maxLines: 5,
    wordsShown: 40,
    collapseNewlines: true,
    rawCounts: true,
    colors: {
      background: '#111111', text: '#222222', name: '#333333', meta: '#444444',
      link: '#555555', border: '#666666', columnTitle: '#777777', columnHeader: '#888888',
      composeBackground: '#999999', pageBackground: '#aaaaaa',
    },
    media: { maxThumbHeight: 200, style: 'hidden' },
    timeFormat: 'absolute',
    autoContrast: false,
    highlightBase: 'theme',
    cardStyle: 'text',
    quoteStyle: 'mark',
  };
  // Through normalization, so a value this test made up cannot slip past the schema
  const s = settings((s) => { s.global = fillNode({ appearance: filled }); });
  const missing = Object.entries(fillNode({ appearance: filled }).appearance).flatMap(
    ([key, value]) => {
      const merged = resolve(s, scope).appearance[key as keyof typeof filled];
      if (value !== null && typeof value === 'object') {
        return Object.entries(value)
          .filter(([inner]) => ((merged as Record<string, unknown>)[inner] ?? null) === null)
          .map(([inner]) => `${key}.${inner}`);
      }
      // `?? null` so an item the merging forgot outright (undefined) is caught too
      return (merged ?? null) === null ? [key] : [];
    }
  );
  assert.deepEqual(missing, [], '合成で継承されていない項目がある');
});



test('合成しても元の設定を書き換えない', () => {
  const s = settings((s) => {
    s.global.filter.rules = [keyword('あ')];
    s.accounts.alice = node((n) => { n.filter.rules = [keyword('い')]; });
  });
  const merged = resolve(s, scope);
  merged.filter.rules.push(keyword('う'));
  assert.equal(s.global.filter.rules.length, 1);
  assert.equal(s.accounts.alice?.filter.rules.length, 1);
});

test('段をまたぐ順はカラム → アカウント → グローバルで固定', () => {
  const s = fillAll(
    settings((s) => {
      s.global.filter.rules = [keyword('あ')];
      s.accounts.alice = node((n) => {
        n.filter.rules = [keyword('い')];
      });
      s.columns['col-1'] = node((n) => {
        n.filter.rules = [keyword('う')];
      });
    })
  );
  // The lower tier's rules are seen first. The upper tier's settings remain behind as a default the lower one can override
  assert.deepEqual(resolve(s, scope).filter.order, ['う', 'い', 'あ']);
});

test('並びには、その段に実在するルールだけが並ぶ', () => {
  const s = fillAll(
    settings((s) => {
      s.global.filter.rules = [keyword('あ')];
      // Ids of rules that do not exist are dropped by normalization
      s.global.filter.order = ['消えたルール', 'あ'];
    })
  );
  assert.deepEqual(resolve(s, scope).filter.order, ['あ']);
});

/* --- Putting an item back to "as X shows it" --- */

/**
 * Where each cancellable item sits in the appearance.
 *
 * Written out here rather than shipped: `mergeAppearance` pairs a picker with an item
 * name fifteen times over, and a mismatched pair (the font size looked up under the line
 * count's name) would cancel the wrong item. This table is the other half of that pairing,
 * and the test below rubs the two together.
 */
const ITEM_AT: Record<ClearableItem, (a: AppearanceNode) => number | string | null> = {
  columnWidth: (a) => a.columnWidth,
  fontSize: (a) => a.fontSize,
  maxLines: (a) => a.maxLines,
  wordsShown: (a) => a.wordsShown,
  'media.maxThumbHeight': (a) => a.media.maxThumbHeight,
  'colors.background': (a) => a.colors.background,
  'colors.text': (a) => a.colors.text,
  'colors.name': (a) => a.colors.name,
  'colors.meta': (a) => a.colors.meta,
  'colors.link': (a) => a.colors.link,
  'colors.border': (a) => a.colors.border,
  'colors.columnTitle': (a) => a.colors.columnTitle,
  'colors.columnHeader': (a) => a.colors.columnHeader,
  'colors.composeBackground': (a) => a.colors.composeBackground,
  'colors.pageBackground': (a) => a.colors.pageBackground,
};

/** 打ち消せる15項目を、グローバル段にすべて入れた状態 */
const allSet = () =>
  fillAll({
    global: {
      appearance: {
        columnWidth: 400,
        fontSize: 15,
        maxLines: 3,
        wordsShown: 50,
        media: { maxThumbHeight: 200 },
        colors: {
          background: '#111111',
          text: '#222222',
          name: '#333333',
          meta: '#444444',
          link: '#555555',
          border: '#666666',
          columnTitle: '#777777',
          columnHeader: '#888888',
          composeBackground: '#999999',
          pageBackground: '#aaaaaa',
        },
      },
    },
  });

test('下の段で「X の表示のまま」に戻すと、その項目だけが消える', () => {
  for (const item of CLEARABLE_ITEMS) {
    const s = allSet();
    s.columns['col-1'] = node((n) => (n.appearance.cleared = [item]));
    const merged = resolve(s, { account: null, surface: null, columnId: 'col-1' }).appearance;

    assert.equal(ITEM_AT[item](merged), null, `${item} が消えていない`);
    // The other fourteen are untouched. This is what catches a picker paired with the
    // wrong item name in `mergeAppearance`
    for (const other of CLEARABLE_ITEMS) {
      if (other === item) continue;
      assert.notEqual(ITEM_AT[other](merged), null, `${item} を消したら ${other} まで消えた`);
    }
  }
});

test('打ち消しは、その段より上だけを止める（下の段の指定は残る）', () => {
  // 「上の指定を無かったことにする」であって「以後この項目は使えない」ではない
  const s = allSet();
  s.accounts.alice = node((n) => (n.appearance.cleared = ['fontSize']));
  s.columns['col-1'] = node((n) => (n.appearance.fontSize = 20));

  assert.equal(
    resolve(s, { account: 'alice', surface: null, columnId: 'col-1' }).appearance.fontSize,
    20
  );
  // カラムが何も言わなければ、アカウントで止まったまま
  assert.equal(
    resolve(s, { account: 'alice', surface: null, columnId: null }).appearance.fontSize,
    null
  );
});

test('サイトの段で打ち消せば、そのサイトだけが X の表示に戻る', () => {
  // これが打ち消しを入れた動機。アカウントの指定は両サイトに届くので、片方で外すには
  // サイトの段から打ち消すしかない
  const s = fillAll({
    accounts: { alice: { appearance: { colors: { composeBackground: '#222222' } } } },
    surfaces: { x: { appearance: { cleared: ['colors.composeBackground'] } } },
  });
  const at = (surface: 'pro' | 'x') =>
    resolve(s, { account: 'alice', surface, columnId: null }).appearance.colors.composeBackground;
  assert.equal(at('x'), null);
  assert.equal(at('pro'), '#222222');
});

test('同じ段が値と打ち消しを両方持てば、値のほうを採る', () => {
  // 設定画面はどちらか一方しか書かないので、読み込んだファイルからしか来ない状態
  const s = allSet();
  s.columns['col-1'] = node((n) => {
    n.appearance.fontSize = 20;
    n.appearance.cleared = ['fontSize'];
  });
  assert.equal(
    resolve(s, { account: null, surface: null, columnId: 'col-1' }).appearance.fontSize,
    20
  );
});

test('打ち消した項目の由来は、打ち消した段', () => {
  // 「指定なし ← グローバル」と出ると、消えた理由が読み取れない
  const s = allSet();
  s.columns['col-1'] = node((n) => (n.appearance.cleared = ['fontSize']));
  const here = { account: null, surface: null, columnId: 'col-1' } as const;

  assert.equal(sourceOf(s, here, (n) => n.appearance.fontSize, 'fontSize'), 'column');
  // 打ち消していない項目は、これまでどおり値を持つ段
  assert.equal(sourceOf(s, here, (n) => n.appearance.maxLines, 'maxLines'), 'global');
});

test('合成した結果は、打ち消しの一覧を持ち越さない', () => {
  // 下に段が無いので、打ち消す相手がいない
  const s = allSet();
  s.columns['col-1'] = node((n) => (n.appearance.cleared = ['fontSize']));
  assert.deepEqual(
    resolve(s, { account: null, surface: null, columnId: 'col-1' }).appearance.cleared,
    []
  );
});

/* --- Merging the upper tiers only (the effective values the settings screen shows dimmed) --- */

/** Settings with a width and filtering at global, and a font size at the account */
const threeTiers = () =>
  settings((s) => {
    s.global.appearance.columnWidth = 400;
    s.global.appearance.fontSize = 13;
    s.global.filter.enabled = false;
    s.accounts.alice = node((n) => {
      n.appearance.fontSize = 15;
      n.filter.enabled = true;
    });
    s.columns['col-1'] = node((n) => {
      n.appearance.columnWidth = 999;
    });
  });

test('グローバル段の上には何も無い', () => {
  const above = inheritedFor(threeTiers(), { tier: 'global' });
  assert.equal(above.enabled, null);
  assert.equal(above.appearance.columnWidth, null);
  assert.equal(above.appearance.fontSize, null);
});

test('アカウント段の上はグローバル段だけ', () => {
  const above = inheritedFor(threeTiers(), { tier: 'accounts' });
  assert.equal(above.enabled, false);
  assert.equal(above.appearance.columnWidth, 400);
  // Its own settings (the account tier's) are not included
  assert.equal(above.appearance.fontSize, 13);
});

test('カラム段の上はグローバル段と、所属アカウントの段', () => {
  const above = inheritedFor(threeTiers(), { tier: 'columns', account: 'alice', surface: 'pro' });
  // The account tier overrides the global one
  assert.equal(above.enabled, true);
  assert.equal(above.appearance.fontSize, 15);
  // Items the account tier does not set come down from the global one
  assert.equal(above.appearance.columnWidth, 400);
  // Its own settings (the column tier's) are not included
  assert.notEqual(above.appearance.columnWidth, 999);
});

test('所属アカウントが分からないカラムは、グローバル段だけを見る', () => {
  // With pro.x.com not open, the account cannot be read
  const above = inheritedFor(threeTiers(), { tier: 'columns', account: null, surface: 'pro' });
  assert.equal(above.enabled, false);
  assert.equal(above.appearance.fontSize, 13);
});

test('所属アカウントに設定が無ければ、その段は飛ばす', () => {
  const above = inheritedFor(threeTiers(), { tier: 'columns', account: 'bob', surface: 'pro' });
  assert.equal(above.enabled, false);
  assert.equal(above.appearance.fontSize, 13);
});

test('サイト段の上に出せるのはグローバル段だけ（既知の割り切り）', () => {
  /*
   * サイトの上はアカウントだが、サイトのページはどのアカウントのものでもないので、
   * 「空欄なら何が効くか」に出せるのはグローバルの値だけ。所属アカウントが読めない
   * カラムと同じ事情
   */
  const above = inheritedFor(threeTiers(), { tier: 'surface' });
  assert.equal(above.enabled, false);
  assert.equal(above.appearance.fontSize, 13);
  assert.equal(above.appearance.columnWidth, 400);
});

test('カラム段の上には、そのカラムのサイトの段も入る', () => {
  const s = threeTiers();
  s.surfaces.x.appearance.fontSize = 16;
  // The site is below the account, so it is what shows through on that site
  assert.equal(inheritedFor(s, { tier: 'columns', account: 'alice', surface: 'x' }).appearance.fontSize, 16);
  // The other site sets nothing, so the account's value stands
  assert.equal(inheritedFor(s, { tier: 'columns', account: 'alice', surface: 'pro' }).appearance.fontSize, 15);
});

test('カラム段の上には、掛け合わせの段も入る', () => {
  const s = threeTiers();
  s.surfaces.x.appearance.fontSize = 16;
  s.surfaceAccounts.x.alice = node((n) => (n.appearance.fontSize = 17));
  // The pair is the innermost of the tiers above a column, so it is what shows through
  assert.equal(
    inheritedFor(s, { tier: 'columns', account: 'alice', surface: 'x' }).appearance.fontSize,
    17
  );
  // Another account on the same site falls back to the site's own value
  assert.equal(
    inheritedFor(s, { tier: 'columns', account: 'bob', surface: 'x' }).appearance.fontSize,
    16
  );
});

test('サイト段の「打ち消せる項目」には、アカウントが入れたものも数える', () => {
  /*
   * サイトのページはどのアカウントのものでもないので、薄く出す値はグローバルまで。
   * だが「打ち消す相手がいるか」はアカウントまで見ないと答えられない —
   * アカウントに付けた色を片方のサイトで外す、が打ち消しを入れた動機そのもの
   */
  const s = settings((s) => {
    s.global.appearance.fontSize = 13;
    s.accounts.alice = node((n) => (n.appearance.colors.composeBackground = '#222222'));
  });
  const above = inheritedFor(s, { tier: 'surface' });

  // 薄く出す値はグローバルまで。アカウントの色は出さない（どのアカウントのものか言えない）
  assert.equal(above.appearance.colors.composeBackground, null);
  assert.equal(above.appearance.fontSize, 13);
  // 打ち消す相手の有無はアカウントまで見る
  assert.notEqual(above.settable.colors.composeBackground, null);
  assert.equal(above.settable.fontSize, 13);
});

test('サイト以外の段では、打ち消せる項目と薄く出す値は同じ', () => {
  // アカウントを含まないので、2つを分ける理由が無い
  const s = settings((s) => {
    s.global.appearance.fontSize = 13;
    s.accounts.alice = node((n) => (n.appearance.colors.composeBackground = '#222222'));
  });
  for (const scope of [
    { tier: 'global' },
    { tier: 'accounts' },
    { tier: 'columns', account: 'alice', surface: 'pro' },
  ] as const) {
    const above = inheritedFor(s, scope);
    assert.deepEqual(above.settable, above.appearance, scope.tier);
  }
});

test('どの段も指定していない項目は null のまま', () => {
  const above = inheritedFor(threeTiers(), { tier: 'columns', account: 'alice', surface: 'pro' });
  assert.equal(above.appearance.maxLines, null);
  assert.equal(above.appearance.colors.background, null);
  assert.equal(above.appearance.media.style, null);
});

test('外観のオン／オフも上書き継承に従う', () => {
  const s = settings((s) => {
    s.global.appearance.enabled = false;
    s.accounts.alice = node((n) => {
      n.appearance.enabled = true;
    });
  });

  // Switched off at global and back on at the account
  assert.equal(resolve(s, { account: null, surface: null, columnId: null }).appearance.enabled, false);
  assert.equal(resolve(s, { account: 'alice', surface: null, columnId: null }).appearance.enabled, true);
  // An account with no settings inherits the global one
  assert.equal(resolve(s, { account: 'bob', surface: null, columnId: null }).appearance.enabled, false);
  // With no tier setting it, null (meaning it applies)
  assert.equal(resolve(emptySettings(), { account: null, surface: null, columnId: null }).appearance.enabled, null);
});

test('外観を止めた範囲には、上の段の指定も含めて何も当たらない', () => {
  const s = settings((s) => {
    s.global.appearance.columnWidth = 400;
    s.global.appearance.maxLines = 5;
    s.global.appearance.media.maxThumbHeight = 150;
    s.accounts.alice = node((n) => {
      n.appearance.enabled = false;
    });
    s.columns['col-1'] = node((n) => {
      n.appearance.enabled = true;
    });
  });

  // Where it is not switched off, values come down from above as before
  const global = appearanceFor(s, { account: null, surface: null, columnId: null });
  assert.equal(global.columnWidth, 400);
  assert.equal(global.maxLines, 5);

  // Where it is switched off, everything is empty, the global settings included
  const stopped = appearanceFor(s, { account: 'alice', surface: null, columnId: null });
  assert.equal(stopped.columnWidth, null);
  assert.equal(stopped.maxLines, null);
  assert.equal(stopped.media.maxThumbHeight, null);

  // Switched back on at a lower tier, it applies again
  const back = appearanceFor(s, { account: 'alice', surface: null, columnId: 'col-1' });
  assert.equal(back.columnWidth, 400);
  assert.equal(back.maxLines, 5);
});

test('その範囲でフィルタが効くかは、自分の段まで含めた実効値（設定画面の印）', () => {
  // Global says "do not apply" and the account alice puts it back to "apply"
  const s = threeTiers();

  assert.equal(enabledAt(s, { account: null, surface: null, columnId: null }), false);
  assert.equal(enabledAt(s, { account: 'alice', surface: null, columnId: null }), true);
  // The column itself does not set it, so the account's value comes down
  assert.equal(enabledAt(s, { account: 'alice', surface: null, columnId: 'col-1' }), true);
  // With no account known, only global is consulted (when pro.x.com is not open)
  assert.equal(enabledAt(s, { account: null, surface: null, columnId: 'col-1' }), false);
  // With no tier setting it, null (meaning it applies)
  assert.equal(enabledAt(emptySettings(), { account: null, surface: null, columnId: null }), null);
});

/* --- Where a value came from (the screen showing what applies) --- */

test('項目の由来は、下の段から順に見て最初に指定している段', () => {
  // A width and a font size at global, a font size on alice, a width on col-1
  const s = threeTiers();
  const here = { account: 'alice', surface: null, columnId: 'col-1' } as const;

  assert.equal(sourceOf(s, here, (n) => n.appearance.columnWidth), 'column');
  assert.equal(sourceOf(s, here, (n) => n.appearance.fontSize), 'account');
  assert.equal(sourceOf(s, here, (n) => n.filter.enabled), 'account');
  // An item no tier sets
  assert.equal(sourceOf(s, here, (n) => n.appearance.maxLines), null);
});

test('掛け合わせの段に書かれていれば、由来はそこになる', () => {
  const s = threeTiers();
  s.surfaces.x.appearance.fontSize = 16;
  s.surfaceAccounts.x.alice = node((n) => {
    n.appearance.fontSize = 17;
    n.appearance.cleared = ['maxLines'];
  });
  const here = { account: 'alice', surface: 'x', columnId: null } as const;

  assert.equal(sourceOf(s, here, (n) => n.appearance.fontSize), 'surfaceAccount');
  // A cancelled item traces to the tier that cancelled it, not to the one it cancelled
  s.global.appearance.maxLines = 5;
  assert.equal(sourceOf(s, here, (n) => n.appearance.maxLines, 'maxLines'), 'surfaceAccount');
  // Another account on the same site reaches the site's own value instead
  assert.equal(
    sourceOf(s, { account: 'bob', surface: 'x', columnId: null }, (n) => n.appearance.fontSize),
    'surface'
  );
});

test('段が欠けていれば飛ばす（設定を持たないアカウント・カラムの外）', () => {
  const s = threeTiers();

  // An account with no settings is skipped and the walk goes down to global
  assert.equal(sourceOf(s, { account: 'bob', surface: null, columnId: null }, (n) => n.appearance.fontSize), 'global');
  // A place with no column determined (a post in the detail panel, say)
  assert.equal(sourceOf(s, { account: null, surface: null, columnId: null }, (n) => n.appearance.columnWidth), 'global');
  // Settings with nothing in them
  assert.equal(
    sourceOf(emptySettings(), { account: null, surface: null, columnId: null }, (n) => n.appearance.columnWidth),
    null
  );
});

test('由来をたどる順も、カラム → サイト → アカウント → グローバル', () => {
  // The same order `tiersFor` merges in, read the other way round. Written twice
  // (merging and tracing), so it is pinned here
  const s = settings((s) => {
    s.global.appearance.fontSize = 13;
    s.accounts.alice = node((n) => (n.appearance.fontSize = 15));
    s.surfaces.x.appearance.fontSize = 16;
    s.surfaces.x.appearance.maxLines = 3;
    s.columns['col-1'] = node((n) => (n.appearance.fontSize = 17));
  });
  const font = (scope: Parameters<typeof sourceOf>[1]) =>
    sourceOf(s, scope, (n) => n.appearance.fontSize);

  assert.equal(font({ account: 'alice', surface: 'x', columnId: 'col-1' }), 'column');
  // The site is below the account, so it is reached first
  assert.equal(font({ account: 'alice', surface: 'x', columnId: null }), 'surface');
  assert.equal(font({ account: 'alice', surface: 'pro', columnId: null }), 'account');
  // Only the site sets it, so nothing above answers
  assert.equal(
    sourceOf(s, { account: 'alice', surface: 'x', columnId: null }, (n) => n.appearance.maxLines),
    'surface'
  );
});

test('ルールの由来は、そのルールを持っている段', () => {
  const s = settings((s) => {
    s.global.filter.rules = [keyword('あ')];
    s.global.filter.order = [s.global.filter.rules[0]!.id];
    s.accounts.alice = node((n) => {
      n.filter.rules = [keyword('い')];
      n.filter.order = [n.filter.rules[0]!.id];
    });
    s.surfaces.x.filter.rules = [keyword('え')];
    s.surfaces.x.filter.order = [s.surfaces.x.filter.rules[0]!.id];
  });
  const globalId = s.global.filter.rules[0]!.id;
  const accountId = s.accounts.alice!.filter.rules[0]!.id;
  const surfaceId = s.surfaces.x.filter.rules[0]!.id;
  const here = { account: 'alice', surface: 'x', columnId: null } as const;

  assert.equal(ruleSourceOf(s, here, globalId), 'global');
  assert.equal(ruleSourceOf(s, here, accountId), 'account');
  assert.equal(ruleSourceOf(s, here, surfaceId), 'surface');
  // A rule of the other site is not among the tiers that apply here
  assert.equal(ruleSourceOf(s, { ...here, surface: 'pro' }, surfaceId), null);
  // The id of a rule that is not in the tiers that apply (one belonging to another account, say)
  assert.equal(ruleSourceOf(s, { account: null, surface: null, columnId: null }, accountId), null);
});

test('合成した並びのルールは、すべて由来をたどれる（画面が「?」を出さない）', () => {
  const s = settings((s) => {
    s.global.filter.rules = [keyword('あ')];
    s.global.filter.order = [s.global.filter.rules[0]!.id];
    s.accounts.alice = node((n) => {
      n.filter.rules = [keyword('い')];
      n.filter.order = [n.filter.rules[0]!.id];
    });
    s.columns['col-1'] = node((n) => {
      n.filter.rules = [keyword('う')];
      n.filter.order = [n.filter.rules[0]!.id];
    });
  });
  const here = { account: 'alice', surface: null, columnId: 'col-1' } as const;

  const merged = resolve(s, here).filter;
  assert.equal(merged.order.length, 3);
  for (const id of merged.order) {
    assert.notEqual(ruleSourceOf(s, here, id), null);
  }
  // The order goes from the lowest tier
  assert.deepEqual(
    merged.order.map((id) => ruleSourceOf(s, here, id)),
    ['column', 'account', 'global']
  );
});

test('由来が指す段の値と、合成した値が一致する（規則を二重に書いているので縛る）', () => {
  const s = threeTiers();
  const here = { account: 'alice', surface: null, columnId: 'col-1' } as const;
  const merged = resolve(s, here);

  /** Takes the node of the origin tier. null when it is none of them */
  const nodeAt = (tier: Tier | null): SettingsNode | null =>
    tier === 'column'
      ? (s.columns['col-1'] ?? null)
      : tier === 'account'
        ? (s.accounts.alice ?? null)
        : tier === 'global'
          ? s.global
          : null;

  const picks: ((node: SettingsNode) => unknown)[] = [
    (n) => n.appearance.columnWidth,
    (n) => n.appearance.compact,
    (n) => n.appearance.fontSize,
    (n) => n.appearance.maxLines,
    (n) => n.appearance.collapseNewlines,
    (n) => n.appearance.colors.background,
    (n) => n.appearance.media.style,
    (n) => n.filter.enabled,
  ];

  for (const pick of picks) {
    const tier = sourceOf(s, here, pick as (node: SettingsNode) => unknown | null);
    const node = nodeAt(tier);
    // With no origin, the merged value is unset too; with one, that tier's value comes through as is
    assert.deepEqual(pick(merged), node === null ? null : pick(node));
  }
});

test('詰めるかどうかと改行の解除は、それぞれ独立に上書き継承する', () => {
  const s = settings((s) => {
    s.global.appearance.compact = true;
    s.global.appearance.collapseNewlines = true;
    // Packs this account's columns but leaves the line breaks alone
    s.accounts.alice = node((n) => {
      n.appearance.collapseNewlines = false;
    });
  });

  const alice = resolve(s, { account: 'alice', surface: null, columnId: null }).appearance;
  assert.equal(alice.compact, true);
  assert.equal(alice.collapseNewlines, false);

  // An account that sets neither takes both from global
  const bob = resolve(s, { account: 'bob', surface: null, columnId: null }).appearance;
  assert.equal(bob.compact, true);
  assert.equal(bob.collapseNewlines, true);
});

test('自動調整は上書き継承する（上で切ったものを下で戻せる）', () => {
  const s = settings((s) => {
    s.global.appearance.autoContrast = false;
    s.accounts.alice = node((n) => { n.appearance.autoContrast = true; });
  });
  assert.equal(resolve(s, scope).appearance.autoContrast, true);
  // Untouched by the column tier, it stays as the account tier's
  assert.equal(resolve(s, { account: 'alice', surface: null, columnId: null }).appearance.autoContrast, true);
  // With no account identified, the global setting remains
  assert.equal(resolve(s, { account: null, surface: null, columnId: null }).appearance.autoContrast, false);
});

test('外観を止めても自動調整の指定は残る（当てる側は resolve から読む）', () => {
  const s = settings((s) => {
    s.global.appearance.autoContrast = false;
    s.global.appearance.enabled = false;
  });
  // Highlight and emphasis appear even with the appearance off (they are filter-side actions),
  // so the auto-adjust setting must not be dropped
  assert.equal(resolve(s, scope).appearance.autoContrast, false);
  // appearanceFor, on the other hand, comes out empty with the appearance off. The applying side does not go through it
  assert.equal(appearanceFor(s, scope).autoContrast, null);
});

test('ハイライトの下地は上書き継承する（上で変えたものを下で戻せる）', () => {
  const s = settings((s) => {
    s.global.appearance.highlightBase = 'theme';
    s.accounts.alice = node((n) => { n.appearance.highlightBase = 'column'; });
  });
  assert.equal(resolve(s, scope).appearance.highlightBase, 'column');
  assert.equal(resolve(s, { account: null, surface: null, columnId: null }).appearance.highlightBase, 'theme');
});

test('外観を止めてもハイライトの下地の指定は残る', () => {
  const s = settings((s) => {
    s.global.appearance.highlightBase = 'theme';
    s.global.appearance.enabled = false;
  });
  // Highlights themselves appear even with the appearance off (a filter-side action), so how they are laid down is kept too
  assert.equal(resolve(s, scope).appearance.highlightBase, 'theme');
});
