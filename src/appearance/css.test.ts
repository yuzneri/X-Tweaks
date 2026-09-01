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
  // The extension's own "Show more", put under a body the line limit cut off. It stands
  // in for X's own button, so the same color has to reach it
  assert.ok(line.includes('.xpro-more'));
  // The line put into a post in place of a card, which opens the card's address
  assert.ok(line.includes('a.xpro-attachment'));
  // A mark with nowhere to go is not a link and is left out
  assert.ok(!line.includes(' .xpro-attachment'));
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
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.media.style = 'hidden')) }]);
  for (const part of css.split('{')[0]!.split(',')) {
    // The condition for "no post opened" may follow the marker (see `OPENED_ATTR`)
    assert.match(
      part.trim(),
      /^\[data-xpro-column="0"\](:not\(\[data-xpro-opened\]\))? /,
      `${part.trim()} に印が無い`
    );
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
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.media.style = 'hidden')) }]);
  assert.match(css, /display: none !important/);
  // Hiding the box alone leaves the frame occupying space, so the frame is hidden too
  assert.ok(css.includes('[data-xpro-media]'));

  // An explicit false emits nothing (it expresses that an upper tier is not hiding it)
  const notEmitted = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.media.style = 'show')) }]);
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
  assert.ok(clampLine.startsWith('[data-xpro-column="0"]:not([data-xpro-opened]) [data-testid="tweetText"]'));
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

test('詰めと改行の解除は、既定では効かない', () => {
  // Unset and "do not" land on the same side: X Pro's own display. The two helpers in
  // schema.ts are the only place that decides it, so the wrong default would go unnoticed
  for (const value of [null, false] as const) {
    const css = cssOf([
      {
        key: '0',
        appearance: appearanceOf((a) => {
          a.compact = value;
          a.collapseNewlines = value;
        }),
      },
    ]);
    assert.equal(css, '', `${value} で規則が出ている`);
  }
});

test('詰めると、余白・アバター・アクションバーだけが変わる', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.compact = true)) }]);
  const lines = css.split('\n');

  // Every rule takes its bearings from the avatar's marker, not from X's generated class
  // names and not from where things sit in the tree
  const top = lines.find((line) => line.includes('padding-top: 2px'))!;
  assert.ok(top.includes('div:has(+ div > div > [data-testid="Tweet-User-Avatar"])'));
  // The band's own branch is zeroed, so the gap does not add up over however deeply it nests
  assert.ok(lines.some((line) => line.includes('[data-testid="Tweet-User-Avatar"]) * { padding-top: 0')));
  const bottom = lines.find((line) => line.includes('padding-bottom: 2px'))!;
  assert.ok(bottom.includes('div:has(> [data-testid="Tweet-User-Avatar"]) + div'));

  // The boxes inside the avatar carry sizes of their own, so they are made to follow
  const avatar = lines.find((line) => line.includes('width: 24px'))!;
  assert.match(avatar, /min-width: 24px !important; max-width: 24px !important/);
  const inside = lines.find((line) => line.includes('[data-testid="Tweet-User-Avatar"] * {'))!;
  assert.match(inside, /width: 100% !important/);
  // Some of them make their height out of padding, and that has to go for the size to take
  assert.match(inside, /padding-bottom: 0 !important/);

  // Packing says nothing about the line breaks: that is a setting of its own
  assert.equal(css.includes('white-space'), false);
});

test('詰めると、ボタンの行は消えずに名前の横へ浮く', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.compact = true)) }]);
  const lines = css.split('\n');

  // The row is told apart by the buttons it holds. Its aria-label is worded per language
  const bar = lines.find((line) => line.includes('position: absolute'))!;
  assert.ok(bar.includes('[role="group"]:has([data-testid="reply"])'));
  // Taken out of the flow, so the height it used to take is still saved
  assert.match(bar, /top: 0 !important/);
  // Left of the "…" that opens the post's menu
  assert.match(bar, /right: \d+px !important/);
  // Its height is left to the buttons, so they line up with the "…"
  assert.match(bar, /height: auto !important/);

  // The column beside the avatar becomes the base, and the containers in between give up theirs
  assert.ok(lines.some((line) => line.includes('+ div { position: relative')));
  const cleared = lines.find((line) => line.includes('position: static'))!;
  assert.ok(cleared.includes('div:has([role="group"])'));

  // Only the repost and the like are kept
  const hidden = lines.find((line) => line.includes('display: none'))!;
  assert.ok(hidden.includes(':not(:has([data-testid="retweet"]))'));
  assert.ok(hidden.includes(':not(:has([data-testid="like"]))'));
  // Written for both shapes: a button wrapped in a container, or sitting in the row directly
  assert.ok(hidden.includes(':not([data-testid="retweet"])'));

  // Room is made by pushing the "…", not by padding the name row (the "…" sits inside that row)
  const room = lines.find((line) => line.includes('margin-left'))!;
  assert.ok(room.includes('button[data-testid="caret"]'));
});

test('詰めると、X 自身の「さらに表示」も消える', () => {
  const packed = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.compact = true)) }]);
  const hidden = packed
    .split('\n')
    .find((line) => line.includes('tweet-text-show-more-link') && line.includes('display: none'))!;
  assert.ok(hidden, '詰めても X のボタンが残っている');
  // The column with a post opened keeps it: that post is there to be read
  assert.ok(hidden.includes(':not([data-xpro-opened])'));

  // Packing is the only thing that takes it away. A line limit alone must not: the button
  // is then the only way to reach the rest of a post X itself cut
  const limited = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.maxLines = 3)) }]);
  assert.equal(
    limited.split('\n').some((line) => line.includes('tweet-text-show-more-link') && line.includes('display: none')),
    false
  );
});

test('入れ子の :has() を書かない。規則ごと捨てられるため', () => {
  const css = cssOf([
    {
      key: '0',
      appearance: appearanceOf((a) => {
        a.compact = true;
        a.collapseNewlines = true;
        a.maxLines = 3;
      }),
    },
  ]);
  // `:has()` inside another `:has()` is invalid, and a browser throws away the whole rule
  // without a word. Every selector here leans on `:has()`, so the shape is checked
  for (const selector of css.split('\n').map((line) => line.slice(0, line.indexOf('{')))) {
    /** One entry per open parenthesis, saying whether it belongs to a `:has()` */
    const open: boolean[] = [];
    for (let i = 0; i < selector.length; i++) {
      if (selector[i] === '(') {
        const isHas = selector.slice(0, i).endsWith(':has');
        assert.ok(!(isHas && open.includes(true)), `${selector} で :has() が入れ子になっている`);
        open.push(isHas);
      } else if (selector[i] === ')') {
        open.pop();
      }
    }
  }
});

test('改行の解除は、詰めとは別に効く', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.collapseNewlines = true)) }]);
  // X keeps the breaks as newlines in the text and shows them with pre-wrap, so putting
  // white-space back folds each one into a single space
  assert.match(css, /white-space: normal !important/);
  // The spans inside the body carry styling of their own, so they are set alongside it
  assert.ok(css.includes('[data-testid="tweetText"] *'));
  // Nothing of the packing comes out
  assert.equal(css.includes('padding-top'), false);
  assert.equal(css.includes('display: none'), false);
});

test('ポストを開いているカラムでは、詰めも改行の解除も止まる', () => {
  const css = cssOf([
    {
      key: '0',
      appearance: appearanceOf((a) => {
        a.compact = true;
        a.collapseNewlines = true;
      }),
    },
  ]);
  // That column was opened to read and to reply. Hiding the buttons there would take away
  // the reply and the like on the very post that was opened
  for (const line of css.split('\n')) {
    assert.ok(
      line.startsWith('[data-xpro-column="0"]:not([data-xpro-opened])'),
      `${line} が開いているカラムでも当たってしまう`
    );
  }
});

test('引用は「X の表示のまま」以外で、印を付けたものだけを消す', () => {
  for (const quoteStyle of ['text', 'mark', 'hidden'] as const) {
    const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.quoteStyle = quoteStyle)) }]);
    // Which element is the quote frame is decided in `appearance/apply.ts` and marked
    // there: the avatar inside it not being the author's cannot be put into a selector
    assert.match(out, /\[data-xpro-card-moved\] \{ display: none !important; \}/);
  }
  const shown = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.quoteStyle = 'show')) }]);
  assert.equal(shown, '');
});

test('ポストを開いているカラムでは、カードも画像も消えない', () => {
  // The post was opened to be read. Taking its card or its photos away there would hide
  // the very thing that was opened
  for (const patch of [
    (a: AppearanceNode) => (a.cardStyle = 'hidden'),
    (a: AppearanceNode) => (a.cardStyle = 'text'),
    (a: AppearanceNode) => (a.cardStyle = 'mark'),
    (a: AppearanceNode) => (a.media.style = 'hidden'),
    (a: AppearanceNode) => (a.media.style = 'mark'),
    (a: AppearanceNode) => (a.quoteStyle = 'hidden'),
  ]) {
    const css = cssOf([{ key: '0', appearance: appearanceOf(patch) }]);
    for (const line of css.split('\n')) {
      assert.ok(
        line.startsWith('[data-xpro-column="0"]:not([data-xpro-opened])'),
        `${line} が開いているカラムでも当たってしまう`
      );
    }
  }
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

/* --- Link cards and articles --- */

test('「X の表示のまま」なら、カードの規則を出さない', () => {
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.cardStyle = 'show')) }]);
  assert.equal(out.includes('card.wrapper'), false);
  assert.equal(out.includes('article-cover-image'), false);
});

test('「表示しない」は、カードと記事を枠ごと消す', () => {
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.cardStyle = 'hidden')) }]);
  assert.match(out, /\[data-testid="card\.wrapper"\][^{]*, [^{]*div:has\(> \[data-testid="article-cover-image"\]\) \{ display: none/);
});

test('画像と動画の「マークだけ」は、マークを入れた投稿のぶんだけ隠す', () => {
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.media.style = 'mark')) }]);
  const hidden = out.split('\n').find((line) => line.includes('tweetPhoto'))!;
  assert.match(hidden, /\{ display: none !important; \}$/);
  assert.match(hidden, /videoPlayer/);
  // Confined to the marked posts. Column-wide, a post with no body to mark would lose
  // its photos with nothing said about them
  for (const target of hidden.split(', ')) assert.match(target, /\[data-xpro-media-marked\] /);
});

test('カードの指定は、画像と動画には触れない', () => {
  for (const cardStyle of ['text', 'mark', 'hidden'] as const) {
    const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.cardStyle = cardStyle)) }]);
    assert.equal(out.includes('tweetPhoto'), false, `${cardStyle} が画像に触れている`);
  }
});

test('「本文の中に文字で」は、本文へ移したカードだけを消す', () => {
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.cardStyle = 'text')) }]);
  // Moving is `appearance/apply.ts`'s job. Hiding every card instead would take the link
  // with it wherever there was no body to move the text into
  assert.match(out, /\[data-xpro-card-moved\] \{ display: none !important; \}/);
});

test('アンケートとカルーセルはカードの指定から外れる。card.wrapper を共有しているため', () => {
  // The other styles move the cards instead of naming them here, and `appearance/apply.ts`
  // looks them up through the same `LINK_CARD`, so the exclusion holds there too
  const out = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.cardStyle = 'hidden')) }]);
  const lines = out.split('\n').filter((line) => line.includes('card.wrapper'));
  assert.ok(lines.length > 0);
  for (const line of lines) {
    assert.match(line, /:not\(:has\(\[data-testid="cardPoll"\]\)\):not\(:has\(\[data-testid="Carousel-NavRight"\]\)\)/);
  }
});

test('おすすめユーザーを隠すと、見出しからさらに表示までのセルが消える', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.hideWhoToFollow = true)) }]);
  const cells = css
    .split('\n')
    .filter((line) => line.startsWith(`[${COLUMN_ATTR}="0"] [data-testid="cellInnerDiv"]`));
  // The three cells the block is made of: the "Show more", the accounts, the heading
  assert.equal(cells.length, 1);
  const [selectors, body] = cells[0]!.split(' { ');
  assert.equal(body, 'display: none !important; }');
  assert.equal(selectors!.split(', ').length, 3);
  // Every one of them is tied to the link that closes the block, so a list of accounts
  // standing for anything else is left alone
  for (const selector of selectors!.split(', ')) {
    assert.match(selector, /a\[href\*="\/i\/connect_people"\]/);
  }
});

test('おすすめユーザーを隠す指定は、x.com の横の欄にも及ぶ', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.hideWhoToFollow = true)) }]);
  // The rail belongs to no view and carries no marker, so this one rule stands outside
  // the column's. On X Pro there is no such rail and it matches nothing
  assert.match(
    css,
    /^\[data-testid="sidebarColumn"\] div:has\(> div > aside \[data-testid="UserCell"\]\) \{ display: none !important; \}$/m
  );
  // Unset writes neither
  const off = cssOf([{ key: '0', appearance: emptyNode().appearance }]);
  assert.equal(off.includes('sidebarColumn'), false);
});

test('おすすめユーザーは、ポストを開いているカラムでも消える', () => {
  const css = cssOf([{ key: '0', appearance: appearanceOf((a) => (a.hideWhoToFollow = true)) }]);
  // Unlike the media and the cards, this block is not what the post was opened for
  assert.equal(css.includes(':not([data-xpro-opened])'), false);
});

test('横の欄の規則は、カラムがいくつあっても1行しか出ない', () => {
  const hiding = appearanceOf((a) => (a.hideWhoToFollow = true));
  const css = cssOf([
    { key: '0', appearance: hiding },
    { key: '1', appearance: hiding },
  ]);
  // It belongs to no column, so `columnRules` is not where it comes from
  const lines = css.split('\n').filter((line) => line.includes('sidebarColumn'));
  assert.equal(lines.length, 1);
});
