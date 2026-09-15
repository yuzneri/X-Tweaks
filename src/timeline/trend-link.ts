/**
 * Putting a trend card's link right on X Pro.
 *
 * A post can carry a card for a trend X has written up, and the card is a link to that
 * trend's page. On x.com it is an ordinary address; on X Pro the very same card arrives
 * written for the phone app instead — `twitter://trending/<id>` — and no browser can follow
 * one, so pressing the card does nothing whatever. The id is the same on both sites (the
 * same trend, the same card, written two ways), so the app link is rewritten to the page
 * x.com would have opened.
 *
 * Only this one form is touched. What other `twitter://` links X Pro may write is not known,
 * and an address guessed at would be no better than the dead one it replaced.
 */

import { changedCells } from '../appearance/changed.ts';

/**
 * The link X Pro writes, and nothing else: only digits are taken as the id, and anything
 * carried after them (a query, a fragment) leaves the link alone rather than being dropped
 * or passed on. Nothing X Pro writes today has any.
 */
const APP_LINK = /^twitter:\/\/trending\/(\d+)$/;

/** Asked of the page, so a sweep looks only at what could possibly be put right */
const APP_LINK_SELECTOR = 'a[href^="twitter://trending/"]';

/**
 * The address that app link stands for, or null where it is not one.
 *
 * The appearance writes the same address onto the line it puts a card's words into
 * (`appearance/apply.ts`) rather than reading the card's `href` back: a line built before
 * this sweep had been round would otherwise carry the dead link on.
 */
export const fixedTrendHref = (href: string | null | undefined): string | null => {
  const id = href?.match(APP_LINK)?.[1];
  return id === undefined ? null : `https://x.com/i/trending/${id}`;
};

/**
 * Puts every one of them on the page right, and says how many it was.
 *
 * Called on every settling: the cards arrive as the columns fill, and one X redraws comes
 * back written the old way. A settling told which posts changed looks in those alone — a
 * card arrives inside a post, and X redrawing one lands its post on that list too. Whatever
 * stands outside any post is reached by the rounds that look at everything, which come
 * every couple of seconds (`appearance/changed.ts`).
 */
export const fixTrendLinks = (): number => {
  let fixed = 0;
  for (const root of changedCells() ?? [document]) {
    for (const link of root.querySelectorAll(APP_LINK_SELECTOR)) {
      const href = fixedTrendHref(link.getAttribute('href'));
      if (href === null) continue;
      link.setAttribute('href', href);
      fixed += 1;
    }
  }
  return fixed;
};
