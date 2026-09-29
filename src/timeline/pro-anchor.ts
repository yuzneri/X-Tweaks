/** Prefer the actual visible tweet over hidden/estimated cells in X's virtual list. */
export type VisibleCell = { id: string; top: number; bottom: number; cellTop: number };
export const chooseVisibleAnchor = (
  cells: VisibleCell[], top: number, bottom: number, relativeTop: number,
): { itemId: string; offset: number } | null => {
  const first = cells.filter(c =>
    [c.top, c.bottom, c.cellTop].every(Number.isFinite) && c.bottom > c.top &&
    c.bottom > top && c.top < bottom,
  ).sort((a, b) => a.top - b.top)[0];
  return first && Number.isFinite(relativeTop)
    ? { itemId: first.id, offset: relativeTop + first.cellTop - top } : null;
};

export const visiblePostAnchor = (owner: unknown, scroll: HTMLElement | undefined, rect: unknown) => {
  if (!scroll?.isConnected || !rect || typeof rect !== 'object') return null;
  const viewport = rect as { getTop?: () => number };
  const scroller = owner as {
    _getAnchorItemCandidates?: () => Array<{ item: { id: string } }>;
    _cells?: Map<string, { getElement?: () => Element }>;
  };
  if (typeof viewport.getTop !== 'function' || typeof scroller._getAnchorItemCandidates !== 'function' ||
    !(scroller._cells instanceof Map)) return null;
  const bounds = scroll.getBoundingClientRect();
  const cells: VisibleCell[] = [];
  // X has already excluded removed or reordered items from these candidates.
  for (const { item } of scroller._getAnchorItemCandidates()) {
    const cell = scroller._cells.get(item.id)?.getElement?.();
    if (!(cell instanceof Element) || !scroll.contains(cell)) continue;
    const post = cell.querySelector('article[data-testid="tweet"]');
    if (!post) continue;
    const box = post.getBoundingClientRect();
    if (box.height <= 0 || box.width <= 0) continue;
    cells.push({ id: item.id, top: box.top, bottom: box.bottom, cellTop: cell.getBoundingClientRect().top });
  }
  return chooseVisibleAnchor(cells, bounds.top, bounds.bottom, viewport.getTop());
};
