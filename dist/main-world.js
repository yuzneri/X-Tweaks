"use strict";
(() => {
  // src/main-world.ts
  var REQUEST = "xpro-tweaks:request-columns";
  var RESPONSE = "xpro-tweaks:response-columns";
  var COLUMN_SELECTOR = '[data-testid="multi-column-layout-column-content"]';
  var COLUMN_ID_ATTR = "data-xpro-column-id";
  var DRAWER_SELECTOR = '[data-testid="drawerAnimatedDiv"]';
  var fiberOf = (el) => {
    const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
    return key ? el[key] ?? null : null;
  };
  var columnIdOf = (el) => {
    let fiber = fiberOf(el);
    for (let depth = 0; fiber && depth < 8; depth++) {
      const columnId = fiber.memoizedProps?.columnId;
      if (typeof columnId === "string" && columnId) return { columnId, depth };
      fiber = fiber.return ?? null;
    }
    return { columnId: null, depth: null };
  };
  var columnIdBelow = (el, limit = 400) => {
    const root = fiberOf(el);
    if (!root) return null;
    const queue = [root];
    for (let seen = 0; queue.length > 0 && seen < limit; seen++) {
      const fiber = queue.shift();
      const columnId = fiber.memoizedProps?.columnId;
      if (typeof columnId === "string" && columnId) return columnId;
      if (fiber.child) queue.push(fiber.child);
      if (fiber.sibling) queue.push(fiber.sibling);
    }
    return null;
  };
  var collectDrawers = () => Array.from(document.querySelectorAll(DRAWER_SELECTOR)).map((el, index) => ({
    index,
    columnId: columnIdOf(el).columnId ?? columnIdBelow(el)
  }));
  var collect = () => Array.from(document.querySelectorAll(COLUMN_SELECTOR)).map((el, index) => {
    const { columnId, depth } = columnIdOf(el);
    if (columnId) {
      if (el.getAttribute(COLUMN_ID_ATTR) !== columnId) el.setAttribute(COLUMN_ID_ATTR, columnId);
    } else {
      el.removeAttribute(COLUMN_ID_ATTR);
    }
    return { index, columnId, depth, fiberFound: !!fiberOf(el) };
  });
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== REQUEST) return;
    let payload;
    try {
      payload = { columns: collect(), drawers: collectDrawers(), error: null };
    } catch (e) {
      payload = { columns: [], drawers: [], error: e instanceof Error ? e.message : String(e) };
    }
    window.postMessage({ type: RESPONSE, requestId: data.requestId, ...payload }, window.location.origin);
  });
  document.documentElement.dataset.xproMainWorld = "1";
})();
