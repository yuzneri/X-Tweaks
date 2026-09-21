type RecordLike = Record<string, unknown>;

export type ColumnAccount = {
  accountId: string;
  path: string | null;
};

const INVALID = Symbol('invalid-column-account');
type Candidate = ColumnAccount | typeof INVALID | null;

const own = (value: unknown, key: string): unknown => {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
};

const stringAt = (value: unknown, ...path: string[]): string | undefined => {
  let current = value;
  for (const key of path) current = own(current, key);
  return typeof current === 'string' ? current : undefined;
};

const idFromPath = (pathname: string | undefined): string | undefined => {
  if (!pathname) return undefined;
  try {
    return new URL(pathname, 'https://pro.x.com').searchParams.get('actAsUserId') ?? undefined;
  } catch {
    return undefined;
  }
};

const contextInMatchingObject = (
  value: unknown,
  columnId: string,
  selfId: string | null
): Candidate => {
  const directId = own(value, 'columnId');
  const privateId = own(value, '_columnId');
  if (directId !== columnId && privateId !== columnId) return null;

  const path =
    stringAt(value, 'pathname') ??
    stringAt(value, 'location', 'pathname') ??
    stringAt(value, '_columnHistory', 'location', 'pathname') ??
    null;
  const actAsValues = [
    stringAt(value, 'actAsUserId'),
    stringAt(value, '_actAsUserId'),
    stringAt(value, 'state', 'actAsUserId'),
    stringAt(value, 'query', 'actAsUserId'),
    stringAt(value, 'location', 'state', 'actAsUserId'),
    stringAt(value, 'location', 'query', 'actAsUserId'),
    stringAt(value, '_columnHistory', 'location', 'state', 'actAsUserId'),
    stringAt(value, '_columnHistory', 'location', 'query', 'actAsUserId'),
    idFromPath(path ?? undefined),
  ].filter((candidate): candidate is string => candidate !== undefined);
  const distinct = new Set(actAsValues);
  if (distinct.size > 1) return INVALID;
  const actAs = actAsValues[0];

  if (actAs !== undefined && actAs !== '') {
    return /^\d+$/.test(actAs) ? { accountId: actAs, path } : INVALID;
  }
  // An empty value explicitly means self. With no value, require a location as evidence
  // that this is the column config/history, not a component prop that merely has columnId.
  if (actAs === undefined && path === null) return null;
  return selfId ? { accountId: selfId, path } : null;
};

/**
 * Searches a bounded object graph for the config/history object belonging to one column.
 * An arbitrary `actAsUserId` elsewhere in React state is deliberately not accepted.
 */
export const columnAccountIn = (
  roots: readonly unknown[],
  columnId: string,
  selfId: string | null,
  limit = 2_000
): ColumnAccount | null => {
  const queue = [...roots];
  const seen = new Set<object>();
  const found = new Map<string, ColumnAccount>();
  for (let index = 0; index < queue.length && index < limit; index++) {
    const value = queue[index];
    if (typeof value !== 'object' || value === null || seen.has(value)) continue;
    seen.add(value);
    const match = contextInMatchingObject(value, columnId, selfId);
    if (match === INVALID) return null;
    if (match) found.set(`${match.accountId}\n${match.path ?? ''}`, match);
    let descriptors: Record<string, PropertyDescriptor>;
    try {
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch {
      continue;
    }
    for (const descriptor of Object.values(descriptors)) {
      if ('value' in descriptor && typeof descriptor.value === 'object' && descriptor.value !== null) {
        queue.push(descriptor.value);
      }
    }
  }
  const matches = [...found.values()];
  if (matches.length === 0) return null;
  const accountIds = new Set(matches.map((match) => match.accountId));
  if (accountIds.size !== 1) return null;
  return matches.find((match) => match.path !== null) ?? matches[0]!;
};
