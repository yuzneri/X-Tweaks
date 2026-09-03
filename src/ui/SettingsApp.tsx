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
  changesAnyChrome,
  changesAnyInjected,
  isEmptyNode,
  SCHEMA_VERSION,
  tidyGenericAlts,
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
import { TierEditor, type Tab } from './TierEditor.tsx';
import { ScopeHeader, type ReassignTarget } from './ScopeHeader.tsx';
import {
  ScopeList,
  scopeKey,
  type Scope,
  type ScopeEntry,
  type ScopeGroup,
  type Site,
} from './ScopeList.tsx';
import { Transfer } from './Transfer.tsx';
import { About } from './About.tsx';
import { Compose } from './Compose.tsx';
import { Injected } from './Injected.tsx';
import { XChrome, XTimeline } from './XChrome.tsx';
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

/** The language selector. It belongs to none of the tiers, so it sits outside the scope switching */
const LanguageSelect = ({
  value,
  onChange,
}: {
  value: Language;
  onChange: (language: Language) => void;
}) => {
  const m = useMessages();
  return (
    <label class="row">
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
 * X's own words for a picture nobody described, one to a line.
 *
 * Left empty the extension works them out from the pages being read and writes them here,
 * so what is shown is what is in use. They are X's words in X's interface language, and
 * anything written here by hand is left alone — emptying the box hands the job back.
 *
 * The text is held while it is being typed and only handed over on the way out: turning
 * every keystroke into a list would make a half-typed word take effect, and a line the
 * typing has just emptied would be dropped from under the cursor.
 */
const GENERIC_ALTS_NOTE = 'xpro-generic-alts-note';

const GenericAlts = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (words: string[]) => void;
}) => {
  const m = useMessages();
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? value.join('\n');
  return (
    <div class="generic-alts">
      <label class="row">
        <span>
          {m.genericAlts.label}
          <small id={GENERIC_ALTS_NOTE}>{m.genericAlts.note}</small>
        </span>
        <textarea
          rows={3}
          value={shown}
          aria-label={m.genericAlts.label}
          // The box names itself, which shuts the note above out unless it is tied on here
          aria-describedby={GENERIC_ALTS_NOTE}
          onInput={(e) => setText(e.currentTarget.value)}
          onBlur={() => {
            // Nothing was typed, so there is nothing to save. Without this, passing
            // through the box would write the same list back and count as a change
            if (text === null) return;
            onChange(tidyGenericAlts(text.split('\n')));
            setText(null);
          }}
        />
      </label>
    </div>
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
 * What that scope is called: what X called it, as read off the page, or failing that the
 * name the extension gives the view. null where neither can name it, and the caller says
 * what to put in its place — the three lists that show scopes each have their own reason
 * for a name being absent, and their own thing to say about it.
 */
const scopeName = (key: string, title: string | null, m: Messages): string | null =>
  title ?? (surfaceOfKey(key) === 'x' ? viewLabel(key, m) : null);

/** The same, with what to call one nothing names. Used where being unnamed is unremarkable */
const scopeLabel = (key: string, title: string | null, m: Messages): string =>
  scopeName(key, title, m) ??
  (surfaceOfKey(key) === 'x' ? m.tiers.views : m.tiers.unnamedColumn);

/**
 * The tab a scope belongs to. Used to land on the right one when the settings are opened
 * pointing at something — from a column's options, the tab has to be X Pro's, or the list
 * beside it would be another site's.
 */
const tabOf = (scope: Scope | undefined): SurfaceTab => {
  if (!scope) return 'common';
  if (scope.tier === 'columns') return surfaceOfKey(scope.key);
  if (scope.tier === 'surface') return scope.key;
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
  /** The site's box is always there; the account inside it comes and goes like any other key */
  const updateSurfaceAccount = (surface: SurfaceId, key: string, node: SettingsNode) =>
    update({
      ...settings,
      surfaceAccounts: {
        ...settings.surfaceAccounts,
        [surface]: put(settings.surfaceAccounts[surface], key, node),
      },
    });

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

  /**
   * The accounts somebody is signed in as right now, across both sites.
   * Written once: four places ask the same question (the two account lists and the two
   * sets of destinations to move settings to), and they must not come to disagree.
   */
  const liveAccounts = useMemo(
    () => new Set(detected.map((scope) => scope.account).filter((a) => a !== null)),
    [detected]
  );

  /** Lists the accounts detected, and the accounts only their settings remain for */
  const accountEntries = useMemo<ScopeEntry[]>(() => {
    const live = liveAccounts;
    /*
     * What that account holds. An account spans both sites, so the two are counted apart:
     * on x.com they are views rather than columns, and calling them columns would name
     * something the site does not have
     */
    const countFor = (account: string): string => {
      const mine = detected.filter((scope) => scope.account === account);
      const views = mine.filter((scope) => surfaceOfKey(scope.key) === 'x').length;
      return m.tiers.scopeCount(mine.length - views, views);
    };
    const keys = [...new Set([...live, ...Object.keys(settings.accounts)])];
    return keys.sort().map((account) => ({
      scope: { tier: 'accounts', key: account },
      label: `@${account}`,
      detail: live.has(account) ? countFor(account) : undefined,
      unassigned: detecting && !live.has(account),
      // An account reaches both sites, so no site tier takes part in the mark
      configured: marked(settings.accounts[account], { account, surface: null, columnId: null }),
    }));
  }, [detected, settings, detecting, liveAccounts, m]);

  /**
   * The same accounts again, once per site: the tier where an account's exception on one of
   * the two sites is written.
   *
   * The list is not narrowed to the accounts seen on that site. "Keep this account's colour
   * off X Pro" is written before the account is next read there, and the colour of the form
   * a post is written in is resolved from what is stored rather than from what is on screen.
   */
  const surfaceAccountEntries = useMemo<Record<SurfaceId, ScopeEntry[]>>(() => {
    const live = liveAccounts;
    const forSite = (surface: SurfaceId): ScopeEntry[] => {
      const nodes = settings.surfaceAccounts[surface];
      const keys = [
        ...new Set([...live, ...Object.keys(settings.accounts), ...Object.keys(nodes)]),
      ]
        // An account nobody is signed in as, holding nothing on this site, has nothing to
        // offer here: there is no exception to write for it and none left behind to tidy up.
        // Its own tier still lists it under "both", where its settings are
        .filter((account) => live.has(account) || nodes[account] !== undefined);
      return keys.sort().map((account) => {
        // What that account holds on this site alone, counted the way the site names it
        const mine = detected.filter(
          (scope) => scope.account === account && surfaceOfKey(scope.key) === surface
        ).length;
        return {
          scope: { tier: 'surfaceAccount', surface, key: account },
          label: `@${account}`,
          detail:
            mine > 0
              ? m.tiers.scopeCount(surface === 'x' ? 0 : mine, surface === 'x' ? mine : 0)
              : undefined,
          // Marked the same way as its own tier: settings for an account nobody is signed
          // in as any more, waiting to be moved or dropped
          unassigned: detectingOn[surface] && !live.has(account),
          configured: marked(nodes[account], { account, surface, columnId: null }),
        };
      });
    };
    return { pro: forSite('pro'), x: forSite('x') };
  }, [detected, settings, detectingOn, liveAccounts, m]);

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
      // What an empty group says depends on the site: x.com's explanation names the
      // wrong site and the wrong thing if X Pro's is used
      empty: group.surface === 'x' ? m.tiers.viewsEmpty : m.tiers.columnsEmpty,
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
          label: scopeLabel(column.key, column.title, m),
          detail: [missing, account, number].filter(Boolean).join(' / ') || undefined,
          unassigned: false,
          configured: marked(settings.columns[column.key], {
            account: column.account,
            // Read from the key rather than from the group, so it cannot disagree with
            // the settings being marked (which are held under that same key)
            surface: surfaceOfKey(column.key),
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
        const named = scopeName(id, null, m);
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
          configured: marked(settings.columns[id], { account: null, surface, columnId: id }),
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
   * X Pro has the compose form; x.com has the page it draws around the timeline. Both
   * belong to their site rather than to any scope in it.
   */
  const wholeSurface = useMemo<Record<SurfaceId, ScopeEntry | null>>(
    () => ({
      pro: {
        scope: { tier: 'surface', key: 'pro' },
        label: m.tiers.whole(m.surfaces.pro),
        unassigned: false,
        // The compose form's two switches are off by default; on, they are worth marking.
        // The site's own tier counts too, the same way an account's or a column's does
        configured:
          settings.compose.reopen ||
          settings.compose.keepHashtags ||
          changesAnyInjected(settings.injected.pro) ||
          marked(settings.surfaces.pro, { account: null, surface: 'pro', columnId: null }),
      },
      x: {
        scope: { tier: 'surface', key: 'x' },
        label: m.tiers.whole(m.surfaces.x),
        unassigned: false,
        // What counts as "something is set" is the shape's to answer (`settings/schema.ts`)
        configured:
          changesAnyChrome(settings.xChrome) ||
          changesAnyInjected(settings.injected.x) ||
          marked(settings.surfaces.x, { account: null, surface: 'x', columnId: null }),
      },
    }),
    [settings, m]
  );

  /** Global is always there. It heads the list and catches the fall when the chosen scope disappears */
  const globalEntry = useMemo<ScopeEntry>(
    () => ({
      scope: { tier: 'global' },
      label: m.tiers.global,
      unassigned: false,
      configured: marked(settings.global, { account: null, surface: null, columnId: null }),
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
    const accounts = surfaceAccountEntries[surfaceTab];
    // One "not assigned" group, not two: what is in it — an account nobody signs in as, a
    // column no deck has — differs, but what is to be done with it is the same
    const missing = [
      ...accounts.filter((entry) => entry.unassigned),
      ...missingBySurface[surfaceTab],
    ];
    const whole = wholeSurface[surfaceTab];
    return [
      ...(whole ? [{ entries: [whole] }] : []),
      // Named after the site as well, so it is not the same heading as the accounts on the
      // "both" tab, which are a different tier reaching both sites
      {
        label: m.tiers.accountsOn(m.surfaces[surfaceTab]),
        entries: accounts.filter((entry) => !entry.unassigned),
        empty: m.tiers.accountsEmpty,
      },
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
  }, [surfaceTab, globalEntry, accountEntries, surfaceAccountEntries, groupsBySurface, missingBySurface, wholeSurface, m]);

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
      return [...liveAccounts]
        .filter((account) => !settings.accounts[account])
        .sort()
        .map((account) => ({ key: account, label: `@${account}` }));
    }
    if (current.scope.tier === 'surfaceAccount') {
      // Only within the same site: what is held here is that site's answer for an account,
      // and the same account on the other site is a different scope with its own entry
      const { surface } = current.scope;
      return [...liveAccounts]
        .filter((account) => !settings.surfaceAccounts[surface][account])
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
          // Named the same way as in the list on the left. A view X names after its
          // content carries no title, and `viewLabel` is the only thing that can name it
          label: `${scopeLabel(scope.key, scope.title, m)}${scope.account ? ` / @${scope.account}` : ''}`,
        }));
    }
    return [];
  }, [current.scope, detected, liveAccounts, settings.accounts, settings.surfaceAccounts, settings.columns, m]);

  /** Show the destination straight away. After the move, the original key is no longer in the list */
  const reassign = (to: string) => {
    const from = current.scope;
    if (from.tier === 'accounts') {
      update({ ...settings, accounts: moveIn(settings.accounts, from.key, to) });
      setScope({ tier: 'accounts', key: to });
    } else if (from.tier === 'surfaceAccount') {
      const { surface } = from;
      update({
        ...settings,
        surfaceAccounts: {
          ...settings.surfaceAccounts,
          [surface]: moveIn(settings.surfaceAccounts[surface], from.key, to),
        },
      });
      setScope({ tier: 'surfaceAccount', surface, key: to });
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
    } else if (from.tier === 'surfaceAccount') {
      // Only this site's. The same account on the other site is another scope, listed and
      // deleted on its own — deleting from here what is not shown here would be a surprise
      update({
        ...settings,
        surfaceAccounts: {
          ...settings.surfaceAccounts,
          [from.surface]: removeFrom(settings.surfaceAccounts[from.surface], from.key),
        },
      });
    } else if (from.tier === 'columns') {
      update({ ...settings, columns: removeFrom(settings.columns, from.key) });
    }
    setScope({ tier: 'global' });
  };

  /**
   * The values coming down from the tiers above. Above the column tier sits the account it
   * belongs to, but that is known only from what was detected, so with pro.x.com not open it is
   * the site and global alone.
   * The dimmed value is "the effective value as far as is known here", not necessarily what actually applies.
   */
  const inherited = useMemo(() => {
    const target = current.scope;
    if (target.tier === 'global') return inheritedFor(settings, { tier: 'global' });
    if (target.tier === 'accounts') return inheritedFor(settings, { tier: 'accounts' });
    // A site is a tier; above it sits the account, which it belongs to none of
    if (target.tier === 'surface') return inheritedFor(settings, { tier: 'surface' });
    // An account on one site: everything above it is determined, so nothing is left out here
    if (target.tier === 'surfaceAccount')
      return inheritedFor(settings, { tier: 'surfaceAccount', account: target.key, surface: target.surface });
    // The extension itself is not a tier: nothing above, nothing below
    if (target.tier === 'meta') return inheritedFor(settings, { tier: 'global' });
    const account = detected.find((scope) => scope.key === target.key)?.account ?? null;
    // Which site a column belongs to is written into its key, so that tier is always known
    return inheritedFor(settings, { tier: 'columns', account, surface: surfaceOfKey(target.key) });
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
          // Which site a column belongs to is written into its key
          surface: surfaceOfKey(shown.key),
          columnId: shown.key,
        }
      : null;

  /** Which site's whole-site page is open. Only read while one is */
  const surfaceOfScope: SurfaceId = shown.tier === 'surface' ? shown.key : 'pro';

  /**
   * Which site the settings on the right are for. The global and account tiers belong to
   * both, so the appearance groups the column-only items there instead of hiding them.
   */
  const site: Site =
    shown.tier === 'columns'
      ? surfaceOfKey(shown.key)
      : // A site's own page is that site's, so the appearance offers what works there and
        // leaves out what does not — the same as on a column of it
        shown.tier === 'surface'
          ? surfaceOfScope
          : // An account's page for one site is that site's too
            shown.tier === 'surfaceAccount'
            ? shown.surface
            : 'both';

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

  /** The tier's stored settings. The extension itself is not a tier, and never reaches here */
  const nodeOf = (target: Scope): SettingsNode => {
    if (target.tier === 'global') return settings.global;
    if (target.tier === 'meta') return emptyNode();
    // Both sites always have a tier, so there is no key to be missing
    if (target.tier === 'surface') return settings.surfaces[target.key];
    // Named one by one rather than "accounts or else columns": a tier added to `Scope`
    // would otherwise fall silently into the columns and read another tier's settings
    const nodes =
      target.tier === 'accounts'
        ? settings.accounts
        : target.tier === 'surfaceAccount'
          ? settings.surfaceAccounts[target.surface]
          : settings.columns;
    return nodes[target.key] ?? emptyNode();
  };

  const changeNode = (node: SettingsNode) => {
    const target = current.scope;
    if (target.tier === 'global') updateGlobal(node);
    else if (target.tier === 'accounts') updateAccount(target.key, node);
    else if (target.tier === 'columns') updateColumn(target.key, node);
    else if (target.tier === 'surfaceAccount') updateSurfaceAccount(target.surface, target.key, node);
    // Kept even when emptied, unlike the accounts and the columns: there are exactly two
    // sites and they never go away, so there is no key to tidy up
    else if (target.tier === 'surface') {
      update({ ...settings, surfaces: { ...settings.surfaces, [target.key]: node } });
    }
  };

  return (
    <MessagesProvider value={m}>
      {/* The shell is emitted by this component itself. The nesting differs by placement, so
          it does not rely on the outside to pass a height down */}
      <div class="settings">
        <header>
          <h1>X Tweaks</h1>
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
                site={site}
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
                  {/* Beside the language: both are about the words X itself shows, rather than ours */}
                  <GenericAlts
                    value={settings.genericAlts}
                    onChange={(genericAlts) => update({ ...settings, genericAlts })}
                  />
                  {/*
                    A place of its own rather than a box opened over the screen, so there is
                    nothing to close. Shown wherever the settings are: the same screen has to
                    hold the same things, or what is here depends on how you got here.
                  */}
                  <Transfer settings={settings} detected={found.groups} onLoad={update} />
                </>
              )}

              {/* Rebuilt when the scope changes. Components in the same position are reused, so without
                  `key` a half-typed rule or uncommitted field text would carry over to the next scope */}
              {current.scope.tier !== 'meta' && (
              <TierEditor
                key={scopeKey(current.scope)}
                node={nodeOf(current.scope)}
                onChange={changeNode}
                tab={tab}
                onTabChange={setTab}
                inherited={inherited}
                site={site}
                oneColumn={current.scope.tier === 'columns'}
                // The merged result cannot be built without knowing every tier, so it is assembled here and passed in
                effective={
                  columnScope && <Effective settings={settings} scope={columnScope} site={site} />
                }
                /*
                 * What belongs to the whole site rather than to its tier. Given tabs of
                 * their own rather than stacked above the tabs, so the page has one row of
                 * navigation instead of content and then navigation below it.
                 *
                 * Two tabs rather than one. The site keeps two separate subjects here —
                 * what it draws around the timeline (or, on X Pro, what the compose form
                 * does) and what X slips into the timeline — and a single tab covering
                 * both could only be named vaguely. Split, each takes the name the group
                 * already had.
                 */
                screens={
                  current.scope.tier === 'surface'
                    ? [
                        {
                          key: 'site' as const,
                          // Which site decides both the name and what is on offer: the two
                          // have nothing in common beyond belonging to a site
                          label: surfaceOfScope === 'x' ? m.xChrome.label : m.compose.label,
                          content:
                            surfaceOfScope === 'x' ? (
                              <XChrome
                                chrome={settings.xChrome}
                                onChange={(xChrome) => update({ ...settings, xChrome })}
                              />
                            ) : (
                              <Compose
                                compose={settings.compose}
                                onChange={(compose) => update({ ...settings, compose })}
                              />
                            ),
                        },
                        {
                          key: 'timeline' as const,
                          label: m.tabs.inTimeline,
                          content: (
                            <>
                              {/*
                                x.com's own two stand at the head of the timeline rather
                                than around it, so they belong here and not with the
                                furniture. X Pro puts nothing of its own in a column
                              */}
                              {surfaceOfScope === 'x' && (
                                <XTimeline
                                  chrome={settings.xChrome}
                                  onChange={(xChrome) => update({ ...settings, xChrome })}
                                />
                              )}
                              {/* Offered under either site, each keeping its own answer */}
                              <Injected
                                injected={settings.injected[surfaceOfScope]}
                                onChange={(one) =>
                                  update({
                                    ...settings,
                                    injected: { ...settings.injected, [surfaceOfScope]: one },
                                  })
                                }
                              />
                            </>
                          ),
                        },
                      ]
                    : undefined
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
