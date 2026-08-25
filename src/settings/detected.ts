/**
 * The record of detected columns. Not a setting, but the record that shows the settings
 * screen what exists in which deck.
 * The list of decks is not remembered, since it can be read from the rail every time.
 * What is remembered is each deck's columns alone.
 */
import { isRecord } from './schema.ts';

/** Columns without a `columnId` are not recorded */
export type DetectedColumn = {
  columnId: string;
  account: string | null;
  title: string | null;
  /**
   * It has settings but was not found when this deck was reopened.
   * A column deleted on X's side becomes this. The mark comes off once it is found again.
   */
  missing?: boolean;
};

/** `name` is used for display only */
export type DetectedDeck = {
  deckId: string;
  name: string | null;
  columns: DetectedColumn[];
};

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

const fillColumn = (v: unknown): DetectedColumn | null => {
  if (!isRecord(v)) return null;
  const columnId = str(v.columnId);
  if (!columnId) return null;
  const column: DetectedColumn = { columnId, account: str(v.account), title: str(v.title) };
  return v.missing === true ? { ...column, missing: true } : column;
};

const fillDeck = (v: unknown): DetectedDeck | null => {
  if (!isRecord(v)) return null;
  const deckId = str(v.deckId);
  if (!deckId) return null;
  const columns = Array.isArray(v.columns) ? v.columns : [];
  return {
    deckId,
    name: str(v.name),
    columns: columns.map(fillColumn).filter((column) => column !== null),
  };
};

/** The whole record. It also holds which deck was on screen (so the settings screen can mark "showing") */
export type Detected = {
  decks: DetectedDeck[];
  currentDeckId: string | null;
};

export const emptyDetected = (): Detected => ({ decks: [], currentDeckId: null });

/** Reads the stored record. Unreadable shapes are discarded (being a record, it is rebuilt on the next detection) */
export const fillDetected = (v: unknown): Detected => {
  if (!isRecord(v)) return emptyDetected();
  const stored = Array.isArray(v.decks) ? v.decks : [];
  return {
    decks: stored.map(fillDeck).filter((deck) => deck !== null),
    currentDeckId: str(v.currentDeckId),
  };
};

/**
 * Does not paint over a known value with `null`. Right after a deck switch the header's
 * box appears first, and a record overwritten as empty in that window fills the settings
 * screen with "columns with no name".
 */
const keepKnown = (fresh: DetectedColumn, known: DetectedColumn | undefined): DetectedColumn =>
  known
    ? {
        columnId: fresh.columnId,
        account: fresh.account ?? known.account,
        title: fresh.title ?? known.title,
      }
    : fresh;

/**
 * Merges the columns of the deck on screen. Ordinarily nothing is dropped: X Pro keeps
 * columns outside the window out of the DOM, so "not in the DOM right now" can well mean
 * "merely out of sight".
 *
 * A rebuild happens only when the deck is reopened (`rebuild`). Deleted columns drop out
 * there, but ones with settings are kept and marked `missing` (so their settings are not
 * left floating).
 * A column that is out of sight is placed after the visible column that preceded it in
 * the remembered order.
 */
const mergeColumns = (
  known: DetectedColumn[],
  fresh: DetectedColumn[],
  configured: ReadonlySet<string>,
  rebuild: boolean
): DetectedColumn[] => {
  const visible = new Set(fresh.map((column) => column.columnId));

  /*
   * Ties each out-of-sight column to the visible column that preceded it in the
   * remembered order. A null key means it is hidden off to the left. When the column it
   * is tied to is gone, `anchor` is not updated as the loop moves on, so it
   * automatically moves up to the visible column before that.
   */
  const trailing = new Map<string | null, DetectedColumn[]>();
  let anchor: string | null = null;
  for (const column of known) {
    if (visible.has(column.columnId)) {
      anchor = column.columnId;
      continue;
    }
    /*
     * Out of sight. Ordinarily kept as is.
     * Only on a rebuild are the ones without settings dropped.
     * The ones kept are marked "not found"
     */
    if (rebuild && !configured.has(column.columnId)) continue;
    const kept = rebuild && !column.missing ? { ...column, missing: true } : column;
    const behind = trailing.get(anchor);
    if (behind) behind.push(kept);
    else trailing.set(anchor, [kept]);
  }

  const knownById = new Map(known.map((column) => [column.columnId, column]));
  const merged: DetectedColumn[] = [];
  const placed = new Set<string>();
  /*
   * The same marker can sit on two elements for a moment (while X reuses an element, or
   * while an old element lingers mid deck-switch). Only one of them is listed.
   * Listed twice, the same column would appear twice on the settings screen.
   */
  const place = (column: DetectedColumn): void => {
    if (placed.has(column.columnId)) return;
    placed.add(column.columnId);
    merged.push(column);
  };

  for (const column of trailing.get(null) ?? []) place(column);
  for (const column of fresh) {
    place(keepKnown(column, knownById.get(column.columnId)));
    for (const behind of trailing.get(column.columnId) ?? []) place(behind);
  }
  return merged;
};

/**
 * Rebuilds the record.
 *
 * - The order and the names follow the list read from the rail. Decks not on the rail
 *   are discarded (tidying up deleted decks)
 * - Only the columns of the deck currently on screen are touched; other decks stay as they were
 * - When the rail could not be read (`decks` is empty), the previous record is kept and
 *   only the deck on screen is updated
 */
export const mergeDetected = (
  previous: Detected,
  decks: { deckId: string; name: string | null }[],
  currentDeckId: string | null,
  columns: DetectedColumn[],
  /** The `columnId`s of columns with settings. On a rebuild they are marked rather than dropped */
  configured: ReadonlySet<string>,
  /**
   * Whether this deck was reopened. The caller decides it by "is this a deck not yet
   * rebuilt on this page", so a page reload rebuilds just as a switch does.
   */
  rebuild: boolean
): Detected => {
  const before = new Map(previous.decks.map((deck) => [deck.deckId, deck]));
  const listed =
    decks.length > 0 ? decks : previous.decks.map(({ deckId, name }) => ({ deckId, name }));
  const known = (deckId: string) => before.get(deckId)?.columns ?? [];

  const merged = listed.map(({ deckId, name }): DetectedDeck => ({
    deckId,
    name,
    /*
     * Nothing is touched in situations where "out of sight" and "not drawn yet" cannot
     * be told apart. A switch goes "10 columns → 0 → 4", and rebuilding at the moment of
     * zero would make the settings screen's columns vanish and come straight back.
     */
    columns:
      deckId !== currentDeckId || columns.length === 0
        ? known(deckId)
        : mergeColumns(known(deckId), columns, configured, rebuild),
  }));

  // Showing a deck that is not on the rail should not happen, but if it does it is added rather than dropped
  if (currentDeckId && !merged.some((deck) => deck.deckId === currentDeckId)) {
    merged.push({ deckId: currentDeckId, name: null, columns });
  }
  return { decks: merged, currentDeckId };
};

/**
 * Removes one column from the record.
 *
 * The only way to drop a column the user deleted. As long as "not in the DOM right now"
 * cannot be told apart from "merely out of sight", it cannot be dropped automatically.
 * Only the user knows it is gone, so it is removed on their say-so.
 *
 * If that column is still there, it gets listed again on the next detection. It can be undone.
 */
export const withoutColumn = (detected: Detected, columnId: string): Detected => ({
  ...detected,
  decks: detected.decks.map((deck) => ({
    ...deck,
    columns: deck.columns.filter((column) => column.columnId !== columnId),
  })),
});

/** Flattens the recorded columns across every deck. Used to decide what is "unassigned" */
export const allColumns = (detected: Detected): DetectedColumn[] =>
  detected.decks.flatMap((deck) => deck.columns);

/**
 * Takes only the columns that can be recorded.
 * A column whose `columnId` could not be obtained cannot be opened from the settings
 * screen, so listing it would only add an entry nobody can press.
 */
export const recordable = (
  columns: { columnId: string | null; account: string | null; title: string | null }[]
): DetectedColumn[] =>
  columns.flatMap((column) =>
    column.columnId === null
      ? []
      : [{ columnId: column.columnId, account: column.account, title: column.title }]
  );
