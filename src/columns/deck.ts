/** How decks are told apart. Picking them out of X's DOM lives in `registry.ts` */

const NOT_A_DECK = new Set(['manage', 'new']);

/**
 * Reads the `deckId` out of a URL. null when it points at no deck.
 * The rail also carries `manage`, `new`, and the `…/edit` of the deck on screen,
 * so anything with more path after the id is rejected (taking `…/edit` would list
 * the same deck twice).
 */
export const deckIdOf = (url: string): string | null => {
  const found = /\/i\/decks\/([^/?#]+)(\/[^?#]*)?/.exec(url);
  if (!found) return null;
  const [, id, rest] = found;
  if (!id || NOT_A_DECK.has(id)) return null;
  return rest && rest !== '/' ? null : id;
};

/**
 * The enclosing marks, paired open with close and tried in order. Merged into a
 * single character class, `Deck "News" isn't selected` would swallow up to another
 * quote mark and yield `News" isn`.
 */
const QUOTES: readonly (readonly [string, string])[] = [
  ['「', '」'],
  ['"', '"'],
  ['“', '”'],
  ['«', '»'],
  ["'", "'"],
];

/**
 * Extracts a deck name from its label ("Deck "Tech" is not selected"). null when unreadable.
 *
 * Both the enclosing marks and the surrounding words change with the UI language, so
 * this is only ever used for display. Identification is done by `deckIdOf`, and when
 * that fails the caller falls back to numbering.
 * A name can itself contain the enclosing marks (「あ「い」う」), so the last closing
 * mark is the one taken.
 */
export const deckNameOf = (label: string | null): string | null => {
  const text = label ?? '';
  for (const [open, close] of QUOTES) {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    if (start < 0 || end <= start + 1) continue;
    const name = text.slice(start + 1, end).trim();
    if (name) return name.slice(0, 40);
  }
  return null;
};

export type DeckInfo = { deckId: string; name: string | null };

/**
 * What could be read about the decks right now.
 *
 * An empty `decks` means "the list is unknown"; a null `deckId` means "which deck is
 * on screen cannot be decided". The recording side uses that distinction to avoid
 * deleting what it does not know.
 */
export type DeckState = { decks: DeckInfo[]; deckId: string | null };

/**
 * The stand-in name for the deck on screen when it cannot be read from the URL.
 * With null, that deck's columns would be recorded nowhere and disappear from the
 * settings screen, so even in an unidentifiable state the columns currently visible
 * can still be listed. X's ids are alphanumeric, so this name never collides.
 */
export const UNKNOWN_DECK = '?';

/** What the judgement needs, copied out of an item on the rail */
export type DeckRailItem = {
  /** Only the selected deck is a `<button>`; the rest are `<a>` */
  tagName: string;
  href: string | null;
  /** The label (`aria-label`). The deck name is in here */
  label: string | null;
};

/**
 * Decides the deck state from the items on the rail and the id of the deck on screen
 * read from the URL.
 *
 * The rail and the URL do not change together. On a switch the URL changes first and
 * the rail follows seconds later, and during that gap the deck the URL points at sits
 * on the "not selected" side of the rail (`<a>`). Read as is, the deck being viewed
 * until a moment ago disappears along with its records.
 * While they disagree, "unknown" is returned and the rail is given time to catch up.
 */
export const deckStateFrom = (items: readonly DeckRailItem[], current: string): DeckState => {
  const linked = items.map((item) => deckIdOf(item.href ?? ''));

  // The rail is unreadable. The list is unknown, but the URL still says which deck is on screen
  if (items.length === 0) return { decks: [], deckId: current };
  // The deck the URL points at sits on the "not selected" side, so the rail has not caught up yet
  if (linked.includes(current)) return { decks: [], deckId: null };

  const found: DeckInfo[] = [];
  // The rail's order is the one the user chose. Keep it, including where the selected deck sits
  items.forEach((item, index) => {
    const id = linked[index];
    if (id) {
      found.push({ deckId: id, name: deckNameOf(item.label) });
    } else if (item.tagName === 'BUTTON' && !found.some((deck) => deck.deckId === current)) {
      found.push({ deckId: current, name: deckNameOf(item.label) });
    }
  });
  // Even if the rail's shape changes and the selected one cannot be found, list at least that one
  if (!found.some((deck) => deck.deckId === current)) {
    found.push({ deckId: current, name: null });
  }
  return { decks: found, deckId: current };
};
