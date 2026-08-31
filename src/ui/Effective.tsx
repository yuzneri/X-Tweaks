/**
 * What is in effect. Shows the result of merging the three tiers as it is, with the
 * origin tier attached. Nothing can be changed on this surface; to change something, go to its origin tier.
 */
import {
  appearanceApplies,
  collapsesNewlines,
  filterApplies,
  isCompact,
  mediaCollapses,
  ruleName,
  type AppearanceNode,
  type SettingsNode,
  type Settings,
} from '../settings/schema.ts';
import {
  resolve,
  ruleSourceOf,
  sourceOf,
  type ColumnScope,
  type Tier,
} from '../settings/resolve.ts';
import type { Messages } from '../i18n/index.ts';
import { COLOR_ORDER } from './Appearance.tsx';
import { useMessages } from './messages.tsx';

type Props = {
  settings: Settings;
  /** Which column it is shown for. This surface appears only while a column is selected */
  scope: ColumnScope;
};

const From = ({ tier }: { tier: Tier | null }) => {
  const m = useMessages();
  return tier ? <span class="from">{m.effective.from[tier]}</span> : null;
};

/** One row of value and origin. An item with no value reads "Not set" */
const Row = ({ label, value, tier }: { label: string; value: string | null; tier: Tier | null }) => {
  const m = useMessages();
  return (
    <div class="effective-row">
      <span class="effective-label">{label}</span>
      <span class={value === null ? 'effective-value unset' : 'effective-value'}>
        {value ?? m.effective.unset}
      </span>
      <From tier={tier} />
    </div>
  );
};

/** An item in px. The unit is decided by the caller (only lines use "lines") */
const size = (value: number | null, unit: string): string | null =>
  value === null ? null : `${value}${unit}`;

const appearanceRows = (
  settings: Settings,
  scope: ColumnScope,
  effective: AppearanceNode,
  m: Messages
): { label: string; value: string | null; tier: Tier | null }[] => {
  const of = <T,>(pick: (node: SettingsNode) => T | null) => sourceOf(settings, scope, pick);
  const colors = m.appearance.colors;
  return [
    {
      label: m.appearance.columnWidth,
      value: size(effective.columnWidth, m.size.unit),
      tier: of((n) => n.appearance.columnWidth),
    },
    {
      label: m.appearance.compact,
      // Unset has a default side too (not packed). Say which one is in effect
      value: isCompact(effective.compact) ? m.appearance.compactOn : m.appearance.compactOff,
      tier: of((n) => n.appearance.compact),
    },
    {
      label: m.appearance.fontSize,
      value: size(effective.fontSize, m.size.unit),
      tier: of((n) => n.appearance.fontSize),
    },
    {
      label: m.appearance.maxLines,
      value: size(effective.maxLines, m.appearance.lines),
      tier: of((n) => n.appearance.maxLines),
    },
    {
      label: m.appearance.collapseNewlines,
      value: collapsesNewlines(effective.collapseNewlines)
        ? m.appearance.collapseNewlinesOn
        : m.appearance.collapseNewlinesOff,
      tier: of((n) => n.appearance.collapseNewlines),
    },
    {
      label: m.appearance.media.maxThumbHeight,
      value: size(effective.media.maxThumbHeight, m.size.unit),
      tier: of((n) => n.appearance.media.maxThumbHeight),
    },
    {
      label: m.appearance.media.collapse,
      // Unset has a default side too (shown). Say which one is in effect
      value: mediaCollapses(effective.media.collapse)
        ? m.appearance.media.collapseOn
        : m.appearance.media.collapseOff,
      tier: of((n) => n.appearance.media.collapse),
    },
    // Colors are listed in the same order as on the editing surface, so the two can be compared
    ...COLOR_ORDER.map((key) => ({
      label: colors[key],
      value: effective.colors[key],
      tier: of((n) => n.appearance.colors[key]),
    })),
  ];
};

export const Effective = ({ settings, scope }: Props) => {
  const m = useMessages();
  const merged = resolve(settings, scope);
  const filtering = filterApplies(merged.filter.enabled);
  const styling = appearanceApplies(merged.appearance.enabled);
  /*
   * The merged value is shown even where it is switched off (`appearanceFor` returns empty).
   * This matches not clearing the list when the rules are switched off. That it has no effect
   * is conveyed by the notice above, and "what applies once it is back on" can be read here too.
   */
  const appearance = merged.appearance;

  /** Listed in judging order. Every id in the order exists in one of the tiers */
  const byId = new Map(merged.filter.rules.map((rule) => [rule.id, rule]));
  const rules = merged.filter.order.map((id) => byId.get(id)).filter((rule) => rule !== undefined);

  return (
    <>
      <p class="hint">{m.effective.hint}</p>

      <fieldset>
        <legend>{m.effective.rules}</legend>
        {/*
          A tier that is switched off is shown too: a notice alone does not say where to fix it.
          The point of this surface is tracing why things are as they are, so the origin is needed
        */}
        <Row
          label={m.filterToggle.label}
          value={filtering ? m.filterToggle.on : m.filterToggle.off}
          tier={sourceOf(settings, scope, (n) => n.filter.enabled)}
        />
        {!filtering && <p class="warning">{m.effective.filterStopped}</p>}
        {rules.length === 0 ? (
          <p class="hint">{m.effective.noRules}</p>
        ) : (
          <ol class="effective-rules">
            {rules.map((rule) => (
              <li key={rule.id} class={rule.enabled ? undefined : 'off'}>
                <span class="effective-label">{ruleName(rule, m)}</span>
                <span class="action-badge">{m.actions[rule.action]}</span>
                {/* Rules stopped rather than deleted are shown too, this being the screen for tracing "why is this not applying" */}
                {!rule.enabled && <span class="rule-meta">{m.effective.disabled}</span>}
                <From tier={ruleSourceOf(settings, scope, rule.id)} />
              </li>
            ))}
          </ol>
        )}
      </fieldset>

      <fieldset>
        <legend>{m.effective.appearance}</legend>
        <Row
          label={m.appearanceToggle.label}
          value={styling ? m.appearanceToggle.on : m.appearanceToggle.off}
          tier={sourceOf(settings, scope, (n) => n.appearance.enabled)}
        />
        {!styling && <p class="warning">{m.effective.appearanceStopped}</p>}
        {appearanceRows(settings, scope, appearance, m).map((row) => (
          <Row key={row.label} {...row} />
        ))}
      </fieldset>
    </>
  );
};
