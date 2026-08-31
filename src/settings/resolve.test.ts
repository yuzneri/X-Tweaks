import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  emptyNode,
  emptySettings,
  fillAll,
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
          ? `age:${c.direction}:${c.minutes}`
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

const scope = { account: 'alice', columnId: 'col-1' };

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
  assert.equal(tiersFor(s, { account: 'bob', columnId: 'col-9' }).length, 1);
  // With neither known (a post outside the columns), only global
  assert.equal(tiersFor(s, { account: null, columnId: null }).length, 1);
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
  assert.deepEqual(resolve(s, { account: 'alice', columnId: 'col-2' }).filter.order, ['あ']);
});

test('フィルタの適用停止も上書き継承に従う', () => {
  const s = settings((s) => {
    // Switched off at the account tier, and back on for one column
    s.accounts.alice = node((n) => { n.filter.enabled = false; });
    s.columns['col-1'] = node((n) => { n.filter.enabled = true; });
  });
  assert.equal(resolve(s, scope).filter.enabled, true);
  assert.equal(resolve(s, { account: 'alice', columnId: 'col-2' }).filter.enabled, false);
  // With no account identified, that tier does not apply
  assert.equal(resolve(s, { account: null, columnId: null }).filter.enabled, null);
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
  const above = inheritedFor(threeTiers(), { tier: 'columns', account: 'alice' });
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
  const above = inheritedFor(threeTiers(), { tier: 'columns', account: null });
  assert.equal(above.enabled, false);
  assert.equal(above.appearance.fontSize, 13);
});

test('所属アカウントに設定が無ければ、その段は飛ばす', () => {
  const above = inheritedFor(threeTiers(), { tier: 'columns', account: 'bob' });
  assert.equal(above.enabled, false);
  assert.equal(above.appearance.fontSize, 13);
});

test('どの段も指定していない項目は null のまま', () => {
  const above = inheritedFor(threeTiers(), { tier: 'columns', account: 'alice' });
  assert.equal(above.appearance.maxLines, null);
  assert.equal(above.appearance.colors.background, null);
  assert.equal(above.appearance.media.collapse, null);
});

test('外観のオン／オフも上書き継承に従う', () => {
  const s = settings((s) => {
    s.global.appearance.enabled = false;
    s.accounts.alice = node((n) => {
      n.appearance.enabled = true;
    });
  });

  // Switched off at global and back on at the account
  assert.equal(resolve(s, { account: null, columnId: null }).appearance.enabled, false);
  assert.equal(resolve(s, { account: 'alice', columnId: null }).appearance.enabled, true);
  // An account with no settings inherits the global one
  assert.equal(resolve(s, { account: 'bob', columnId: null }).appearance.enabled, false);
  // With no tier setting it, null (meaning it applies)
  assert.equal(resolve(emptySettings(), { account: null, columnId: null }).appearance.enabled, null);
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
  const global = appearanceFor(s, { account: null, columnId: null });
  assert.equal(global.columnWidth, 400);
  assert.equal(global.maxLines, 5);

  // Where it is switched off, everything is empty, the global settings included
  const stopped = appearanceFor(s, { account: 'alice', columnId: null });
  assert.equal(stopped.columnWidth, null);
  assert.equal(stopped.maxLines, null);
  assert.equal(stopped.media.maxThumbHeight, null);

  // Switched back on at a lower tier, it applies again
  const back = appearanceFor(s, { account: 'alice', columnId: 'col-1' });
  assert.equal(back.columnWidth, 400);
  assert.equal(back.maxLines, 5);
});

test('その範囲でフィルタが効くかは、自分の段まで含めた実効値（設定画面の印）', () => {
  // Global says "do not apply" and the account alice puts it back to "apply"
  const s = threeTiers();

  assert.equal(enabledAt(s, { account: null, columnId: null }), false);
  assert.equal(enabledAt(s, { account: 'alice', columnId: null }), true);
  // The column itself does not set it, so the account's value comes down
  assert.equal(enabledAt(s, { account: 'alice', columnId: 'col-1' }), true);
  // With no account known, only global is consulted (when pro.x.com is not open)
  assert.equal(enabledAt(s, { account: null, columnId: 'col-1' }), false);
  // With no tier setting it, null (meaning it applies)
  assert.equal(enabledAt(emptySettings(), { account: null, columnId: null }), null);
});

/* --- Where a value came from (the screen showing what applies) --- */

test('項目の由来は、下の段から順に見て最初に指定している段', () => {
  // A width and a font size at global, a font size on alice, a width on col-1
  const s = threeTiers();
  const here = { account: 'alice', columnId: 'col-1' } as const;

  assert.equal(sourceOf(s, here, (n) => n.appearance.columnWidth), 'column');
  assert.equal(sourceOf(s, here, (n) => n.appearance.fontSize), 'account');
  assert.equal(sourceOf(s, here, (n) => n.filter.enabled), 'account');
  // An item no tier sets
  assert.equal(sourceOf(s, here, (n) => n.appearance.maxLines), null);
});

test('段が欠けていれば飛ばす（設定を持たないアカウント・カラムの外）', () => {
  const s = threeTiers();

  // An account with no settings is skipped and the walk goes down to global
  assert.equal(sourceOf(s, { account: 'bob', columnId: null }, (n) => n.appearance.fontSize), 'global');
  // A place with no column determined (a post in the detail panel, say)
  assert.equal(sourceOf(s, { account: null, columnId: null }, (n) => n.appearance.columnWidth), 'global');
  // Settings with nothing in them
  assert.equal(
    sourceOf(emptySettings(), { account: null, columnId: null }, (n) => n.appearance.columnWidth),
    null
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
  });
  const globalId = s.global.filter.rules[0]!.id;
  const accountId = s.accounts.alice!.filter.rules[0]!.id;
  const here = { account: 'alice', columnId: null } as const;

  assert.equal(ruleSourceOf(s, here, globalId), 'global');
  assert.equal(ruleSourceOf(s, here, accountId), 'account');
  // The id of a rule that is not in the tiers that apply (one belonging to another account, say)
  assert.equal(ruleSourceOf(s, { account: null, columnId: null }, accountId), null);
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
  const here = { account: 'alice', columnId: 'col-1' } as const;

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
  const here = { account: 'alice', columnId: 'col-1' } as const;
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
    (n) => n.appearance.media.collapse,
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

  const alice = resolve(s, { account: 'alice', columnId: null }).appearance;
  assert.equal(alice.compact, true);
  assert.equal(alice.collapseNewlines, false);

  // An account that sets neither takes both from global
  const bob = resolve(s, { account: 'bob', columnId: null }).appearance;
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
  assert.equal(resolve(s, { account: 'alice', columnId: null }).appearance.autoContrast, true);
  // With no account identified, the global setting remains
  assert.equal(resolve(s, { account: null, columnId: null }).appearance.autoContrast, false);
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
  assert.equal(resolve(s, { account: null, columnId: null }).appearance.highlightBase, 'theme');
});

test('外観を止めてもハイライトの下地の指定は残る', () => {
  const s = settings((s) => {
    s.global.appearance.highlightBase = 'theme';
    s.global.appearance.enabled = false;
  });
  // Highlights themselves appear even with the appearance off (a filter-side action), so how they are laid down is kept too
  assert.equal(resolve(s, scope).appearance.highlightBase, 'theme');
});
