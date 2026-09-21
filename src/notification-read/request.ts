export const API_ORIGINS = new Set([
  'https://pro.x.com',
  'https://x.com',
  'https://api.x.com',
]);

export type NotificationRequest = {
  apiOrigin: string;
  kind: 'rest' | 'graphql';
};

const REST_PATH = /^\/(?:i\/api\/)?2\/notifications\/all\.json$/;
const GRAPHQL_PATH = /^\/(?:i\/api\/)?graphql\/[^/]+\/NotificationsTimeline$/;

/** Classifies only requests that load the "All notifications" timeline. */
export const notificationRequestOf = (url: string, method = 'GET'): NotificationRequest | null => {
  if (method.toUpperCase() !== 'GET') return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!API_ORIGINS.has(parsed.origin)) return null;
  if (REST_PATH.test(parsed.pathname)) return { apiOrigin: parsed.origin, kind: 'rest' };
  if (!GRAPHQL_PATH.test(parsed.pathname)) return null;
  try {
    const variables = JSON.parse(parsed.searchParams.get('variables') ?? 'null') as {
      timeline_type?: unknown;
      timelineType?: unknown;
    } | null;
    const timelineType = variables?.timeline_type ?? variables?.timelineType;
    return timelineType === 'All' ? { apiOrigin: parsed.origin, kind: 'graphql' } : null;
  } catch {
    return null;
  }
};

/** Reads X's logged-in user id from the twid cookie (`u=<decimal id>`). */
export const userIdFromCookies = (cookies: string): string | null => {
  const encoded = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('twid='))
    ?.slice(5);
  if (!encoded) return null;
  try {
    const value = decodeURIComponent(encoded);
    const match = /^u=(\d+)$/.exec(value);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

type RecordLike = Record<string, unknown>;
const record = (value: unknown): RecordLike | null =>
  typeof value === 'object' && value !== null ? (value as RecordLike) : null;

/** Finds the first valid top cursor in a REST or GraphQL URT response. */
export const topCursorOf = (payload: unknown, limit = 10_000): string | null => {
  const queue: unknown[] = [payload];
  const seen = new Set<object>();
  for (let index = 0; index < queue.length && index < limit; index++) {
    const value = queue[index];
    if (typeof value !== 'object' || value === null || seen.has(value)) continue;
    seen.add(value);
    const item = record(value)!;
    if (typeof item.entryId === 'string' && item.entryId.startsWith('cursor-top-')) {
      const cursor = record(item.content)?.value;
      if (typeof cursor === 'string' && cursor.length > 0) return cursor;
    }
    if (Array.isArray(value)) queue.push(...value);
    else queue.push(...Object.values(item));
  }
  return null;
};

export const accountIdOfRequest = (headers: Headers, cookies: string): string | null => {
  const delegated = headers.get('x-act-as-user-id');
  if (delegated !== null) return /^\d+$/.test(delegated) ? delegated : null;
  return userIdFromCookies(cookies);
};

const COPIED_HEADERS = [
  'authorization',
  'x-act-as-user-id',
  'x-contributor-version',
  'x-csrf-token',
  'x-twitter-active-user',
  'x-twitter-auth-type',
  'x-twitter-client-language',
] as const;

/** Copies only the page authentication context needed by X's own API. */
export const readHeadersFrom = (source: Headers): Headers => {
  const headers = new Headers();
  for (const name of COPIED_HEADERS) {
    const value = source.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
  return headers;
};

export const readEndpoint = (apiOrigin: string): string | null => {
  if (!API_ORIGINS.has(apiOrigin)) return null;
  const path =
    apiOrigin === 'https://api.x.com'
      ? '/2/notifications/all/last_seen_cursor.json'
      : '/i/api/2/notifications/all/last_seen_cursor.json';
  return `${apiOrigin}${path}`;
};
