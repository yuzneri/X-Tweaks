import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyNode, type AppearanceNode } from '../settings/schema.ts';
import { buildCss, columnKey, COLUMN_ATTR } from './css.ts';

const appearanceOf = (patch: (a: AppearanceNode) => void): AppearanceNode => {
  const appearance = emptyNode().appearance;
  patch(appearance);
  return appearance;
};

/** The parentheses used by "both" come from the dictionary; the Japanese ones are used here */
const cssOf = (columns: Parameters<typeof buildCss>[0]): string =>
  buildCss(columns, { open: '(', close: ')' });

test('何も指定していなければ、1行も出さない', () => {
  assert.equal(cssOf([{ key: '0', appearance: emptyNode().appearance }]), '');
});

test('指定した項目だけが出る', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.background = '#112233')) }]);
  const lines = css.split('\n');
  // The background is laid on the column and the tab bar is repainted in the same color
  // (so posts scrolling underneath do not show through). The black backdrop under
  // avatars is made transparent so it is not left behind
  assert.equal(lines[0], `[${COLUMN_ATTR}="0"] { background-color: #112233 !important; }`);
  assert.match(lines[1]!, /\[role="tablist"\]/);
  assert.match(lines[2]!, /UserAvatar-Container/);
  assert.equal(lines.length, 3);
});

test('どの指定にも !important を付ける。X が要素に直に当てているため', () => {
  const css = cssOf(
    [
      {
        key: '1',
        appearance: appearanceOf((a) => {
          a.columnWidth = 400;
          a.fontSize = 16;
          a.colors.text = '#ffffff';
          a.colors.link = '#1d9bf0';
          a.colors.border = '#333333';
          a.media.maxThumbHeight = 200;
        }),
      },
    ]);
  const lines = css.split('\n');
  assert.ok(lines.length > 0);
  for (const line of lines) assert.match(line, /!important/, `${line} に !important が無い`);
});

test('カラムごとに、その並び順の印だけに当たる', () => {
  const css = cssOf(
    [
      { key: '0', appearance: appearanceOf((a) => (a.colors.background = '#111111')) },
      { key: '2', appearance: appearanceOf((a) => (a.colors.background = '#222222')) },
    ]);
  assert.match(css, /\[data-xpro-column="0"\] \{ background-color: #111111/);
  assert.match(css, /\[data-xpro-column="2"\] \{ background-color: #222222/);
  // Nothing is emitted for a column with no settings (1)
  assert.equal(css.includes('data-xpro-column="1"'), false);
});

test('幅は3つとも押さえる。X Pro 側も幅を指定するため', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.columnWidth = 350)) }]);
  for (const part of ['width: 350px', 'min-width: 350px', 'max-width: 350px']) {
    assert.ok(css.includes(part), `${part} が無い`);
  }
});

test('リンクの色は、本文の外のリンクと「さらに表示」にも当たる', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.link = '#00aaff')) }]);
  const line = css.split('\n').find((line) => line.includes('#00aaff'))!;
  // Links inside the body text
  assert.ok(line.includes('[data-testid="tweetText"] a'));
  // "Show more" is a button rather than an a, so it is picked up by its marker
  assert.ok(line.includes('[data-testid="tweet-text-show-more-link"]'));
  // The @IDs of reply targets and card URLs: a elements where X writes the link color inline
  assert.ok(line.includes('a[style*="color: rgb(29, 155, 240)"]'));
});

test('薄い文字は、X が要素に直に書いている色で選ぶ', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.meta = '#888888')) }]);
  // The dark theme's color. Class names change every time, so the color value is the
  // only thing to select on (confirmed in the real DOM)
  const mutedLine = css.split('\n').find((line) => line.includes('#888888'))!;
  assert.ok(mutedLine.includes('[data-xpro-column="0"] [style*="color: rgb(113, 118, 123)"]'));
  // Icons go back to their original color: they live in the same container as the
  // counts and would otherwise be painted along with them
  assert.match(css, /\[style\*="color: rgb\(113, 118, 123\)"\] svg \{ color: rgb\(113, 118, 123\) !important/);
});

test('本文の色より後に薄い文字の色を置く。名前の欄には両方が混ざっているため', () => {
  const css = cssOf(
    [
      {
        key: '0',
        appearance: appearanceOf((a) => {
          a.colors.text = '#ffffff';
          a.colors.meta = '#888888';
        }),
      },
    ]);
  assert.ok(css.indexOf('#888888') > css.indexOf('#ffffff'));
});

test('カラム名は見出しの h1 に当てる', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.columnTitle = '#00ff00')) }]);
  assert.match(css, /\[data-xpro-column="0"\] \[data-testid="column-title-wrapper"\] h1 \{ color: #00ff00/);
});

test('タブの帯は、タブが入っている一覧だけに当てる', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.background = '#204060')) }]);
  // X uses the same component for the horizontal lists of several images. Without the
  // condition, the area beside those images gets painted too
  assert.match(css, /\[role="tablist"\]:has\(\[role="tab"\]\)/);
  assert.ok(!/\[role="tablist"\](?!:has)/.test(css), 'タブの条件が付いていない当て先がある');
});

test('背景を敷いたら、アイコンの下地を透かす', () => {
  // X lays a black square under avatars. Coloring the background leaves that square behind
  const background = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.background = '#204060')) }]);
  assert.match(background, /\[data-testid\^="UserAvatar-Container"\] div \{ background-color: transparent !important; \}/);
  const header = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.columnHeader = '#123456')) }]);
  assert.match(header, /UserAvatar-Container/);
  // Nothing happens when no color is laid down
  const unset = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.text = '#ffffff')) }]);
  assert.ok(!unset.includes('UserAvatar-Container'));
});

test('タブの帯はカラムの背景に合わせ、カラム名の帯より後に置く', () => {
  const css = cssOf(
    [
      {
        key: '0',
        appearance: appearanceOf((a) => {
          a.colors.background = '#204060';
          a.colors.columnHeader = '#123456';
        }),
      },
    ]);
  const tabLine = css.split('\n').find((line) => line.includes('[role="tablist"]'))!;
  assert.match(tabLine, /background-color: #204060 !important/);
  // Even with a bar color set, the tab bar follows the column background (placed later so it wins)
  assert.ok(css.indexOf('[role="tablist"]') > css.indexOf('column-title-wrapper'));
});

test('帯の色を敷いたら、帯の中の入れ物は透かす', () => {
  // Only one layer is painted, so an opaque container inside would stack on top and hide the color
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.columnHeader = '#123456')) }]);
  const transparentLine = css.split('\n').find((line) => line.includes('transparent'))!;
  assert.ok(transparentLine.includes('[data-xpro-header] div:has([data-testid="column-title-wrapper"])'));
  assert.ok(transparentLine.includes('[data-xpro-header] [data-testid="column-title-wrapper"]'));
  // Nothing is made transparent when no color is laid down
  const unset = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.text = '#ffffff')) }]);
  assert.ok(!unset.includes('transparent'));
});

test('カラム名の帯は、印を付けた1枚だけに敷く', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.columnHeader = '#123456')) }]);
  // Several nested containers match the condition. Painting all of them makes a color
  // with opacity darker further in, so choosing the bar is left to the side that sets
  // the marker (appearance/apply.ts) and the CSS paints exactly one
  assert.match(css, /\[data-xpro-column="0"\] \[data-xpro-header\] \{ background-color: #123456 !important; \}/);
});

test('当て先が複数あっても、すべてカラムの印の中に閉じ込める', () => {
  // Forgetting the marker at the front would make that rule affect every column
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.media.collapse = true)) }]);
  for (const part of css.split('{')[0]!.split(',')) {
    assert.match(part.trim(), /^\[data-xpro-column="0"\] /, `${part.trim()} に印が無い`);
  }
});

test('画像の高さの上限は、中の img ではなく箱に当てる', () => {
  // Images in a column are not necessarily img elements, and the outer box is what
  // sets the size (confirmed in the real DOM)
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.media.maxThumbHeight = 120)) }]);
  const heightLine = css.split('\n').find((line) => line.includes('max-height'))!;
  for (const box of ['tweetPhoto', 'videoPlayer', 'videoComponent']) {
    assert.ok(heightLine.includes(`[data-xpro-column="0"] [data-testid="${box}"]`), `${box} が当て先に無い`);
  }
  // Without hiding the overflow, an image spilling out of the box overlaps the post below
  assert.match(heightLine, /max-height: 120px !important; overflow: hidden !important;/);

  // Shrinking the box alone leaves the frame occupying its original space, so a marked
  // frame gets its height replaced outright
  const frameLine = css.split('\n').find((line) => line.includes('data-xpro-media'))!;
  assert.ok(frameLine.startsWith('[data-xpro-column="0"] [data-xpro-media]'), '外枠がカラムの印の外にある');
  assert.match(frameLine, /height: 120px !important/);
  // Unless both mechanisms creating the height are removed, the frame keeps its space
  assert.match(frameLine, /padding-bottom: 0 !important/);
  assert.match(frameLine, /aspect-ratio: auto !important/);
  // The frame's contents shrink along with it, so the rounded corners of the inner
  // container are not cut off
  assert.match(css, /\[data-xpro-media\] \* \{ max-height: 100% !important; \}/);
  // Only where there is an img inside, keep the aspect ratio intact while cropping
  assert.match(css, /\[data-testid="tweetPhoto"\] img \{ object-fit: cover !important; \}/);
});

test('メディアの折りたたみは隠すだけ。要素は残す', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.media.collapse = true)) }]);
  assert.match(css, /display: none !important/);
  // Hiding the box alone leaves the frame occupying space, so the frame is hidden too
  assert.ok(css.includes('[data-xpro-media]'));

  // An explicit false emits nothing (it expresses that an upper tier is not hiding it)
  const notEmitted = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.media.collapse = false)) }]);
  assert.equal(notEmitted, '');
});



test('本文と名前は別々の当て先に当てる', () => {
  const textOnly = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.text = '#ffcc00')) }]);
  assert.match(textOnly, /\[data-xpro-column="0"\] \[data-testid="tweetText"\] \{ color: #ffcc00/);
  assert.ok(!textOnly.includes('User-Name'));

  const nameOnly = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.colors.name = '#00ccff')) }]);
  assert.match(nameOnly, /\[data-xpro-column="0"\] \[data-testid="User-Name"\] span \{ color: #00ccff/);
  assert.ok(!nameOnly.includes('tweetText'));
});

test('本文の行数の上限は、画面上の行で切る', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.maxLines = 3)) }]);
  const clampLine = css.split('\n').find((line) => line.includes('-webkit-line-clamp: 3'))!;
  // Columns with a post opened (the ones with the reply input box) are excluded
  assert.ok(clampLine.startsWith('[data-xpro-column="0"]:not(:has([data-testid="tweetTextarea_0"])) [data-testid="tweetText"]'));
  // Both Chrome and Firefox work with the -webkit- prefix. The standard spelling is written alongside
  assert.match(clampLine, /-webkit-line-clamp: 3 !important/);
  assert.match(clampLine, /display: -webkit-box !important/);
  // Cutting by height would clip characters when emoji make a line taller, so height is not used
  assert.ok(!clampLine.includes('max-height'));
  // As a flex child, -webkit-box is cancelled out, so the wrapping container is put back to block
  const parentLine = css.split('\n').find((line) => line.includes(':has(> [data-testid="tweetText"])'))!;
  assert.match(parentLine, /display: block !important/);

  // The limit is lifted only for posts opened via "Show more"
  const openedLine = css.split('\n').find((line) => line.includes('xpro-lines-open'))!;
  assert.match(openedLine, /-webkit-line-clamp: none !important/);
});

test('行数の上限は、引用の中の本文には当てない', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.maxLines = 3)) }]);
  const clampLine = css.split('\n').find((line) => line.includes('-webkit-line-clamp: 3'))!;
  // A quote is part of the quoting post; clamping it separately clamps twice
  assert.ok(clampLine.includes(':not([role="link"] [data-testid="tweetText"])'));
});

test('展開の規則は、上限の規則より強くする', () => {
  // `:not()` carries the specificity of its contents. Dropping the condition lets the
  // limit win and the post stays closed when pressed
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.maxLines = 3)) }]);
  const openedLine = css.split('\n').find((line) => line.includes('xpro-lines-open [data-testid'))!;
  assert.ok(openedLine.includes(':not([role="link"] [data-testid="tweetText"])'));
  assert.match(openedLine, /max-height: none !important/);
});

test('当て先の鍵は、解決できた一番細かい段で決まる', () => {
  // Down to the column, the key is the column's
  assert.equal(columnKey({ account: 'alice', columnId: 'col-1' }), 'c:col-1');
  // Even without a columnId, the account tier's appearance should still apply
  assert.equal(columnKey({ account: 'alice', columnId: null }), 'a:alice');
  // With neither, the global tier still applies. Without a marker there would be nothing to target
  assert.equal(columnKey({ account: null, columnId: null }), 'g');
});

test('鍵から、属性セレクタを壊す字を落とす', () => {
  // Both are alphanumeric in practice, but that is not assumed
  assert.equal(columnKey({ account: null, columnId: 'a"b\\c' }), 'c:abc');
});

test('鍵ごとに規則を書き分ける', () => {
  const css = cssOf([
    { key: 'c:col-1', appearance: appearanceOf((a) => (a.columnWidth = 400)) },
    { key: 'a:alice', appearance: appearanceOf((a) => (a.columnWidth = 300)) },
  ]);
  assert.ok(css.includes(`[${COLUMN_ATTR}="c:col-1"] { width: 400px`));
  assert.ok(css.includes(`[${COLUMN_ATTR}="a:alice"] { width: 300px`));
});

/* --- How the time is shown --- */

test('「X の表示のまま」なら、時刻の規則を出さない', () => {
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.timeFormat = 'relative')) }]);
  assert.equal(out.includes('data-xpro-time'), false);
});

test('「日付と時刻」は、X の time を隠して印を出す', () => {
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.timeFormat = 'absolute')) }]);
  assert.match(out, /\[data-xpro-time\]::after \{ content: attr\(data-xpro-time\)/);
  assert.match(out, /\[data-xpro-time\] > time \{ display: none/);
});

test('「両方」で今日の投稿は、X の time を括弧で囲んで残す', () => {
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.timeFormat = 'both')) }]);
  assert.match(out, /\[data-xpro-today\]::before \{ content: attr\(data-xpro-time\) '\('/);
  assert.match(out, /\[data-xpro-today\]::after \{ content: '\)'/);
});

test('「両方」で今日でない投稿は、日付だけにして相対を隠す', () => {
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.timeFormat = 'both')) }]);
  assert.match(out, /:not\(\[data-xpro-today\]\)::after \{ content: attr\(data-xpro-time\)/);
  assert.match(out, /:not\(\[data-xpro-today\]\) > time \{ display: none/);
});

test('括弧に引用符が入っていても規則が壊れない', () => {
  const out = buildCss(
    [{ key: '0', appearance: appearanceOf((a) => (a.timeFormat = 'both')) }],
    { open: "it's", close: ')' }
  );
  assert.match(out, /content: attr\(data-xpro-time\) 'it\\'s'/);
});
