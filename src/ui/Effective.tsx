/**
 * What is in effect. Shows the result of merging the tiers as it is, with the
 * origin tier attached. Nothing can be changed on this surface; to change something, go to its origin tier.
 */
import {
  appearanceApplies,
  cardStyleOf,
  collapsesNewlines,
  filterApplies,
  isCompact,
  mediaStyleOf,
  quoteStyleOf,
  ruleName,
  colorItem,
  type AppearanceNode,
  type ClearableItem,
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
import { COLOR_ORDER, isAccountColor, isColumnColor, isXOnlyColor } from './Appearance.tsx';
import type { Site } from './ScopeList.tsx';
import { useMessages } from './messages.tsx';

type Props = {
  settings: Settings;
  /** Which column it is shown for. This surface appears only while a column is selected */
  scope: ColumnScope;
  /** Which site it belongs to. The column-only items are left out where they cannot apply */
  site: Site;
};

const From = ({ tier, site }: { tier: Tier | null; site: Site }) => {
  const m = useMessages();
  if (!tier) return null;
  // `view` is `column` under another name, so it is picked here rather than being a tier
  const words = m.effective.from;
  return <span class="from">{tier === 'column' && site === 'x' ? words.view : words[tier]}</span>;
};

/** One row of value and origin. An item with no value reads "Not set" */
const Row = ({
  label,
  value,
  tier,
  site,
}: {
  label: string;
  value: string | null;
  tier: Tier | null;
  site: Site;
}) => {
  const m = useMessages();
  return (
    <div class="effective-row">
      <span class="effective-label">{label}</span>
      <span class={value === null ? 'effective-value unset' : 'effective-value'}>
        {value ?? m.effective.unset}
      </span>
      <From tier={tier} site={site} />
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
  site: Site,
  m: Messages
): { label: string; value: string | null; tier: Tier | null }[] => {
  /*
   * The item's name goes along with the picker for the items a tier can put back to "as X
   * shows it": that tier is the origin of the answer even when the answer is "nothing"
   * (`sourceOf` in settings/resolve.ts).
   */
  const of = <T,>(pick: (node: SettingsNode) => T | null, item?: ClearableItem) =>
    sourceOf(settings, scope, pick, item);
  /*
   * The column-only items are left out where a scope is not a column: the applying side
   * drops them there (`withoutColumnItems`), so listing them would name a value that is
   * not in effect on the very surface for reading what is
   */
  const columns = site !== 'x';
  return [
    ...(columns
      ? [
          {
            label: m.appearance.columnWidth,
            value: size(effective.columnWidth, m.size.unit),
            tier: of((n) => n.appearance.columnWidth, 'columnWidth'),
          },
        ]
      : []),
    {
      label: m.appearance.compact,
      // Unset has a default side too (not packed). Say which one is in effect
      value: isCompact(effective.compact) ? m.appearance.compactOn : m.appearance.compactOff,
      tier: of((n) => n.appearance.compact),
    },
    {
      label: m.appearance.fontSize,
      value: size(effective.fontSize, m.size.unit),
      tier: of((n) => n.appearance.fontSize, 'fontSize'),
    },
    {
      label: m.appearance.maxLines,
      value: size(effective.maxLines, m.appearance.lines),
      tier: of((n) => n.appearance.maxLines, 'maxLines'),
    },
    {
      label: m.appearance.wordsShown,
      value: size(effective.wordsShown, m.appearance.characters),
      tier: of((n) => n.appearance.wordsShown, 'wordsShown'),
    },
    {
      label: m.appearance.collapseNewlines,
      value: collapsesNewlines(effective.collapseNewlines)
        ? m.appearance.collapseNewlinesOn
        : m.appearance.collapseNewlinesOff,
      tier: of((n) => n.appearance.collapseNewlines),
    },
    {
      label: m.appearance.media.style,
      // Unset has a default side too (shown). Say which one is in effect
      value: m.appearance.media.styles[mediaStyleOf(effective.media.style)],
      tier: of((n) => n.appearance.media.style),
    },
    {
      label: m.appearance.media.maxThumbHeight,
      value: size(effective.media.maxThumbHeight, m.size.unit),
      tier: of((n) => n.appearance.media.maxThumbHeight, 'media.maxThumbHeight'),
    },
    {
      label: m.appearance.cardStyle,
      value: m.appearance.attachmentStyles[cardStyleOf(effective.cardStyle)],
      tier: of((n) => n.appearance.cardStyle),
    },
    {
      label: m.appearance.quoteStyle,
      value: m.appearance.attachmentStyles[quoteStyleOf(effective.quoteStyle)],
      tier: of((n) => n.appearance.quoteStyle),
    },
    /*
     * Colors are listed in the same order as on the editing surface, so the two can be
     * compared. Left out are the ones this scope does not decide: a column's on a site
     * with no columns, the page's on the site that has no page to paint, and the compose
     * form's, which is answered as far up as the account and would read here as though
     * the scope on screen had a say in it.
     */
    ...COLOR_ORDER.filter(
      (key) =>
        (columns || !isColumnColor(key)) && (!columns || !isXOnlyColor(key)) && !isAccountColor(key)
    ).map((key) => ({
      label: m.appearance.colors[key],
      value: effective.colors[key],
      tier: of((n) => n.appearance.colors[key], colorItem(key)),
    })),
  ];
};

export const Effective = ({ settings, scope, site }: Props) => {
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
      <p class="hint">{site === 'x' ? m.effective.hintView : m.effective.hint}</p>

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
          site={site}
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
                <From tier={ruleSourceOf(settings, scope, rule.id)} site={site} />
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
          site={site}
        />
        {!styling && <p class="warning">{m.effective.appearanceStopped}</p>}
        {appearanceRows(settings, scope, appearance, site, m).map((row) => (
          <Row key={row.label} {...row} site={site} />
        ))}
      </fieldset>
    </>
  );
};
