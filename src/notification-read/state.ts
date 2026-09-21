export type PendingRead = {
  columnSetKey: string;
  accountKey: string;
  apiOrigin: string;
  cursor: string;
  headers: Headers;
};

export type ReadSnapshot = PendingRead & { generation: number };

type AccountState = {
  current: ReadSnapshot;
  completedGeneration: number;
  inFlight: Set<string>;
};

const keyOf = ({ generation, cursor }: ReadSnapshot): string => `${generation}\n${cursor}`;
const accountStateKey = (columnSetKey: string, accountKey: string): string =>
  `${columnSetKey}\n${accountKey}`;

/** In-memory column-set and account-separated state for fetched, sent, and completed cursors. */
export class PendingReads {
  private readonly accounts = new Map<string, AccountState>();

  retainColumnSet(columnSetKey: string): void {
    for (const [key, state] of this.accounts) {
      if (state.current.columnSetKey !== columnSetKey) this.accounts.delete(key);
    }
  }

  pendingAccountKeys(columnSetKey: string): string[] {
    return [...this.accounts]
      .filter(
        ([, state]) =>
          state.current.columnSetKey === columnSetKey &&
          state.completedGeneration < state.current.generation
      )
      .map(([, state]) => state.current.accountKey);
  }

  observe(read: PendingRead): void {
    const stateKey = accountStateKey(read.columnSetKey, read.accountKey);
    const previous = this.accounts.get(stateKey);
    if (previous?.current.cursor === read.cursor) {
      previous.current = { ...read, generation: previous.current.generation };
      return;
    }
    const generation = (previous?.current.generation ?? 0) + 1;
    this.accounts.set(stateKey, {
      current: { ...read, generation },
      completedGeneration: previous?.completedGeneration ?? 0,
      inFlight: previous?.inFlight ?? new Set(),
    });
  }

  begin(columnSetKey: string, accountKey: string): ReadSnapshot | null {
    const state = this.accounts.get(accountStateKey(columnSetKey, accountKey));
    if (!state || state.completedGeneration >= state.current.generation) return null;
    const key = keyOf(state.current);
    if (state.inFlight.has(key)) return null;
    state.inFlight.add(key);
    return state.current;
  }

  finish(snapshot: ReadSnapshot, succeeded: boolean): void {
    const state = this.accounts.get(accountStateKey(snapshot.columnSetKey, snapshot.accountKey));
    if (!state) return;
    state.inFlight.delete(keyOf(snapshot));
    if (succeeded) state.completedGeneration = Math.max(state.completedGeneration, snapshot.generation);
  }
}
