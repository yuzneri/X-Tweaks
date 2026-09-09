/**
 * The appearance settings. Does not know which tier it belongs to — edits the appearance it is
 * handed and returns it. Every item can be put back to empty, returning to X Pro's own display.
 */
import {
  adjustsContrast,
  appearanceApplies,
  ATTACHMENT_STYLES,
  cardStyleOf,
  ACCOUNT_COLORS,
  collapsesNewlines,
  showsRawCounts,
  COLUMN_COLORS,
  emptyNode,
  HIGHLIGHT_BASES,
  highlightBaseOf,
  isCompact,
  MEDIA_STYLES,
  mediaStyleOf,
  quoteStyleOf,
  TIME_FORMATS,
  timeFormatOf,
  X_ONLY_COLORS,
  colorItem,
  type AppearanceNode,
  type ClearableItem,
} from '../settings/schema.ts';
import type { Messages } from '../i18n/index.ts';
import { BoolSelect, ChoiceSelect, ColorField, SizeField } from './fields.tsx';
import type { PaletteKind } from './palettes.ts';
import type { Site } from './ScopeList.tsx';
import { useMessages } from './messages.tsx';

/**
 * The color fields, grouped by what is painted (two backgrounds → four text colors → one
 * line, since backgrounds and text need different choices). Within a group, order follows
 * the screen top to bottom (bar → column, column name → author name → body → dim text → link).
 */
export const COLOR_ORDER = [
  'columnHeader',
  'background',
  'pageBackground',
  'composeBackground',
  'columnTitle',
  'name',
  'text',
  'meta',
  'link',
  'border',
] as const;

type ColorKey = (typeof COLOR_ORDER)[number];

/** Whether that color is column-only (`COLUMN_COLORS`) */
export const isColumnColor = (key: ColorKey): boolean => COLUMN_COLORS.includes(key);

/** Whether that color only means something on x.com (`X_ONLY_COLORS`) */
export const isXOnlyColor = (key: ColorKey): boolean => X_ONLY_COLORS.includes(key);

/**
 * Whether that color is answered by the account, not the scope on screen (`ACCOUNT_COLORS`).
 * Offered only on tiers covering whole accounts — set on a column, it would never be read.
 */
export const isAccountColor = (key: ColorKey): boolean => ACCOUNT_COLORS.includes(key);

/**
 * What each colour is for, deciding the swatches its picker offers (`ui/palettes.ts`).
 * Written by name, not derived from the key — nothing in the key says whether it is a ground,
 * text, or a line. Every ground takes the tints, being something the page shows through
 * whether behind a post or the whole page.
 */
const PALETTE_OF: Record<ColorKey, PaletteKind> = {
  columnHeader: 'tint',
  background: 'tint',
  pageBackground: 'tint',
  composeBackground: 'tint',
  columnTitle: 'text',
  name: 'text',
  text: 'text',
  meta: 'text',
  link: 'text',
  border: 'line',
};

/**
 * Whether that color belongs in the colors group, not the columns-only group (only X Pro has
 * columns). Fixed on every page — what changes is whether it is offered at all, a color the
 * page cannot apply being left out, not shown dead (`shownColor`).
 *
 * Only columns get their own group, since the width needs one anyway. A lone color needs
 * none: a word under its name (`colorNote`) sets it apart instead.
 */
const isPlainColor = (key: ColorKey): boolean => !isColumnColor(key);

/**
 * What is added under a color's name, where the name alone leaves a question.
 *
 * The background is one setting on both sites, though X Pro paints it inside a column and
 * x.com paints the timeline down the middle of the page; the note says so rather than the
 * name changing, which a reader moving between the two would have to relearn. The
 * outside-timeline row explains why it is not always there: only x.com has one. (The compose
 * form's row, left out on a column or view for belonging to neither, stands without a note.)
 */
const colorNote = (key: ColorKey, m: Messages): string | null =>
  key === 'background'
    ? m.appearance.colors.backgroundNote
    : key === 'pageBackground'
      ? m.appearance.colors.pageNote
      : null;

type Props = {
  node: AppearanceNode;
  onChange: (node: AppearanceNode) => void;
  /**
   * The value from a higher tier when this is left empty. Every field means "unset falls to
   * the tier above, and if that is unset too, to X Pro's own", so the dimmed value is the
   * effective value as far as resolvable.
   */
  inherited: AppearanceNode;
  /**
   * The same, with accounts folded in where this scope belongs to none of them (`settable`,
   * settings/resolve.ts). Read only to decide if an item's worth offering to reset — never
   * shown.
   */
  settable: AppearanceNode;
  /** Which site's settings these are (see `Site`) */
  site: Site;
  /**
   * Whether one column or view is being edited. Colors answered by the site, not the scope
   * (`ACCOUNT_COLORS`), are offered everywhere else but here: the compose form belongs to no
   * column and no view. Told apart from `site` since a site's own page is `pro`/`x` there
   * too, but its range is not a column.
   */
  oneColumn: boolean;
};

export const Appearance = ({
  node,
  onChange,
  inherited,
  settable: setAbove,
  site,
  oneColumn,
}: Props) => {
  const m = useMessages();
  /**
   * Whether the appearance applies here, as the effective value looking to the top. If not,
   * the value from above is not shown either — it'd read as in effect while switched off.
   */
  const applying = appearanceApplies(node.enabled ?? inherited.enabled);
  const above = applying ? inherited : emptyNode().appearance;
  // Switched off, nothing comes down, so nothing to offer cancelling
  const settable = applying ? setAbove : emptyNode().appearance;
  const patch = (part: Partial<AppearanceNode>) => onChange({ ...node, ...part });
  const colors = (part: Partial<AppearanceNode['colors']>) =>
    patch({ colors: { ...node.colors, ...part } });
  const media = (part: Partial<AppearanceNode['media']>) =>
    patch({ media: { ...node.media, ...part } });

  /** The list with that item taken off. Used wherever a value is written for it */
  const without = (item: ClearableItem) => node.cleared.filter((held) => held !== item);

  /**
   * The props for a field's "as X shows it" switch. `above` is an upper tier's value for
   * that item, taken from `settable`, not the dimmed value: a site's dimmed value stops at
   * global, while an account may be setting it, and cancelling that colour on one site is
   * the whole reason this switch exists (`settable`, resolve.ts). Passed in beside the row's
   * `inherited` so the two cannot diverge.
   */
  const clearing = (item: ClearableItem, above: string | number | null) => ({
    cleared: node.cleared.includes(item),
    clearable: above !== null,
    onCleared: (on: boolean) =>
      patch({ cleared: on ? [...without(item), item] : without(item) }),
  });

  /**
   * Writes one size, clearing the item's cancelled flag when a value goes in. Left on, the
   * two would disagree silently — `inherit` reads the value first, until the box empties
   * again and the item falls back to "as X shows it" instead of what is above.
   */
  const sizeChange =
    (item: ClearableItem, apply: (value: number | null) => Partial<AppearanceNode>) =>
    (value: number | null) =>
      patch({ ...apply(value), ...(value === null ? {} : { cleared: without(item) }) });

  /*
   * The column-only items, built here so one row serves both X Pro's tab and the shared
   * tiers' group
   */
  const columnWidthRow = (
    <label class="row">
      <span>{m.appearance.columnWidth}</span>
      <SizeField
        value={node.columnWidth}
        inherited={above.columnWidth}
        onChange={sizeChange('columnWidth', (columnWidth) => ({ columnWidth }))}
        label={m.appearance.columnWidth}
        {...clearing('columnWidth', settable.columnWidth)}
      />
    </label>
  );

  /**
   * Whether that color is offered here at all. Two are not always: the compose form belongs
   * to no column or view, so set on one it'd never be read; the outside-timeline page is
   * x.com's alone. Left out, not shown dead — the note under the name says where it works.
   */
  const shownColor = (key: ColorKey): boolean =>
    isPlainColor(key) &&
    !(oneColumn && isAccountColor(key)) &&
    !(site === 'pro' && isXOnlyColor(key));

  const colorRow = (key: ColorKey) => {
    const label = m.appearance.colors[key];
    const note = colorNote(key, m);
    // Tied to the box below, which has its own name and would otherwise shut the note out
    const noteId = note !== null ? `xpro-color-note-${key}` : undefined;
    return (
      <label class="row" key={key}>
        <span>
          {label}
          {note !== null && <small id={noteId}>{note}</small>}
        </span>
        <ColorField
          kind={PALETTE_OF[key]}
          value={node.colors[key]}
          onChange={(color) =>
            patch({
              colors: { ...node.colors, [key]: color },
              ...(color === null ? {} : { cleared: without(colorItem(key)) }),
            })
          }
          {...clearing(colorItem(key), settable.colors[key])}
          // When an upper tier sets it, that color appears in the swatch and dimmed text
          fallback={above.colors[key]}
          // Not a default but a color from above: traceable and changeable, so worded
          // differently
          fallbackInherited
          label={label}
          describedBy={noteId}
        />
      </label>
    );
  };

  return (
    <>
      {/*
        The only description always shown here: "empty keeps X Pro's own" applies to sizes
        and colors alike
      */}
      <p class="hint">{site === 'x' ? m.appearance.hintX : m.appearance.hint}</p>

      {/*
        Switches the appearance off entirely, like the filter's toggle. Off, nothing
        applies, upper tiers included
      */}
      <label class="row appearance-toggle">
        <span>{m.appearanceToggle.label}</span>
        <BoolSelect
          value={node.enabled}
          // Nothing set yet: show the value that actually applies
          // (`appearanceApplies`, schema.ts)
          effective={appearanceApplies(inherited.enabled)}
          onChange={(enabled) => patch({ enabled })}
          label={m.appearanceToggle.label}
          on={m.appearanceToggle.on}
          off={m.appearanceToggle.off}
          // The switch itself, not a display change: "apply" belongs on top
          onFirst
        />
      </label>

      {/*
        While off, say so — the fields below dim values from above, which would else look in
        effect
      */}
      {!applying && (
        <p class="hint">{m.appearanceToggle.stoppedHint}</p>
      )}

      {/*
        Non-color settings: sizes and how things are shown. Named by bracketing the contents,
        not enumerating them, so no heading has to be added each time something is added
      */}
      <fieldset>
        <legend>{m.appearance.legend}</legend>

        {/*
          Packs the posts: padding, avatar, reply/repost row. First of the timeline-wide
          items (the width stands above it on X Pro's tab, being the same kind of thing)
        */}
        <label class="row">
          <span>{m.appearance.compact}</span>
          <BoolSelect
            value={node.compact}
            // Unset: the value that actually applies (`isCompact`, schema.ts)
            effective={isCompact(above.compact)}
            onChange={(compact) => patch({ compact })}
            label={m.appearance.compact}
            on={m.appearance.compactOn}
            off={m.appearance.compactOff}
          />
        </label>

        <label class="row">
          <span>{m.appearance.fontSize}</span>
          <SizeField
            value={node.fontSize}
            inherited={above.fontSize}
            onChange={sizeChange('fontSize', (fontSize) => ({ fontSize }))}
            label={m.appearance.fontSize}
            {...clearing('fontSize', settable.fontSize)}
          />
        </label>

        <label class="row">
          <span>{m.appearance.maxLines}</span>
          <SizeField
            value={node.maxLines}
            inherited={above.maxLines}
            onChange={sizeChange('maxLines', (maxLines) => ({ maxLines }))}
            label={m.appearance.maxLines}
            unit={m.appearance.lines}
            {...clearing('maxLines', settable.maxLines)}
          />
        </label>

        {/*
          How much of what the extension writes into a post shows: a picture's description,
          a quoted post, a card's headline. Beside the body's own line limit — the same
          question about how much a post takes up
        */}
        <label class="row">
          <span>{m.appearance.wordsShown}</span>
          <SizeField
            value={node.wordsShown}
            inherited={above.wordsShown}
            onChange={sizeChange('wordsShown', (wordsShown) => ({ wordsShown }))}
            label={m.appearance.wordsShown}
            unit={m.appearance.characters}
            {...clearing('wordsShown', settable.wordsShown)}
          />
        </label>

        {/*
          Folds line breaks into a single space each. Under the line limit — both about how
          much room the body takes
        */}
        <label class="row">
          <span>{m.appearance.collapseNewlines}</span>
          <BoolSelect
            value={node.collapseNewlines}
            // Unset: the value that actually applies (schema.ts)
            effective={collapsesNewlines(above.collapseNewlines)}
            onChange={(collapseNewlines) => patch({ collapseNewlines })}
            label={m.appearance.collapseNewlines}
            on={m.appearance.collapseNewlinesOn}
            off={m.appearance.collapseNewlinesOff}
          />
        </label>

        {/*
          The counts under a post, written out rather than rounded — last of the
          post's-own-text items
        */}
        <label class="row">
          <span>{m.appearance.rawCounts}</span>
          <BoolSelect
            value={node.rawCounts}
            effective={showsRawCounts(above.rawCounts)}
            onChange={(rawCounts) => patch({ rawCounts })}
            label={m.appearance.rawCounts}
            on={m.appearance.rawCountsOn}
            off={m.appearance.rawCountsOff}
          />
        </label>

        {/*
          What hangs off a post from here down: photos/videos, cards, quotes — how much is
          worth showing
        */}
        <label class="row">
          <span>{m.appearance.media.style}</span>
          <ChoiceSelect
            value={node.media.style}
            // Unset keeps X Pro's own display (schema.ts)
            effective={mediaStyleOf(above.media.style)}
            options={MEDIA_STYLES}
            labels={m.appearance.media.styles}
            onChange={(style) => media({ style })}
            label={m.appearance.media.style}
          />
        </label>

        {/*
          How tall they are once shown, so it follows the setting that decides whether
          they are
        */}
        <label class="row">
          <span>{m.appearance.media.maxThumbHeight}</span>
          <SizeField
            value={node.media.maxThumbHeight}
            inherited={above.media.maxThumbHeight}
            onChange={sizeChange('media.maxThumbHeight', (maxThumbHeight) => ({
              media: { ...node.media, maxThumbHeight },
            }))}
            label={m.appearance.media.maxThumbHeight}
            {...clearing('media.maxThumbHeight', settable.media.maxThumbHeight)}
          />
        </label>

        <label class="row">
          <span>{m.appearance.cardStyle}</span>
          <ChoiceSelect
            value={node.cardStyle}
            // Unset keeps X Pro's own display (schema.ts)
            effective={cardStyleOf(above.cardStyle)}
            options={ATTACHMENT_STYLES}
            labels={m.appearance.attachmentStyles}
            onChange={(cardStyle) => patch({ cardStyle })}
            label={m.appearance.cardStyle}
          />
        </label>

        {/*
          A quoted post. Its own setting: a quote is somebody's words, not a preview of a link
        */}
        <label class="row">
          <span>{m.appearance.quoteStyle}</span>
          <ChoiceSelect
            value={node.quoteStyle}
            // Unset keeps X Pro's own display (schema.ts)
            effective={quoteStyleOf(above.quoteStyle)}
            options={ATTACHMENT_STYLES}
            labels={m.appearance.attachmentStyles}
            onChange={(quoteStyle) => patch({ quoteStyle })}
            label={m.appearance.quoteStyle}
          />
        </label>

        <label class="row">
          <span>{m.appearance.timeFormat}</span>
          <ChoiceSelect
            value={node.timeFormat}
            // Unset keeps X's own display (schema.ts)
            effective={timeFormatOf(above.timeFormat)}
            options={TIME_FORMATS}
            labels={m.appearance.timeFormats}
            onChange={(timeFormat) => onChange({ ...node, timeFormat })}
            label={m.appearance.timeFormat}
          />
        </label>

      </fieldset>

      <fieldset>
        <legend>{m.appearance.colors.legend}</legend>
        {/*
          Keeps X Pro's own when unset; the extension does not know the color used instead
          (fallback is null)
        */}
        {COLOR_ORDER.filter(shownColor).map(colorRow)}

        {/*
          Shifts text color only when a highlight or emphasis makes it unreadable. In the
          colors group since it is the same subject to the user, though it is a rule's color,
          not the tier's palette
        */}
        <label class="row">
          <span>{m.appearance.autoContrast}</span>
          <BoolSelect
            value={node.autoContrast}
            // Unset shows the value that actually applies, looking up to the top (schema.ts)
            effective={adjustsContrast(above.autoContrast)}
            onChange={(autoContrast) => onChange({ ...node, autoContrast })}
            label={m.appearance.autoContrast}
            on={m.appearance.autoContrastOn}
            off={m.appearance.autoContrastOff}
          />
        </label>

        {/*
          What a translucent highlight color is laid over. With a column background set, the
          default blends the two and ruins the hue, so this allows skipping it — placed after
          that field, since it only matters once it is set
        */}
        <label class="row">
          <span>
            {m.appearance.highlightBase}
          </span>
          <ChoiceSelect
            value={node.highlightBase}
            // Unset shows the value that actually applies, looking up to the top (schema.ts)
            effective={highlightBaseOf(above.highlightBase)}
            options={HIGHLIGHT_BASES}
            // The same name the color field above uses, so the two read as the one thing
            labels={m.appearance.highlightBases}
            onChange={(highlightBase) => onChange({ ...node, highlightBase })}
            label={m.appearance.highlightBase}
          />
        </label>
      </fieldset>

      {/*
        A column of X Pro: its width and its name's two colors. Kept in its own group even on
        X Pro's own pages, since folded into the groups above these three would sit in one
        place on X Pro's pages and another everywhere else. x.com has no columns, so left
        out, not shown dead
      */}
      {site !== 'x' && (
        <fieldset>
          <legend>{m.appearance.columnGroup.legend}</legend>
          <p class="hint">{m.appearance.columnGroup.hint}</p>
          {columnWidthRow}
          {COLOR_ORDER.filter(isColumnColor).map(colorRow)}
        </fieldset>
      )}

    </>
  );
};
