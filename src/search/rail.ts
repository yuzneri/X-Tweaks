/**
 * Where in x.com's rail the search form goes.
 *
 * The rail comes in three shapes, and X marks none of them as such. What is here was
 * measured on saved copies of the three pages (see the design document):
 *
 * | page       | the rail starts with                          | a search box in it |
 * | ---------- | --------------------------------------------- | ------------------ |
 * | home, etc. | the search box, pinned, then a spacer          | yes                |
 * | /search    | X's own search filters (a heading and a body)  | no                 |
 * | /explore   | Today's News                                   | no                 |
 *
 * On `/search` the form takes the filters' place rather than standing beside them: what
 * X offers there — from anyone or people you follow, anywhere or near you, and a link to
 * its own advanced search — is a part of what this form asks for, so leaving both would
 * put the same two questions on the screen twice.
 */

const RAIL = '[data-testid="sidebarColumn"]';

/**
 * The mark on the panel this feature puts in the rail.
 *
 * Named here rather than only where the panel is built, because deciding where the panel
 * goes means being able to tell it apart from X's own blocks — see `withoutOurs`.
 */
export const PANEL = 'data-xpro-search';

/** X's search box. Present in the rail on a timeline, and nowhere near it on /search */
const SEARCH_FORM = 'form[role="search"]';

/**
 * The link out of X's own search filters. What names that block, since X marks it with
 * nothing: matching its heading would mean matching a word, and the word changes with the
 * language X is being read in.
 */
const ADVANCED_SEARCH = 'a[href*="/search-advanced"]';

/**
 * The small print at the foot of the rail. Used only to find the container the blocks sit
 * in — it is the one marker present in all three shapes, and the rail holds exactly one
 * `nav` in each (measured).
 */
const SMALL_PRINT = 'nav';

/**
 * Which of the three shapes this rail is, given what it holds.
 *
 * Kept apart from the DOM so the rule can be read and tested on its own. The search box
 * decides first: a rail holding one is a timeline's rail, whatever else may be in it.
 */
export type RailShape = 'below-search' | 'replace-filters' | 'at-top';

export const railShape = (holds: { searchForm: boolean; advancedSearch: boolean }): RailShape => {
  if (holds.searchForm) return 'below-search';
  if (holds.advancedSearch) return 'replace-filters';
  return 'at-top';
};

/**
 * The container the rail's blocks are laid out in, or null while the rail cannot be read.
 *
 * Found by climbing from the small print rather than descending from the rail. Descending
 * runs into a fork — on `/explore` a container two levels down already has two children
 * while the blocks are four levels below that — and taking the wrong branch there is
 * silent. Climbing stops at the first ancestor with a sibling, which is the block the
 * small print is, so its parent is the container (measured on all three pages).
 */
const holderOf = (rail: Element): Element | null => {
  const smallPrint = rail.querySelector(SMALL_PRINT);
  if (!smallPrint) return null;
  let block: Element = smallPrint;
  while (
    block.parentElement &&
    block.parentElement !== rail &&
    block.parentElement.children.length < 2
  ) {
    block = block.parentElement;
  }
  const holder = block.parentElement;
  return holder && holder !== rail ? holder : null;
};

/**
 * Which of the container's own children holds this marker.
 *
 * Asked downwards from the container rather than climbed up from the marker. Climbing
 * stops at the first ancestor with a sibling, and inside a block that is not the block —
 * X's search filters hold three things side by side, so climbing from the link inside
 * them stops two levels short and returns something the container has never heard of.
 */
const blockContaining = (holder: Element, marker: Element): Element | null =>
  [...holder.children].find((child) => child.contains(marker)) ?? null;

/**
 * Whether an element is the empty box X puts under the pinned search form to hold the
 * height the form is not taking up, the form being out of the flow.
 *
 * Told by being empty, which is all there is to go on. Getting it wrong costs the form one
 * place in the order and nothing else, so nothing is risked by the guess.
 */
const isSpacer = (element: Element): boolean =>
  element.children.length === 0 && (element.textContent ?? '') === '';

/**
 * Whether an element is the heading X puts above its search filters.
 *
 * Named by where it sits — immediately before the block holding the link — since X marks
 * it with nothing and its words change with the language. Refusing anything that holds a
 * link keeps a block of X's from being hidden by mistake if the arrangement changes:
 * every other block in the rail carries links, and a heading carries none.
 */
const isFilterHeading = (element: Element): boolean => element.querySelector('a') === null;

/**
 * The same element, or the one after it where it is the panel already standing there.
 *
 * Where the form goes must not depend on whether the form is already there. Without this,
 * a panel standing in exactly the right place makes the answer come back as "put it before
 * itself": on a timeline the step past the spacer lands on the panel, and at the head of
 * the rail the first child *is* the panel. The insertion then sees a place it does not
 * match, moves it — and a node moved is a node taken out of the document and put back,
 * which drops the caret out of whatever field was being typed in.
 */
const withoutOurs = (element: Element | null): Element | null =>
  element?.hasAttribute(PANEL) ? element.nextElementSibling : element;

/** Where the form goes, and what of X's is covered over to make room for it */
export type Placement = {
  /** The container to insert into */
  holder: Element;
  /** Insert before this. null means "at the end" */
  before: Element | null;
  /**
   * X's own blocks that this form stands in for. They are hidden rather than removed:
   * every rail-block selector in `appearance/css.ts` refuses anything holding the search
   * form, and taking a node out of the rail could put a whole block within reach of a
   * rule meant for one of its parts.
   */
  covers: Element[];
};

/**
 * Reads the rail and says where the form goes, or null while the rail is not there or
 * cannot be made sense of.
 *
 * Called on every settling of the DOM, so it does no more than a handful of lookups.
 */
export const placementIn = (root: ParentNode = document): Placement | null => {
  const rail = root.querySelector(RAIL);
  if (!rail) return null;
  const holder = holderOf(rail);
  if (!holder) return null;

  const searchForm = rail.querySelector(SEARCH_FORM);
  const advancedSearch = rail.querySelector(ADVANCED_SEARCH);
  const shape = railShape({ searchForm: searchForm !== null, advancedSearch: advancedSearch !== null });

  if (shape === 'below-search' && searchForm) {
    const block = blockContaining(holder, searchForm);
    if (!block) return null;
    // Past the spacer as well, so the form starts where the rail's contents actually start
    const next = block.nextElementSibling;
    const after = next && isSpacer(next) ? next : block;
    return { holder, before: withoutOurs(after.nextElementSibling), covers: [] };
  }

  if (shape === 'replace-filters' && advancedSearch) {
    const block = blockContaining(holder, advancedSearch);
    if (!block) return null;
    const heading = block.previousElementSibling;
    const covers = heading && isFilterHeading(heading) ? [heading, block] : [block];
    return { holder, before: covers[0] ?? block, covers };
  }

  return { holder, before: withoutOurs(holder.firstElementChild), covers: [] };
};
