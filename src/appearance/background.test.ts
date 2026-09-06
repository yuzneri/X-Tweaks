import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backgroundOver, type Within } from './background.ts';
import { layer, type Rgb, type Rgba } from './contrast.ts';

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const RED: Rgb = { r: 255, g: 0, b: 0 };

/** Half-opaque white, the shade X lays over a post to show it is being pointed at */
const VEIL: Rgba = { r: 255, g: 255, b: 255, a: 0.5 };
const SHADE: Rgba = { r: 0, g: 0, b: 0, a: 0.25 };

test('間に不透明な色があれば、その色が答え。後ろは関係ない', () => {
  const found: Within = { opaque: RED };
  assert.deepEqual(backgroundOver(found, WHITE), RED);
  assert.deepEqual(backgroundOver(found, BLACK), RED);
});

test('間に何も無ければ、後ろの色がそのまま出る', () => {
  assert.deepEqual(backgroundOver({ layers: [] }, RED), RED);
});

test('半透明の層は、後ろの色の上に重なる', () => {
  assert.deepEqual(backgroundOver({ layers: [VEIL] }, BLACK), layer(BLACK, VEIL));
});

test('層は手前から順に集められ、奥から順に重ねられる', () => {
  /*
   * `layersWithin` walks from the element outward, so the first thing it finds is the
   * frontmost. Compositing has to run the other way — the one furthest back goes on the
   * backdrop first — and getting that backwards still produces a plausible-looking colour,
   * which is why it is pinned here rather than left to the eye.
   */
  const front = VEIL;
  const back = SHADE;
  const expected = layer(layer(WHITE, back), front);
  assert.deepEqual(backgroundOver({ layers: [front, back] }, WHITE), expected);
  // The other order is a different colour, so the test above is actually saying something
  assert.notDeepEqual(backgroundOver({ layers: [back, front] }, WHITE), expected);
});
