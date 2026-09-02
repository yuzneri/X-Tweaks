import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  SCHEMA_VERSION,
  adjustsContrast,
  COLUMN_COLORS,
  emptyNode,
  emptySettings,
  fillAll,
  minutesOf,
  splitDuration,
  appearanceApplies,
  canEmphasizeWith,
  fillNode,
  cardStyleOf,
  hasContent,
  quoteStyleOf,
  mediaStyleOf,
  highlightBaseOf,
  isEmptyNode,
  restoresHashtags,
  ruleName,
  syncOrder,
  targetsFor,
  type Condition,
  type Rule,
  withoutColumnItems,
} from './schema.ts';
import { messagesFor } from '../i18n/index.ts';

const m = messagesFor('ja');

/** Passed as if it were a stored value, so it is written untyped, as plain data */
const textCondition = (patch: Record<string, unknown> = {}) => ({
  kind: 'text',
  target: 'text',
  mode: 'contains',
  pattern: 'あ',
  ...patch,
});

const ruleOf = (patch: Record<string, unknown> = {}) => ({
  id: 'r1',
  conditions: [textCondition()],
  action: 'collapse',
  ...patch,
});

test('何も保存されていなければ、全項目が未指定になる', () => {
  const node = emptyNode();
  assert.equal(node.filter.enabled, null);
  assert.deepEqual(node.filter.rules, []);
  assert.deepEqual(node.filter.order, []);
  assert.equal(node.appearance.colors.background, null);
});

test('一部のキーしか無くても、残りは未指定で埋まる', () => {
  const node = fillNode({ filter: { enabled: true } });
  assert.equal(node.filter.enabled, true);
  assert.deepEqual(node.filter.rules, []);
});

test('想定と違う型の値は未指定に倒れる。壊れた値のせいで設定全体が読めなくならない', () => {
  const node = fillNode({
    filter: { enabled: 'yes', rules: 'あ' },
    appearance: { columnWidth: '400px', fontSize: Number.NaN },
  });
  assert.equal(node.filter.enabled, null);
  assert.deepEqual(node.filter.rules, []);
  assert.equal(node.appearance.columnWidth, null);
  assert.equal(node.appearance.fontSize, null);
});

test('条件を1つも持たないルールは捨てる。すべての投稿に一致してしまうため', () => {
  const node = fillNode({
    filter: {
      rules: [
        ruleOf({ id: 'r1', conditions: [] }),
        ruleOf({ id: 'r2' }),
        ruleOf({ id: 'r3', conditions: 'ごみ' }),
        // A rule whose conditions are all unreadable also ends up with zero conditions and is discarded
        ruleOf({ id: 'r4', conditions: [{ kind: 'text' }, { kind: 'そんな種類は無い' }] }),
      ],
    },
  });
  assert.deepEqual(
    node.filter.rules.map((r) => r.id),
    ['r2']
  );
});

test('パターンを失った文字列条件は捨てる。何にも一致しないため', () => {
  const node = fillNode({
    filter: {
      rules: [
        ruleOf({
          conditions: [textCondition({ pattern: '' }), textCondition({ pattern: '残る' })],
        }),
      ],
    },
  });
  assert.deepEqual(node.filter.rules[0]?.conditions, [
    { kind: 'text', target: 'text', mode: 'contains', pattern: '残る', caseSensitive: false, negate: false },
  ]);
});

test('投稿の古さの条件は、保存の往復でそのまま残る', () => {
  // Normalization is built to discard kinds it does not know, so the round trip is pinned down here.
  // Dropping one would take a condition out of the AND and make the rule match more widely than intended
  const node = fillNode({
    filter: {
      rules: [
        ruleOf({
          conditions: [
            { kind: 'age', direction: 'older', minutes: 1440, negate: false },
            { kind: 'age', direction: 'newer', minutes: 30, negate: true },
          ],
        }),
      ],
    },
  });
  assert.deepEqual(node.filter.rules[0]?.conditions, [
    { kind: 'age', direction: 'older', minutes: 1440, negate: false },
    { kind: 'age', direction: 'newer', minutes: 30, negate: true },
  ]);
});

test('古さが正の整数でなければ、その条件は捨てる', () => {
  // Letting 0 through would make "older than 0 minutes" = every post
  const node = fillNode({
    filter: {
      rules: [
        ruleOf({
          conditions: [
            { kind: 'age', direction: 'older', minutes: 0 },
            { kind: 'age', direction: 'older', minutes: -5 },
            { kind: 'age', direction: 'older', minutes: 1.5 },
            { kind: 'age', direction: 'older', minutes: '60' },
            { kind: 'age', direction: 'older', minutes: 60 },
          ],
        }),
      ],
    },
  });
  assert.deepEqual(node.filter.rules[0]?.conditions, [
    { kind: 'age', direction: 'older', minutes: 60, negate: false },
  ]);
});

test('知らない向きは「より古い」に倒す', () => {
  const node = fillNode({
    filter: {
      rules: [ruleOf({ conditions: [{ kind: 'age', direction: 'そんな向きは無い', minutes: 60 }] })],
    },
  });
  assert.deepEqual(node.filter.rules[0]?.conditions, [
    { kind: 'age', direction: 'older', minutes: 60, negate: false },
  ]);
});

test('分に直した長さは、画面に出すとき割り切れる一番大きい単位に戻る', () => {
  assert.deepEqual(splitDuration(minutesOf(2, 'days')), { value: 2, unit: 'days' });
  assert.deepEqual(splitDuration(minutesOf(3, 'hours')), { value: 3, unit: 'hours' });
  assert.deepEqual(splitDuration(90), { value: 90, unit: 'minutes' });
});

test('知らない対象・照らし合わせ方は既定に倒し、知らない性質の条件は捨てる', () => {
  const node = fillNode({
    filter: {
      rules: [
        ruleOf({
          conditions: [
            textCondition({ target: 'そんな対象は無い', mode: 'そんな方法は無い', pattern: 'あ' }),
            { kind: 'trait', trait: 'repost' },
            { kind: 'trait', trait: 'そんな性質は無い' },
          ],
        }),
      ],
    },
  });
  assert.deepEqual(node.filter.rules[0]?.conditions, [
    // The target and the mode fall back to the defaults (body, contains). The pattern was readable, so the condition can stay
    { kind: 'text', target: 'text', mode: 'contains', pattern: 'あ', caseSensitive: false, negate: false },
    { kind: 'trait', trait: 'repost', negate: false },
  ]);
});

test('否定・大文字小文字の指定は、保存されていなければ既定（しない）で埋まる', () => {
  const node = fillNode({
    filter: {
      rules: [
        ruleOf({
          conditions: [
            textCondition({ negate: true, caseSensitive: true }),
            { kind: 'trait', trait: 'ad', negate: true },
          ],
        }),
      ],
    },
  });
  const [textCond, traitCond] = node.filter.rules[0]!.conditions;
  assert.equal(textCond?.kind === 'text' && textCond.caseSensitive, true);
  assert.equal(textCond?.negate, true);
  assert.equal(traitCond?.negate, true);
  // The side with nothing set
  assert.equal(fillNode({ filter: { rules: [ruleOf()] } }).filter.rules[0]?.conditions[0]?.negate, false);
});

test('有効／無効を持たないルールは有効として読む。止める意図が無かったため', () => {
  const read = (v: unknown) => fillNode({ filter: { rules: [ruleOf({ enabled: v })] } }).filter.rules[0];
  assert.equal(read(undefined)?.enabled, true);
  assert.equal(read('no')?.enabled, true);
  assert.equal(read(false)?.enabled, false);
});

test('動作が読めないルールは、折りたたむとして読む', () => {
  const node = fillNode({ filter: { rules: [ruleOf({ action: 'そんな動作は無い' })] } });
  assert.equal(node.filter.rules[0]?.action, ACTIONS.COLLAPSE);
});

test('id が欠けたルールには id を振り直す。並びと削除が個体を参照するため', () => {
  const node = fillNode({
    filter: { rules: [ruleOf({ id: undefined }), ruleOf({ id: undefined })] },
  });
  const [first, second] = node.filter.rules;
  assert.ok(first?.id);
  assert.ok(second?.id);
  assert.notEqual(first?.id, second?.id);
});

test('カラーコードは #rrggbb と #rrggbbaa を受け入れ、小文字に揃える', () => {
  const color = (v: unknown) =>
    fillNode({ appearance: { colors: { background: v } } }).appearance.colors.background;
  assert.equal(color('#AABBCC'), '#aabbcc');
  // With opacity
  assert.equal(color('#AABBCC80'), '#aabbcc80');

  for (const bad of ['#abc', 'aabbcc', 'red', '#gghhii', '#aabbccddee', '#aabbccd', 123, null]) {
    assert.equal(color(bad), null, `${String(bad)} は受け入れない`);
  }
});

test('表示言語は auto・ja・en だけを受け入れ、それ以外は auto に戻す', () => {
  assert.equal(fillAll({ language: 'en' }).language, 'en');
  assert.equal(fillAll({ language: 'ja' }).language, 'ja');
  assert.equal(fillAll({ language: 'auto' }).language, 'auto');
  // Not stored, an unknown language, or the wrong type all fall back to the default auto
  assert.equal(fillAll({}).language, 'auto');
  assert.equal(fillAll({ language: 'fr' }).language, 'auto');
  assert.equal(fillAll({ language: 1 }).language, 'auto');
});

test('X の文言は文字列だけを受け、空白だけの行と重複は落とす', () => {
  const words = (v: unknown) => fillAll({ genericAlts: v }).genericAlts;

  assert.deepEqual(words(['画像', '埋め込み動画']), ['画像', '埋め込み動画']);
  // Nothing stored means "work them out", which is the empty list
  assert.deepEqual(words(undefined), []);
  assert.deepEqual(words('画像'), []);
  // A blank line typed into the box, and the same word written twice, say nothing extra
  assert.deepEqual(words(['画像', '', '   ', '画像']), ['画像']);
  // What is not a string is dropped, the rest is kept
  assert.deepEqual(words(['画像', 1, null, { a: 1 }, '動画']), ['画像', '動画']);
  // Kept as written otherwise: it is compared with what X put on a picture
  assert.deepEqual(words([' 画像 ']), [' 画像 ']);
});

test('保存されていない段は空になり、3段の形は常に揃う', () => {
  const settings = emptySettings();
  assert.deepEqual(settings.accounts, {});
  assert.deepEqual(settings.columns, {});
});

test('アカウント段・カラム段の設定も、段ごとに正規化される', () => {
  const settings = fillAll({
    version: SCHEMA_VERSION,
    accounts: { alice: { filter: { enabled: false } } },
    columns: { 'col-1': { filter: { rules: [ruleOf()] } } },
  });
  assert.equal(settings.accounts.alice?.filter.enabled, false);
  // Untouched items are filled with defaults too, so the merging side need not worry about anything missing
  assert.deepEqual(settings.accounts.alice?.filter.rules, []);
  assert.equal(settings.columns['col-1']?.filter.rules.length, 1);
});

test('対応するカラムが見つからない設定も、そのまま読み出せる', () => {
  const settings = fillAll({ columns: { 'col-gone': { filter: { enabled: false } } } });
  assert.equal(settings.columns['col-gone']?.filter.enabled, false);
});

test('保存されている version は読み捨て、この拡張の version に揃える', () => {
  assert.equal(fillAll({ version: 0 }).version, SCHEMA_VERSION);
});

test('投稿フォームの設定は、何も保存されていなければ X Pro のまま（両方 off）', () => {
  assert.deepEqual(emptySettings().compose, { reopen: false, keepHashtags: false });
  assert.deepEqual(fillAll({ compose: {} }).compose, { reopen: false, keepHashtags: false });
});

test('投稿フォームの設定は保存された値を読み出す', () => {
  const settings = fillAll({ compose: { reopen: true, keepHashtags: true } });
  assert.deepEqual(settings.compose, { reopen: true, keepHashtags: true });
});

test('投稿フォームの設定は、真偽値でない値を off に倒す（段の継承が無く「未設定」を持たないため）', () => {
  const settings = fillAll({ compose: { reopen: 'true', keepHashtags: 1 } });
  assert.deepEqual(settings.compose, { reopen: false, keepHashtags: false });
  // The key itself being something other than an object lands on the same side
  assert.deepEqual(fillAll({ compose: 'on' }).compose, { reopen: false, keepHashtags: false });
});

test('ハッシュタグを残すかどうかは、開いたままにする設定と連動しない', () => {
  assert.equal(restoresHashtags({ reopen: true, keepHashtags: true }), true);
  // On by itself it still works: the tags wait for the next form opened by hand
  assert.equal(restoresHashtags({ reopen: false, keepHashtags: true }), true);
  assert.equal(restoresHashtags({ reopen: true, keepHashtags: false }), false);
  assert.equal(restoresHashtags({ reopen: false, keepHashtags: false }), false);
});

test('何も指定していない段は「空」と判定する', () => {
  assert.equal(isEmptyNode(emptyNode()), true);
  assert.equal(isEmptyNode(undefined), true);
});

test('フィルタでも外観でも、何か指定していれば空ではない', () => {
  const condition: Condition = { kind: 'trait', trait: 'repost', negate: false };
  const rule: Rule = {
    id: 'r1',
    conditions: [condition],
    action: ACTIONS.COLLAPSE,
    color: null,
    label: '',
    enabled: true,
  };
  const samples: ((node: ReturnType<typeof emptyNode>) => void)[] = [
    (n) => { n.filter.enabled = false; },
    (n) => { n.filter.rules = [rule]; },
    (n) => { n.appearance.columnWidth = 400; },
    (n) => { n.appearance.colors.background = '#111111'; },
    (n) => { n.appearance.media.style = 'hidden'; },
    (n) => { n.appearance.compact = true; },
    (n) => { n.appearance.collapseNewlines = true; },
    (n) => { n.appearance.hideWhoToFollow = true; },
    (n) => { n.appearance.autoContrast = false; },
    (n) => { n.appearance.highlightBase = 'theme'; },
    (n) => { n.appearance.cardStyle = 'hidden'; },
    (n) => { n.appearance.quoteStyle = 'mark'; },
  ];
  for (const [i, apply] of samples.entries()) {
    const node = emptyNode();
    apply(node);
    assert.equal(isEmptyNode(node), false, `${i} 番目の指定を見落としている`);
  }
});

test('並びには、その段に実在するルールがちょうど1つずつ並ぶ', () => {
  const node = fillNode({
    filter: { rules: [ruleOf({ id: 'r1' }), ruleOf({ id: 'r2' })] },
  });
  // With no stored order, it is the order they were created in
  assert.deepEqual(node.filter.order, ['r1', 'r2']);
});

test('保存された並びを尊重しつつ、抜けたルールは末尾に足す', () => {
  const node = fillNode({
    filter: {
      rules: [ruleOf({ id: 'r1' }), ruleOf({ id: 'r2' }), ruleOf({ id: 'r3' })],
      // r3 is put first. r2 is not in the order at all
      order: ['r3', 'r1'],
    },
  });
  assert.deepEqual(node.filter.order, ['r3', 'r1', 'r2']);
});

test('実在しないルールと壊れた値は並びから落とし、重複は1つにする', () => {
  const node = fillNode({
    filter: {
      rules: [ruleOf({ id: 'r1' })],
      order: ['消えたルール', 42, null, 'r1', 'r1'],
    },
  });
  assert.deepEqual(node.filter.order, ['r1']);
});

test('ルールが1つも無ければ並びも空', () => {
  assert.deepEqual(fillNode({}).filter.order, []);
  assert.deepEqual(emptyNode().filter.order, []);
});

test('ルールの呼び名は、表示名があればそれ、無ければ条件を並べたもの', () => {
  const rule = (patch: Partial<Rule>): Rule => ({
    id: 'r1',
    conditions: [],
    action: ACTIONS.COLLAPSE,
    color: null,
    label: '',
    enabled: true,
    ...patch,
  });

  assert.equal(ruleName(rule({ label: '宣伝っぽいもの' }), m), '宣伝っぽいもの');

  assert.equal(
    ruleName(
      rule({
        conditions: [
          { kind: 'trait', trait: 'repost', negate: false },
          { kind: 'text', target: 'text', mode: 'contains', pattern: '宣伝', caseSensitive: false, negate: false },
        ],
      }),
      m
    ),
    'リポスト かつ 本文が「宣伝」を含む'
  );

  // Negation is phrased differently per kind of condition
  assert.equal(
    ruleName(
      rule({
        conditions: [
          { kind: 'trait', trait: 'ad', negate: true },
          { kind: 'text', target: 'replyTo', mode: 'exact', pattern: 'alice', caseSensitive: false, negate: true },
        ],
      }),
      m
    ),
    '広告ではない かつ 返信先のIDが「alice」と一致しない'
  );
});

test('並びを実在するルールに揃える（設定画面がルールを足し引きしたときにも使う）', () => {
  const r = (id: string): Rule => ({
    id,
    conditions: [{ kind: 'trait', trait: 'repost', negate: false }],
    action: ACTIONS.COLLAPSE,
    color: null,
    label: '',
    enabled: true,
  });

  // An added rule goes in at the end
  assert.deepEqual(syncOrder(['a'], [r('a'), r('b')]), ['a', 'b']);
  // A deleted rule drops out
  assert.deepEqual(syncOrder(['a', 'b'], [r('b')]), ['b']);
  // A reordering is preserved
  assert.deepEqual(syncOrder(['b', 'a'], [r('a'), r('b')]), ['b', 'a']);
  // Broken values and duplicates are dropped
  assert.deepEqual(syncOrder([null, 'a', 'a', 7], [r('a')]), ['a']);
  assert.deepEqual(syncOrder(undefined, [r('a')]), ['a']);
});

test('外観のオン／オフは3値で、持っていない設定は未指定になる', () => {
  // Content stored before this item existed
  assert.equal(fillNode({ appearance: { columnWidth: 400 } }).appearance.enabled, null);
  assert.equal(fillNode({ appearance: { enabled: false } }).appearance.enabled, false);
  assert.equal(fillNode({ appearance: { enabled: true } }).appearance.enabled, true);
  // An unexpected type falls back to not set
  assert.equal(fillNode({ appearance: { enabled: 'yes' } }).appearance.enabled, null);

  // Unset means "apply". It stops only when explicitly set to false
  assert.equal(appearanceApplies(null), true);
  assert.equal(appearanceApplies(true), true);
  assert.equal(appearanceApplies(false), false);
});

test('外観のオン／オフだけを持つ段は空ではない（保存先から落とさない）', () => {
  // Overlooking this would mean choosing "do not apply" on a column never gets saved
  assert.equal(isEmptyNode(fillNode({ appearance: { enabled: false } })), false);
  assert.equal(isEmptyNode(fillNode({ appearance: { enabled: true } })), false);
  assert.equal(isEmptyNode(fillNode({ appearance: { enabled: null } })), true);
});


test('印が見る「中身」に、適用するかどうかの切り替えは入らない', () => {
  const rule = {
    id: 'a',
    conditions: [{ kind: 'trait', trait: 'repost' }],
    action: ACTIONS.COLLAPSE,
  };

  // A rule or an appearance setting means there is content
  assert.equal(hasContent(fillNode({ filter: { rules: [rule] } })), true);
  assert.equal(hasContent(fillNode({ appearance: { columnWidth: 400 } })), true);
  assert.equal(hasContent(fillNode({ appearance: { colors: { text: '#ffffff' } } })), true);
  assert.equal(hasContent(fillNode({ appearance: { media: { style: 'hidden' } } })), true);

  // Merely toggling "does it apply" is not content
  assert.equal(hasContent(fillNode({ filter: { enabled: true } })), false);
  assert.equal(hasContent(fillNode({ filter: { enabled: false } })), false);
  assert.equal(hasContent(fillNode({ appearance: { enabled: false } })), false);

  assert.equal(hasContent(emptyNode()), false);
  assert.equal(hasContent(undefined), false);

  // The decision to drop a tier from storage (isEmptyNode) counts the toggle as a setting. They serve different purposes
  assert.equal(isEmptyNode(fillNode({ filter: { enabled: true } })), false);
  assert.equal(isEmptyNode(fillNode({ appearance: { enabled: false } })), false);
});

test('外観の切り替えは、真偽値以外を未指定として読む', () => {
  const read = (v: unknown) => {
    const { appearance } = fillNode({
      appearance: { compact: v, collapseNewlines: v, hideWhoToFollow: v },
    });
    return [appearance.compact, appearance.collapseNewlines, appearance.hideWhoToFollow];
  };

  assert.deepEqual(read(true), [true, true, true]);
  // false is a value of its own: it is what cancels an upper tier's true
  assert.deepEqual(read(false), [false, false, false]);
  assert.deepEqual(read(undefined), [null, null, null]);
  assert.deepEqual(read('true'), [null, null, null]);
  assert.deepEqual(read(1), [null, null, null]);

  // They are independent: one being set says nothing about the others
  const only = fillNode({ appearance: { compact: true } }).appearance;
  assert.equal(only.compact, true);
  assert.equal(only.collapseNewlines, null);
  assert.equal(only.hideWhoToFollow, null);
});

test('保存された寸法は正の整数だけを受ける', () => {
  const width = (v: unknown) => fillNode({ appearance: { columnWidth: v } }).appearance.columnWidth;

  assert.equal(width(400), 400);
  // A 0 reaching buildCss makes the column zero-wide and it vanishes
  assert.equal(width(0), null);
  assert.equal(width(-100), null);
  assert.equal(width(12.5), null);
  assert.equal(width(Infinity), null);
  assert.equal(width(NaN), null);
  assert.equal(width('400'), null);
  assert.equal(width(null), null);

  // The same rule holds for the other sizes
  const node = fillNode({
    appearance: { fontSize: 0, maxLines: -1, media: { maxThumbHeight: 1.5 } },
  });
  assert.equal(node.appearance.fontSize, null);
  assert.equal(node.appearance.maxLines, null);
  assert.equal(node.appearance.media.maxThumbHeight, null);
});

test('性質を選ぶと、その性質だからこそ指定できる対象が増える', () => {
  // With no trait picked, only the three every post always has
  assert.deepEqual(targetsFor(null), ['text', 'screenName', 'displayName']);

  // Relations to other posts
  assert.ok(targetsFor('repost').includes('repostedBy'));
  assert.ok(targetsFor('quote').includes('quotedText'));
  assert.ok(targetsFor('reply').includes('replyTo'));

  // Embedded things appear only once their trait is picked
  assert.ok(targetsFor('pollOpen').includes('pollChoice'));
  assert.ok(targetsFor('pollClosed').includes('pollChoice'));
  assert.ok(targetsFor('linkCard').includes('cardDomain'));
  assert.ok(targetsFor('linkCard').includes('cardTitle'));
  assert.ok(targetsFor('space').includes('spaceName'));
  assert.ok(targetsFor('article').includes('articleText'));

  // They do not appear for another trait
  assert.equal(targetsFor('repost').includes('pollChoice'), false);
  assert.equal(targetsFor('media').includes('cardDomain'), false);

  // Traits of the post itself have no targets of their own
  assert.deepEqual(targetsFor('communityNote'), targetsFor(null));
  assert.deepEqual(targetsFor('ad'), targetsFor(null));
});

test('「自分自身」の条件では強調できない（塗る文字を指していないため）', () => {
  const self: Condition = {
    kind: 'text',
    target: 'replyTo',
    mode: 'self',
    pattern: '',
    caseSensitive: false,
    negate: false,
  };
  assert.equal(canEmphasizeWith(self), false);
  // For the same target, a condition matching a pattern can be painted
  assert.equal(canEmphasizeWith({ ...self, mode: 'contains', pattern: 'alice' }), true);
  // Negation, and targets with nothing to paint, cannot be painted either (the existing rules)
  assert.equal(canEmphasizeWith({ ...self, mode: 'contains', pattern: 'alice', negate: true }), false);
  assert.equal(canEmphasizeWith({ ...self, target: 'repostedBy', mode: 'contains', pattern: 'alice' }), false);
});

test('「自分自身」は選べる対象でだけ読み戻せる', () => {
  const read = (target: string) =>
    fillAll({ global: { filter: { rules: [{ id: 'r', conditions: [{ kind: 'text', target, mode: 'self' }], action: 'collapse' }] } } })
      .global.filter.rules[0]?.conditions ?? [];

  // It survives for targets that look at a user ID (the author aside)
  assert.equal(read('replyTo').length, 1);
  assert.equal(read('quotedScreenName').length, 1);
  assert.equal(read('repostedBy').length, 1);
  // The author is always true and is discarded. It means nothing on the body either
  assert.equal(read('screenName').length, 0);
  assert.equal(read('text').length, 0);
});

test('自動調整の既定は「する」（未指定でも効く）', () => {
  assert.equal(adjustsContrast(null), true);
  assert.equal(adjustsContrast(true), true);
  // It stops only when explicitly turned off
  assert.equal(adjustsContrast(false), false);
  // Even in a tier that sets nothing, the default is "yes"
  assert.equal(adjustsContrast(emptyNode().appearance.autoContrast), true);
});

test('自動調整の指定は真偽値だけを受ける（壊れた値は未指定に倒す）', () => {
  const filled = (v: unknown) => fillNode({ appearance: { autoContrast: v } }).appearance.autoContrast;
  assert.equal(filled(false), false);
  assert.equal(filled(true), true);
  assert.equal(filled('false'), null);
  assert.equal(filled(0), null);
  assert.equal(filled(undefined), null);
});

test('ハイライトの下地の既定は「カラムの背景色の上」', () => {
  assert.equal(highlightBaseOf(null), 'column');
  assert.equal(highlightBaseOf('theme'), 'theme');
  // Even in a tier that sets nothing, it looks the same as before this was introduced
  assert.equal(highlightBaseOf(emptyNode().appearance.highlightBase), 'column');
});

test('ハイライトの下地は知らない値を未指定に倒す', () => {
  const filled = (v: unknown) =>
    fillNode({ appearance: { highlightBase: v } }).appearance.highlightBase;
  assert.equal(filled('column'), 'column');
  assert.equal(filled('theme'), 'theme');
  // An unknown value left in place would leave the layering undecided. Exports from when this was a boolean land here too
  assert.equal(filled('custom'), null);
  assert.equal(filled(true), null);
  assert.equal(filled(undefined), null);
});

test('カードと引用の既定は「X の表示のまま」', () => {
  assert.equal(cardStyleOf(null), 'show');
  assert.equal(cardStyleOf('hidden'), 'hidden');
  assert.equal(quoteStyleOf(null), 'show');
  assert.equal(quoteStyleOf('mark'), 'mark');
  // Even in a tier that sets nothing, they look the same as before these were introduced
  assert.equal(cardStyleOf(emptyNode().appearance.cardStyle), 'show');
  assert.equal(quoteStyleOf(emptyNode().appearance.quoteStyle), 'show');
});

test('カードと引用の見せ方は、知らない値を未指定に倒す', () => {
  const filled = (v: unknown) => fillNode({ appearance: { cardStyle: v } }).appearance.cardStyle;
  assert.equal(filled('show'), 'show');
  assert.equal(filled('text'), 'text');
  assert.equal(filled('hidden'), 'hidden');
  // Left in place, an unknown value would emit no rule and read as "as X shows it" anyway.
  // Dropping it to unset also lets an upper tier's setting come down as it should
  assert.equal(filled('none'), null);
  assert.equal(filled(true), null);
  assert.equal(filled(undefined), null);
  // The quote is read the same way, off the same list
  const quote = (v: unknown) => fillNode({ appearance: { quoteStyle: v } }).appearance.quoteStyle;
  assert.equal(quote('text'), 'text');
  assert.equal(quote('none'), null);
});

test('画像と動画の既定は「X の表示のまま」', () => {
  assert.equal(mediaStyleOf(null), 'show');
  assert.equal(mediaStyleOf('mark'), 'mark');
  assert.equal(mediaStyleOf(emptyNode().appearance.media.style), 'show');
});

test('前の形（collapse の真偽値）で保存された指定は「表示しない」として読む', () => {
  const style = (media: unknown) => fillNode({ appearance: { media } }).appearance.media.style;
  // Saved before the mark was added. Read as hiding, so it does not quietly come back on screen
  assert.equal(style({ collapse: true }), 'hidden');
  // "Show" was the same as unset then, and stays unset now
  assert.equal(style({ collapse: false }), null);
  // The new shape wins where both are there
  assert.equal(style({ collapse: true, style: 'mark' }), 'mark');
  assert.equal(style({ style: 'caption' }), 'caption');
  assert.equal(style({ style: 'そんな見せ方は無い' }), null);
});

test('カラムの無いサイトでは、カラム専用の指定を落とす', () => {
  const node = emptyNode().appearance;
  node.columnWidth = 320;
  node.colors.columnTitle = '#111111';
  node.colors.columnHeader = '#222222';
  // 落とすもの以外は残る。投稿単位の指定はサイトを問わず効く
  node.fontSize = 14;
  node.colors.background = '#333333';

  const out = withoutColumnItems(node);
  assert.equal(out.columnWidth, null);
  for (const key of COLUMN_COLORS) assert.equal(out.colors[key], null, key);
  assert.equal(out.fontSize, 14);
  assert.equal(out.colors.background, '#333333');
  // 元は変えない
  assert.equal(node.columnWidth, 320);
});

test('落とすのはカラム専用の 3 つだけ', () => {
  // 全項目に値を入れて、変わったものを数える。項目が増えたときの落とし過ぎを見張る
  const node = emptyNode().appearance;
  node.enabled = true;
  node.columnWidth = 320;
  node.compact = true;
  node.fontSize = 14;
  node.maxLines = 5;
  node.collapseNewlines = true;
  node.hideWhoToFollow = true;
  node.autoContrast = false;
  node.highlightBase = 'theme';
  node.timeFormat = 'absolute';
  node.cardStyle = 'mark';
  node.quoteStyle = 'hidden';
  node.media = { maxThumbHeight: 120, style: 'mark' };
  for (const key of Object.keys(node.colors) as (keyof typeof node.colors)[]) {
    node.colors[key] = '#123456';
  }

  const out = withoutColumnItems(node);
  const cleared = Object.keys(out).filter(
    (key) => out[key as keyof typeof out] !== node[key as keyof typeof node]
  );
  // colors は中身を差し替えるので、丸ごと別物になる。中身は下で数える
  assert.deepEqual(cleared.sort(), ['colors', 'columnWidth']);
  const clearedColors = Object.keys(out.colors).filter(
    (key) => out.colors[key as keyof typeof out.colors] === null
  );
  assert.deepEqual(clearedColors.sort(), [...COLUMN_COLORS].sort());
});
