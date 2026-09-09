/**
 * Edits one tier's settings. Does not know which tier it belongs to, and passes the site
 * along without reading it — the appearance is the one part that cares. Split into tabs:
 * stacked vertically it would not fit on one screen.
 */
import type { ComponentChildren } from 'preact';
import { filterApplies, syncOrder, type FilterNode, type SettingsNode } from '../settings/schema.ts';
import type { Inherited } from '../settings/resolve.ts';
import { BoolSelect } from './fields.tsx';
import { Appearance } from './Appearance.tsx';
import type { Site } from './ScopeList.tsx';
import { useMessages } from './messages.tsx';
import { Rules } from './Rules.tsx';

/**
 * The last three are not the tier's settings at all: `effective` reads the tiers back, and
 * `site` and `injected` hold what belongs to the whole site the tier is for. They come last
 * so the two tabs editing the tier itself stay put on every page. The site's own settings
 * get two tabs, not one, being two subjects that one word could only cover vaguely; what
 * `site` holds differs between the two sites, so its name is passed in (see `screens`).
 */
const TABS = ['filter', 'appearance', 'effective', 'site', 'timeline'] as const;

export type Tab = (typeof TABS)[number];

type Props = {
  node: SettingsNode;
  onChange: (node: SettingsNode) => void;
  /**
   * The tab that is open, held above (`SettingsApp`): held here, every scope switch would
   * rebuild the component and fall back to the first tab.
   */
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  /** The values coming down from the tiers above, shown dimmed in the fields left unset */
  inherited: Inherited;
  /**
   * Which site these settings are for; names the innermost tier and picks the appearance's
   * items (see `Site`)
   */
  site: Site;
  /** Whether the range being edited is one column or view; passed along for the appearance */
  oneColumn: boolean;
  /**
   * The "what is in effect" surface; that tab appears only when this is passed. Its contents
   * cannot be built without knowing every tier, so building it is left to the caller.
   */
  effective?: ComponentChildren;
  /**
   * The settings belonging to the whole site, not this tier: what X puts on the page, what
   * the compose form does after a post, and what X slips into a timeline. Passed only on a
   * site's own page. Each carries its own name: what a site keeps here differs between the
   * two — X Pro has the compose form, x.com the furniture around the timeline — so one
   * shared word would fit neither.
   */
  screens?: { key: 'site' | 'timeline'; label: string; content: ComponentChildren }[];
};

export const TierEditor = ({
  node,
  onChange,
  tab,
  onTabChange,
  inherited,
  site,
  oneColumn,
  effective,
  screens,
}: Props) => {
  const m = useMessages();
  const updateFilter = (patch: Partial<FilterNode>) =>
    onChange({ ...node, filter: { ...node.filter, ...patch } });

  const named = new Map((screens ?? []).map((one) => [one.key, one]));
  // The last tabs each belong to one kind of scope, appearing only where they apply
  const tabs = TABS.filter((key) => {
    if (key === 'effective') return !!effective;
    if (key === 'site' || key === 'timeline') return named.has(key);
    return true;
  });
  // Moving between scopes takes tabs away; if the open tab is gone, fall back to the first
  const current = tabs.includes(tab) ? tab : 'filter';

  return (
    <>
      {/*
        No `role="tablist"`: it would set an expectation of arrow-key movement and roving
        tabindex, not worth carrying for two pressable buttons side by side. Which one is
        open is conveyed by `aria-current` (the same practice as the list on the left)
      */}
      <nav class="tabs" aria-label={m.tabs.label}>
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            aria-current={key === current ? 'true' : undefined}
            class={key === current ? 'tab current' : 'tab'}
            onClick={() => onTabChange(key)}
          >
            {/* The site's own tabs are named by the caller, the tier's by the dictionary */}
            {key === 'site' || key === 'timeline' ? named.get(key)?.label : m.tabs[key]}
          </button>
        ))}
      </nav>

      {current === 'filter' && (
        <>
          {/*
            The only description always shown on this tab: the judging order needs to be
            known before there is even one rule. The order across tiers is gathered here too
          */}
          <p class="hint">{m.rules.orderHint(m.rules.orderScopes[site])}</p>

          {/*
            With only one field, no group box is drawn around it: a box would make the
            group's heading and the field's name say the same thing twice
          */}
          <label class="row filter-toggle">
            <span>{m.filterToggle.label}</span>
            <BoolSelect
              value={node.filter.enabled}
              // Unset shows the value that actually applies, looking to the top
              // (`filterApplies`, schema.ts)
              effective={filterApplies(inherited.enabled)}
              onChange={(enabled) => updateFilter({ enabled })}
              label={m.filterToggle.label}
              on={m.filterToggle.on}
              off={m.filterToggle.off}
              // The switch itself, not a display change: "apply" belongs on top
              onFirst
            />
          </label>

          {/*
            The list and the order are the same thing: adding or removing a rule aligns the
            order too. A rule not in the order takes no part in judging
          */}
          <Rules
            rules={node.filter.rules}
            order={node.filter.order}
            onChange={(rules, order) => updateFilter({ rules, order: syncOrder(order, rules) })}
          />
        </>
      )}

      {current === 'appearance' && (
        <Appearance
          node={node.appearance}
          inherited={inherited.appearance}
          settable={inherited.settable}
          site={site}
          oneColumn={oneColumn}
          onChange={(appearance) => onChange({ ...node, appearance })}
        />
      )}

      {current === 'effective' && effective}

      {(current === 'site' || current === 'timeline') && named.get(current)?.content}
    </>
  );
};
