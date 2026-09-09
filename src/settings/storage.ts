/** Reading, writing and subscribing to the settings. Everything depending on the extension APIs is confined here */
import { SCHEMA_VERSION, emptySettings, fillAll, isRecord, type Settings } from './schema.ts';
import {
  fillDetected,
  mergeDetected,
  withoutScope,
  type Detected,
  type DetectedScope,
  type Prune,
} from './detected.ts';
import { MARKERS, type Marker } from '../filter/health.ts';
import type { SurfaceId } from '../surface/index.ts';

export type { Detected, DetectedScope, DetectedGroup } from './detected.ts';

// Namespace resolution only, no polyfill — Chrome MV3's chrome.* also returns Promises, so either resolves the same way
declare const chrome: typeof browser | undefined;
const api: typeof browser = typeof browser !== 'undefined' ? browser : chrome!;

const STORAGE_KEY = 'settings';
/**
 * The record of which scopes are currently on screen, grouped the way the surface groups
 * them. Not a setting, so it is under a separate key; the settings screen uses it to decide
 * what to list in the account and scope tiers.
 */
const DETECTED_KEY = 'detected';

/**
 * Whether the whole extension is paused. Kept separate from `settings`: inside it,
 * "paused" would be included in an export and carried to another device — not something a
 * temporary state should do.
 */
const PAUSED_KEY = 'paused';

/**
 * The result of a load. Carries no messages: when settings cannot be read it returns only
 * the stored version and whether it is newer or older, and the settings screen builds the
 * explanation from the dictionaries.
 */
export type LoadResult = {
  settings: Settings;
  unreadable: { version: number; newer: boolean } | null;
};

/**
 * Loads the settings. A different version is not interpreted; defaults are used instead.
 * Only reading happens, never writing, so the original data stays intact and an earlier
 * extension version can be gone back to.
 */
export const load = async (): Promise<LoadResult> => {
  const stored: unknown = (await api.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  if (stored === undefined || stored === null) {
    return { settings: emptySettings(), unreadable: null };
  }

  const version = (stored as { version?: unknown }).version;
  if (version !== SCHEMA_VERSION) {
    const stamped = typeof version === 'number' ? version : 0;
    return {
      settings: emptySettings(),
      unreadable: { version: stamped, newer: stamped > SCHEMA_VERSION },
    };
  }

  return { settings: fillAll(stored), unreadable: null };
};

export const save = async (settings: Settings): Promise<void> => {
  await api.storage.local.set({ [STORAGE_KEY]: { ...settings, version: SCHEMA_VERSION } });
};

/**
 * Subscribes to changes under one key, returning an unsubscribe function. Changes
 * propagate through this alone — no messages pass around inside the extension.
 */
const watch = <T>(
  key: string,
  parse: (value: unknown) => T,
  callback: (value: T) => void
): (() => void) => {
  const handler = (
    changes: Record<string, browser.storage.StorageChange>,
    areaName: string
  ): void => {
    const change = changes[key];
    if (areaName !== 'local' || !change) return;
    callback(parse(change.newValue));
  };
  api.storage.onChanged.addListener(handler);
  return () => api.storage.onChanged.removeListener(handler);
};

export const subscribe = (callback: (settings: Settings) => void): (() => void) =>
  watch(STORAGE_KEY, fillAll, callback);

/**
 * Whether ad detection was switched off. The content script writes it; the settings
 * screen reads it to show a warning. Not a setting, so it is under a separate key.
 */
const AD_GUARD_KEY = 'adGuard';

const fillFlag = (v: unknown): boolean => v === true;

export const loadAdGuard = async (): Promise<boolean> =>
  fillFlag((await api.storage.local.get(AD_GUARD_KEY))[AD_GUARD_KEY]);

export const saveAdGuard = async (tripped: boolean): Promise<void> => {
  await api.storage.local.set({ [AD_GUARD_KEY]: tripped });
};

export const subscribeAdGuard = (callback: (tripped: boolean) => void): (() => void) =>
  watch(AD_GUARD_KEY, fillFlag, callback);

/**
 * The broken markers of X — same route as the ad guard, but one key holds them as a list
 * rather than one key per marker.
 */
const HEALTH_KEY = 'health';

const fillHealth = (v: unknown): Marker[] =>
  Array.isArray(v) ? v.filter((x): x is Marker => MARKERS.includes(x as Marker)) : [];

export const loadHealth = async (): Promise<Marker[]> =>
  fillHealth((await api.storage.local.get(HEALTH_KEY))[HEALTH_KEY]);

export const saveHealth = async (broken: Marker[]): Promise<void> => {
  await api.storage.local.set({ [HEALTH_KEY]: broken });
};

export const subscribeHealth = (callback: (broken: Marker[]) => void): (() => void) =>
  watch(HEALTH_KEY, fillHealth, callback);

/** An unreadable value (e.g. written by another version) falls back to "running" — staying paused unnoticed is the worse outcome */
const fillPaused = (v: unknown): boolean => v === true;

export const loadPaused = async (): Promise<boolean> =>
  fillPaused((await api.storage.local.get(PAUSED_KEY))[PAUSED_KEY]);

export const savePaused = async (paused: boolean): Promise<void> => {
  await api.storage.local.set({ [PAUSED_KEY]: paused });
};

export const subscribePaused = (callback: (paused: boolean) => void): (() => void) =>
  watch(PAUSED_KEY, fillPaused, callback);

/**
 * Records the scopes detected. Only the content script writes; the settings screen only
 * reads. What is remembered is each group's scopes — the list of groups itself is readable
 * from the rail each time. Merging rules live in `detected.ts`. Identical contents are not
 * written, to avoid re-rendering the settings screen on every write.
 */
export const saveDetected = async (
  surface: SurfaceId,
  groups: { id: string; name: string | null }[],
  currentGroupId: string | null,
  scopes: DetectedScope[],
  configured: ReadonlySet<string>,
  prune: Prune
): Promise<void> => {
  const stored = (await api.storage.local.get(DETECTED_KEY))[DETECTED_KEY];
  const previous = fillDetected(stored);
  const next = mergeDetected(previous, surface, groups, currentGroupId, scopes, configured, prune);
  if (JSON.stringify(previous) === JSON.stringify(next)) return;
  await api.storage.local.set({ [DETECTED_KEY]: next });
};

export const loadDetected = async (): Promise<Detected> =>
  fillDetected((await api.storage.local.get(DETECTED_KEY))[DETECTED_KEY]);

export const subscribeDetected = (callback: (detected: Detected) => void): (() => void) =>
  watch(DETECTED_KEY, fillDetected, callback);

/**
 * Removes one scope from the record, called from the settings screen. A scope still there
 * is listed again next detection, so it can be undone.
 */
export const forgetScope = async (key: string): Promise<void> => {
  const stored = (await api.storage.local.get(DETECTED_KEY))[DETECTED_KEY];
  await api.storage.local.set({ [DETECTED_KEY]: withoutScope(fillDetected(stored), key) });
};

/**
 * Throws away the whole record of detected scopes. Scopes out of sight are never deleted,
 * so a removed column does not drop out on its own — this is the only way to clear what is
 * piled up. The settings themselves are untouched.
 */
export const clearDetected = async (): Promise<void> => {
  await api.storage.local.remove(DETECTED_KEY);
};
