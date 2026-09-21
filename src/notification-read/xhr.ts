import { notificationRequestOf } from './request.ts';

export type ObservedXhr = {
  apiOrigin: string;
  columnSetKey: string | null;
  headers: Headers;
  payload: unknown;
};

type XhrConstructor = { prototype: XMLHttpRequest };

/** Observes successful notification REST responses from X's XMLHttpRequest dispatcher. */
export const watchNotificationXhr = (
  onResponse: (response: ObservedXhr) => void,
  Xhr: XhrConstructor = XMLHttpRequest,
  baseUrl = window.location.href,
  columnSetKeyAtRequest: () => string | null = () => null
): (() => void) => {
  const requests = new WeakMap<XMLHttpRequest, { method: string; url: string; headers: Headers }>();
  const prototype = Xhr.prototype;
  const nativeOpen = prototype.open as unknown as (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async: boolean,
    username?: string | null,
    password?: string | null
  ) => void;
  const nativeSetRequestHeader = prototype.setRequestHeader;
  const nativeSend = prototype.send;

  prototype.open = function (
    method: string,
    url: string | URL,
    async = true,
    username?: string | null,
    password?: string | null
  ): void {
    requests.set(this, { method, url: String(url), headers: new Headers() });
    Reflect.apply(nativeOpen, this, [method, url, async, username, password]);
  };
  prototype.setRequestHeader = function (name: string, value: string): void {
    const request = requests.get(this);
    if (request) request.headers.append(name, value);
    nativeSetRequestHeader.call(this, name, value);
  };
  prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
    const request = requests.get(this);
    let classified = null;
    if (request) {
      try {
        classified = notificationRequestOf(new URL(request.url, baseUrl).href, request.method);
      } catch {
        // The native send remains responsible for an invalid request URL.
      }
    }
    if (request && classified) {
      let columnSetKey: string | null = null;
      try {
        columnSetKey = columnSetKeyAtRequest();
      } catch {
        // Context observation must not change X's own request.
      }
      const observed = { apiOrigin: classified.apiOrigin, columnSetKey, headers: request.headers };
      this.addEventListener(
        'loadend',
        () => {
          if (this.status < 200 || this.status >= 300) return;
          try {
            const payload =
              this.responseType === 'json' ? this.response : JSON.parse(this.responseText) as unknown;
            onResponse({ ...observed, payload });
          } catch {
            // Observation must not change or report errors into X's own request.
          }
        },
        { once: true }
      );
    }
    nativeSend.call(this, body);
  };

  return () => {
    prototype.open = nativeOpen as typeof prototype.open;
    prototype.setRequestHeader = nativeSetRequestHeader;
    prototype.send = nativeSend;
  };
};
