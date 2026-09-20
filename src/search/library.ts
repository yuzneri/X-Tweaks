/** Search history and searches explicitly saved by the reader. Kept apart from site settings. */
import { searchPath, type SearchScopes } from './query.ts';

declare const chrome: typeof browser | undefined;
// Pure parsing helpers from this module are also used by the settings importer in tests,
// where neither extension namespace exists. Resolve the API only when storage is used.
const extensionApi = (): typeof browser => {
  if (typeof browser !== 'undefined') return browser;
  if (typeof chrome !== 'undefined') return chrome!;
  throw new Error('Extension storage is unavailable');
};

const KEY = 'searchLibrary';
const VERSION = 1;
export const HISTORY_LIMIT = 50;

export type SearchEntry = { query: string; scopes: SearchScopes };
export type HistoryEntry = SearchEntry & { visitedAt: number };
export type SavedEntry = SearchEntry & { name: string };
export type SearchLibrary = { history: HistoryEntry[]; saved: SavedEntry[] };

export const emptyLibrary = (): SearchLibrary => ({ history: [], saved: [] });

/** One address for both identity and navigation, including result tab and X's scope flags. */
export const entryPath = (entry: SearchEntry): string => searchPath(entry.query, entry.scopes);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const entryFrom = (value: unknown): SearchEntry | null => {
  if (!isRecord(value) || typeof value.query !== 'string' || value.query.trim() === '') return null;
  const scopes = value.scopes;
  if (
    !isRecord(scopes) ||
    !['top', 'live', 'user', 'media', 'list'].includes(String(scopes.tab)) ||
    typeof scopes.followedOnly !== 'boolean' ||
    typeof scopes.nearbyOnly !== 'boolean'
  ) return null;
  return {
    query: value.query,
    scopes: {
      tab: scopes.tab as SearchScopes['tab'],
      followedOnly: scopes.followedOnly,
      nearbyOnly: scopes.nearbyOnly,
    },
  };
};

/** Reads the portable part of the library, dropping malformed and duplicate entries. */
export const savedEntriesFrom = (value: unknown): SavedEntry[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item): SavedEntry[] => {
    const entry = entryFrom(item);
    if (!entry || !isRecord(item) || typeof item.name !== 'string') return [];
    const name = item.name.trim();
    const path = entryPath(entry);
    if (name === '' || seen.has(path)) return [];
    seen.add(path);
    return [{ ...entry, name }];
  });
};

const read = (value: unknown): SearchLibrary => {
  if (value === undefined) return emptyLibrary();
  if (!isRecord(value) || value.version !== VERSION) {
    throw new Error('Unsupported search library format');
  }
  const history = Array.isArray(value.history) ? value.history : [];
  const saved = Array.isArray(value.saved) ? value.saved : [];
  return {
    history: history.flatMap((item): HistoryEntry[] => {
      const entry = entryFrom(item);
      return entry && isRecord(item) && typeof item.visitedAt === 'number' &&
        Number.isFinite(item.visitedAt)
        ? [{ ...entry, visitedAt: item.visitedAt }]
        : [];
    }).slice(0, HISTORY_LIMIT),
    saved: savedEntriesFrom(saved),
  };
};

export const loadLibrary = async (): Promise<SearchLibrary> =>
  read((await extensionApi().storage.local.get(KEY))[KEY]);

// Serialize writes made by this tab so a history visit and a save do not overwrite each other.
let pending: Promise<unknown> = Promise.resolve();
const change = (edit: (current: SearchLibrary) => SearchLibrary): Promise<SearchLibrary> => {
  const task = pending.catch(() => {}).then(async () => {
    const next = edit(await loadLibrary());
    await extensionApi().storage.local.set({ [KEY]: { version: VERSION, ...next } });
    return next;
  });
  pending = task;
  return task;
};

export const recordHistory = (entry: SearchEntry, visitedAt = Date.now()): Promise<SearchLibrary> => {
  if (entry.query.trim() === '') return loadLibrary();
  return change((current) => {
    const path = entryPath(entry);
    return {
      ...current,
      history: [
        { ...entry, visitedAt },
        ...current.history.filter((item) => entryPath(item) !== path),
      ].slice(0, HISTORY_LIMIT),
    };
  });
};

export const saveSearch = (entry: SearchEntry, name: string): Promise<SearchLibrary> => {
  const trimmed = name.trim();
  if (entry.query.trim() === '' || trimmed === '') {
    return Promise.reject(new Error('Search query and name are required'));
  }
  return change((current) => {
    const path = entryPath(entry);
    return {
      ...current,
      saved: [
        { ...entry, name: trimmed },
        ...current.saved.filter((item) => entryPath(item) !== path),
      ],
    };
  });
};

export const removeSaved = (entry: SearchEntry): Promise<SearchLibrary> =>
  change((current) => ({
    ...current,
    saved: current.saved.filter((item) => entryPath(item) !== entryPath(entry)),
  }));

/** Replaces only the portable saved searches; local history stays on this browser. */
export const replaceSaved = (saved: SavedEntry[]): Promise<SearchLibrary> =>
  change((current) => ({ ...current, saved: savedEntriesFrom(saved) }));

export const clearHistory = (): Promise<SearchLibrary> =>
  change((current) => ({ ...current, history: [] }));

export const subscribeLibrary = (notify: (library: SearchLibrary) => void): (() => void) => {
  const listener = (changes: Record<string, browser.storage.StorageChange>, area: string): void => {
    if (area === 'local' && changes[KEY]?.newValue !== undefined) {
      try {
        notify(read(changes[KEY].newValue));
      } catch (error) {
        console.error('Could not read search library update', error);
      }
    }
  };
  extensionApi().storage.onChanged.addListener(listener);
  return () => extensionApi().storage.onChanged.removeListener(listener);
};
