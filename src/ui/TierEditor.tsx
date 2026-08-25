/**
 * Edits one tier's settings. It knows neither which tier it belongs to nor which surface it sits on.
 * It is split into tabs because stacked vertically it would not fit on one screen.
 */
import type { ComponentChildren } from 'preact';
import { filterApplies, syncOrder, type FilterNode, type SettingsNode } from '../settings/schema.ts';
import type { Inherited } from '../settings/resolve.ts';
import { BoolSelect } from './fields.tsx';
import { Appearance } from './Appearance.tsx';
import { useMessages } from './messages.tsx';
import { Rules } from './Rules.tsx';

const TABS = ['filter', 'appearance', 'effective'] as const;

export type Tab = (typeof TABS)[number];

type Props = {
  node: SettingsNode;
  onChange: (node: SettingsNode) => void;
  /**
   * The tab that is open. The state is held above (`SettingsApp`).
   * Held here, every scope switch would rebuild the component and fall back to the first tab.
   */
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  /** The values coming down from the tiers above. Shown dimmed in the fields left unset */
  inherited: Inherited;
  /**
   * The "what is in effect" surface. The third tab appears only when this is passed.
   * Its contents cannot be built without knowing all three tiers, so building it is left to the caller.
   */
  effective?: ComponentChildren;
};

export const TierEditor = ({ node, onChange, tab, onTabChange, inherited, effective }: Props) => {
  const m = useMessages();
  const updateFilter = (patch: Partial<FilterNode>) =>
    onChange({ ...node, filter: { ...node.filter, ...patch } });

  const tabs = TABS.filter((key) => key !== 'effective' || effective);
  // Moving away from a column removes the third tab. If the open tab is gone, fall back to the first
  const current = tabs.includes(tab) ? tab : 'filter';

  return (
    <>
      {/*
        No `role="tablist"` is claimed. Claiming it would set an expectation of arrow-key movement
        and roving tabindex, which is not worth carrying for two pressable buttons side by side.
        Which one is open is conveyed by `aria-current` (the same practice as the list on the left)
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
            {m.tabs[key]}
          </button>
        ))}
      </nav>

      {current === 'filter' && (
        <>
          {/*
            The only description always shown on this tab is this one.
            The judging order needs to be known before there is even one rule.
            The order across tiers is gathered here as well (there was nowhere left outside the tabs)
          */}
          <p class="hint">{m.rules.orderHint}</p>

          {/*
            With only one field, no group box is drawn around it.
            A box would make the group's heading and the field's name say the same thing twice
          */}
          <label class="row filter-toggle">
            <span>{m.filterToggle.label}</span>
            <BoolSelect
              value={node.filter.enabled}
              // With nothing set yet, show the value that actually applies, looking up to the top (the same function judging uses, in schema.ts)
              effective={filterApplies(inherited.enabled)}
              onChange={(enabled) => updateFilter({ enabled })}
              label={m.filterToggle.label}
              on={m.filterToggle.on}
              off={m.filterToggle.off}
            />
          </label>

          {/*
            The list and the order are the same thing. Adding or removing a rule aligns the order too.
            A rule not in the order takes no part in judging
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
          onChange={(appearance) => onChange({ ...node, appearance })}
        />
      )}

      {current === 'effective' && effective}
    </>
  );
};
