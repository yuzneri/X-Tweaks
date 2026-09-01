/**
 * The appearance settings. It does not know which tier it belongs to; it edits the
 * appearance it was handed and returns it. Every item can be put back to empty, which returns it to X Pro's own display.
 */
import {
  adjustsContrast,
  appearanceApplies,
  ATTACHMENT_STYLES,
  cardStyleOf,
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
  type AppearanceNode,
} from '../settings/schema.ts';
import type { Messages } from '../i18n/index.ts';
import { BoolSelect, ChoiceSelect, ColorField, SizeField } from './fields.tsx';
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

/**
 * What that color is called on this site's tab.
 *
 * x.com has one timeline down the middle of the page rather than a column, so the
 * background is named after what is actually painted. Decided in one place because
 * "what is in effect" lists the same colors in the same order to be compared with these.
 */
export const colorLabel = (key: ColorKey, site: Site, m: Messages): string =>
  key === 'background' && site === 'x' ? m.appearance.colors.backgroundX : m.appearance.colors[key];

type Props = {
  node: AppearanceNode;
  onChange: (node: AppearanceNode) => void;
  /**
   * The value that comes down from a higher tier when this is left empty.
   * Every field means "unset falls to the tier above, and if that is unset too, to X Pro's own",
   * so what is shown dimmed is the effective value as far as it can be resolved.
   */
  inherited: AppearanceNode;
  /** Which site's settings these are (see `Site`) */
  site: Site;
};

export const Appearance = ({ node, onChange, inherited, site }: Props) => {
  const m = useMessages();
  /**
   * Whether the appearance applies in this scope, as the effective value looking up to the top.
   * If it does not, the value coming from above is not shown either: the dimmed value means
   * "what applies if this stays empty", and showing it where it is switched off would read as in effect.
   */
  const applying = appearanceApplies(node.enabled ?? inherited.enabled);
  const above = applying ? inherited : emptyNode().appearance;
  const patch = (part: Partial<AppearanceNode>) => onChange({ ...node, ...part });
  const colors = (part: Partial<AppearanceNode['colors']>) =>
    patch({ colors: { ...node.colors, ...part } });
  const media = (part: Partial<AppearanceNode['media']>) =>
    patch({ media: { ...node.media, ...part } });

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
        onChange={(columnWidth) => patch({ columnWidth })}
        label={m.appearance.columnWidth}
      />
    </label>
  );

  const colorRow = (key: ColorKey) => {
    const label = colorLabel(key, site, m);
    return (
      <label class="row" key={key}>
        <span>{label}</span>
        <ColorField
          value={node.colors[key]}
          onChange={(color) => colors({ [key]: color })}
          // When an upper tier sets it, that color appears in the swatch and the dimmed text
          fallback={above.colors[key]}
          // Not a default color but one that came down from above. It can be traced and changed, so it is worded differently
          fallbackInherited
          label={label}
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

        {site === 'pro' && columnWidthRow}

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
            onChange={(fontSize) => patch({ fontSize })}
            label={m.appearance.fontSize}
          />
        </label>

        <label class="row">
          <span>{m.appearance.maxLines}</span>
          <SizeField
            value={node.maxLines}
            inherited={above.maxLines}
            onChange={(maxLines) => patch({ maxLines })}
            label={m.appearance.maxLines}
            unit={m.appearance.lines}
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
            onChange={(maxThumbHeight) => media({ maxThumbHeight })}
            label={m.appearance.media.maxThumbHeight}
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
        {COLOR_ORDER.filter((key) => site === 'pro' || !isColumnColor(key)).map(colorRow)}

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
          <span>{m.appearance.highlightBase}</span>
          <ChoiceSelect
            value={node.highlightBase}
            // With nothing set yet, show the value that actually applies, looking up to the top (the same function the applying side uses, in schema.ts)
            effective={highlightBaseOf(above.highlightBase)}
            options={HIGHLIGHT_BASES}
            // Named after what is painted, the same as the background color above
            labels={
              site === 'x'
                ? { ...m.appearance.highlightBases, column: m.appearance.highlightBases.columnX }
                : m.appearance.highlightBases
            }
            onChange={(highlightBase) => onChange({ ...node, highlightBase })}
            label={m.appearance.highlightBase}
          />
        </label>
      </fieldset>

      {/*
        The items that only take effect where a scope is a column. Grouped at the end
        rather than dimmed in place: dimming would read as "does not work", while what is
        set here really does apply — on X Pro.
        x.com's own tab does not get this group at all; there they can never apply
      */}
      {site === 'both' && (
        <fieldset>
          <legend>{m.appearance.columnOnly.legend}</legend>
          <p class="hint">{m.appearance.columnOnly.hint}</p>
          {columnWidthRow}
          {COLOR_ORDER.filter(isColumnColor).map(colorRow)}
        </fieldset>
      )}
    </>
  );
};
