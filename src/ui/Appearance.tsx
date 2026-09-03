/**
 * The appearance settings. It does not know which tier it belongs to; it edits the
 * appearance it was handed and returns it. Every item can be put back to empty, which returns it to X Pro's own display.
 */
import {
  adjustsContrast,
  appearanceApplies,
  ATTACHMENT_STYLES,
  cardStyleOf,
  ACCOUNT_COLORS,
  collapsesNewlines,
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
 * The order of the color fields, grouped by the kind of thing painted (two backgrounds →
 * four text colors → one line). Backgrounds and text call for different color choices, so ones alike in nature sit together.
 * Within a group the order follows the screen, top to bottom (bar → column, column name → author name → body → dim text → link).
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

/** Whether that color is one of the column-only ones (`COLUMN_COLORS`, named beside the shape) */
export const isColumnColor = (key: ColorKey): boolean => COLUMN_COLORS.includes(key);

/** Whether that color only means something on x.com (`X_ONLY_COLORS`) */
export const isXOnlyColor = (key: ColorKey): boolean => X_ONLY_COLORS.includes(key);

/**
 * Whether that color is answered by the account rather than by the scope on screen
 * (`ACCOUNT_COLORS`). Those are offered on the tiers that cover whole accounts and
 * nowhere else: set on a column they would never be read.
 */
export const isAccountColor = (key: ColorKey): boolean => ACCOUNT_COLORS.includes(key);

/**
 * What each colour is for, which decides the swatches its picker offers
 * (`ui/palettes.ts`). Written out by name rather than derived from the key: "is this a
 * ground, a piece of text or a line" is a fact about the thing painted, and nothing in
 * the key says it.
 *
 * Every ground takes the tints. A ground is something the page shows through, whether it
 * is laid behind a post or behind the whole page, so one set covers them all.
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
 * Whether that color belongs in the colors group rather than in the one named after the
 * columns, which only X Pro has.
 *
 * The same answer on every page: a color never moves from one group to another with the
 * page it is read on. What does change is whether it is offered at all, and a color the
 * page cannot apply is left out rather than shown dead (`shownColor`).
 *
 * Only the columns get a group of their own, and only because the width goes in it too —
 * a size among the colors would need a group anyway. A lone color needs no group: what
 * sets it apart is a word under its name (`colorNote`), which is how the compose form's
 * and the page outside the timeline's are handled.
 */
const isPlainColor = (key: ColorKey): boolean => !isColumnColor(key);

/**
 * What is added under a color's name, where the name alone leaves a question.
 *
 * The background is one setting called by one name on both sites, although X Pro paints it
 * inside a column and x.com paints the timeline down the middle of the page. The note says
 * so on every page rather than the name changing with the page, which is what a reader
 * moving between the two of them has to relearn.
 *
 * The page outside the timeline says why its row is not always there: x.com alone has one.
 * (The compose form's row is left out on a column or a view for its own reason — it belongs
 * to neither — and stands without a note.)
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
   * The value that comes down from a higher tier when this is left empty.
   * Every field means "unset falls to the tier above, and if that is unset too, to X Pro's own",
   * so what is shown dimmed is the effective value as far as it can be resolved.
   */
  inherited: AppearanceNode;
  /**
   * The same, with the accounts folded in where this scope belongs to none of them
   * (`settable` in settings/resolve.ts). Read only to decide whether an item is worth
   * offering to put back to X's own display — never shown.
   */
  settable: AppearanceNode;
  /** Which site's settings these are (see `Site`) */
  site: Site;
  /**
   * Whether what is being edited is one column or view.
   *
   * The colors answered as far down as the site rather than by the scope on screen
   * (`ACCOUNT_COLORS`) are offered everywhere else and not here: the form a post is
   * written in belongs to no column and no view, so set on one it would never be read.
   * Told apart from `site` because a site's own page is that site's — so `site` is `pro`
   * or `x` there, the same as on a column of it — while the range it covers is not a column.
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
   * Whether the appearance applies in this scope, as the effective value looking up to the top.
   * If it does not, the value coming from above is not shown either: the dimmed value means
   * "what applies if this stays empty", and showing it where it is switched off would read as in effect.
   */
  const applying = appearanceApplies(node.enabled ?? inherited.enabled);
  const above = applying ? inherited : emptyNode().appearance;
  // Switched off here, nothing comes down at all, so there is nothing to offer cancelling
  const settable = applying ? setAbove : emptyNode().appearance;
  const patch = (part: Partial<AppearanceNode>) => onChange({ ...node, ...part });
  const colors = (part: Partial<AppearanceNode['colors']>) =>
    patch({ colors: { ...node.colors, ...part } });
  const media = (part: Partial<AppearanceNode['media']>) =>
    patch({ media: { ...node.media, ...part } });

  /** The list with that item taken off. Used wherever a value is written for it */
  const without = (item: ClearableItem) => node.cleared.filter((held) => held !== item);

  /**
   * The props that give a field its "as X shows it" switch.
   *
   * `above` is what an upper tier sets for that one item, taken from `settable` rather
   * than from the dimmed value: on a site's page the dimmed value stops at the global
   * tier, while an account may well be setting the item — and cancelling an account's
   * colour on one site is the whole reason this switch exists (`settable` in resolve.ts).
   * Passed in by the caller, beside the row's `inherited`, so the two cannot come from
   * different items.
   */
  const clearing = (item: ClearableItem, above: string | number | null) => ({
    cleared: node.cleared.includes(item),
    clearable: above !== null,
    onCleared: (on: boolean) =>
      patch({ cleared: on ? [...without(item), item] : without(item) }),
  });

  /**
   * Writes one size, and takes the item off the cancelled list when a value goes in.
   *
   * Left on, the two would say opposite things about the same item. `inherit` reads the
   * value first, so nothing would look wrong — until the box was emptied again, when the
   * item would fall back to "as X shows it" rather than to what comes down from above.
   */
  const sizeChange =
    (item: ClearableItem, apply: (value: number | null) => Partial<AppearanceNode>) =>
    (value: number | null) =>
      patch({ ...apply(value), ...(value === null ? {} : { cleared: without(item) }) });

  /*
   * The column-only items. Built here so the same row can stand in its usual place on X
   * Pro's tab and in the group below on the shared tiers' tab, without being written twice
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
   * Whether that color is offered on this page at all.
   *
   * Two are not always: the form a post is written in belongs to no column and no view, so
   * set on one it would never be read; the page around the timeline is x.com's alone.
   * Left out rather than shown dead — a field that cannot do anything is worse than a
   * field that is not there, and the note under the name says where it does work.
   */
  const shownColor = (key: ColorKey): boolean =>
    isPlainColor(key) &&
    !(oneColumn && isAccountColor(key)) &&
    !(site === 'pro' && isXOnlyColor(key));

  const colorRow = (key: ColorKey) => {
    const label = m.appearance.colors[key];
    const note = colorNote(key, m);
    // Tied to the box below, which has a name of its own and would otherwise shut the note out
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
          // When an upper tier sets it, that color appears in the swatch and the dimmed text
          fallback={above.colors[key]}
          // Not a default color but one that came down from above. It can be traced and changed, so it is worded differently
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
        The only description always shown on this tab is this one.
        "Empty keeps X Pro's own" applies to sizes and colors alike, so it sits at the top of the tab rather than inside a group
      */}
      <p class="hint">{site === 'x' ? m.appearance.hintX : m.appearance.hint}</p>

      {/*
        Switches the appearance off entirely. Placed at the top of the tab, in the same shape as the filter's toggle.
        Switched off, nothing applies to that column, the upper tiers' settings included
      */}
      <label class="row appearance-toggle">
        <span>{m.appearanceToggle.label}</span>
        <BoolSelect
          value={node.enabled}
          // With nothing set yet, show the value that actually applies, looking up to the top (the same function the applying side uses, in schema.ts)
          effective={appearanceApplies(inherited.enabled)}
          onChange={(enabled) => patch({ enabled })}
          label={m.appearanceToggle.label}
          on={m.appearanceToggle.on}
          off={m.appearanceToggle.off}
          // The switch itself, not a change to how X Pro shows things: "apply" belongs on top
          onFirst
        />
      </label>

      {/*
        While it is switched off, say so.
        The fields below show the values coming down from above in dimmed text, so without this
        they would look as though they were in effect
      */}
      {!applying && (
        <p class="hint">{m.appearanceToggle.stoppedHint}</p>
      )}

      {/*
        The group of settings that are not colors: sizes (width, text, lines, thumbnails) and
        how things are shown (photos and videos, time). Its name brackets the contents rather
        than enumerating them, so no heading has to be bolted on each time something is added
      */}
      <fieldset>
        <legend>{m.appearance.legend}</legend>

        {/*
          Packs the posts: the padding around them, the avatar, and the row of reply and
          repost buttons. First of the items that are about the timeline as a whole
          (on X Pro's tab the width stands above it, being the same kind of thing)
        */}
        <label class="row">
          <span>{m.appearance.compact}</span>
          <BoolSelect
            value={node.compact}
            // With nothing set yet, show the value that actually applies, looking up to the top (the same function the applying side uses, in schema.ts)
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
          How much of what the extension writes into a post goes on screen: a picture's
          description, a quoted post, a card's headline. Placed beside the body's own line
          limit, the two being the same kind of question about how much a post takes up
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
          Folds the line breaks written into a post into a single space each.
          Placed under the line limit: both are about how much room the body takes
        */}
        <label class="row">
          <span>{m.appearance.collapseNewlines}</span>
          <BoolSelect
            value={node.collapseNewlines}
            // With nothing set yet, show the value that actually applies, looking up to the top (the same function the applying side uses, in schema.ts)
            effective={collapsesNewlines(above.collapseNewlines)}
            onChange={(collapseNewlines) => patch({ collapseNewlines })}
            label={m.appearance.collapseNewlines}
            on={m.appearance.collapseNewlinesOn}
            off={m.appearance.collapseNewlinesOff}
          />
        </label>

        {/*
          What hangs off a post, from here down: the photos and videos, the cards, the
          quotes. They all answer "how much of it is worth showing on a timeline"
        */}
        <label class="row">
          <span>{m.appearance.media.style}</span>
          <ChoiceSelect
            value={node.media.style}
            // Consults the same function as the applying side (schema.ts). Unset keeps X Pro's own display
            effective={mediaStyleOf(above.media.style)}
            options={MEDIA_STYLES}
            labels={m.appearance.media.styles}
            onChange={(style) => media({ style })}
            label={m.appearance.media.style}
          />
        </label>

        {/* How tall they are once shown, so it follows the setting that decides whether they are */}
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
            // Consults the same function as the applying side (schema.ts). Unset keeps X Pro's own display
            effective={cardStyleOf(above.cardStyle)}
            options={ATTACHMENT_STYLES}
            labels={m.appearance.attachmentStyles}
            onChange={(cardStyle) => patch({ cardStyle })}
            label={m.appearance.cardStyle}
          />
        </label>

        {/* A quoted post. Its own setting: a quote is somebody's words, not a preview of a link */}
        <label class="row">
          <span>{m.appearance.quoteStyle}</span>
          <ChoiceSelect
            value={node.quoteStyle}
            // Consults the same function as the applying side (schema.ts). Unset keeps X Pro's own display
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
            // Consults the same function as the applying side (schema.ts). Unset keeps X's own display
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
        {/* Every one keeps X Pro's own when unset. The extension does not know the color used instead (fallback is null) */}
        {COLOR_ORDER.filter(shownColor).map(colorRow)}

        {/*
          Shifts the text color only when a highlight or emphasis makes it unreadable.
          Placed in the colors group: it applies to a rule's color rather than the tier's palette, but to the user it is the same subject
        */}
        <label class="row">
          <span>{m.appearance.autoContrast}</span>
          <BoolSelect
            value={node.autoContrast}
            // With nothing set yet, show the value that actually applies, looking up to the top (the same function the applying side uses, in schema.ts)
            effective={adjustsContrast(above.autoContrast)}
            onChange={(autoContrast) => onChange({ ...node, autoContrast })}
            label={m.appearance.autoContrast}
            on={m.appearance.autoContrastOn}
            off={m.appearance.autoContrastOff}
          />
        </label>

        {/*
          What a translucent highlight color is laid over.
          With a column background set, the default blends the two and ruins the hue, so this allows skipping it.
          Placed after the column background field, since it only starts to matter once that is set
        */}
        <label class="row">
          <span>
            {m.appearance.highlightBase}
          </span>
          <ChoiceSelect
            value={node.highlightBase}
            // With nothing set yet, show the value that actually applies, looking up to the top (the same function the applying side uses, in schema.ts)
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
        What a column of X Pro is: its width and the two colors of its name. Kept in a
        group of its own on X Pro's own pages as well, although nothing there needs telling
        which site it is. Folded into the groups above, these three would sit in one place
        on X Pro's pages and in another everywhere else.
        x.com has no columns, so the group is left out rather than shown dead.
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
