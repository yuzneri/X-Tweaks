import {
  READ_ENABLED,
  READ_REQUEST,
  READ_RESPONSE,
  type ReadRequest,
  type ReadStatus,
} from './protocol.ts';
import {
  accountIdOfRequest,
  notificationRequestOf,
  readEndpoint,
  readHeadersFrom,
  topCursorOf,
} from './request.ts';
import { PendingReads } from './state.ts';
import { watchNotificationXhr } from './xhr.ts';

type MainOptions = {
  accountForColumn: (columnId: string, observedAccounts: readonly string[]) => string | null;
  columnSetKey: () => string | null;
  runtime?: MainRuntime;
};

type ObservedRequest = {
  apiOrigin: string;
  columnSetKey: string | null;
  headers: Headers;
};

type MainWindow = {
  fetch: typeof fetch;
  location: { origin: string };
  addEventListener: (type: 'message', listener: (event: MessageEvent<unknown>) => void) => void;
  removeEventListener: (type: 'message', listener: (event: MessageEvent<unknown>) => void) => void;
  postMessage: (message: unknown, targetOrigin: string) => void;
};

export type MainRuntime = {
  target: MainWindow;
  cookie: () => string;
  observeXhr: (
    onResponse: Parameters<typeof watchNotificationXhr>[0],
    columnSetKeyAtRequest: () => string | null
  ) => () => void;
};

const warning = (message: string): void => console.warn(`[X Tweaks] ${message}`);

const browserRuntime = (): MainRuntime => ({
  target: window as unknown as MainWindow,
  cookie: () => document.cookie,
  observeXhr: (onResponse, columnSetKeyAtRequest) =>
    watchNotificationXhr(
      onResponse,
      XMLHttpRequest,
      window.location.href,
      columnSetKeyAtRequest
    ),
});

/** Observes X's notification fetches and handles narrowly scoped read requests. */
export const installNotificationReadMain = ({
  accountForColumn,
  columnSetKey,
  runtime = browserRuntime(),
}: MainOptions): (() => void) => {
  const { target } = runtime;
  const nativeFetch = target.fetch;
  const pending = new PendingReads();
  let enabled = false;
  const warned = new Set<string>();
  const warnOnce = (kind: string, message: string): void => {
    if (warned.has(kind)) return;
    warned.add(kind);
    warning(message);
  };

  const currentColumnSetKey = (): string | null => {
    try {
      return columnSetKey();
    } catch {
      return null;
    }
  };

  const activateCurrentColumnSet = (): string | null => {
    const current = currentColumnSetKey();
    if (current) pending.retainColumnSet(current);
    return current;
  };

  const observePayload = (request: ObservedRequest, payload: unknown): void => {
    const current = activateCurrentColumnSet();
    if (!request.columnSetKey || request.columnSetKey !== current) return;
    const accountKey = accountIdOfRequest(request.headers, runtime.cookie());
    if (!accountKey) {
      warnOnce('request-account', 'Could not identify the account for a notifications request');
      return;
    }
    const cursor = topCursorOf(payload);
    if (!cursor) {
      warnOnce('top-cursor', 'Could not find the top cursor in a notifications response');
      return;
    }
    pending.observe({
      columnSetKey: request.columnSetKey,
      accountKey,
      apiOrigin: request.apiOrigin,
      cursor,
      headers: readHeadersFrom(request.headers),
    });
  };

  const observedFetch = function (
    this: unknown,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let request: Request | null = null;
    try {
      const observationInput =
        typeof input === 'string' || input instanceof URL
          ? input
          : Request.prototype.clone.call(input);
      request = new Request(observationInput, init);
    } catch {
      // X receives the original input and decides whether it is valid.
    }
    const result = nativeFetch.call(this, input, init);
    if (!request) return result;
    const classified = notificationRequestOf(request.url, request.method);
    if (!classified) return result;
    const observed = request;
    const observedColumnSetKey = currentColumnSetKey();
    void result.then(
      (response) => {
        if (!response.ok) return;
        void Promise.resolve()
          .then(() => response.clone().json() as Promise<unknown>)
          .then((payload: unknown) =>
            observePayload(
              {
                apiOrigin: classified.apiOrigin,
                columnSetKey: observedColumnSetKey,
                headers: observed.headers,
              },
              payload
            )
          )
          .catch(() => warnOnce('response-json', 'Could not read a notifications response'));
      },
      () => {
        // The page owns the request failure; observing it adds no second warning.
      }
    );
    return result;
  };
  target.fetch = observedFetch;

  // X's current REST client uses XMLHttpRequest rather than fetch.
  const stopXhr = runtime.observeXhr(
    ({ apiOrigin, columnSetKey, headers, payload }) =>
      observePayload({ apiOrigin, columnSetKey, headers }, payload),
    currentColumnSetKey
  );

  const respond = (requestId: number, status: ReadStatus): void => {
    target.postMessage({ type: READ_RESPONSE, requestId, status }, target.location.origin);
  };

  const onMessage = (event: MessageEvent<unknown>): void => {
    if (event.source !== target) return;
    const data = event.data as {
      type?: unknown;
      enabled?: unknown;
      requestId?: unknown;
      columnId?: unknown;
    } | null;
    if (data?.type === READ_ENABLED && typeof data.enabled === 'boolean') {
      enabled = data.enabled;
      return;
    }
    if (
      !enabled ||
      !data ||
      data.type !== READ_REQUEST ||
      typeof data.requestId !== 'number' ||
      typeof data.columnId !== 'string'
    ) {
      return;
    }
    const { requestId, columnId } = data as ReadRequest;
    const current = activateCurrentColumnSet();
    if (!current) {
      respond(requestId, 'mismatch');
      return;
    }
    const accountKey = accountForColumn(columnId, pending.pendingAccountKeys(current));
    if (!accountKey) {
      respond(requestId, 'mismatch');
      warnOnce('column-account', 'A notification column did not match its request account');
      return;
    }
    const snapshot = pending.begin(current, accountKey);
    if (!snapshot) {
      respond(requestId, 'nothing-pending');
      return;
    }
    const endpoint = readEndpoint(snapshot.apiOrigin);
    if (!endpoint) {
      pending.finish(snapshot, false);
      respond(requestId, 'failed');
      return;
    }
    void nativeFetch.call(target, endpoint, {
      method: 'POST',
      headers: snapshot.headers,
      body: new URLSearchParams({ cursor: snapshot.cursor }),
      credentials: 'include',
      keepalive: true,
    }).then(
      (response) => {
        pending.finish(snapshot, response.ok);
        respond(requestId, response.ok ? 'marked' : 'failed');
        if (!response.ok) {
          warnOnce('read-http', `X rejected a notification read update (HTTP ${response.status})`);
        }
      },
      () => {
        pending.finish(snapshot, false);
        respond(requestId, 'failed');
        warnOnce('read-network', 'A notification read update could not be sent');
      }
    );
  };
  target.addEventListener('message', onMessage);

  return () => {
    if (target.fetch === observedFetch) target.fetch = nativeFetch;
    target.removeEventListener('message', onMessage);
    stopXhr();
  };
};
