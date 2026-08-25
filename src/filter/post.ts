/**
 * Reads what the judgement needs out of a post cell.
 * This is the only place that depends on the shape of X's DOM. When X changes its
 * structure, this is the file to fix.
 */
import { canEmphasize, type MatchTarget } from '../settings/schema.ts';
import type { Post } from './decide.ts';

/** The unit that gets collapsed. It sits outside the post proper, so the gap between posts folds with it */
export const CELL_SELECTOR = '[data-testid="cellInnerDiv"]';

const TWEET = '[data-testid="tweet"]';
const TWEET_TEXT = '[data-testid="tweetText"]';
const SOCIAL_CONTEXT = '[data-testid="socialContext"]';
const AUTHOR_AVATAR = '[data-testid="Tweet-User-Avatar"]';
const USER_NAME = '[data-testid="User-Name"]';
const AVATAR_NAME_PREFIX = 'UserAvatar-Container-';
const AVATAR_NAME = `[data-testid^="${AVATAR_NAME_PREFIX}"]`;
const MEDIA =
  '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"]';
const PROFILE_LINK = 'a[role="link"][href^="https://x.com/"]';
/** X calls this Birdwatch internally, and that name is still in the marker */
const COMMUNITY_NOTE = '[data-testid="birdwatch-pivot"]';

/**
 * The arrow that only appears on notes awaiting a rating.
 * Being a decorative icon it is a weak marker, but the wording changes with the UI
 * language and cannot be used. When it can no longer be told apart, this falls back
 * to "a note is attached".
 */
const NOTE_RATING_ARROW = '[data-testid="icon-arrow-right"]';

/**
 * Polls. While voting is open the choices are `radio`; once closed they become `list`.
 * The open side does not require `cardPoll` because carousel-style cards do not carry
 * that marker. Without enclosing it in the card frame instead, it would match wrongly
 * the moment X starts using `radio` somewhere else.
 */
const CARD = '[data-testid="card.wrapper"]';
const CAROUSEL = '[data-testid="Carousel-NavRight"]';
/** A card's detail. The first child is the linked domain, the second the headline */
const CARD_DETAIL = '[data-testid$=".detail"]';
/** A Space's container. The first child is the host's name, the second the title */
const SPACE_BOX = '[data-testid="wrapperView"]';
const POLL = '[data-testid="cardPoll"]';
const POLL_OPEN = `${CARD} [role="radio"]`;
const POLL_CLOSED = `${POLL} [role="list"]`;

const SPACE = 'a[href*="/i/spaces/"]';

/**
 * Articles (X's Articles). Spotted by the cover image's marker.
 * An "Article" label follows right after it, but the wording changes with the UI
 * language and is not used. An article without a cover image is missed, but nothing
 * is ever matched wrongly.
 */
const ARTICLE = '[data-testid="article-cover-image"]';

/**
 * The mark of an ad. Spotted by the shape of the icon on the "Promoted" line (the
 * wording changes with the language). Looking for presence rather than absence is the
 * point: going by "having no timestamp" would tip every post into being an ad and
 * make them all vanish the day X changes how it shows times.
 */
const AD_BADGE = 'svg path[d^="M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13"]';

/**
 * The screen name. On a repost the avatar points at the original author; on a quote
 * the first one points at the quoting side.
 * It takes the first avatar found within, so passing the quote frame returns the
 * quoted post's author.
 */
const authorOf = (root: Element): string | null => {
  const avatar = root.querySelector(AUTHOR_AVATAR)?.querySelector(AVATAR_NAME);
  const testId = avatar?.getAttribute('data-testid');
  return testId ? testId.slice(AVATAR_NAME_PREFIX.length) : null;
};

/**
 * The profile name (display name). As with `authorOf`, whose name it is depends on
 * where the search starts. The name area lists the display name, the `@`ID and the
 * time, so the first text not starting with `@` is taken.
 */
const displayNameOf = (root: Element): string | null => {
  const nameEl = root.querySelector(USER_NAME);
  if (!nameEl) return null;
  for (const span of nameEl.querySelectorAll('span')) {
    const text = span.textContent?.trim();
    if (text && !text.startsWith('@') && text !== '·') return text;
  }
  return null;
};

const some = (value: string | null): string[] => (value === null ? [] : [value]);

/**
 * The body text. For a quote, the quoted post's body is added to the list.
 * They are listed one by one rather than concatenated: concatenating would keep
 * "matches exactly" from ever holding on a post with a quote, and it would also
 * disagree with the unit emphasis paints (one element at a time).
 */
const textOf = (root: Element): string[] =>
  Array.from(root.querySelectorAll(TWEET_TEXT), (el) => el.textContent ?? '');

/**
 * When the post was made. A `time`'s `datetime` is ISO 8601 in UTC and does not depend
 * on the UI language. Excluding the `time` inside the quote frame is the point: a post
 * with a quote holds two `time` elements, and the one in the frame is the quoted
 * post's time.
 */
const postedAtOf = (tweet: Element, quote: Element | null): number | null => {
  const time = Array.from(tweet.querySelectorAll('time')).find(
    (el) => quote === null || !quote.contains(el)
  );
  const value = time?.getAttribute('datetime');
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * The quote frame. The avatar rather than the body text is the clue, so it is found
 * even when the quoted post is images only.
 * Excluding the post author's avatar is the point: searching merely for "a container
 * holding an avatar" would treat the post body as the frame and read the author's own
 * values the day X changes the shape wrapping the author's avatar.
 */
const quoteFrameOf = (tweet: Element): Element | null => {
  // The first avatar in document order is the author's (the same one `authorOf` looks at)
  const own = tweet.querySelector(AUTHOR_AVATAR);
  return (
    Array.from(tweet.querySelectorAll('[role="link"]')).find((el) => {
      const avatar = el.querySelector(AUTHOR_AVATAR);
      return avatar !== null && avatar !== own;
    }) ?? null
  );
};

/** The target has the shape `https://x.com/<screen name>` */
const linkedName = (link: HTMLAnchorElement): string | null => {
  const [, name] = new URL(link.href).pathname.split('/');
  return name || null;
};

/**
 * Who reposted. Taken from the target of the link wrapping the "… reposted" line.
 * The text on that line shows a display name, but it runs together with boilerplate
 * that depends on the UI language, so it is not used.
 */
const repostedByOf = (tweet: Element): string | null => {
  const socialContext = tweet.querySelector(SOCIAL_CONTEXT);
  if (!socialContext) return null;
  const link = Array.from(tweet.querySelectorAll<HTMLAnchorElement>(PROFILE_LINK)).find((el) =>
    el.contains(socialContext)
  );
  return link ? linkedName(link) : null;
};

/**
 * The profile links on the reply-target line. The "Replying to @xxx" line carries no
 * marker and its wording changes with the language, so it is spotted structurally: it
 * comes before the body text and is neither the name area, nor an avatar, nor the
 * repost line. Whether it is the same person as the author is not considered (a reply
 * to oneself is still a reply).
 */
const replyLinksOf = (tweet: Element): HTMLAnchorElement[] => {
  const text = tweet.querySelector(TWEET_TEXT);
  if (!text) return [];

  const socialContext = tweet.querySelector(SOCIAL_CONTEXT);

  return Array.from(tweet.querySelectorAll<HTMLAnchorElement>(PROFILE_LINK)).filter((link) => {
    // Links after the body text are mentions within it, or the card's
    if (!(link.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
    // The links on the author's name, ID, time and avatar
    if (link.closest(USER_NAME) || link.closest(AUTHOR_AVATAR)) return false;
    // The "… reposted" line, where the link wraps the socialContext
    if (socialContext && link.contains(socialContext)) return false;
    return true;
  });
};

/**
 * Whether a vertical line connects this to the post above it (a thread continuing).
 *
 * On the parent post of a thread, X puts an extra container drawing a line below the
 * avatar. The line exists only on the parent side, so if the post above has that
 * container, this cell is a continuation, meaning a reply.
 * Replies of this shape show no "Replying to" line, so links cannot spot them.
 * A "Show more replies" row in between is skipped, since what follows it is still the
 * same thread.
 */
const followsThreadLine = (cell: Element): boolean => {
  let prev = cell.previousElementSibling;
  while (prev?.matches(CELL_SELECTOR) && !prev.querySelector(TWEET)) {
    prev = prev.previousElementSibling;
  }
  if (!prev?.matches(CELL_SELECTOR)) return false;
  const avatar = prev.querySelector(AUTHOR_AVATAR);
  return avatar !== null && (avatar.parentElement?.childElementCount ?? 0) > 1;
};

/**
 * What emphasis paints. `value` is the string the rule matched against, and `offset`
 * is where that string starts within the element's text. The user-ID area is shown on
 * screen with the `@` included while the judgement looks at it without, and that
 * discrepancy is absorbed here.
 */
export type MarkTarget = { element: Element; value: string; offset: number };

/** Paints the body-text elements as they are. Changing the starting point narrows it to the quoted body */
const textTargetsIn = (root: Element): MarkTarget[] =>
  Array.from(root.querySelectorAll(TWEET_TEXT), (element) => ({
    element,
    value: element.textContent ?? '',
    offset: 0,
  }));

/**
 * Finds where the user ID or the display name sits in the name area.
 * How they are told apart follows the same rules as `authorOf` / `displayNameOf`.
 */
const nameTargetIn = (root: Element, wants: 'id' | 'display'): MarkTarget[] => {
  const nameEl = root.querySelector(USER_NAME);
  if (!nameEl) return [];

  for (const span of nameEl.querySelectorAll('span')) {
    const text = span.textContent ?? '';
    const trimmed = text.trim();
    if (!trimmed || trimmed === '·') continue;

    if (wants === 'id') {
      // Shifted back by the `@`, which the judgement does not use (`authorOf` excludes it)
      if (trimmed.startsWith('@')) {
        return [{ element: span, value: trimmed.slice(1), offset: text.indexOf('@') + 1 }];
      }
      continue;
    }

    // The display name is the first one not starting with `@` (the same rule as `displayNameOf`)
    if (!trimmed.startsWith('@')) {
      return [{ element: span, value: trimmed, offset: text.indexOf(trimmed) }];
    }
  }
  return [];
};

/**
 * The reply-target links. The judgement looks at the ID read from the link target,
 * while the painted value is taken from the text shown on screen, so that a difference
 * in case between target and display does not shift the position.
 */
const replyTargetsIn = (tweet: Element): MarkTarget[] =>
  replyLinksOf(tweet).flatMap((link) => {
    const text = link.textContent ?? '';
    const at = text.indexOf('@');
    return at < 0 ? [] : [{ element: link, value: text.slice(at + 1), offset: at + 1 }];
  });

/**
 * Returns the elements emphasis paints, according to the rule's target.
 * They point at the same places as the strings `readPost` judged on.
 */
export const markTargets = (cell: Element, target: MatchTarget): MarkTarget[] => {
  if (!canEmphasize(target)) return [];

  const tweet = cell.querySelector(TWEET);
  if (!tweet) return [];

  switch (target) {
    case 'text':
      return textTargetsIn(tweet);
    case 'screenName':
      return nameTargetIn(tweet, 'id');
    case 'displayName':
      return nameTargetIn(tweet, 'display');
    case 'replyTo':
      return replyTargetsIn(tweet);
    // The quoted-post targets use the same functions starting from the frame. No frame, nothing to paint
    case 'quotedText':
    case 'quotedScreenName':
    case 'quotedDisplayName': {
      const quote = quoteFrameOf(tweet);
      if (!quote) return [];
      if (target === 'quotedText') return textTargetsIn(quote);
      return nameTargetIn(quote, target === 'quotedScreenName' ? 'id' : 'display');
    }
    // The "… reposted" line shows only a display name, so there is nothing to paint.
    // No `default` here: leaving a new target out should fall to the type checker
    case 'repostedBy':
      return [];
    // Text from embedded things is used for filtering only. It is reached by child
    // index, so the painted position shifts easily
    case 'pollChoice':
    case 'cardDomain':
    case 'cardTitle':
    case 'spaceName':
    case 'articleText':
      return [];
  }
};

/** A card that is neither a poll nor a carousel: the preview shown when a URL is pasted */
const linkCardsIn = (tweet: Element): Element[] =>
  Array.from(tweet.querySelectorAll(CARD)).filter(
    (card) => !card.querySelector(POLL) && !card.querySelector(CAROUSEL)
  );

/**
 * A poll's choices. While voting is open a `radio` is the container for one choice and
 * in the results a `listitem` is, and in both the first `span` is the choice's name.
 * The percentage in the results is a separate `span`, so it does not get mixed in.
 */
const pollChoicesIn = (tweet: Element): string[] =>
  Array.from(
    tweet.querySelectorAll(`${CARD} [role="radio"], ${POLL} [role="listitem"]`),
    (el) => el.querySelector('span')?.textContent?.trim() ?? ''
  ).filter((text) => text !== '');

/**
 * The Nth child of a card's detail: 0 is the linked domain, 1 the headline.
 * A card's link is a `t.co` short URL, so nothing beyond the domain can be obtained.
 */
const cardDetailIn = (tweet: Element, index: number): string[] =>
  linkCardsIn(tweet)
    .map((card) => card.querySelector(CARD_DETAIL)?.children[index]?.textContent?.trim() ?? '')
    .filter((text) => text !== '');

/**
 * A Space's name, read only once it is known to be a Space.
 * Whether `wrapperView` is unique to Spaces cannot be settled from one sample, so the
 * check comes first.
 */
const spaceNameIn = (tweet: Element): string[] => {
  if (!tweet.querySelector(SPACE)) return [];
  const text = tweet.querySelector(SPACE_BOX)?.children[1]?.textContent?.trim();
  return text ? [text] : [];
};

/**
 * An article's headline and opening. They sit in the cover image's next sibling.
 * The "Article" label is inside the cover image, so it does not get mixed in.
 */
const articleTextIn = (tweet: Element): string[] => {
  const text = tweet.querySelector(ARTICLE)?.nextElementSibling?.textContent?.trim();
  return text ? [text] : [];
};

/** When in doubt, fall back to "a note is attached" */
const communityNoteOf = (tweet: Element): 'added' | 'rating' | null => {
  const note = tweet.querySelector(COMMUNITY_NOTE);
  if (!note) return null;
  return note.querySelector(NOTE_RATING_ARROW) ? 'rating' : 'added';
};

const pollOf = (tweet: Element): 'open' | 'closed' | null => {
  if (tweet.querySelector(POLL_OPEN)) return 'open';
  if (tweet.querySelector(POLL_CLOSED)) return 'closed';
  return null;
};

/** Lists what could be read from the reply-target line, falling back to the author on a self-thread with no such line */
const replyTo = (links: HTMLAnchorElement[], followsThread: boolean, author: string): string[] => {
  const named = links.map(linkedName).filter((name): name is string => name !== null);
  if (named.length > 0) return named;
  return followsThread ? [author] : [];
};

/**
 * Turns a post cell into something judgeable. Returns null for items without the post
 * marker (notifications, trends) and for posts still mid-render whose author is not in
 * yet (the latter get picked up again on the next change).
 */
export const readPost = (cell: Element): Post | null => {
  const tweet = cell.querySelector(TWEET);
  if (!tweet) return null;

  const author = authorOf(tweet);
  if (!author) return null;

  const quote = quoteFrameOf(tweet);
  const replyLinks = replyLinksOf(tweet);
  const followsThread = followsThreadLine(cell);

  return {
    values: {
      text: textOf(tweet),
      quotedText: quote ? textOf(quote) : [],
      screenName: [author],
      displayName: some(displayNameOf(tweet)),
      repostedBy: some(repostedByOf(tweet)),
      quotedScreenName: some(quote ? authorOf(quote) : null),
      quotedDisplayName: some(quote ? displayNameOf(quote) : null),
      replyTo: replyTo(replyLinks, followsThread, author),
      pollChoice: pollChoicesIn(tweet),
      cardDomain: cardDetailIn(tweet, 0),
      cardTitle: cardDetailIn(tweet, 1),
      spaceName: spaceNameIn(tweet),
      articleText: articleTextIn(tweet),
    },
    isRepost: tweet.querySelector(SOCIAL_CONTEXT) !== null,
    // A quote is spotted by a second author avatar, the quoted post's, being present
    isQuote: tweet.querySelectorAll(AUTHOR_AVATAR).length > 1,
    isReply: replyLinks.length > 0 || followsThread,
    hasMedia: tweet.querySelector(MEDIA) !== null,
    communityNote: communityNoteOf(tweet),
    poll: pollOf(tweet),
    hasSpace: tweet.querySelector(SPACE) !== null,
    hasArticle: tweet.querySelector(ARTICLE) !== null,
    hasLinkCard: linkCardsIn(tweet).length > 0,
    // Spotted by the icon on the ad's banner
    isAd: tweet.querySelector(AD_BADGE) !== null,
    postedAt: postedAtOf(tweet, quote),
  };
};
