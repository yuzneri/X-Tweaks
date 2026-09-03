/**
 * Editing rules. On screen there is one "what the post is" plus a text box per target,
 * and only the boxes filled in become conditions. The stored form is a list of conditions,
 * so it is converted on the way in and out (`toDraft` / `toConditions`). The order in the list is the order rules are judged in.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ACTIONS,
  AGE_DIRECTIONS,
  AGE_UNITS,
  canEmphasizeWith,
  describeCondition,
  canCompareToSelf,
  isScreenNameTarget,
  isSelfMode,
  newRuleId,
  ruleName,
  targetsFor,
  usesColor,
  defaultColorFor,
  TRAIT_KEYS,
  type Action,
  type Condition,
  type MatchMode,
  type MatchTarget,
  type Rule,
  type TraitKey,
  type AgeDirection,
  type AgeUnit,
  minutesOf,
  splitDuration,
} from '../settings/schema.ts';
import { ActionBadge, ActionSelect, ColorField, RULE_ACTIONS } from './fields.tsx';
import { useReorder } from './reorder.ts';
import { useMessages } from './messages.tsx';
import type { Messages } from '../i18n/index.ts';

type Props = {
  rules: Rule[];
  /** The order judging follows. The list is shown in this order */
  order: string[];
  onChange: (rules: Rule[], order: string[]) => void;
};

type TextCondition = Extract<Condition, { kind: 'text' }>;
type TraitCondition = Extract<Condition, { kind: 'trait' }>;

/** One target's input. Which target it is comes from where the box sits, so it is not held here */
type TextInput = Omit<TextCondition, 'kind' | 'target'>;

/**
 * The input for a post's age. The number is held as a string to keep a half-typed value.
 * An empty box makes no condition (the same rule as the other boxes)
 */
type AgeInput = {
  value: string;
  unit: AgeUnit;
  direction: AgeDirection;
  negate: boolean;
};

/**
 * The rule being edited, held as boxes per target (unlike the stored form).
 * The trait is null when none is picked ("Any" on screen), and text makes no condition when the pattern is empty.
 */
type Draft = {
  trait: TraitCondition | null;
  texts: Partial<Record<MatchTarget, TextInput>>;
  age: AgeInput;
  action: Action;
  color: string | null;
  label: string;
  enabled: boolean;
};

const emptyText = (): TextInput => ({
  mode: 'contains',
  pattern: '',
  caseSensitive: false,
  negate: false,
});

const emptyAge = (): AgeInput => ({ value: '', unit: 'hours', direction: 'older', negate: false });

const emptyDraft = (): Draft => ({
  trait: null,
  texts: {},
  age: emptyAge(),
  action: ACTIONS.COLLAPSE,
  color: null,
  label: '',
  enabled: true,
});

/**
 * Splits a stored rule into the boxes.
 * For a rule with several conditions on the same target (not creatable on this screen), only the first is taken.
 */
const toDraft = (rule: Rule): Draft => {
  const texts: Partial<Record<MatchTarget, TextInput>> = {};
  for (const c of rule.conditions) {
    if (c.kind !== 'text' || texts[c.target]) continue;
    texts[c.target] = {
      mode: c.mode,
      pattern: c.pattern,
      caseSensitive: c.caseSensitive,
      negate: c.negate,
    };
  }
  const age = rule.conditions.find((c) => c.kind === 'age');
  return {
    trait: rule.conditions.find((c): c is TraitCondition => c.kind === 'trait') ?? null,
    texts,
    age: age
      ? (() => {
          const { value, unit } = splitDuration(age.minutes);
          return { value: String(value), unit, direction: age.direction, negate: age.negate };
        })()
      : emptyAge(),
    action: rule.action,
    color: rule.color,
    label: rule.label,
    enabled: rule.enabled,
  };
};

/** The targets shown on screen. Picking a trait adds the ones that exist by virtue of it */
const shownTargets = (draft: Draft): readonly MatchTarget[] =>
  targetsFor(draft.trait?.trait ?? null);

/** A user ID may be written with or without a leading @. It is normalized to without on save */
const patternOf = (target: MatchTarget, raw: string): string =>
  isScreenNameTarget(target) ? raw.trim().replace(/^@/, '') : raw.trim();

/** Turns the age input into a condition. Empty, zero or below, and non-integers make no condition */
const ageConditionOf = (age: AgeInput): Condition[] => {
  const raw = age.value.trim();
  if (raw === '') return [];
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return [];
  return [
    { kind: 'age', direction: age.direction, minutes: minutesOf(value, age.unit), negate: age.negate },
  ];
};

/** Whether what was typed fails as an age condition (an empty box passes: it simply does not filter) */
const badAge = (age: AgeInput): boolean =>
  age.value.trim() !== '' && ageConditionOf(age).length === 0;

/**
 * Turns the boxes back into a list of conditions, trait first and then targets, matching the screen.
 * Targets not on screen are ignored, so input in a box hidden by changing the trait does not
 * take effect as a condition while out of sight.
 */
const toConditions = (draft: Draft): Condition[] => [
  ...(draft.trait ? [draft.trait] : []),
  ...shownTargets(draft).flatMap((target): Condition[] => {
    const input = draft.texts[target];
    if (!input) return [];
    // "Is the author" carries no pattern
    if (isSelfMode(input.mode)) {
      return canCompareToSelf(target)
        ? [{ kind: 'text', target, mode: 'self', pattern: '', caseSensitive: false, negate: input.negate }]
        : [];
    }
    const pattern = patternOf(target, input.pattern);
    // An empty box means not filtering on that target
    if (!pattern) return [];
    return [
      {
        kind: 'text',
        target,
        mode: input.mode,
        pattern,
        // X does not distinguish case in user IDs, so the setting is dropped even if it is still there
        caseSensitive: !isScreenNameTarget(target) && input.caseSensitive,
        negate: input.negate,
      },
    ];
  }),
  ...ageConditionOf(draft.age),
];

/** The key for deciding whether two rules are the same. The same list of conditions means the same rule */
const conditionsKey = (conditions: Condition[]): string =>
  JSON.stringify(
    conditions.map((c) =>
      c.kind === 'text'
        ? ['text', c.target, c.mode, c.pattern.toLowerCase(), c.negate]
        : c.kind === 'age'
          ? ['age', c.direction, c.minutes, c.negate]
          : ['trait', c.trait, c.negate]
    )
  );

/** Validates the input and shapes it into something saveable. `existing` is the other rules, for the duplicate check */
const validate = (
  draft: Draft,
  existing: Rule[],
  m: Messages
): { rule: Omit<Rule, 'id'> } | { error: string } => {
  const conditions = toConditions(draft);

  // Something unreadable as a number is not silently discarded: no state where it was typed but has no effect
  if (badAge(draft.age)) return { error: m.rules.ageError };

  // A rule with neither a trait nor any text would match every post
  if (conditions.length === 0) return { error: m.rules.errors.noCondition };

  for (const c of conditions) {
    if (c.kind !== 'text' || c.mode !== 'regex') continue;
    // An invalid regular expression is not saved, so no state exists that throws at run time
    try {
      new RegExp(c.pattern);
    } catch (e) {
      return { error: m.rules.errors.badRegex(e instanceof Error ? e.message : String(e)) };
    }
  }

  // Emphasis paints the matched characters, so it needs a condition that determines where to paint.
  // Negated conditions ("does not contain ●●") and targets with nothing to paint cannot be chosen
  if (
    draft.action === ACTIONS.EMPHASIZE &&
    !conditions.some(canEmphasizeWith)
  ) {
    return { error: m.rules.errors.noEmphasisTarget };
  }

  // A rule with exactly the same conditions cannot be created: with only the action differing, only the earlier one applies
  const key = conditionsKey(conditions);
  if (existing.some((rule) => conditionsKey(rule.conditions) === key)) {
    return { error: m.rules.errors.duplicate };
  }

  return {
    rule: {
      conditions,
      action: draft.action,
      color: usesColor(draft.action) ? draft.color : null,
      label: draft.label.trim(),
      enabled: draft.enabled,
    },
  };
};

/** Shown in the same shape for traits and for text */
const NegateBox = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => {
  const m = useMessages();
  return (
    <label class="inline">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />{' '}
      {m.rules.negate}
    </label>
  );
};

type TextRowProps = {
  target: MatchTarget;
  input: TextInput;
  onChange: (input: TextInput) => void;
  onSubmit: () => void;
};

/** One target's row. Left empty, that target does not filter */
const TextRow = ({ target, input, onChange, onSubmit }: TextRowProps) => {
  const m = useMessages();
  return (
    <div class="row add condition">
      <span class="field-label">{m.rules.targets[target]}</span>
      {/* "Is the author" has its counterpart fixed, so no input box is shown */}
      {!isSelfMode(input.mode) && (
        <input
          type="text"
          aria-label={m.rules.targets[target]}
          placeholder={m.rules.anyPlaceholder}
          value={input.pattern}
          onInput={(e) => onChange({ ...input, pattern: e.currentTarget.value })}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        />
      )}
      {/* The match mode and the negation are always shown for every target.
          Rows all having the same shape reads better than a box sprouting the moment typing starts */}
      <select
        aria-label={m.rules.modeLabel}
        value={input.mode}
        onChange={(e) => onChange({ ...input, mode: e.currentTarget.value as MatchMode })}
      >
        {/* "Is the author" alone means something only for targets where a counterpart is determined */}
        {Object.entries(m.rules.modes)
          .filter(([value]) => value !== 'self' || canCompareToSelf(target))
          .map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
      </select>
      <label class="inline" hidden={isScreenNameTarget(target)}>
        <input
          type="checkbox"
          checked={input.caseSensitive}
          onChange={(e) => onChange({ ...input, caseSensitive: e.currentTarget.checked })}
        />{' '}
        {m.rules.caseSensitive}
      </label>
      <NegateBox checked={input.negate} onChange={(negate) => onChange({ ...input, negate })} />
    </div>
  );
};

type FormProps = {
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
  onSubmit: () => void;
  /** Whether a new rule is being created or an existing one opened. The description and the wording of closing change */
  mode: 'add' | 'edit';
  onClose: () => void;
  /**
   * An input error, shown inside the form. Placed below the list it would end up off screen
   * while a row near the top is being edited, making it look as though the press did nothing.
   */
  error: string | null;
  /** Deletes this rule. In the list row it would get pressed while reordering, so it is here, during editing, only */
  onDelete?: () => void;
};

/** The same component for adding and editing, so the meaning of the input and its validation live in one place */
const RuleForm = ({
  draft,
  onDraftChange,
  onSubmit,
  mode,
  onClose,
  error,
  onDelete,
}: FormProps) => {
  const m = useMessages();
  const { trait } = draft;
  const firstField = useRef<HTMLInputElement>(null);
  // Deleting cannot be undone, so it is confirmed once after being pressed
  const [confirming, setConfirming] = useState(false);

  // Right after opening, the button that was pressed ("Add a rule" or "Edit") is gone and focus has nowhere to be.
  // Moving it to the first box allows typing on with the keyboard alone
  useEffect(() => {
    firstField.current?.focus();
  }, []);

  return (
    <>
      {/* How to fill the boxes in. Someone opening an existing rule knows how, so it is shown when adding only */}
      {mode === 'add' && <p class="hint">{m.rules.hint}</p>}

      {/* The name goes at the top of the form, so "what rule is this" can be written before the conditions */}
      <div class="row add">
        <input
          ref={firstField}
          type="text"
          aria-label={m.rules.namePlaceholder}
          placeholder={m.rules.namePlaceholder}
          value={draft.label}
          onInput={(e) => onDraftChange({ ...draft, label: e.currentTarget.value })}
        />
      </div>

      <div class="row add condition">
        <span class="field-label">{m.rules.traitLabel}</span>
        <select
          aria-label={m.rules.traitLabel}
          value={trait?.trait ?? ''}
          onChange={(e) => {
            const value = e.currentTarget.value;
            onDraftChange({
              ...draft,
              // Back to "Any" drops the negation too, so no invisible setting is left behind
              trait: value
                ? { kind: 'trait', trait: value as TraitKey, negate: trait?.negate ?? false }
                : null,
            });
          }}
        >
          <option value="">{m.rules.any}</option>
          {TRAIT_KEYS.map((key) => (
            <option key={key} value={key}>
              {m.traits[key]}
            </option>
          ))}
        </select>
        {trait && (
          <NegateBox
            checked={trait.negate}
            onChange={(negate) => onDraftChange({ ...draft, trait: { ...trait, negate } })}
          />
        )}
      </div>

      {/* How old the post is, measured from the moment of judging */}
      <div class="row add condition">
        <span class="field-label">{m.rules.ageLabel}</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label={m.rules.ageLabel}
          placeholder={m.rules.anyPlaceholder}
          value={draft.age.value}
          onInput={(e) => onDraftChange({ ...draft, age: { ...draft.age, value: e.currentTarget.value } })}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        />
        <select
          aria-label={m.rules.ageLabel}
          value={draft.age.unit}
          onChange={(e) =>
            onDraftChange({ ...draft, age: { ...draft.age, unit: e.currentTarget.value as AgeUnit } })
          }
        >
          {AGE_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {m.rules.ageUnits[unit]}
            </option>
          ))}
        </select>
        <select
          aria-label={m.rules.ageLabel}
          value={draft.age.direction}
          onChange={(e) =>
            onDraftChange({
              ...draft,
              age: { ...draft.age, direction: e.currentTarget.value as AgeDirection },
            })
          }
        >
          {AGE_DIRECTIONS.map((direction) => (
            <option key={direction} value={direction}>
              {m.rules.ageDirections[direction]}
            </option>
          ))}
        </select>
        <NegateBox
          checked={draft.age.negate}
          onChange={(negate) => onDraftChange({ ...draft, age: { ...draft.age, negate } })}
        />
      </div>

      {shownTargets(draft).map((target) => (
        <TextRow
          key={target}
          target={target}
          input={draft.texts[target] ?? emptyText()}
          onChange={(input) =>
            onDraftChange({ ...draft, texts: { ...draft.texts, [target]: input } })
          }
          onSubmit={onSubmit}
        />
      ))}

      <div class="row add">
        <ActionSelect
          label={m.rules.actionLabel}
          value={draft.action}
          actions={RULE_ACTIONS}
          onChange={(action) => onDraftChange({ ...draft, action: action ?? ACTIONS.COLLAPSE })}
        />
        <ColorField
          hidden={!usesColor(draft.action)}
          /*
           * Emphasis paints a few characters, highlight a whole post, so the two want
           * colours of different strength — the defaults differ for the same reason
           */
          kind={draft.action === ACTIONS.EMPHASIZE ? 'strong' : 'tint'}
          fallback={defaultColorFor(draft.action)}
          value={draft.color}
          onChange={(color) => onDraftChange({ ...draft, color })}
        />
        <button type="button" onClick={onSubmit}>
          {mode === 'add' ? m.rules.add : m.rules.save}
        </button>
        <button type="button" onClick={onClose}>
          {mode === 'add' ? m.rules.closeForm : m.rules.cancel}
        </button>
      </div>

      {/* The description of the selected action. It is needed at the moment of choosing, so it sits next to the choice */}
      <p class="hint action-hint">{m.rules.actionHints[draft.action]}</p>

      {/* Delete is kept away from the save row. Side by side, the buttons crowd and get mispressed.
          Pressing turns that same row into the confirmation, so it can be answered without moving one's eyes */}
      {onDelete && (
        <div class={confirming ? 'row add remove-row confirm' : 'row add remove-row'}>
          {confirming ? (
            <>
              <span>{m.rules.removeConfirm}</span>
              <button type="button" class="danger" onClick={onDelete}>
                {m.rules.removeYes}
              </button>
              <button type="button" onClick={() => setConfirming(false)}>
                {m.rules.removeNo}
              </button>
            </>
          ) : (
            <button type="button" class="danger" onClick={() => setConfirming(true)}>
              {m.rules.remove}
            </button>
          )}
        </div>
      )}

      {error && <p class="error">{error}</p>}
    </>
  );
};

/** For a rule given a name, fills in the conditions its name alone does not say */
const detailOf = (rule: Rule, m: Messages): string =>
  rule.label ? rule.conditions.map((c) => describeCondition(c, m)).join(m.conditions.and) : '';

export const Rules = ({ rules, order, onChange }: Props) => {
  const m = useMessages();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  // The add form opens only when pressed.
  // Always open, the input boxes would stand out more than the list and take up vertical space
  const [adding, setAdding] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  // Focus is not moved right after the screen opens. It moves only when the presser's own place disappears
  const firstRender = useRef(true);

  // If the rule being edited is deleted in another tab, the edit is abandoned
  const current = editing && rules.some((rule) => rule.id === editing.id) ? editing : null;
  // Used to decide where focus returns. `current` itself is rebuilt on every keystroke, so the id is what is watched
  const editingId = current?.id ?? null;

  // Closing the form takes its buttons with it, so the presser is returned to "Add a rule".
  // When it closed through a delete, the row itself is gone and this is the only place to return to
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!adding && !editingId) openButton.current?.focus();
  }, [adding, editingId]);

  const add = () => {
    const result = validate(draft, rules, m);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    const added = { id: newRuleId(), ...result.rule };
    // An added rule goes at the end of the order. Not in the order, it takes no part in judging
    onChange([...rules, added], [...order, added.id]);
    // Only the pattern and the name are cleared; the trait, the match mode, the action and the color stay.
    // Rules with similar conditions are often added one after another
    setDraft({
      ...draft,
      label: '',
      texts: Object.fromEntries(
        Object.entries(draft.texts).map(([target, input]) => [target, { ...input, pattern: '' }])
      ),
    });
  };

  const save = () => {
    if (!current) return;
    // The rule itself is left out of the duplicate check, or fixing only the action would trip it
    const result = validate(
      current.draft,
      rules.filter((rule) => rule.id !== current.id),
      m
    );
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    // The id is kept. The order points at rules by this id, and changing it would lose the position
    onChange(
      rules.map((rule) => (rule.id === current.id ? { id: rule.id, ...result.rule } : rule)),
      order
    );
    setEditing(null);
  };

  const startEditing = (rule: Rule) => {
    setError(null);
    setEditing({ id: rule.id, draft: toDraft(rule) });
  };

  /** Called from within the edit. The deleted row is gone, so the edit closes too */
  const remove = (id: string) => {
    onChange(rules.filter((rule) => rule.id !== id), order.filter((x) => x !== id));
    setEditing(null);
    setError(null);
  };

  const toggle = (id: string, enabled: boolean) =>
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, enabled } : rule)), order);

  /** Moves one entry within the order, leaving the rules themselves alone. Called from both ↑↓ and dragging */
  const move = (from: number, to: number) => {
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onChange(rules, next);
  };

  // Reordering by dragging. The keyboard is served by the ↑↓ on each row
  const reorder = useReorder(move);

  // The list follows the order. Normalization keeps the order matched to the rules that exist, but
  // they can disagree for a moment, right after a save for instance, so anything unresolvable is skipped
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const listed = order.map((id) => byId.get(id)).filter((rule): rule is Rule => rule !== undefined);

  return (
    <fieldset>
      <legend>{m.rules.legend}</legend>

      <ul class="rules">
        {listed.length === 0 && <li class="empty">{m.rules.empty}</li>}
        {listed.map((rule, index) =>
          current?.id === rule.id ? (
            <li key={rule.id} class="editing">
              <RuleForm
                draft={current.draft}
                onDraftChange={(next) => setEditing({ id: rule.id, draft: next })}
                onSubmit={save}
                mode="edit"
                onClose={() => {
                  setEditing(null);
                  setError(null);
                }}
                error={error}
                onDelete={() => remove(rule.id)}
              />
            </li>
          ) : (
            <li
              key={rule.id}
              class={[
                rule.enabled ? '' : 'disabled',
                reorder.from === index ? 'dragging' : '',
                // The drop line: above the destination row when moving up, below it when moving down
                reorder.to !== null && reorder.from !== null &&
                reorder.to < reorder.from && reorder.to === index
                  ? 'drop-before'
                  : '',
                reorder.to !== null && reorder.from !== null &&
                reorder.to > reorder.from && reorder.to === index
                  ? 'drop-after'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* The drag handle. Keyboard reordering is served by the ↑↓ on each row, so
                  this is a marker for fingers and mice alone */}
              <span class="grip" aria-hidden="true" {...reorder.gripProps(index)} />
              {/* The switch for stopping a rule temporarily rather than deleting it. Kept apart from the action choices */}
              <label class="inline">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  aria-label={m.rules.enabled}
                  onChange={(e) => toggle(rule.id, e.currentTarget.checked)}
                />
              </label>
              {/* What is read (name, conditions, action) is gathered into one. The controls go on the row below */}
              <div class="rule-body">
                <span class="rule-name">{ruleName(rule, m)}</span>
                {/* Only a rule given a name has anything here. It is left out when empty, to avoid an empty row */}
                {detailOf(rule, m) && <span class="rule-meta">{detailOf(rule, m)}</span>}
                <ActionBadge action={rule.action} color={rule.color} />
              </div>
              {/* The controls are gathered into one. If they do not fit the row's width,
                  the whole group wraps to the right end of the next line (`flex-wrap` in panel.css) */}
              <span class="rule-actions">
                <button
                  type="button"
                  class="move"
                  aria-label={m.rules.moveUp(ruleName(rule, m))}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="move"
                  aria-label={m.rules.moveDown(ruleName(rule, m))}
                  disabled={index === listed.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  // Pressed while another row is being edited, the values being typed would be silently discarded
                  disabled={current !== null}
                  onClick={() => startEditing(rule)}
                >
                  {m.rules.edit}
                </button>
              </span>
            </li>
          )
        )}
      </ul>

      {/* Neither the add form nor the button to open it is shown while editing: which one is being typed into would become unclear */}
      {!current &&
        (adding ? (
          <RuleForm
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={add}
            mode="add"
            onClose={() => {
              setAdding(false);
              setError(null);
            }}
            error={error}
          />
        ) : (
          <button
            ref={openButton}
            type="button"
            class="open-form"
            onClick={() => setAdding(true)}
          >
            {m.rules.openForm}
          </button>
        ))}

    </fieldset>
  );
};
