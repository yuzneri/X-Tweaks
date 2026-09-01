/**
 * The skeleton of the settings screen. It holds the settings in one place and assembles
 * the scope switching and the per-tier partial updates. Two panes: where settings apply on the left, what to set on the right.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LANGUAGES, localeOf, messagesFor, type Language, type Locale } from '../i18n/index.ts';
import { MessagesProvider, useMessages } from './messages.tsx';
import {
  emptyNode,
  filterApplies,
  hasContent,
  isEmptyNode,
  SCHEMA_VERSION,
  type SettingsNode,
} from '../settings/schema.ts';
import {
  forgetScope,
  loadAdGuard,
  loadDetected,
  loadHealth,
  loadPaused,
  subscribeAdGuard,
  subscribeDetected,
  subscribeHealth,
  subscribePaused,
} from '../settings/storage.ts';
import type { Marker } from '../filter/health.ts';
import {
  allScopes,
  emptyDetected,
  type Detected,
  type DetectedScope,
} from '../settings/detected.ts';
import { enabledAt, inheritedFor, type ColumnScope } from '../settings/resolve.ts';
import { TierEditor, type Tab } from './TierEditor.tsx';
import { ScopeHeader, type ReassignTarget } from './ScopeHeader.tsx';
import { ScopeList, scopeKey, type Scope, type ScopeEntry, type ScopeGroup } from './ScopeList.tsx';
import { Transfer } from './Transfer.tsx';
import { Compose } from './Compose.tsx';
import { Effective } from './Effective.tsx';
import { useSettings } from './useSettings.ts';

/**
 * Detection is only possible while pro.x.com is open. Otherwise only the items with settings are listed.
 * Whether the read has finished is returned too: before it, "none yet" is indistinguishable
 * from zero, and the panel would show "no columns found" the instant it opens.
 */
const useDetected = (): { detected: Detected; loaded: boolean } => {
  const [detected, setDetected] = useState<Detected>(emptyDetected);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    loadDetected().then((found) => {
      setDetected(found);
      setLoaded(true);
    });
    return subscribeDetected(setDetected);
  }, []);
  return { detected, loaded };
};

/**
 * Whether the whole extension is paused. Edits are still saved while it is, but nothing
 * applies, so this is read only to say so. The toggle itself is in the popup.
 */
const usePaused = (): boolean => {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    void loadPaused().then(setPaused);
    return subscribePaused(setPaused);
  }, []);
  return paused;
};

/** Whether ad detection was switched off. The content script writes it; this screen only reads it and says so */
const useAdGuard = (): boolean => {
  const [tripped, setTripped] = useState(false);
  useEffect(() => {
    void loadAdGuard().then(setTripped);
    return subscribeAdGuard(setTripped);
  }, []);
  return tripped;
};

/** The broken markers of X. The content script writes them; this only reads them and says so */
const useHealth = (): Marker[] => {
  const [broken, setBroken] = useState<Marker[]>([]);
  useEffect(() => {
    void loadHealth().then(setBroken);
    return subscribeHealth(setBroken);
  }, []);
  return broken;
};

/** The language selector. It belongs to none of the three tiers, so it sits outside the scope switching */
const LanguageSelect = ({
  value,
  onChange,
}: {
  value: Language;
  onChange: (language: Language) => void;
}) => {
  const m = useMessages();
  return (
    <label class="language">
      <span>{m.language.label}</span>
      <select value={value} onChange={(e) => onChange(e.currentTarget.value as Language)}>
        {LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {m.language[language]}
          </option>
        ))}
      </select>
    </label>
  );
};

type Props = {
  /**
   * Where to land right after opening.
   * Used to bring up a column's settings immediately when opened from that column's header.
   */
  start?: Scope;
  /**
   * Reports the resolved language. Whether `document` is touched is decided per placement,
   * so this component is kept unaware of where it was placed.
   * Rewriting X's `<html lang>` from the in-page panel would not be undone by removing the extension.
   */
  onLocale?: (locale: Locale) => void;
  /**
   * Whether this surface may offer import and export. Only the options page passes true.
   * The in-page panel lives inside pro.x.com, where creating a `blob:` can be affected by X's CSP.
   */
  exportable?: boolean;
};

export const SettingsApp = ({ onLocale, start, exportable }: Props = {}) => {
  const { settings, unreadable, status, update, reportSaveFailed, loaded } = useSettings();
  const locale = localeOf(settings.language);
  const m = messagesFor(locale);

  useEffect(() => onLocale?.(locale), [locale, onLocale]);
  const [scope, setScope] = useState<Scope>(start ?? { tier: 'global' });
  // The tab is held above the scope, so switching scope leaves the open tab as it is
  const [tab, setTab] = useState<Tab>('filter');
  // Import/export is not left open. On closing, focus returns to the button that opened it
  const [transferring, setTransferring] = useState(false);
  const transferButton = useRef<HTMLButtonElement>(null);
  const { detected: found, loaded: detectedLoaded } = useDetected();
  // "What exists now" is taken from every deck in the record.
  // Going by the deck on screen alone would drop other decks' columns and accounts into "unassigned"
  const detected = useMemo(() => allScopes(found), [found]);
  const paused = usePaused();
  const adGuard = useAdGuard();
  const broken = useHealth();
  // The lists are not shown until the settings and the detection have been read, being indistinguishable from empty
  const ready = loaded && detectedLoaded;
  // With pro.x.com not open, nothing can be detected.
  // Showing "unassigned" in that state would look as though the settings had come loose
  const detecting = found.groups.length > 0;

  const updateGlobal = (node: SettingsNode) => update({ ...settings, global: node });
  /**
   * Writes a tier's settings back. Once it returns to setting nothing, the key goes with it.
   * Empty settings left behind would be listed as a contentless "unassigned" once their column disappeared.
   */
  const put = (nodes: Record<string, SettingsNode>, key: string, node: SettingsNode) => {
    const next = { ...nodes };
    if (isEmptyNode(node)) delete next[key];
    else next[key] = node;
    return next;
  };

  const updateAccount = (key: string, node: SettingsNode) =>
    update({ ...settings, accounts: put(settings.accounts, key, node) });
  const updateColumn = (key: string, node: SettingsNode) =>
    update({ ...settings, columns: put(settings.columns, key, node) });

  /** Moves settings to another key. No overwrite can happen (keys with settings are left out of the targets) */
  const moveIn = (nodes: Record<string, SettingsNode>, from: string, to: string) => {
    const moved = { ...nodes, [to]: nodes[from]! };
    delete moved[from];
    return moved;
  };
  const removeFrom = (nodes: Record<string, SettingsNode>, key: string) => {
    const rest = { ...nodes };
    delete rest[key];
    return rest;
  };

  /** Whether to mark it: it has content and filtering is in effect */
  const marked = (node: SettingsNode | undefined, scope: ColumnScope): boolean =>
    hasContent(node) && filterApplies(enabledAt(settings, scope));

  /** Lists the accounts detected, and the accounts only their settings remain for */
  const accountEntries = useMemo<ScopeEntry[]>(() => {
    const live = new Set(detected.map((scope) => scope.account).filter((a) => a !== null));
    const keys = [...new Set([...live, ...Object.keys(settings.accounts)])];
    return keys.sort().map((account) => ({
      scope: { tier: 'accounts', key: account },
      label: `@${account}`,
      detail: live.has(account)
        ? m.tiers.columnCount(detected.filter((scope) => scope.account === account).length)
        : undefined,
      unassigned: detecting && !live.has(account),
      configured: marked(settings.accounts[account], { account, columnId: null }),
    }));
  }, [detected, settings, detecting, m]);

  /**
   * The groups of columns per deck. The heading is the deck's name, or a number when unreadable.
   * Columns with the same name are numbered across decks: the same name in another deck is
   * common, and telling them apart is needed even across groups.
   */
  const deckGroups = useMemo<ScopeGroup[]>(() => {
    const all = detected;
    const identityOf = (scope: DetectedScope) => JSON.stringify([scope.title, scope.account]);
    const duplicated = new Set(
      all.map(identityOf).filter((key, i, keys) => keys.indexOf(key) !== i)
    );
    const seen = new Map<string, number>();

    return found.groups.map((group, index) => ({
      label: group.name ?? m.tiers.deckNth(index + 1),
      note: group.id === found.currentGroupId ? m.tiers.deckShowing : undefined,
      empty: m.tiers.columnsEmpty,
      entries: group.scopes.map((column): ScopeEntry => {
        const identity = identityOf(column);
        const order = (seen.get(identity) ?? 0) + 1;
        seen.set(identity, order);
        const account = column.account ? `@${column.account}` : null;
        const number = duplicated.has(identity) ? m.tiers.nth(order) : null;
        // It has settings but was not found when this deck was reopened
        const missing = column.missing ? m.tiers.columnMissing : null;
        return {
          scope: { tier: 'columns', key: column.key },
          label: column.title ?? m.tiers.unnamedColumn,
          detail: [missing, account, number].filter(Boolean).join(' / ') || undefined,
          unassigned: false,
          configured: marked(settings.columns[column.key], {
            account: column.account,
            columnId: column.key,
          }),
        };
      }),
    }));
  }, [found, detected, settings, m]);

  const missingColumns = useMemo<ScopeEntry[]>(() => {
    const liveIds = new Set(detected.map((scope) => scope.key));
    return Object.keys(settings.columns)
      .filter((id) => !liveIds.has(id))
      .sort()
      .map((id): ScopeEntry => ({
        scope: { tier: 'columns', key: id },
        label: detecting ? m.tiers.missingColumn : m.tiers.unknownColumn,
        detail: id,
        unassigned: detecting,
        // With no matching column, the account is unknown too. The effective value is judged up to global
        configured: marked(settings.columns[id], { account: null, columnId: id }),
      }));
  }, [detected, settings, detecting, m]);

  /** Global is always there. It heads the list and catches the fall when the chosen scope disappears */
  const globalEntry = useMemo<ScopeEntry>(
    () => ({
      scope: { tier: 'global' },
      label: m.tiers.global,
      unassigned: false,
      configured: marked(settings.global, { account: null, columnId: null }),
    }),
    [settings, m]
  );

  /**
   * The list on the left: global → accounts → columns per deck → unassigned.
   * The unassigned entries are gathered into one group across the tiers.
   * Even when not one deck could be read, a single column group is shown to explain the situation
   * (with no group, the column tier itself would look absent).
   */
  const groups = useMemo<ScopeGroup[]>(() => {
    const unassigned = [...accountEntries, ...missingColumns].filter((entry) => entry.unassigned);
    return [
      { entries: [globalEntry] },
      {
        label: m.tiers.accounts,
        entries: accountEntries.filter((entry) => !entry.unassigned),
        empty: m.tiers.accountsEmpty,
      },
      ...(deckGroups.length > 0
        ? deckGroups
        : [{ label: m.tiers.columns, entries: [], empty: m.tiers.columnsEmpty }]),
      // An empty group is not shown at all. A heading left with nothing to tidy up suggests there is something
      ...(unassigned.length > 0 ? [{ label: m.tiers.unassignedGroup, entries: unassigned }] : []),
    ];
  }, [globalEntry, accountEntries, deckGroups, missingColumns, m]);

  /**
   * The scope shown on the right. The selection itself is not rewritten: detection arrives late,
   * so right after opening from the column options that column is not in the list yet, and
   * a `setScope` here would move to global before the detection arrives.
   */
  const current =
    groups
      .flatMap((group) => group.entries)
      .find((entry) => scopeKey(entry.scope) === scopeKey(scope)) ?? globalEntry;

  /** Where it can be moved to. Ones that already have settings are left out, to avoid overwriting */
  const reassignTargets = useMemo<ReassignTarget[]>(() => {
    if (current.scope.tier === 'accounts') {
      return [...new Set(detected.map((scope) => scope.account).filter((a) => a !== null))]
        .filter((account) => !settings.accounts[account])
        .sort()
        .map((account) => ({ key: account, label: `@${account}` }));
    }
    if (current.scope.tier === 'columns') {
      return detected
        .filter((scope) => !settings.columns[scope.key])
        .map((scope) => ({
          key: scope.key,
          label: `${scope.title ?? m.tiers.unnamedColumn}${scope.account ? ` / @${scope.account}` : ''}`,
        }));
    }
    return [];
  }, [current.scope, detected, settings.accounts, settings.columns, m]);

  /** Show the destination straight away. After the move, the original key is no longer in the list */
  const reassign = (to: string) => {
    const from = current.scope;
    if (from.tier === 'accounts') {
      update({ ...settings, accounts: moveIn(settings.accounts, from.key, to) });
      setScope({ tier: 'accounts', key: to });
    } else if (from.tier === 'columns') {
      update({ ...settings, columns: moveIn(settings.columns, from.key, to) });
      setScope({ tier: 'columns', key: to });
    }
  };

  /**
   * Removes one column from the record of detected columns, discarding its settings too.
   * If the column is still there, the record side lists it again on the next detection, so
   * only the settings are lost. Hence the confirmation only when it has settings (`ScopeHeader`).
   */
  const forgetCurrent = () => {
    const from = current.scope;
    if (from.tier !== 'columns') return;
    forgetScope(from.key).catch(reportSaveFailed);
    if (settings.columns[from.key]) {
      update({ ...settings, columns: removeFrom(settings.columns, from.key) });
    }
    setScope({ tier: 'global' });
  };

  const removeCurrent = () => {
    const from = current.scope;
    if (from.tier === 'accounts') {
      update({ ...settings, accounts: removeFrom(settings.accounts, from.key) });
    } else if (from.tier === 'columns') {
      update({ ...settings, columns: removeFrom(settings.columns, from.key) });
    }
    setScope({ tier: 'global' });
  };

  /**
   * The values coming down from the tiers above. Above the column tier sits the account it
   * belongs to, but that is known only from what was detected, so with pro.x.com not open it is global alone.
   * The dimmed value is "the effective value as far as is known here", not necessarily what actually applies.
   */
  const inherited = useMemo(() => {
    const target = current.scope;
    if (target.tier === 'global') return inheritedFor(settings, { tier: 'global' });
    if (target.tier === 'accounts') return inheritedFor(settings, { tier: 'accounts' });
    const account = detected.find((scope) => scope.key === target.key)?.account ?? null;
    return inheritedFor(settings, { tier: 'columns', account });
  }, [current.scope, settings, detected]);

  /**
   * Where the column being viewed sits. Determined only while a column is selected.
   * The account it belongs to is known only from what was detected, so with pro.x.com not open it is null.
   */
  const shown = current.scope;
  const columnScope: ColumnScope | null =
    shown.tier === 'columns'
      ? {
          account: detected.find((scope) => scope.key === shown.key)?.account ?? null,
          columnId: shown.key,
        }
      : null;

  const nodeOf = (target: Scope): SettingsNode => {
    if (target.tier === 'global') return settings.global;
    const nodes = target.tier === 'accounts' ? settings.accounts : settings.columns;
    return nodes[target.key] ?? emptyNode();
  };

  const changeNode = (node: SettingsNode) => {
    const target = current.scope;
    if (target.tier === 'global') updateGlobal(node);
    else if (target.tier === 'accounts') updateAccount(target.key, node);
    else updateColumn(target.key, node);
  };

  return (
    <MessagesProvider value={m}>
      {/* The shell is emitted by this component itself. The nesting differs by placement, so
          it does not rely on the outside to pass a height down */}
      <div class="settings">
        <header>
          <h1>X Pro Tweaks</h1>
          <p
            id="status"
            role="status"
            aria-live="polite"
            class={status === 'saveFailed' ? 'failed' : undefined}
          >
            {status && m.status[status]}
          </p>
          <LanguageSelect
            value={settings.language}
            onChange={(language) => update({ ...settings, language })}
          />
          {/* Not shown until loading finishes. Even if it could be pressed, the box lives under `ready` and would not open */}
          {exportable && ready && (
            <button
              type="button"
              ref={transferButton}
              aria-expanded={transferring}
              onClick={() => setTransferring((open) => !open)}
            >
              {m.transfer.open}
            </button>
          )}
        </header>

        {/* While paused, say up front that edits here have no effect */}
        {paused && <p class="warning">{m.pausedNotice}</p>}

        {/* When the ad rules alone were switched off automatically */}
        {adGuard && <p class="warning">{m.adGuardNotice}</p>}
        {/* The notice for a broken marker of X. What stops differs per marker, so each is described separately */}
        {broken.length > 0 && (
          <p class="warning">
            {broken.map((marker) => m.health[marker]).join(' ')} {m.health.hint}
          </p>
        )}

        {unreadable !== null && (
          <p class="warning">
            {(unreadable.newer ? m.unreadable.newer : m.unreadable.older)(
              unreadable.version,
              SCHEMA_VERSION
            )}
          </p>
        )}

        {ready && (
          <div class="panes">
            <ScopeList
              groups={groups}
              active={current.scope}
              onSelect={setScope}
              note={detecting ? undefined : m.tiers.notDetecting}
            />

            <div class="pane detail">
              {/* Rebuilt when the scope changes. This header holds the pre-delete confirmation as state,
                  so without `key` a confirmation raised on column A would remain on column B's screen */}
              <ScopeHeader
                key={scopeKey(current.scope)}
                entry={current}
                targets={reassignTargets}
                onReassign={reassign}
                onRemove={removeCurrent}
                onForget={current.scope.tier === 'columns' ? forgetCurrent : undefined}
              />
              {/* Rebuilt when the scope changes. Components in the same position are reused, so without
                  `key` a half-typed rule or uncommitted field text would carry over to the next scope */}
              <TierEditor
                key={scopeKey(current.scope)}
                node={nodeOf(current.scope)}
                onChange={changeNode}
                tab={tab}
                onTabChange={setTab}
                inherited={inherited}
                // Not a tier's setting, so it is handed in only where it belongs: the global settings
                compose={
                  current.scope.tier === 'global' && (
                    <Compose
                      compose={settings.compose}
                      onChange={(compose) => update({ ...settings, compose })}
                    />
                  )
                }
                // The merged result cannot be built without knowing all three tiers, so it is assembled here and passed in
                effective={columnScope && <Effective settings={settings} scope={columnScope} />}
              />
            </div>
          </div>
        )}

        {ready && transferring && (
          <Transfer
            settings={settings}
            detected={found.groups}
            onLoad={update}
            onClose={() => {
              setTransferring(false);
              transferButton.current?.focus();
            }}
          />
        )}
      </div>
    </MessagesProvider>
  );
};
