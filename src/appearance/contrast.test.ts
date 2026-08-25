import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLACK,
  MIN_CONTRAST,
  WHITE,
  contrastRatio,
  fixIfWorsened,
  layer,
  luminance,
  parseColor,
  parseCssColor,
  readableTextColor,
} from './contrast.ts';
import { DEFAULT_EMPHASIS_COLOR, DEFAULT_HIGHLIGHT_COLOR } from '../settings/schema.ts';

/** The backdrop and body-text colors of X's dark theme (measured in the real DOM) */
const DARK = { r: 0, g: 0, b: 0 };
const X_TEXT = { r: 231, g: 233, b: 234, a: 1 };

test('#rrggbb は不透明として読む', () => {
  assert.deepEqual(parseColor('#ffff00'), { r: 255, g: 255, b: 0, a: 1 });
  // Saved values are lowercased, but reading also accepts uppercase (`HEX_COLOR_PATTERN` allows it)
  assert.deepEqual(parseColor('#FFFF00'), { r: 255, g: 255, b: 0, a: 1 });
});

test('#rrggbbaa の末尾は不透明度（ARGB ではない）', () => {
  const color = parseColor('#f9188026');
  assert.equal(color?.r, 249);
  assert.equal(color?.b, 128);
  // 0x26 / 255 ≒ 0.15
  assert.ok(Math.abs((color?.a ?? 0) - 0.149) < 0.005);
});

test('読めない色は null（呼ぶ側が「触らない」に倒せる）', () => {
  assert.equal(parseColor(''), null);
  assert.equal(parseColor('#fff'), null);
  assert.equal(parseColor('red'), null);
  assert.equal(parseColor('rgb(0, 0, 0)'), null);
});

test('不透明な色を重ねると下地は見えない', () => {
  assert.deepEqual(layer({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 0, a: 1 }), {
    r: 255,
    g: 255,
    b: 0,
  });
});

test('透明な色を重ねても下地のまま', () => {
  assert.deepEqual(layer({ r: 12, g: 34, b: 56 }, { r: 255, g: 0, b: 0, a: 0 }), {
    r: 12,
    g: 34,
    b: 56,
  });
});

test('半透明は下地と混ざる', () => {
  // 50% white over black gives mid gray
  assert.deepEqual(layer(DARK, { r: 255, g: 255, b: 255, a: 0.5 }), { r: 128, g: 128, b: 128 });
});

test('重ねる順に呼べば3層になる', () => {
  const highlighted = layer(DARK, { r: 255, g: 255, b: 255, a: 0.5 });
  const emphasized = layer(highlighted, { r: 255, g: 255, b: 255, a: 0.5 });
  // Layered twice, so further from the backdrop than a single layer
  assert.equal(emphasized.r, 192);
});

test('相対輝度は白が1・黒が0', () => {
  assert.equal(luminance({ r: 255, g: 255, b: 255 }), 1);
  assert.equal(luminance(DARK), 0);
});

test('白と黒のコントラスト比は21', () => {
  assert.equal(contrastRatio({ r: 255, g: 255, b: 255 }, DARK), 21);
});

test('WCAG の既知の境界と一致する（係数や閾値の写し間違いを見つける）', () => {
  const white = { r: 255, g: 255, b: 255 };
  /*
   * #767676 is the well-known "darkest gray that still meets WCAG AA (4.5:1) on
   * white", while #777777 falls short. Values obvious from the formula (21, 1)
   * alone would not catch a mistyped coefficient.
   *
   * This is the one place 4.5 is written directly: it is the outside world's
   * threshold, separate from where the extension draws its line (`MIN_CONTRAST`).
   */
  assert.ok(contrastRatio({ r: 118, g: 118, b: 118 }, white) >= 4.5);
  assert.ok(contrastRatio({ r: 119, g: 119, b: 119 }, white) < 4.5);
});

test('同じ色どうしは1（順序を問わない）', () => {
  const color = { r: 90, g: 120, b: 150 };
  assert.equal(contrastRatio(color, color), 1);
  assert.equal(
    contrastRatio({ r: 255, g: 255, b: 255 }, DARK),
    contrastRatio(DARK, { r: 255, g: 255, b: 255 })
  );
});

test('既定のハイライト色では何も変えない（足りているときは触らない）', () => {
  const background = layer(DARK, parseColor(DEFAULT_HIGHLIGHT_COLOR)!);
  assert.equal(readableTextColor(background, X_TEXT), null);
});

test('既定の強調色でも、ハイライトに重なっても何も変えない', () => {
  const highlighted = layer(DARK, parseColor(DEFAULT_HIGHLIGHT_COLOR)!);
  const emphasized = layer(highlighted, parseColor(DEFAULT_EMPHASIS_COLOR)!);
  assert.equal(readableTextColor(emphasized, X_TEXT), null);
});

test('明るく不透明な色を敷くと黒に寄せる', () => {
  const background = layer(DARK, parseColor('#ffff00')!);
  assert.equal(readableTextColor(background, X_TEXT), BLACK);
});

test('暗く不透明な色なら白のまま（ダークテーマの文字色で足りる）', () => {
  const background = layer(DARK, parseColor('#000080')!);
  assert.equal(readableTextColor(background, X_TEXT), null);
});

test('明るい下地に白い文字なら白に寄せない', () => {
  // White text on a white background: short of the threshold, so it goes to black
  assert.equal(readableTextColor({ r: 255, g: 255, b: 255 }, X_TEXT), BLACK);
});

test('寄せ先は、白と黒のうちコントラストの大きいほう', () => {
  // Light text on a light background: black differs more than white
  const gray = { r: 128, g: 128, b: 128 };
  assert.equal(readableTextColor(gray, { r: 150, g: 150, b: 150, a: 1 }), BLACK);
  // Dark text on a dark background: white differs more
  const olive = { r: 90, g: 80, b: 20 };
  assert.equal(readableTextColor(olive, { r: 100, g: 100, b: 100, a: 1 }), WHITE);
});

test('どんな背景でも、白か黒のどちらかは基準を満たす（寄せ先に困らない）', () => {
  // The minimum is at the point where the white and black ratios are equal, and even
  // there it is 4.58:1. Even raising the threshold to 4.5 never leaves both short
  // (confirmed by calculation while implementing)
  let worst = Infinity;
  for (let r = 0; r <= 255; r += 15) {
    for (let g = 0; g <= 255; g += 15) {
      for (let b = 0; b <= 255; b += 15) {
        const color = { r, g, b };
        const best = Math.max(
          contrastRatio(color, { r: 255, g: 255, b: 255 }),
          contrastRatio(color, DARK)
        );
        worst = Math.min(worst, best);
      }
    }
  }
  assert.ok(worst >= MIN_CONTRAST, `最悪でも ${MIN_CONTRAST} 以上のはずが ${worst}`);
});

test('文字色が半透明なら、背景に重ねてから測る', () => {
  const background = layer(DARK, parseColor('#ffff00')!);
  // 10% black over yellow sinks into the yellow and cannot be read
  assert.equal(readableTextColor(background, { r: 0, g: 0, b: 0, a: 0.1 }), BLACK);
  // The same black is fine when opaque
  assert.equal(readableTextColor(background, { r: 0, g: 0, b: 0, a: 1 }), null);
});

test('文字色が分からないときは、背景に対して読める色を返す', () => {
  assert.equal(readableTextColor({ r: 255, g: 255, b: 0 }, null), BLACK);
  assert.equal(readableTextColor(DARK, null), WHITE);
});

test('測った色（rgb / rgba）を読む', () => {
  assert.deepEqual(parseCssColor('rgb(0, 0, 0)'), { r: 0, g: 0, b: 0, a: 1 });
  assert.deepEqual(parseCssColor('rgba(255, 0, 128, 0.5)'), { r: 255, g: 0, b: 128, a: 0.5 });
  // Transparent is read as alpha 0; no need to tell it apart from "has no background"
  assert.deepEqual(parseCssColor('rgba(0, 0, 0, 0)'), { r: 0, g: 0, b: 0, a: 0 });
});

test('新しい書き方（スペース区切り・%のアルファ）も読む', () => {
  assert.deepEqual(parseCssColor('rgb(10 20 30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(parseCssColor('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
});

test('読めない書き方は null（触らないに倒れる）', () => {
  assert.equal(parseCssColor('transparent'), null);
  assert.equal(parseCssColor('color(srgb 1 0 0)'), null);
  assert.equal(parseCssColor('oklch(0.7 0.1 200)'), null);
  assert.equal(parseCssColor('#ffffff'), null);
  assert.equal(parseCssColor(''), null);
});

test('既定のハイライト（15%）では、薄い文字も触らない', () => {
  // X's dim text only reaches 4.58:1 on black, and a faint wash drops it to 4.14.
  // Drawing the line at 4.5 would recolor it under the default color, so the line is 3:1
  const muted = { r: 113, g: 118, b: 123, a: 1 };
  const faint = layer(DARK, parseColor(DEFAULT_HIGHLIGHT_COLOR)!);
  assert.ok(contrastRatio(faint, { r: 113, g: 118, b: 123 }) < 4.5);
  assert.equal(fixIfWorsened(DARK, faint, muted), null);
});

test('白いハイライトの上では、本文を黒に寄せる', () => {
  const white = { r: 255, g: 255, b: 255 };
  // X's body color on white has a contrast of 1.22, which really is unreadable
  assert.ok(contrastRatio(white, { r: 231, g: 233, b: 234 }) < 1.5);
  assert.equal(fixIfWorsened(DARK, white, X_TEXT), BLACK);
});

test('元から足りない文字は、色を敷いても触らない（拡張の越権にしない）', () => {
  // Text with only 2:1 on black. Getting somewhat worse under a highlight is not the extension's doing
  const dim = { r: 60, g: 60, b: 60, a: 1 };
  assert.ok(contrastRatio(DARK, { r: 60, g: 60, b: 60 }) < 3);
  assert.equal(fixIfWorsened(DARK, layer(DARK, parseColor(DEFAULT_HIGHLIGHT_COLOR)!), dim), null);
});
