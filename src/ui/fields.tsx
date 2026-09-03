/** The small shared components of the settings screen, shaped so they know nothing about where they are placed */
import { useEffect, useState } from 'preact/hooks';
import {
  ACTIONS,
  DEFAULT_HIGHLIGHT_COLOR,
  defaultColorFor,
  usesColor,
  type Action,
} from '../settings/schema.ts';
import type { Messages } from '../i18n/index.ts';
import { parseColorInput } from './color.ts';
import { parseSizeInput } from './size.ts';
import { useMessages } from './messages.tsx';
import type { PaletteKind } from './palettes.ts';

/** An action's name. The dictionary keys match the values of `ACTIONS`, so it can be looked up directly */
const actionLabel = (m: Messages, action: Action): string => m.actions[action];

/** The actions selectable on a rule. "Do nothing" is one of them, used to cancel an upper tier's settings */
export const RULE_ACTIONS = [
  ACTIONS.COLLAPSE,
  ACTIONS.HIDE,
  ACTIONS.HIGHLIGHT,
  ACTIONS.EMPHASIZE,
  ACTIONS.NOTHING,
] as const;

type ColorFieldProps = {
  value: string | null;
  onChange: (color: string | null) => void;
  hidden?: boolean;
  /**
   * The color used when none is set. Shown as the picker's starting value and in the empty box's note.
   * null means "there is no fixed stand-in color", and neither a swatch nor a picker starting point is shown.
   */
  fallback?: string | null;
  /**
   * Whether `fallback` is a color that came down from an upper tier (rather than a default the extension decided).
   * A color from above can be traced and changed, so the empty box's note is worded differently.
   */
  fallbackInherited?: boolean;
  label?: string;
  /**
   * What the field is for, which decides the colours the picker offers (`ui/palettes.ts`).
   * A tint is the default because that is what the rules' own colours are.
   */
  kind?: PaletteKind;
  /**
   * Whether this tier puts the item back to how X shows it, cancelling what comes down
   * from above. Passed together with `onCleared`; without the pair there is no control and
   * the field behaves as it always did (the rules' own colours have no tier above them).
   */
  cleared?: boolean;
  onCleared?: (cleared: boolean) => void;
  /**
   * Whether there is anything above to cancel. Told apart from `fallback`, which is what
   * gets shown dimmed: on a site's page the two differ, the dimmed value stopping at the
   * global tier while an account may well be setting the item (`settable` in resolve.ts).
   */
  clearable?: boolean;
  /**
   * The id of the note written under the field's name in the row.
   * The box carries its own name (`aria-label`), which shuts out the row's `label` and the
   * note inside it, so a reader hears the name and never the note unless it is tied on here.
   */
  describedBy?: string;
};

/**
 * The color input. One color-code box has the Coloris picker attached to it (ui/color-picker.ts).
 * It commits on change only: input keeps firing while the picker is being dragged, and saving on that
 * would set off a flood of writes.
 */
export const ColorField = ({
  value,
  onChange,
  hidden,
  fallback = DEFAULT_HIGHLIGHT_COLOR,
  fallbackInherited,
  label,
  kind = 'tint',
  cleared = false,
  onCleared,
  clearable = false,
  describedBy,
}: ColorFieldProps) => {
  const m = useMessages();
  const [text, setText] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);

  // Follows a value changed from outside, by another tab or by switching tiers
  useEffect(() => {
    setText(value ?? '');
    setError(null);
  }, [value]);

  const commit = (raw: string) => {
    const result = parseColorInput(raw);
    setError(result.invalid ? m.color.error : null);
    if (!result.invalid) onChange(result.color);
  };

  // What applies when the box is empty. The long form goes to `title` and the accessible name, the short one inside the box
  const note = cleared
    ? m.cleared.note
    : fallback === null
      ? m.color.unset
      : (fallbackInherited ? m.color.inherited : m.color.fallback)(fallback);
  const shortNote = cleared
    ? m.cleared.short
    : fallback === null
      ? m.color.unsetShort
      : fallbackInherited
        ? m.color.inheritedShort
        : m.color.fallbackShort;

  return (
    <span class="color-field" hidden={hidden}>
      {/* While the item is put back to X's own, nothing is coming — so no swatch stands for it */}
      {!cleared && (value ?? fallback) !== null && (
        <span class="swatch" style={{ backgroundColor: value ?? fallback! }} aria-hidden="true" />
      )}
      <input
        type="text"
        class={`colorcode colorcode-${kind}`}
        // The box is narrow, so where the color came from is left to the short dimmed text and the long explanation comes here
        title={note}
        aria-label={label ?? m.color.label}
        aria-describedby={describedBy}
        placeholder={shortNote}
        // The starting point when the picker is opened from an empty box (read by ui/color-picker.ts).
        // With no stand-in color the attribute is left out entirely (Coloris then starts from black)
        data-fallback={fallback ?? undefined}
        // Cancelling and setting a colour say opposite things, so only one can be written at a time
        disabled={cleared}
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        onChange={(e) => commit(e.currentTarget.value)}
      />
      <ClearToggle
        cleared={cleared}
        onCleared={onCleared}
        available={clearable}
        empty={value === null}
        label={label ?? m.color.label}
      />
      {error && <p class="error">{error}</p>}
    </span>
  );
};

/**
 * The switch that puts one item back to how X shows it, cancelling what an upper tier set.
 *
 * It appears only where it does something: something has to be coming down to cancel, and
 * this tier has to be setting nothing of its own (a value written here wins over the
 * cancelling, so the switch would read as doing nothing). It stays while it is on, or
 * there would be no way to turn it off again.
 *
 * The visible words are short because it sits at the end of a narrow row; what it means in
 * full goes to `title` and the accessible name.
 *
 * A `span` rather than a `label`, and it comes after the field rather than before it.
 * Every row is itself a `label` (`Appearance.tsx`), and a `label` inside a `label` is not
 * allowed — worse, a row's label binds to the first control inside it, so a checkbox put
 * ahead of the field would make pressing the row's name cancel the item instead of
 * reaching the field. The box carries its own name (`aria-label`), so nothing is lost by
 * not wrapping it.
 *
 * The words beside the box are made to work by hand for the same reason. A press on them
 * is a press inside the row's label, which the browser forwards to the field — on a colour
 * row that opens the picker, so the words appeared to do the wrong thing entirely. They
 * belong to this switch, so the press is stopped here and toggles the box itself.
 * A press on the box is left alone: the browser does not forward a press that lands on a
 * control of its own, and cancelling it here would cancel the box's own toggle with it.
 */
const ClearToggle = ({
  cleared,
  onCleared,
  available,
  empty,
  label,
}: {
  cleared: boolean;
  onCleared?: (cleared: boolean) => void;
  available: boolean;
  empty: boolean;
  label: string;
}) => {
  const m = useMessages();
  if (!onCleared || !available || (!empty && !cleared)) return null;
  return (
    <span
      class="clear-toggle"
      title={m.cleared.note}
      // The gap between the box and the words is inside the row's label too
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={cleared}
        aria-label={m.cleared.label(label)}
        onChange={(e) => onCleared(e.currentTarget.checked)}
      />
      <span
        aria-hidden="true"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onCleared(!cleared);
        }}
      >
        {m.cleared.short}
      </span>
    </span>
  );
};

type SizeFieldProps = {
  value: number | null;
  onChange: (size: number | null) => void;
  label: string;
  /** The unit shown to the right of the box. px when omitted */
  unit?: string;
  /**
   * The value that comes down from a higher tier when this is left empty.
   * Shown as the dimmed placeholder. Without one it stays "Not set".
   */
  inherited?: number | null;
  /** Whether this tier puts the item back to how X shows it. Passed together with `onCleared` */
  cleared?: boolean;
  onCleared?: (cleared: boolean) => void;
  /** Whether there is anything above to cancel (see the colour field's) */
  clearable?: boolean;
};

/**
 * The box for entering a size in px. Empty means "not set", keeping X Pro's own.
 * `type="number"` is not used because browsers empty the value on invalid input, making
 * "cleared" and "mistyped" impossible to tell apart.
 */
export const SizeField = ({
  value,
  onChange,
  label,
  unit,
  inherited = null,
  cleared = false,
  onCleared,
  clearable = false,
}: SizeFieldProps) => {
  const m = useMessages();
  const [text, setText] = useState(value === null ? '' : String(value));
  const [error, setError] = useState<string | null>(null);

  // Follows a change from another tab, or switching to another column in the list (components are reused)
  useEffect(() => {
    setText(value === null ? '' : String(value));
    setError(null);
  }, [value]);

  const commit = (raw: string) => {
    const result = parseSizeInput(raw);
    setError(result.invalid ? m.size.error : null);
    if (!result.invalid) onChange(result.size);
  };

  // The box is narrow, so the dimmed text shows only the number and what it is comes from the accessible name.
  // Whether a space goes between the number and the unit differs by language, so joining them is left to the dictionary
  const unitLabel = unit ?? m.size.unit;

  return (
    <span class="size-field">
      {/* The unit is layered inside the box, so it is wrapped in a container the size of the input (nothing shifts when an error appears) */}
      <span class="size-box">
        <input
          type="text"
          inputMode="numeric"
          class="size"
          // The inheritance note is only shown for an empty box, so a box with a value is not read out as "not set".
          // `value` rather than `text` (mid-typing) is consulted, to keep the name from changing on every keystroke
          aria-label={
            value === null && inherited !== null && !cleared
              ? m.size.inheritedLabel(label, String(inherited), unitLabel)
              : label
          }
          placeholder={
            cleared ? m.cleared.short : inherited === null ? m.size.unset : String(inherited)
          }
          // Cancelling and setting a size say opposite things, so only one can be written at a time
          disabled={cleared}
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          onChange={(e) => commit(e.currentTarget.value)}
        />
        <span class="unit" aria-hidden="true">
          {unitLabel}
        </span>
      </span>
      <ClearToggle
        cleared={cleared}
        onCleared={onCleared}
        available={clearable}
        empty={value === null}
        label={label}
      />
      {error && <p class="error">{error}</p>}
    </span>
  );
};

type BoolSelectProps = {
  value: boolean | null;
  /** The value actually in effect while nothing is set. Shown as the selected one */
  effective: boolean;
  onChange: (value: boolean | null) => void;
  label: string;
  /** The sentences for "do" and "do not". The phrasing differs per item, so they are passed in */
  on: string;
  off: string;
  /**
   * Whether the "do" side is listed first. Off by default: the side that changes nothing
   * belongs at the top, so a list opens on "as it is" and the ones below it read as
   * departures from it.
   * The switches that turn the extension on and off are the exception. There the "do"
   * side is what the control is for, not a change to X Pro's own display.
   */
  onFirst?: boolean;
};

/**
 * One switch over "is this on the page", as the lists of x.com's own furniture
 * (`XChrome.tsx`) and of what X slips into a timeline (`Injected.tsx`) are written.
 *
 * Ticked means the thing is there, which is also how the value is stored (`schema.ts`).
 * The rows are names of things on the page, and an empty box beside each name has to read
 * as "this one is gone" — the other way round, a fresh install would show a list of names
 * with every box empty, saying the opposite of what the page looks like.
 */
export const ShownSwitch = ({
  label,
  shown,
  onShown,
  describedBy,
  disabled = false,
}: {
  label: string;
  shown: boolean;
  onShown: (shown: boolean) => void;
  describedBy?: string;
  disabled?: boolean;
}) => (
  <label class="row switch">
    <input
      type="checkbox"
      checked={shown}
      disabled={disabled}
      aria-describedby={describedBy}
      onChange={(event) => onShown(event.currentTarget.checked)}
    />
    <span>{label}</span>
  </label>
);

/**
 * A yes/no choice. "Not set" and "choose the same side as above" have the same result, so no
 * "not set" option is offered and choosing the same side as above clears this tier's setting.
 * Storing the same value would leave the left list marked "has settings" with nothing behind it.
 */
export const BoolSelect = ({
  value,
  effective,
  onChange,
  label,
  on,
  off,
  onFirst,
}: BoolSelectProps) => {
  const sides: [string, string][] = onFirst
    ? [['true', on], ['false', off]]
    : [['false', off], ['true', on]];
  return (
    <select
      aria-label={label}
      value={String(value ?? effective)}
      onChange={(e) => {
        const next = e.currentTarget.value === 'true';
        onChange(next === effective ? null : next);
      }}
    >
      {sides.map(([side, text]) => (
        <option key={side} value={side}>
          {text}
        </option>
      ))}
    </select>
  );
};

type ChoiceSelectProps<T extends string> = {
  value: T | null;
  /** The value actually in effect while nothing is set. Shown as the selected one (the same as `BoolSelect`) */
  effective: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T | null) => void;
  label: string;
};

/** An item with several options. `BoolSelect` widened past two values, handled the same way */
export const ChoiceSelect = <T extends string>({
  value,
  effective,
  options,
  labels,
  onChange,
  label,
}: ChoiceSelectProps<T>) => (
  <select
    aria-label={label}
    value={value ?? effective}
    onChange={(e) => {
      const next = e.currentTarget.value as T;
      onChange(next === effective ? null : next);
    }}
  >
    {options.map((option) => (
      <option key={option} value={option}>
        {labels[option]}
      </option>
    ))}
  </select>
);

type ActionSelectProps<A extends Action> = {
  value: A | null;
  onChange: (action: A | null) => void;
  /**
   * The selectable actions, always listed by the caller. Not every action is available on every
   * rule (emphasis needs a text rule, say), so no "show them all" default is offered
   */
  actions: readonly A[];
  /** Whether "not set" can be chosen. It means inheriting an upper tier's setting */
  allowUnset?: boolean;
  label?: string;
};

export const ActionSelect = <A extends Action>({
  value,
  onChange,
  actions,
  allowUnset,
  label,
}: ActionSelectProps<A>) => {
  const m = useMessages();
  return (
    <select
      aria-label={label}
      value={value ?? 'null'}
      onChange={(e) => {
        const next = e.currentTarget.value;
        onChange(next === 'null' ? null : (next as A));
      }}
    >
      {allowUnset && <option value="null">{m.unset}</option>}
      {actions.map((action) => (
        <option key={action} value={action}>
          {actionLabel(m, action)}
        </option>
      ))}
    </select>
  );
};

export const ActionBadge = ({
  action,
  color,
  fallback,
}: {
  action: Action;
  color: string | null;
  /** The color actually used for a rule with no color set. The action's default when omitted */
  fallback?: string;
}) => {
  const m = useMessages();
  const shown = fallback ?? defaultColorFor(action);
  return (
    <span class="action-badge">
      {usesColor(action) && (
        <span
          class="swatch"
          style={{ backgroundColor: color ?? shown }}
          title={color ?? m.color.fallback(shown)}
        />
      )}
      {actionLabel(m, action)}
    </span>
  );
};
