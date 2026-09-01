/**
 * The skeleton of the settings screen. It holds the settings in one place and assembles
 * the scope switching and the per-tier partial updates. Two panes: where settings apply on the left, what to set on the right.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { LANGUAGES, localeOf, messagesFor, type Language, type Locale } from '../i18n/index.ts';
import { MessagesProvider, useMessages } from './messages.tsx';
import type { Messages } from '../i18n/index.ts';
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
import type { SurfaceId } from '../surface/index.ts';
import { VIEW_PREFIX, viewSubjectOf } from '../surface/view.ts';
import type { AppearanceSite } from './Appearance.tsx';
import { TierEditor, type Tab } from './TierEditor.tsx';
import { ScopeHeader, type ReassignTarget } from './ScopeHeader.tsx';
import { ScopeList, scopeKey, type Scope, type ScopeEntry, type ScopeGroup } from './ScopeList.tsx';
import { Transfer } from './Transfer.tsx';
import { About } from './About.tsx';
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

/**
 * Which site a scope key belongs to. x.com's keys carry a prefix of the extension's own
 * making; X Pro's are the ids X hands out, which never look like one.
 */
const surfaceOfKey = (key: string): SurfaceId => (key.startsWith(VIEW_PREFIX) ? 'x' : 'pro');

/**
 * What a view of x.com is called.
 *
 * The record holds only the key, and the name is decided here, so changing the language
 * renames what is already recorded. X Pro's column names come the other way round: they
 * are what the user typed, so they are read off the page and stored.
 *
 * A list is named only "List" — which one it is, the key says. Reading the list's own
 * name off the page is worth doing later; it is not read anywhere yet.
 */
const viewLabel = (key: string, m: Messages): string | null => {
  const rest = key.slice(VIEW_PREFIX.length);
  const names = m.tiers.viewNames;
  if (rest in names) return names[rest as keyof typeof names];

  // Held one per person, per query, per list. Which one it is, is worth more than the kind
  const subject = viewSubjectOf(key);
  if (subject === null) return null;
  if (rest.startsWith('profile:')) return `@${subject}`;
  if (rest.startsWith('search:')) return subject;
  if (rest.startsWith('list:')) return names.list;
  return null;
};

/**
 * The tab a scope belongs to. Used to land on the right one when the settings are opened
 * pointing at something — from a column's options, the tab has to be X Pro's, or the list
 * beside it would be another site's.
 */
const tabOf = (scope: Scope | undefined): SurfaceTab => {
  if (!scope) return 'common';
  if (scope.tier === 'columns') return surfaceOfKey(scope.key);
  if (scope.tier === 'surface') return scope.key === 'x' ? 'x' : 'pro';
  if (scope.tier === 'meta') return 'meta';
  return 'common';
};

/** The tab that decides which screen's settings the list shows */
type SurfaceTab = 'common' | SurfaceId | 'meta';

/**
 * `meta` last, and set apart on screen. The first three answer "which screen"; it answers
 * "the extension itself", which is a different question and does not belong in the row.
 */
const SURFACE_TABS: SurfaceTab[] = ['common', 'pro', 'x', 'meta'];

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
};

export const SettingsApp = ({ onLocale, start }: Props = {}) => {
  const { settings, unreadable, status, update, reportSaveFailed, loaded } = useSettings();
  const locale = localeOf(settings.language);
  const m = messagesFor(locale);

  useEffect(() => onLocale?.(locale), [locale, onLocale]);
  const [scope, setScope] = useState<Scope>(start ?? { tier: 'global' });
  /*
   * Which screen's settings are on show. Held above the scope: moving between tabs is
   * moving between lists, and the scope selected in one has no meaning in another.
   */
  const [surfaceTab, setSurfaceTab] = useState<SurfaceTab>(() => tabOf(start));
  // The tab is held above the scope, so switching scope leaves the open tab as it is
  const [tab, setTab] = useState<Tab>('filter');
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
  /**
   * Whether that site has been seen. Held per site: having x.com open says nothing about
   * whether X Pro's columns are known, and one tab would otherwise stop explaining itself
   * because the other tab had something to show.
   */
  const detectingOn = useMemo<Record<SurfaceId, boolean>>(
    () => ({
      pro: found.groups.some((group) => group.surface === 'pro'),
      x: found.groups.some((group) => group.surface === 'x'),
    }),
    [found]
  );

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
  const groupsBySurface = useMemo<Record<SurfaceId, ScopeGroup[]>>(() => {
    const all = detected;
    const identityOf = (scope: DetectedScope) => JSON.stringify([scope.title, scope.account]);
    const duplicated = new Set(
      all.map(identityOf).filter((key, i, keys) => keys.indexOf(key) !== i)
    );
    const seen = new Map<string, number>();

    const built = found.groups.map((group, index) => ({
      surface: group.surface,
      // x.com has one group and no name for it, so the list is headed by what it holds
      label: group.surface === 'x' ? m.tiers.views : (group.name ?? m.tiers.deckNth(index + 1)),
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
        /*
         * What X called it, as read off the page. A view X names after its content rather
         * than itself (a profile, a search) has none recorded, and falls back to the name
         * the extension gives that view.
         */
        const named =
          column.title ?? (group.surface === 'x' ? viewLabel(column.key, m) : null);
        return {
          scope: { tier: 'columns', key: column.key },
          label: named ?? (group.surface === 'x' ? m.tiers.views : m.tiers.unnamedColumn),
          detail: [missing, account, number].filter(Boolean).join(' / ') || undefined,
          unassigned: false,
          configured: marked(settings.columns[column.key], {
            account: column.account,
            columnId: column.key,
          }),
        };
      }),
    }));
    return {
      pro: built.filter((group) => group.surface === 'pro'),
      x: built.filter((group) => group.surface === 'x'),
    };
  }, [found, detected, settings, m]);

  /**
   * Scopes that have settings but were not found. Which surface each belongs to is read
   * off the key: x.com's carry a prefix, X Pro's are the ids X hands out.
   */
  const missingBySurface = useMemo<Record<SurfaceId, ScopeEntry[]>>(() => {
    const liveIds = new Set(detected.map((scope) => scope.key));
    const entries = Object.keys(settings.columns)
      .filter((id) => !liveIds.has(id))
      .sort()
      .map((id) => {
        const surface = surfaceOfKey(id);
        const named = surface === 'x' ? viewLabel(id, m) : null;
        const seen = detectingOn[surface];
        return {
        surface,
        entry: {
          scope: { tier: 'columns', key: id } as Scope,
          label:
            named ??
            (surface === 'x'
              ? seen
                ? m.tiers.missingView
                : m.tiers.unknownView
              : seen
                ? m.tiers.missingColumn
                : m.tiers.unknownColumn),
          detail: id,
          unassigned: seen,
          // With no matching scope, the account is unknown too. The effective value is judged up to global
          configured: marked(settings.columns[id], { account: null, columnId: id }),
        },
      };
      });
    return {
      pro: entries.filter((one) => one.surface === 'pro').map((one) => one.entry),
      x: entries.filter((one) => one.surface === 'x').map((one) => one.entry),
    };
  }, [detected, settings, detectingOn, m]);

  /**
   * The entry for one whole site, at the head of that site's tab.
   *
   * Only where the site has something to put in it. X Pro has the compose form; x.com has
   * nothing yet, and an entry leading to an empty page would be worse than no entry.
   */
  const wholeSurface = useMemo<Record<SurfaceId, ScopeEntry | null>>(
    () => ({
      pro: {
        scope: { tier: 'surface', key: 'pro' },
        label: m.tiers.whole(m.surfaces.pro),
        unassigned: false,
        // The compose form's two switches are off by default; on, they are worth marking
        configured: settings.compose.reopen || settings.compose.keepHashtags,
      },
      x: null,
    }),
    [settings.compose, m]
  );

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
   * The list on the left, for the tab that is open.
   *
   * The two sites never share a list. Their screens have nothing in common, and reading
   * which one an entry belongs to on every glance is what the tabs are there to spare.
   * What does apply to both — global and the accounts — has a tab of its own, so that
   * the place a setting is written and the range it covers line up one to one.
   */
  const groups = useMemo<ScopeGroup[]>(() => {
    if (surfaceTab === 'meta') {
      return [
        {
          entries: [
            { scope: { tier: 'meta', key: 'settings' }, label: m.meta.settings, unassigned: false, configured: false },
            { scope: { tier: 'meta', key: 'about' }, label: m.meta.about, unassigned: false, configured: false },
          ],
        },
      ];
    }
    if (surfaceTab === 'common') {
      const unassigned = accountEntries.filter((entry) => entry.unassigned);
      return [
        { entries: [globalEntry] },
        {
          label: m.tiers.accounts,
          entries: accountEntries.filter((entry) => !entry.unassigned),
          empty: m.tiers.accountsEmpty,
        },
        // An empty group is not shown at all. A heading left with nothing to tidy up suggests there is something
        ...(unassigned.length > 0 ? [{ label: m.tiers.unassignedGroup, entries: unassigned }] : []),
      ];
    }

    const listed = groupsBySurface[surfaceTab];
    const missing = missingBySurface[surfaceTab];
    const whole = wholeSurface[surfaceTab];
    return [
      ...(whole ? [{ entries: [whole] }] : []),
      // Even when nothing could be read, one empty group is shown to explain the situation
      // (with no group at all, the tier itself would look absent)
      ...(listed.length > 0
        ? listed
        : [
            {
              label: surfaceTab === 'x' ? m.tiers.views : m.tiers.columns,
              entries: [],
              empty: surfaceTab === 'x' ? m.tiers.viewsEmpty : m.tiers.columnsEmpty,
            },
          ]),
      ...(missing.length > 0 ? [{ label: m.tiers.unassignedGroup, entries: missing }] : []),
    ];
  }, [surfaceTab, globalEntry, accountEntries, groupsBySurface, missingBySurface, wholeSurface, m]);

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
      // Only within the same site. The two hold different kinds of thing — a column has a
      // width and a name bar, a view has neither — so moving between them means nothing
      const surface = surfaceOfKey(current.scope.key);
      return detected
        .filter((scope) => surfaceOfKey(scope.key) === surface && !settings.columns[scope.key])
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
    // Neither a whole site nor the extension itself is a tier: nothing above, nothing below
    if (target.tier === 'surface' || target.tier === 'meta') {
      return inheritedFor(settings, { tier: 'global' });
    }
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

  /**
   * Which site the settings on the right are for. The global and account tiers belong to
   * both, so the appearance groups the column-only items there instead of hiding them.
   */
  const site: AppearanceSite = shown.tier === 'columns' ? surfaceOfKey(shown.key) : 'both';

  /**
   * Moves to another screen's settings. The scope goes with it: the one selected here has
   * no counterpart in the list being moved to, and leaving it would show that screen's
   * list beside a scope belonging to the other.
   */
  const selectSurface = (next: SurfaceTab): void => {
    setSurfaceTab(next);
    if (next === 'common') {
      setScope({ tier: 'global' });
      return;
    }
    if (next === 'meta') {
      setScope({ tier: 'meta', key: 'settings' });
      return;
    }
    const first =
      wholeSurface[next] ??
      groupsBySurface[next].flatMap((group) => group.entries)[0] ??
      missingBySurface[next][0];
    // Nothing found on that screen yet. Global is what applies there in the meantime
    setScope(first?.scope ?? { tier: 'global' });
  };

  /** The tier's stored settings. A whole site and the extension itself are not tiers, and never reach here */
  const nodeOf = (target: Scope): SettingsNode => {
    if (target.tier === 'global') return settings.global;
    if (target.tier === 'surface' || target.tier === 'meta') return emptyNode();
    const nodes = target.tier === 'accounts' ? settings.accounts : settings.columns;
    return nodes[target.key] ?? emptyNode();
  };

  const changeNode = (node: SettingsNode) => {
    const target = current.scope;
    if (target.tier === 'global') updateGlobal(node);
    else if (target.tier === 'accounts') updateAccount(target.key, node);
    // A whole site holds no tier, so nothing here is its to write
    else if (target.tier === 'columns') updateColumn(target.key, node);
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
          <>
            {/*
              No `role="tablist"` is claimed, for the same reason as the tabs on the right:
              it would set an expectation of arrow-key movement and roving tabindex.
              Which one is open is conveyed by `aria-current`
            */}
            <nav class="surfaces" aria-label={m.surfaces.label}>
              {SURFACE_TABS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-current={id === surfaceTab ? 'true' : undefined}
                  class={[
                    'surface',
                    id === surfaceTab ? 'current' : null,
                    // Set apart: it is not one of the screens
                    id === 'meta' ? 'utility' : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectSurface(id)}
                >
                  {m.surfaces[id]}
                </button>
              ))}
            </nav>

          <div class="panes">
            <ScopeList
              groups={groups}
              active={current.scope}
              onSelect={setScope}
              note={
                surfaceTab === 'common' || surfaceTab === 'meta' || detectingOn[surfaceTab]
                  ? undefined
                  : surfaceTab === 'x'
                    ? m.tiers.notDetectingX
                    : m.tiers.notDetecting
              }
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
              {current.scope.tier === 'meta' && current.scope.key === 'about' && <About />}

              {current.scope.tier === 'meta' && current.scope.key === 'settings' && (
                <>
                  <LanguageSelect
                    value={settings.language}
                    onChange={(language) => update({ ...settings, language })}
                  />
                  {/*
                    A place of its own rather than a box opened over the screen, so there is
                    nothing to close. Shown wherever the settings are: the same screen has to
                    hold the same things, or what is here depends on how you got here.
                  */}
                  <Transfer settings={settings} detected={found.groups} onLoad={update} />
                </>
              )}

              {/*
                One whole site. Not a tier, so it does not go through the merging: what is
                here belongs to the site and to nothing above or below it.
              */}
              {current.scope.tier === 'surface' && (
                <Compose
                  compose={settings.compose}
                  onChange={(compose) => update({ ...settings, compose })}
                />
              )}

              {/* Rebuilt when the scope changes. Components in the same position are reused, so without
                  `key` a half-typed rule or uncommitted field text would carry over to the next scope */}
              {current.scope.tier !== 'surface' && current.scope.tier !== 'meta' && (
              <TierEditor
                key={scopeKey(current.scope)}
                node={nodeOf(current.scope)}
                onChange={changeNode}
                tab={tab}
                onTabChange={setTab}
                inherited={inherited}
                site={site}
                // The merged result cannot be built without knowing all three tiers, so it is assembled here and passed in
                effective={
                  columnScope && <Effective settings={settings} scope={columnScope} site={site} />
                }
              />
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </MessagesProvider>
  );
};
