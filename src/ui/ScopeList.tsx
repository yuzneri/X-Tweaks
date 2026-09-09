/**
 * The list of scopes settings apply to (the left pane). Global, accounts, columns and
 * unassigned are shown in one list, and selecting one switches the right pane.
 */
import type { SurfaceId } from '../surface/index.ts';
import { useMessages } from './messages.tsx';

/** Where settings are edited. The tier and the key gathered into one value */
/**
 * Which site the settings on the right belong to. `both` is the global and account tiers, which the
 * two sites share. What differs by site is what a scope *is* there — a column of X Pro's deck, or a
 * view of x.com — so anything that names one takes this.
 */
export type Site = 'both' | 'pro' | 'x';

export type Scope =
  | { tier: 'global' }
  | { tier: 'accounts'; key: string }
  | { tier: 'columns'; key: string }
  /**
   * One whole site. A tier of its own, below the account and above the column (`tiersFor` in
   * settings/resolve.ts), and where the settings live that belong to the site rather than to any
   * scope in it — what X draws around the timeline, and what the compose form does after a post.
   */
  | { tier: 'surface'; key: SurfaceId }
  /**
   * One account, on one site. The tier below the site and above the column, where an account's
   * exception on one of the two sites is written. It carries the site as well as the account: the
   * account alone does not say which page, and the same account on the two sites is two scopes.
   */
  | { tier: 'surfaceAccount'; surface: SurfaceId; key: string }
  /** The extension itself: what it is set to, and what it is. Nothing to do with any site */
  | { tier: 'meta'; key: 'settings' | 'about' };

/**
 * The string used for identity and comparison. Global carries no key. The separator is written as an
 * escape because a raw control character would make git treat this file as binary and its diffs unreadable.
 */
export const scopeKey = (scope: Scope): string =>
  scope.tier === 'global'
    ? 'global'
    : scope.tier === 'surfaceAccount'
      ? `${scope.tier}\u0000${scope.surface}\u0000${scope.key}`
      : `${scope.tier}\u0000${scope.key}`;

export type ScopeEntry = {
  scope: Scope;
  label: string;
  /** A note that helps tell entries apart: the account for a scope, what an account holds */
  detail?: string;
  unassigned: boolean;
  /** It has some setting or other. Makes it clear at a glance what was put where */
  configured: boolean;
};

export type ScopeGroup = {
  /** The group's heading. Global is alone, so it has none */
  label?: string;
  /** A short note beside the heading. Used to mark the deck currently on screen */
  note?: string;
  entries: ScopeEntry[];
  /** What to show instead when the group is empty. Groups removed entirely when empty, like unassigned, have none */
  empty?: string;
};

type Props = {
  groups: ScopeGroup[];
  active: Scope;
  onSelect: (scope: Scope) => void;
  /** A notice above the list. Used when pro.x.com is not open */
  note?: string;
};

export const ScopeList = ({ groups, active, onSelect, note }: Props) => {
  const m = useMessages();
  const activeKey = scopeKey(active);

  return (
    <nav class="pane scopes" aria-label={m.tiers.label}>
      {note && <p class="hint">{note}</p>}
      {groups.map((group, index) => (
        <div class="scope-group" key={group.label ?? index}>
          {group.label && (
            <h2>
              {group.label}
              {group.note && <span class="group-note">{group.note}</span>}
            </h2>
          )}
          <ul>
            {group.entries.length === 0 && group.empty && <li class="empty">{group.empty}</li>}
            {group.entries.map((entry) => {
              const key = scopeKey(entry.scope);
              const current = key === activeKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    class={current ? 'scope current' : 'scope'}
                    // Pressable items are listed, so which one is selected is conveyed to screen readers too
                    aria-current={current ? 'true' : undefined}
                    onClick={() => onSelect(entry.scope)}
                  >
                    <span class="scope-label">{entry.label}</span>
                    {entry.detail && <span class="scope-detail">{entry.detail}</span>}
                    {entry.configured && (
                      <span class="scope-dot" role="img" aria-label={m.unassigned.configured} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};
