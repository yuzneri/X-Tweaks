import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeColors, pageColor } from './compose-colors.ts';
import { emptyNode, fillAll, SCHEMA_VERSION } from '../settings/schema.ts';

/** Built through the normalization, so nothing a test made up can slip past the schema */
const settingsOf = (stored: Record<string, unknown>) =>
  fillAll({ version: SCHEMA_VERSION, ...stored });

const withColor = (color: string) => ({ appearance: { colors: { composeBackground: color } } });

test('何も指定が無ければ、1件も出さない', () => {
  assert.deepEqual(composeColors(settingsOf({}), 'pro'), { colors: [], except: [] });
});

test('一番上の指定は、どのアカウントでもない1件として出る', () => {
  const { colors } = composeColors(settingsOf({ global: withColor('#111111') }), 'pro');
  assert.deepEqual(colors, [{ account: null, color: '#111111' }]);
});

test('アカウントが違う色を持てば、全体の後に続く', () => {
  // Both are one attribute selector, so the account's own has to come later to win
  const { colors } = composeColors(
    settingsOf({ global: withColor('#111111'), accounts: { yuzneri: withColor('#222222') } }),
    'pro'
  );
  assert.deepEqual(colors, [
    { account: null, color: '#111111' },
    { account: 'yuzneri', color: '#222222' },
  ]);
});

test('上と同じ色を繰り返すだけのアカウントは、行を増やさない', () => {
  const { colors } = composeColors(
    settingsOf({ global: withColor('#111111'), accounts: { yuzneri: withColor('#111111') } }),
    'pro'
  );
  assert.deepEqual(colors, [{ account: null, color: '#111111' }]);
});

test('アカウントだけが指定していれば、そのアカウントの1件だけ', () => {
  const { colors, except } = composeColors(
    settingsOf({ accounts: { yuzneri: withColor('#222222') } }),
    'pro'
  );
  assert.deepEqual(colors, [{ account: 'yuzneri', color: '#222222' }]);
  assert.deepEqual(except, []);
});

test('外観を止めたアカウントには、上から降りてくる色も届かせない', () => {
  /*
   * 全体の規則は「印が付いていれば何でも」に当たるので、そのアカウントを名指しで
   * 除かないと、外観を止めたのに投稿フォームだけ色が残る
   */
  const settings = settingsOf({
    global: withColor('#111111'),
    accounts: { off: { appearance: { enabled: false } } },
  });
  const { colors, except } = composeColors(settings, 'pro');
  assert.deepEqual(colors, [{ account: null, color: '#111111' }]);
  assert.deepEqual(except, ['off']);
});

test('上に色が無ければ、外観を止めていても除く相手はいない', () => {
  // Nothing is coming down, so there is nothing for the account to be kept out of
  const { except } = composeColors(
    settingsOf({ accounts: { off: { appearance: { enabled: false } } } }),
    'pro'
  );
  assert.deepEqual(except, []);
});

test('サイトが外観を止めれば、そのサイトでは投稿フォームの色を1行も書かない', () => {
  const settings = settingsOf({
    global: withColor('#111111'),
    accounts: { alice: {} },
    surfaces: { x: { appearance: { enabled: false } } },
  });
  // 止めた側には除く相手も要らない。そもそも規則が1行も無いので、除きようがない
  assert.deepEqual(composeColors(settings, 'x'), { colors: [], except: [] });
  // もう一方のサイトは素通り
  assert.deepEqual(composeColors(settings, 'pro').colors, [{ account: null, color: '#111111' }]);
});

test('アカウントが止めた外観をサイトが戻せば、そのサイトでは色が届く', () => {
  // 段の順番（サイトはアカウントより下）を、投稿フォームの側から縛る
  const settings = settingsOf({
    global: withColor('#111111'),
    accounts: { alice: { appearance: { enabled: false } } },
    surfaces: { x: { appearance: { enabled: true } } },
  });
  assert.deepEqual(composeColors(settings, 'x').except, []);
  // 戻していない側では、止めたままなので除いたまま
  assert.deepEqual(composeColors(settings, 'pro').except, ['alice']);
});

test('サイトの段は、アカウントが決めた色を上書きする', () => {
  /*
   * これが元々の要望そのもの。アカウントに付けた色は両方のサイトに届くので、
   * 片方で別の色にするにはサイトの段がアカウントに勝つ必要がある
   */
  const settings = settingsOf({
    accounts: { yuzneri: withColor('#222222') },
    surfaces: { x: withColor('#333333') },
  });
  // The account now resolves the same colour as everyone else, so it needs no line of its own
  assert.deepEqual(composeColors(settings, 'x').colors, [{ account: null, color: '#333333' }]);
  // The other site never saw it
  assert.deepEqual(composeColors(settings, 'pro').colors, [
    { account: 'yuzneri', color: '#222222' },
  ]);
});

test('サイトの段で打ち消せば、そのサイトの投稿フォームだけ色が付かない', () => {
  const settings = settingsOf({
    global: withColor('#111111'),
    accounts: { alice: {} },
    surfaces: { x: { appearance: { cleared: ['colors.composeBackground'] } } },
  });
  // 上から降りてくる色ごと消えるので、除く相手も要らない
  assert.deepEqual(composeColors(settings, 'x'), { colors: [], except: [] });
  assert.deepEqual(composeColors(settings, 'pro').colors, [{ account: null, color: '#111111' }]);
});

test('一方のアカウントだけ、そのサイトで打ち消せる', () => {
  const settings = settingsOf({
    accounts: { alice: withColor('#aa0000'), bob: withColor('#0000bb') },
    surfaceAccounts: { pro: { bob: { appearance: { cleared: ['colors.composeBackground'] } } } },
  });
  // On X Pro only bob loses it; alice keeps hers, and neither is touched on x.com
  assert.deepEqual(composeColors(settings, 'pro').colors, [{ account: 'alice', color: '#aa0000' }]);
  assert.deepEqual(composeColors(settings, 'x').colors, [
    { account: 'alice', color: '#aa0000' },
    { account: 'bob', color: '#0000bb' },
  ]);
});

test('掛け合わせの段で、片方のサイトだけ別の色にできる', () => {
  const settings = settingsOf({
    accounts: { alice: withColor('#aa0000') },
    surfaceAccounts: { pro: { alice: withColor('#00aa00') } },
  });
  assert.deepEqual(composeColors(settings, 'pro').colors, [{ account: 'alice', color: '#00aa00' }]);
  assert.deepEqual(composeColors(settings, 'x').colors, [{ account: 'alice', color: '#aa0000' }]);
});

test('掛け合わせにしか設定の無いアカウントも数える', () => {
  // The account is in no other map. Missed here, the general colour would go on painting
  // the form this setting exists to keep it off
  const settings = settingsOf({
    global: withColor('#111111'),
    surfaceAccounts: { pro: { bob: { appearance: { cleared: ['colors.composeBackground'] } } } },
  });
  assert.deepEqual(composeColors(settings, 'pro'), {
    colors: [{ account: null, color: '#111111' }],
    except: ['bob'],
  });
  // On the other site nothing is written for that account, so nothing is excluded either
  assert.deepEqual(composeColors(settings, 'x'), {
    colors: [{ account: null, color: '#111111' }],
    except: [],
  });
});

test('ページの背景は、画面に出ているビューの値', () => {
  const appearance = emptyNode().appearance;
  appearance.colors.pageBackground = '#14293d';
  assert.equal(pageColor([{ appearance }]), '#14293d');
});

test('ビューが1つも無ければ、ページの背景は未指定', () => {
  assert.equal(pageColor([]), null);
});
