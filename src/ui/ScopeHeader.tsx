/**
 * The right pane's heading. It keeps what is being edited visible at the top, and
 * reassigning and deleting unassigned settings happen here too.
 * Reassignment is not in the list on the left: "select" and "move to another key" side by side invite mispresses.
 */
import { useState } from 'preact/hooks';
import { useMessages } from './messages.tsx';
import type { ScopeEntry } from './ScopeList.tsx';

export type ReassignTarget = { key: string; label: string };

type Props = {
  entry: ScopeEntry;
  /** Candidate destinations. Ones that already have settings are left out, to avoid overwriting */
  targets: ReassignTarget[];
  onReassign: (to: string) => void;
  onRemove: () => void;
  /** Removes it from the record of detected columns. Passed only while a column tier is selected */
  onForget?: () => void;
};

export const ScopeHeader = ({ entry, targets, onReassign, onRemove, onForget }: Props) => {
  const m = useMessages();
  const [forgetting, setForgetting] = useState(false);
  // Whole sentences change with the language, so a branch of the dictionary is chosen rather than a word slotted in
  const words = entry.scope.tier === 'accounts' ? m.unassigned.account : m.unassigned.column;

  return (
    <>
      <div class="scope-header">
        {/* The right pane's heading. Navigating by heading with a screen reader lands on the scope being edited */}
        <h2 class="scope-label">{entry.label}</h2>
        {entry.detail && <span class="rule-meta">{entry.detail}</span>}
        {entry.unassigned && (
          <span class="action-badge" title={words.notFound}>
            {m.unassigned.badge}
          </span>
        )}
      </div>

      {entry.unassigned && (
        <div class="reassign">
          <div class="row">
            <span>{words.moveTo}</span>
            <select
              value=""
              disabled={targets.length === 0}
              onChange={(e) => {
                const to = e.currentTarget.value;
                if (to) onReassign(to);
              }}
            >
              <option value="">
                {targets.length === 0 ? words.noTargets : m.unassigned.chooseTarget}
              </option>
              {targets.map((target) => (
                <option key={target.key} value={target.key}>
                  {target.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={onRemove}>
              {m.unassigned.remove}
            </button>
          </div>
          <p class="hint">{words.skipConfigured}</p>
        </div>
      )}

      {/*
        Drops a deleted column from the list.
        The confirmation is only interposed when it has settings: without them nothing is lost,
        and a column that is still there gets listed again on the next detection.
      */}
      {onForget && !entry.unassigned && (
        forgetting ? (
          <div class="row add confirm">
            <span>{m.forget.confirm}</span>
            <button
              type="button"
              class="danger"
              onClick={() => {
                setForgetting(false);
                onForget();
              }}
            >
              {m.forget.confirmYes}
            </button>
            <button type="button" onClick={() => setForgetting(false)}>
              {m.forget.confirmNo}
            </button>
          </div>
        ) : (
          <div class="row add remove-row">
            <button
              type="button"
              title={m.forget.hint}
              onClick={() => (entry.configured ? setForgetting(true) : onForget())}
            >
              {m.forget.action}
            </button>
          </div>
        )
      )}
    </>
  );
};
