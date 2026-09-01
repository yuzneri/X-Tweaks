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
  const note =
    fallback === null
      ? m.color.unset
      : (fallbackInherited ? m.color.inherited : m.color.fallback)(fallback);
  const shortNote =
    fallback === null
      ? m.color.unsetShort
      : fallbackInherited
        ? m.color.inheritedShort
        : m.color.fallbackShort;

  return (
    <span class="color-field" hidden={hidden}>
      {(value ?? fallback) !== null && (
        <span class="swatch" style={{ backgroundColor: value ?? fallback! }} aria-hidden="true" />
      )}
      <input
        type="text"
        class="colorcode"
        // The box is narrow, so where the color came from is left to the short dimmed text and the long explanation comes here
        title={note}
        aria-label={label ?? m.color.label}
        placeholder={shortNote}
        // The starting point when the picker is opened from an empty box (read by ui/color-picker.ts).
        // With no stand-in color the attribute is left out entirely (Coloris then starts from black)
        data-fallback={fallback ?? undefined}
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        onChange={(e) => commit(e.currentTarget.value)}
      />
      {error && <p class="error">{error}</p>}
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
};

/**
 * The box for entering a size in px. Empty means "not set", keeping X Pro's own.
 * `type="number"` is not used because browsers empty the value on invalid input, making
 * "cleared" and "mistyped" impossible to tell apart.
 */
export const SizeField = ({ value, onChange, label, unit, inherited = null }: SizeFieldProps) => {
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
            value === null && inherited !== null
              ? m.size.inheritedLabel(label, String(inherited), unitLabel)
              : label
          }
          placeholder={inherited === null ? m.size.unset : String(inherited)}
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          onChange={(e) => commit(e.currentTarget.value)}
        />
        <span class="unit" aria-hidden="true">
          {unitLabel}
        </span>
      </span>
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
