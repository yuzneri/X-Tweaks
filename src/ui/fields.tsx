/** The small shared components of the settings screen, unaware of where they're placed */
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

/** An action's name; dictionary keys match `ACTIONS`' values, so it is looked up directly */
const actionLabel = (m: Messages, action: Action): string => m.actions[action];

/** The actions selectable on a rule; "Do nothing" cancels an upper tier's settings */
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
   * The color used when none is set, shown as the picker's starting value and in the empty
   * box's note. `null` means no fixed stand-in — neither a swatch nor a picker start is shown.
   */
  fallback?: string | null;
  /**
   * Whether `fallback` came down from an upper tier, rather than a default the extension
   * decided. A color from above can be traced and changed, so the note is worded differently.
   */
  fallbackInherited?: boolean;
  label?: string;
  /** What the field is for, deciding picker colours (`ui/palettes.ts`); tint by default */
  kind?: PaletteKind;
  /**
   * Whether this tier puts the item back to how X shows it, cancelling what comes from above.
   * Passed with `onCleared`; without it, no control (rules' colours have no tier above)
   */
  cleared?: boolean;
  onCleared?: (cleared: boolean) => void;
  /**
   * Whether there is anything above to cancel. Told apart from `fallback`: on a site's page
   * the dimmed value stops at the global tier while an account may well be setting the item
   * (`settable` in resolve.ts).
   */
  clearable?: boolean;
  /**
   * The id of the note under the field's name. The box carries its own `aria-label`, shutting
   * out the row's `label` and note, so a reader hears the note only if it is tied on here.
   */
  describedBy?: string;
};

/**
 * The color input: a code box with the Coloris picker attached (ui/color-picker.ts). Commits
 * on change only — input keeps firing while dragging the picker, so saving on that would
 * flood writes.
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

  // Follows an outside change: another tab, or switching tiers
  useEffect(() => {
    setText(value ?? '');
    setError(null);
  }, [value]);

  const commit = (raw: string) => {
    const result = parseColorInput(raw);
    setError(result.invalid ? m.color.error : null);
    if (!result.invalid) onChange(result.color);
  };

  // What applies when empty: the long form to `title`/accessible name, short inside the box
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
      {/* Put back to X's own, nothing is coming, so no swatch stands for it */}
      {!cleared && (value ?? fallback) !== null && (
        <span class="swatch" style={{ backgroundColor: value ?? fallback! }} aria-hidden="true" />
      )}
      <input
        type="text"
        class={`colorcode colorcode-${kind}`}
        // Narrow box: the short dimmed text holds where the color came from, the long form here
        title={note}
        aria-label={label ?? m.color.label}
        aria-describedby={describedBy}
        placeholder={shortNote}
        // Starting point when the picker opens from an empty box (ui/color-picker.ts). With
        // no stand-in the attribute is left out (Coloris then starts from black)
        data-fallback={fallback ?? undefined}
        // Cancelling and setting a colour say opposite things, so only one at a time
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
 * Appears only where it does something: something must be coming down to cancel, and this
 * tier must set nothing of its own (a value written here would win, making the switch read
 * as doing nothing). Stays while on, or there'd be no way to turn it off. Short words, sitting
 * at the end of a narrow row; the full meaning goes to `title` and the accessible name.
 *
 * A `span`, not a `label`, after the field, not before: every row is itself a `label`
 * (`Appearance.tsx`), a `label` cannot nest inside one, and a row's label binds to its first
 * control — a checkbox ahead of the field would make pressing the row's name cancel the item
 * instead of reaching it. The box carries its own `aria-label`, so nothing's lost unwrapped.
 * The words beside the box get a manual click handler, since a press on them is forwarded to
 * the field by the row's label — on a colour row, wrongly opening the picker — so the press
 * is stopped here and toggles the box directly. A press on the box itself is left alone: the
 * browser does not forward that, and stopping it here would cancel the box's own toggle too.
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
      // The gap between box and words is inside the row's label too
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
  /** The unit shown to the right of the box; px when omitted */
  unit?: string;
  /** The value from a higher tier when left empty, shown dimmed; else "Not set" */
  inherited?: number | null;
  /** Whether this tier puts the item back to how X shows it. Passed with `onCleared` */
  cleared?: boolean;
  onCleared?: (cleared: boolean) => void;
  /** Whether there is anything above to cancel (see the colour field's) */
  clearable?: boolean;
};

/**
 * The box for a size in px. Empty means "not set", keeping X Pro's own. Not `type="number"`,
 * since browsers empty invalid input, making "cleared" and "mistyped" indistinguishable.
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

  // Follows a change from another tab, or switching column in the list (components are reused)
  useEffect(() => {
    setText(value === null ? '' : String(value));
    setError(null);
  }, [value]);

  const commit = (raw: string) => {
    const result = parseSizeInput(raw);
    setError(result.invalid ? m.size.error : null);
    if (!result.invalid) onChange(result.size);
  };

  // Narrow box: dimmed text shows only the number, its meaning comes from the accessible name.
  // Whether a space joins number and unit differs by language, so it is left to the dictionary
  const unitLabel = unit ?? m.size.unit;

  return (
    <span class="size-field">
      {/*
        The unit is layered in the box, in a container sized to the input (nothing shifts on
        error)
      */}
      <span class="size-box">
        <input
          type="text"
          inputMode="numeric"
          class="size"
          // Shown only for an empty box, so a filled one is not read out as "not set". `value`,
          // not `text` (mid-typing), keeps the name from changing on every keystroke
          aria-label={
            value === null && inherited !== null && !cleared
              ? m.size.inheritedLabel(label, String(inherited), unitLabel)
              : label
          }
          placeholder={
            cleared ? m.cleared.short : inherited === null ? m.size.unset : String(inherited)
          }
          // Cancelling and setting a size say opposite things, so only one at a time
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
  /** The sentences for "do" and "do not"; phrasing differs per item, so they're passed in */
  on: string;
  off: string;
  /**
   * Whether "do" is listed first. Off by default: the side that changes nothing belongs at
   * the top, so a list opens on "as it is" with the rest reading as departures. The switches
   * that turn the extension on and off are the exception, "do" there being the control's
   * purpose, not a display change.
   */
  onFirst?: boolean;
};

/**
 * One switch over "is this on the page", as x.com's own furniture (`XChrome.tsx`) and what X
 * slips into a timeline (`Injected.tsx`) are written. Ticked means present, matching how it is
 * stored (`schema.ts`): rows are names of things on the page, so an empty box must read as
 * "gone" — the other way round, a fresh install would show every box empty, the opposite of
 * what the page looks like.
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
 * "not set" option is offered — choosing that side clears this tier's setting instead.
 * Storing the same value would mark the left list "has settings" with nothing behind it.
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
  /** The value actually in effect while nothing is set, shown selected (as `BoolSelect`) */
  effective: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T | null) => void;
  label: string;
};

/** An item with several options; `BoolSelect` widened past two values, handled the same way */
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
   * The selectable actions, always listed by the caller: not every action fits every rule
   * (emphasis needs a text rule, say), so no "show them all" default is offered
   */
  actions: readonly A[];
  /** Whether "not set" can be chosen, meaning inheriting an upper tier's setting */
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
  /** The color used for a rule with none set; the action's default when omitted */
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
