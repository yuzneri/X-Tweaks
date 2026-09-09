/**
 * The record of scopes found on screen — not a setting, but what shows the settings screen
 * what exists and where. A scope is one column on X Pro and one view on x.com, grouped by
 * deck on X Pro and by nothing more than the site on x.com. The list of groups is not
 * remembered where the surface can read it live (X Pro reads its decks off the rail); what is
 * remembered is each group's scopes.
 */
import { isRecord } from './schema.ts';
import type { SurfaceId } from '../surface/index.ts';

/** The sites a group can belong to. A record naming anything else is from a version that knew more */
const SURFACES = new Set<string>(['pro', 'x']);

/** What to do with a scope not on screen. The surface decides it; the difference is spelled out on `Pruning` in `surface/index.ts` */
export type Prune = {
  /** Throw away the ones nothing was set for */
  drop: boolean;
  /** Mark the ones with settings, to say they may be gone */
  mark: boolean;
};

/** Scopes whose key could not be resolved are not recorded */
export type DetectedScope = {
  /** What the settings are held under: X Pro's `columnId`, or x.com's `view:…` */
  key: string;
  account: string | null;
  title: string | null;
  /** Has settings but was not found when this group was reopened — a column deleted on X's side becomes this. The mark comes off once found again */
  missing?: boolean;
};

/** `name` is used for display only */
export type DetectedGroup = {
  /** Which site the group belongs to. The record holds both at once */
  surface: SurfaceId;
  id: string;
  name: string | null;
  scopes: DetectedScope[];
};

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

const fillScope = (v: unknown): DetectedScope | null => {
  if (!isRecord(v)) return null;
  const key = str(v.key);
  if (!key) return null;
  const scope: DetectedScope = { key, account: str(v.account), title: str(v.title) };
  return v.missing === true ? { ...scope, missing: true } : scope;
};

const fillGroup = (v: unknown): DetectedGroup | null => {
  if (!isRecord(v)) return null;
  const id = str(v.id);
  const surface = str(v.surface);
  if (!id || surface === null || !SURFACES.has(surface)) return null;
  const scopes = Array.isArray(v.scopes) ? v.scopes : [];
  return {
    surface: surface as SurfaceId,
    id,
    name: str(v.name),
    scopes: scopes.map(fillScope).filter((scope) => scope !== null),
  };
};

/** The whole record. It also holds which group is on screen (so the settings screen can mark "showing") */
export type Detected = {
  groups: DetectedGroup[];
  currentGroupId: string | null;
};

export const emptyDetected = (): Detected => ({ groups: [], currentGroupId: null });

/** Reads the stored record. Unreadable shapes are discarded (being a record, it is rebuilt on the next detection) */
export const fillDetected = (v: unknown): Detected => {
  if (!isRecord(v)) return emptyDetected();
  const stored = Array.isArray(v.groups) ? v.groups : [];
  return {
    groups: stored.map(fillGroup).filter((group) => group !== null),
    currentGroupId: str(v.currentGroupId),
  };
};

/**
 * Does not paint over a known value with `null` — right after a deck switch the header's
 * box appears first, and overwriting the record empty in that window shows "columns with
 * no name".
 */
const keepKnown = (fresh: DetectedScope, known: DetectedScope | undefined): DetectedScope =>
  known
    ? {
        key: fresh.key,
        account: fresh.account ?? known.account,
        title: fresh.title ?? known.title,
      }
    : fresh;

/**
 * Merges the scopes of the group on screen. Ordinarily nothing is dropped: X Pro keeps
 * columns outside the window out of the DOM, so "not in the DOM right now" can mean "merely
 * out of sight", and on x.com a view just is not the current one.
 *
 * `prune.drop` throws away ones nothing was set for; ones with settings are kept either
 * way, so their settings are never left floating. `prune.mark` says whether being absent
 * is worth reporting — on X Pro "this column may be gone", on x.com only that you're
 * looking elsewhere. An out-of-sight scope is placed after the visible scope preceding it
 * in the remembered order.
 */
const mergeScopes = (
  known: DetectedScope[],
  fresh: DetectedScope[],
  configured: ReadonlySet<string>,
  prune: Prune
): DetectedScope[] => {
  const visible = new Set(fresh.map((scope) => scope.key));

  /*
   * Ties each out-of-sight scope to the visible one preceding it in the remembered order;
   * a null key means hidden off to the left. When the tied-to scope is gone, `anchor`
   * is not updated as the loop moves on, so it shifts to the one before.
   */
  const trailing = new Map<string | null, DetectedScope[]>();
  let anchor: string | null = null;
  for (const scope of known) {
    if (visible.has(scope.key)) {
      anchor = scope.key;
      continue;
    }
    /*
     * Out of sight, kept as is ordinarily. Only on a rebuild are ones without settings
     * dropped, and kept ones marked "not found"
     */
    if (prune.drop && !configured.has(scope.key)) continue;
    const kept = prune.mark && !scope.missing ? { ...scope, missing: true } : scope;
    const behind = trailing.get(anchor);
    if (behind) behind.push(kept);
    else trailing.set(anchor, [kept]);
  }

  const knownByKey = new Map(known.map((scope) => [scope.key, scope]));
  const merged: DetectedScope[] = [];
  const placed = new Set<string>();
  /*
   * The same marker can sit on two elements for a moment (X reusing one, or an old one
   * lingering mid deck-switch). Only one is listed, or the same scope would appear twice
   * on the settings screen.
   */
  const place = (scope: DetectedScope): void => {
    if (placed.has(scope.key)) return;
    placed.add(scope.key);
    merged.push(scope);
  };

  for (const scope of trailing.get(null) ?? []) place(scope);
  for (const scope of fresh) {
    place(keepKnown(scope, knownByKey.get(scope.key)));
    for (const behind of trailing.get(scope.key) ?? []) place(behind);
  }
  return merged;
};

/**
 * Rebuilds the record. Only the reporting surface's groups are touched; the other site's
 * stay exactly as they were, since one page can only speak for the site it is on, and
 * dropping what it cannot see would empty the other site's list every time this one opened.
 * Within that surface, order and names follow the reported list, and unreported groups are
 * discarded (tidying up deleted decks). Only the on-screen group's scopes are touched, and
 * when the list could not be read (`groups` empty) the previous record is kept with only
 * that group updated.
 */
export const mergeDetected = (
  previous: Detected,
  surface: SurfaceId,
  groups: { id: string; name: string | null }[],
  currentGroupId: string | null,
  scopes: DetectedScope[],
  /** The keys of scopes with settings. They are kept whatever `prune` says */
  configured: ReadonlySet<string>,
  prune: Prune
): Detected => {
  const elsewhere = previous.groups.filter((group) => group.surface !== surface);
  const here = previous.groups.filter((group) => group.surface === surface);

  const before = new Map(here.map((group) => [group.id, group]));
  const listed = groups.length > 0 ? groups : here.map(({ id, name }) => ({ id, name }));
  const known = (id: string) => before.get(id)?.scopes ?? [];

  const merged = listed.map(({ id, name }): DetectedGroup => ({
    surface,
    id,
    name,
    /*
     * Nothing is touched where "out of sight" and "not drawn yet" cannot be told apart: a
     * deck switch goes "10 columns → 0 → 4", and rebuilding at zero would make the list
     * vanish and come straight back.
     */
    scopes:
      id !== currentGroupId || scopes.length === 0
        ? known(id)
        : mergeScopes(known(id), scopes, configured, prune),
  }));

  // Showing a group that was not reported should not happen, but if it does it is added rather than dropped
  if (currentGroupId && !merged.some((group) => group.id === currentGroupId)) {
    merged.push({ surface, id: currentGroupId, name: null, scopes });
  }
  // The other site's groups keep their place at the front, so switching sites does not shuffle the list
  return { groups: [...elsewhere, ...merged], currentGroupId };
};

/**
 * Removes one scope from the record — the only way to drop a column the user deleted: as
 * long as "not in the DOM right now" cannot be told from "merely out of sight" it cannot be
 * dropped automatically, and only the user knows it is gone. If the scope is still there
 * it is listed again next detection, so it can be undone.
 */
export const withoutScope = (detected: Detected, key: string): Detected => ({
  ...detected,
  groups: detected.groups.map((group) => ({
    ...group,
    scopes: group.scopes.filter((scope) => scope.key !== key),
  })),
});

/** Flattens the recorded scopes across every group. Used to decide what is "unassigned" */
export const allScopes = (detected: Detected): DetectedScope[] =>
  detected.groups.flatMap((group) => group.scopes);

/**
 * Takes only the scopes that can be recorded. A scope whose key could not be obtained cannot
 * be opened from the settings screen, so listing it would add an entry nobody can press.
 */
export const recordable = (
  found: { columnId: string | null; account: string | null; title: string | null }[]
): DetectedScope[] =>
  found.flatMap((one) =>
    one.columnId === null ? [] : [{ key: one.columnId, account: one.account, title: one.title }]
  );
