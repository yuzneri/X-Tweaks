import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, type PaletteKind } from './palettes.ts';
import { DEFAULT_EMPHASIS_COLOR, DEFAULT_HIGHLIGHT_COLOR } from '../settings/schema.ts';

const KINDS = Object.keys(PALETTES) as PaletteKind[];

/** The six characters of colour, with any opacity on the end dropped */
const base = (color: string) => color.slice(0, 7);

/**
 * Where a colour sits on the wheel. Worked out here rather than shipped: the lists are
 * written in order by hand, and this is what checks the hand did not slip.
 */
const wheelOf = (color: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(color.slice(at, at + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const span = high - low;
  const light = (high + low) / 2;
  let hue = 0;
  if (span > 0) {
    hue =
      high === r
        ? (60 * (((g - b) / span) % 6) + 360) % 360
        : high === g
          ? 60 * ((b - r) / span + 2)
          : 60 * ((r - g) / span + 4);
  }
  return { hue, chroma: span === 0 ? 0 : span / (1 - Math.abs(2 * light - 1)), light };
};

/**
 * Whether a colour reads as a grey.
 *
 * Near black and near white count however much chroma the arithmetic finds: X's body text
 * `#0f1419` comes out at 210° off a few points between its channels, and sorted by that
 * it would land in the middle of the blues.
 */
const isGrey = (color: string) => {
  const { chroma, light } = wheelOf(color);
  return chroma < 0.2 || light < 0.12 || light > 0.88;
};

test('どの組も、同じ色を二度出さない', () => {
  for (const kind of KINDS) {
    assert.deepEqual([...new Set(PALETTES[kind])], PALETTES[kind], kind);
  }
});

test('どの組も #rrggbb か #rrggbbaa で書く', () => {
  // The value goes straight into the settings when a swatch is pressed, and the schema
  // (`hexColor` in settings/schema.ts) refuses anything else
  for (const kind of KINDS) {
    for (const color of PALETTES[kind]) {
      assert.match(color, /^#[0-9a-f]{6}([0-9a-f]{2})?$/, `${kind}: ${color}`);
    }
  }
});

test('地に敷く色は透け、文字と線は透けない', () => {
  // A ground that is opaque hides what is under it; a body color that is not is invisible
  for (const color of PALETTES.tint) assert.equal(color.length, 9, color);
  for (const color of PALETTES.strong) assert.equal(color.length, 9, color);
  for (const kind of ['text', 'line'] as const) {
    for (const color of PALETTES[kind]) assert.equal(color.length, 7, `${kind}: ${color}`);
  }
});

test('強調の組は、ハイライトの組より濃い', () => {
  const alpha = (color: string) => Number.parseInt(color.slice(7), 16);
  assert.ok(alpha(PALETTES.strong[0]!) > alpha(PALETTES.tint[0]!));
});

test('それぞれの既定の色は、その組から選べる', () => {
  // Otherwise the field opens showing a color the swatches cannot get back to
  assert.ok(PALETTES.tint.includes(DEFAULT_HIGHLIGHT_COLOR));
  assert.ok(PALETTES.strong.includes(DEFAULT_EMPHASIS_COLOR));
});

test('どの組も色相の順に並び、灰は暗い順に最後', () => {
  for (const kind of KINDS) {
    const colors = PALETTES[kind];
    const greyFrom = colors.findIndex(isGrey);
    const hues = colors.slice(0, greyFrom).map((color) => wheelOf(color).hue);
    const greys = colors.slice(greyFrom);
    // 色のあるものは色相の昇順
    assert.deepEqual(hues, [...hues].sort((a, b) => a - b), `${kind}: ${colors.join(' ')}`);
    // 灰はひとかたまりで最後に来て、暗い順
    for (const grey of greys) assert.ok(isGrey(grey), `${kind}: ${grey} が灰の並びに混ざっている`);
    const lights = greys.map((color) => wheelOf(color).light);
    assert.deepEqual(lights, [...lights].sort((a, b) => a - b), `${kind}: ${greys.join(' ')}`);
  }
});

test('ブランド以外の色は、どの組にも同じ顔ぶれで入る', () => {
  // 用途ごとに選び分けない、というのが要点。ある欄で見つけた色を次の欄でも探せる
  const shared = [
    '#7f1d1d',
    '#a16207',
    '#84cc16',
    '#2eb82e',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
    '#1e3a8a',
    '#6366f1',
    '#d946ef',
  ];
  for (const kind of KINDS) {
    const held = PALETTES[kind].map(base);
    for (const color of shared) assert.ok(held.includes(color), `${kind} に ${color} が無い`);
  }
});

test('緑の帯が、他の帯と同じ密度で埋まっている', () => {
  /*
   * 足す前は lime 84° の次が X の緑 160° で、その間 76° がまるごと空だった。
   * 他の帯は15〜20°刻みなので、そこだけ穴になっていた
   */
  const greens = PALETTES.tint
    .map((color) => wheelOf(color).hue)
    .filter((hue) => hue >= 70 && hue < 180)
    .sort((a, b) => a - b);
  assert.ok(greens.length >= 5, `緑からシアンの帯が ${greens.length} 色しかない`);
  for (const [at, hue] of greens.entries()) {
    if (at === 0) continue;
    assert.ok(hue - greens[at - 1]! <= 40, `${greens[at - 1]}° と ${hue}° の間が空いている`);
  }
});
