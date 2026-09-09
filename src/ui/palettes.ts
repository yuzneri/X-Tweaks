/**
 * The colours offered in the picker, grouped by what the field is for.
 *
 * One set per kind of field: a colour that suits one suits none of the others — a 15% tint
 * keeps text readable behind a highlight, but the same value as body text would be
 * invisible. Before this, every field was offered the highlight's eight tints, leaving text
 * and border fields with nothing usable. Each set holds the colours X itself uses, so a
 * choice never looks out of place, plus a shared row of hues X has none of, the same
 * wherever they appear so a colour found once can be found again — telling things apart,
 * above all which account a post is going out as, being the point of them.
 *
 * Every set runs in colour-wheel order, red round to pink, with greys at the end from dark
 * to light. Written out rather than sorted at run time, so a colour dropped into the wrong
 * place shows up in the diff (`palettes.test.ts` checks it holds). The trailing two digits
 * are the opacity: `26` is 15%, `66` is 40%.
 */

export type PaletteKind = 'tint' | 'strong' | 'text' | 'line';

export const PALETTES: Record<PaletteKind, string[]> = {
  /**
   * Every ground: behind a post, a column, the page, and over the compose form. All let what
   * is under them through, so all take the same tints.
   */
  tint: [
    '#7f1d1d26', // maroon
    '#ff7a0026', // orange (X)
    '#a1620726', // brown
    '#ffd40026', // yellow (X)
    '#84cc1626', // lime
    '#2eb82e26', // green
    '#22c55e26', // grass
    '#00ba7c26', // green (X, reposts)
    '#14b8a626', // teal
    '#06b6d426', // cyan
    '#1d9bf026', // blue (X, the standard accent)
    '#1e3a8a26', // navy
    '#6366f126', // indigo
    '#7856ff26', // purple (X)
    '#d946ef26', // fuchsia
    '#f9188026', // pink (X, likes)
    '#f4212e26', // red (X, warnings)
    '#71767b26', // grey (X, secondary text)
  ],

  /**
   * Laid over a few characters, not a whole post. At the tint's 15% the match cannot be
   * spotted, hence the 40% emphasis default against the highlight's 15%
   * (`DEFAULT_EMPHASIS_COLOR`, `settings/schema.ts`).
   */
  strong: [
    '#7f1d1d66', // maroon
    '#ff7a0066', // orange (X)
    '#a1620766', // brown
    '#ffd40066', // yellow (X)
    '#84cc1666', // lime
    '#2eb82e66', // green
    '#22c55e66', // grass
    '#00ba7c66', // green (X, reposts)
    '#14b8a666', // teal
    '#06b6d466', // cyan
    '#1d9bf066', // blue (X, the standard accent)
    '#1e3a8a66', // navy
    '#6366f166', // indigo
    '#7856ff66', // purple (X)
    '#d946ef66', // fuchsia
    '#f9188066', // pink (X, likes)
    '#f4212e66', // red (X, warnings)
    '#71767b66', // grey (X, secondary text)
  ],

  /**
   * Text and links: opaque, readable against a ground. X's own six are the ones a reader can
   * pick for links, so text already comes in them there. The red X warns in is left out,
   * belonging to a state, not a palette; plain body text and its greys close the list.
   */
  text: [
    '#7f1d1d', // maroon
    '#ff7a00', // orange (X)
    '#a16207', // brown
    '#ffd400', // yellow (X)
    '#84cc16', // lime
    '#2eb82e', // green
    '#22c55e', // grass
    '#00ba7c', // green (X)
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#1d9bf0', // blue (X)
    '#1e3a8a', // navy
    '#6366f1', // indigo
    '#7856ff', // purple (X)
    '#d946ef', // fuchsia
    '#f91880', // pink (X)
    '#0f1419', // body text on X's light theme
    '#71767b', // secondary text (X)
    '#ffffff', // body text on X's dark themes
  ],

  /**
   * The line between posts. X's own three are greys, so they sit at the end, one per theme
   * it offers
   */
  line: [
    '#7f1d1d', // maroon
    '#a16207', // brown
    '#84cc16', // lime
    '#2eb82e', // green
    '#22c55e', // grass
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#1e3a8a', // navy
    '#6366f1', // indigo
    '#d946ef', // fuchsia
    '#2f3336', // line on Lights out (X)
    '#38444d', // line on Dim (X)
    '#eff3f4', // line on Light (X)
  ],
};
