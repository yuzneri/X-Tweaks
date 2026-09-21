export type NotificationColumnAccount = {
  columnId: string | null;
  accountId: string | null;
  hasNotifications: boolean;
};

/** Identifies the currently rendered deck without depending on order or notification content. */
export const columnSetKeyOf = (columns: readonly NotificationColumnAccount[]): string | null => {
  const columnIds = columns.map((column) => column.columnId);
  if (columnIds.some((columnId) => !columnId)) return null;
  const distinct = new Set(columnIds as string[]);
  if (distinct.size !== columnIds.length) return null;
  return JSON.stringify([...distinct].sort());
};

/**
 * Resolves a notification column without guessing from its title, position, or account type.
 * A missing React-derived account is accepted only when the current DOM and observed request
 * accounts leave exactly one possible one-to-one assignment.
 */
export const resolveNotificationAccount = (
  columns: readonly NotificationColumnAccount[],
  targetColumnId: string,
  observedAccounts: readonly string[]
): string | null => {
  const notificationColumns = columns.filter((column) => column.hasNotifications);
  const targets = notificationColumns.filter((column) => column.columnId === targetColumnId);
  if (targets.length !== 1) return null;
  const target = targets[0]!;
  if (target.accountId && /^\d+$/.test(target.accountId)) return target.accountId;

  const unresolved = notificationColumns.filter(
    (column) => !column.accountId || !/^\d+$/.test(column.accountId)
  );
  if (unresolved.length !== 1 || unresolved[0] !== target) return null;

  const claimed = new Set(
    notificationColumns
      .map((column) => column.accountId)
      .filter((accountId): accountId is string => accountId !== null && /^\d+$/.test(accountId))
  );
  const candidates = [
    ...new Set(
      observedAccounts.filter((accountId) => /^\d+$/.test(accountId) && !claimed.has(accountId))
    ),
  ];
  return candidates.length === 1 ? candidates[0]! : null;
};
