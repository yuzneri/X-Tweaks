/**
 * Reads what the judgement needs out of a post cell.
 * This is the only place that depends on the shape of X's DOM. When X changes its
 * structure, this is the file to fix.
 */
import { ATTACHMENT_CLASS } from '../appearance/card.ts';
import { canEmphasize, type CountMetric, type MatchTarget } from '../settings/schema.ts';
import type { Post } from './decide.ts';

/** The unit that gets collapsed. It sits outside the post proper, so the gap between posts folds with it */
export const CELL_SELECTOR = '[data-testid="cellInnerDiv"]';

const TWEET = '[data-testid="tweet"]';
const TWEET_TEXT = '[data-testid="tweetText"]';
const SOCIAL_CONTEXT = '[data-testid="socialContext"]';
const AUTHOR_AVATAR = '[data-testid="Tweet-User-Avatar"]';
const USER_NAME = '[data-testid="User-Name"]';
/**
 * The avatar marker X writes the screen name into. Exported because the same marker
 * names the account a column belongs to (X Pro) and the one signed in (x.com), and three
 * copies of the string would drift apart.
 */
const AVATAR_NAME_PREFIX = 'UserAvatar-Container-';
export const AVATAR_NAME = `[data-testid^="${AVATAR_NAME_PREFIX}"]`;

/** The screen name written into an avatar's marker. null when that is not what the element is */
export const avatarNameOf = (avatar: Element | null | undefined): string | null => {
  const testId = avatar?.getAttribute('data-testid');
  return testId?.startsWith(AVATAR_NAME_PREFIX) ? testId.slice(AVATAR_NAME_PREFIX.length) : null;
};

/**
 * The photos and the videos in a post. Told apart because the appearance marks them
 * separately: which one hung off the post is worth saying.
 * Exported because the appearance hides and marks the same things; written twice, the
 * "has a photo" condition and what the CSS hides would drift apart.
 */
/**
 * X's own "Show more", shown where X itself has cut a long post.
 * Exported because the appearance both reads it (it puts none of its own beside one)
 * and hides it (with the posts packed).
 */
export const X_SHOW_MORE = '[data-testid="tweet-text-show-more-link"]';

export const PHOTO = '[data-testid="tweetPhoto"]';
/**
 * The two markers X puts on a video. They are not alternatives: `videoComponent` sits
 * inside `videoPlayer`, so one video answers to both.
 *
 * Both are named because the rules that hide media have to reach the inner box as well —
 * it carries a size of its own, and hiding the outer alone leaves it holding the space.
 * Anything counting videos rather than styling them wants `isOutermostMedia`.
 */
export const VIDEO = ['[data-testid="videoPlayer"]', '[data-testid="videoComponent"]'];

/** A link into a post. Both the box around a photo and the time on a post carry one */
const POST_LINK = 'a[href*="/status/"]';
const MEDIA = [PHOTO, ...VIDEO].join(', ');
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
/** A card's detail, in the small layout. Read through `cardTextOf` */
const CARD_DETAIL = '[data-testid$=".detail"]';
/** Where the large layout keeps its text instead: the last block of the link. Read through `cardTextOf` */
const CARD_LARGE_TEXT = '[data-testid="card.layoutLarge.media"] > a > div:last-child';
/** A Space's container. The first child is the host's name, the second the title */
const SPACE_BOX = '[data-testid="wrapperView"]';
const POLL = '[data-testid="cardPoll"]';
const POLL_OPEN = `${CARD} [role="radio"]`;
const POLL_CLOSED = `${POLL} [role="list"]`;

/**
 * A card that is neither a poll nor a carousel: the preview shown when a URL is pasted.
 *
 * Exported because the appearance settings restyle the same cards. Written twice, the
 * "has a link card" condition and what the CSS restyles would drift apart, and the
 * appearance would swallow the polls that share `card.wrapper`.
 */
export const LINK_CARD = `${CARD}:not(:has(${POLL})):not(:has(${CAROUSEL}))`;

const SPACE = 'a[href*="/i/spaces/"]';

/**
 * Articles (X's Articles). Spotted by the cover image's marker.
 * An "Article" label follows right after it, but the wording changes with the UI
 * language and is not used. An article without a cover image is missed, but nothing
 * is ever matched wrongly.
 */
export const ARTICLE = '[data-testid="article-cover-image"]';

/** One account offered in a list, with a Follow button beside it */
export const USER_CELL = '[data-testid="UserCell"]';

/**
 * The link that closes the block of accounts X suggests following ("Show more"), which
 * leads to the page listing them all.
 *
 * The block is a heading, a run of `USER_CELL`s and this link, each in a cell of its own.
 * This link is what the appearance goes by, for want of anything marking the block as a
 * whole: the heading's wording is X's own and comes translated in one column and left in
 * English in another, and a run of accounts is the content itself on the pages listing
 * who follows whom, which going by `USER_CELL` alone would empty.
 */
export const WHO_TO_FOLLOW_MORE = 'a[href*="/i/connect_people"]';

/**
 * The mark of an ad. X wraps a promoted post in an element that measures where it sits
 * on screen and carries the impression pixels beside it; an ordinary post never sits
 * inside one.
 *
 * The same marker also appears *within* a post, around an embedded video, so only one
 * enclosing the post counts. Going by "the post has this marker" would call every post
 * with a video an ad.
 *
 * Looking for presence rather than absence is the point: going by "having no timestamp"
 * would tip every post into being an ad and make them all vanish the day X changes how
 * it shows times.
 */
const AD_PLACEMENT = '[data-testid="placementTracking"]';

/**
 * The description written for a photo, as X carries it.
 *
 * X puts it in two places at once — the box's `aria-label` and the `img`'s `alt` — and
 * where nobody wrote one it puts its own word for a picture there instead ("Image",
 * 「画像」). That word cannot be told from a description by looking at it, so telling the
 * two apart is left to `appearance/alt.ts`, which learns it from the page.
 * The `img` is read first: the box is what carries the marker, but the picture is what
 * the description belongs to.
 */
export const altTextOf = (media: Element): string | null => {
  const written =
    media.querySelector('img')?.getAttribute('alt') ?? media.getAttribute('aria-label');
  return written?.trim() ? written : null;
};

/**
 * Whether this is the outermost marker on the media it is part of.
 *
 * X marks one video twice, `videoComponent` sitting inside `videoPlayer` (see `VIDEO`),
 * and the description is read the same off either. Taken as two, a video says everything
 * it has to say twice over — two identical lines under the picture, two in the line put
 * into the post.
 *
 * So anything counting media, or gathering what it says, asks this first. The rules that
 * hide media do not: there both markers are wanted.
 */
export const isOutermostMedia = (media: Element): boolean =>
  media.parentElement?.closest(MEDIA) == null;

/**
 * What X writes on its own button for reading a picture's description.
 *
 * It is the face of the button rather than a marker: X gives it no `data-testid`, and the
 * tooltip beside it ("画像の説明を読む") is worded per interface language. "ALT" is not —
 * it is the same three letters in every locale seen, X using it as a badge rather than as
 * a word.
 */
const ALT_BUTTON_FACE = 'ALT';

/**
 * Whether X is already offering the description of the pictures in this block itself.
 *
 * On a post opened to be read, X puts an ALT button beside the picture — on both sites —
 * and pressing it shows the whole description. There is nothing to add there, so no
 * caption goes in.
 *
 * It is asked of the block rather than of the scope because X is sparing with the button:
 * in a post opened on x.com it stood on the opened post's picture and on none of the
 * pictures in the replies below it. Standing down for the whole scope would take the
 * caption off those too, and they have no button to fall back on.
 *
 * Where X someday translates the face of the button, this stops recognising it and the
 * caption comes back — the same words twice, which is the harmless way to be wrong.
 */
export const showsOwnAltButton = (block: Element): boolean =>
  Array.from(block.querySelectorAll('button')).some(
    (button) => button.textContent?.trim() === ALT_BUTTON_FACE
  );

/**
 * Whose post a picture belongs to, read from an address on the way out of it
 * (`…/someone/status/1234567890/photo/1`).
 *
 * A photo sits inside a link to itself, but a video does not, so the post around it is
 * asked instead: the first such address in the cell is the time it carries, which links
 * to the post. Going by the photo's own link alone would leave every video unattributed.
 *
 * Used to tell whose pictures a text turns up on (`appearance/alt.ts`). A picture inside
 * a quote is answered with the quoting account, which is close enough for that question:
 * what is being asked is whether two pictures came from two different people.
 * null where there is no address to read at all.
 */
export const accountOfPicture = (media: Element): string | null => {
  const own = media.closest(POST_LINK)?.getAttribute('href');
  const inCell = media.closest(CELL_SELECTOR)?.querySelector(POST_LINK)?.getAttribute('href');
  return (own ?? inCell)?.match(/\/([^/]+)\/status\/\d+/)?.[1] ?? null;
};

/**
 * The screen name. On a repost the avatar points at the original author; on a quote
 * the first one points at the quoting side.
 * It takes the first avatar found within, so passing the quote frame returns the
 * quoted post's author.
 */
export const authorOf = (root: Element): string | null =>
  avatarNameOf(root.querySelector(AUTHOR_AVATAR)?.querySelector(AVATAR_NAME));

/**
 * The profile name (display name). As with `authorOf`, whose name it is depends on
 * where the search starts, and the appearance reads it from a quote frame. The name area lists the display name, the `@`ID and the
 * time, so the first text not starting with `@` is taken.
 */
export const displayNameOf = (root: Element): string | null => {
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
  Array.from(root.querySelectorAll(TWEET_TEXT), ownTextOf);

/**
 * The text nodes X itself wrote in that element, in the order they are read.
 *
 * The lines the appearance puts into a post, in place of what hangs off it, are left
 * out. They are the extension's own addition, and counting them would make a rule
 * written against the body start matching a card's headline, which the body no longer
 * shows on its own.
 * A line holds one text node of its own making (`appearance/apply.ts` writes nothing
 * else into it), so its parent alone tells whether a node belongs to one.
 */
export const ownTextNodesOf = (el: Element): Text[] => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (!text.parentElement?.classList.contains(ATTACHMENT_CLASS)) nodes.push(text);
  }
  return nodes;
};

/**
 * The text X itself wrote in that element.
 *
 * Built from the nodes above rather than from `textContent`, so that a position within
 * this string means the same thing to whoever paints it (`filter/emphasis.ts`): the two
 * count the same characters wherever a line of ours happens to sit.
 */
export const ownTextOf = (el: Element): string =>
  ownTextNodesOf(el)
    .map((node) => node.data)
    .join('');

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
 * Where the counts X shows under a post are written. The ones counted in the body have no
 * marker of their own — they are counted from the text (`countsOf`).
 *
 * The pair in a line is the same button in its two states: pressing it swaps the marker
 * (`like` becomes `unlike`), and the count is on either. Views are not a button at all —
 * X hangs them off a link into the post's analytics.
 *
 * The markers are what is gone by rather than the number shown beside the icon, which X
 * rounds off ("1.2万", "12K") and cannot be compared against a threshold.
 *
 * Bookmarks are not among them, for want of anywhere to read them: in a timeline X leaves
 * the number off the button altogether, and puts it only on a post opened to be read. It
 * does count them — the number is in the label of the row as a whole ("60 件の返信、229 件の
 * ブックマーク、…") — but that label leaves out whatever stands at zero, so which number is
 * which cannot be told without knowing X's wording in the language it is showing.
 */
export const COUNT_MARKERS = {
  reply: '[data-testid="reply"]',
  repost: '[data-testid="retweet"], [data-testid="unretweet"]',
  like: '[data-testid="like"], [data-testid="unlike"]',
  view: 'a[href$="/analytics"]',
} as const;

/**
 * Everything carrying a count, as one selector. What the appearance walks when it writes
 * the counts out in full (`appearance/apply.ts`)
 */
export const COUNT_TARGETS = Object.values(COUNT_MARKERS).join(', ');

/**
 * The box X animates a count inside. Its text is the count as X shows it, rounded off
 * where X rounds ("22万"), and X's own element is what the appearance hides to put the
 * full number in its place.
 */
export const COUNT_TEXT = '[data-testid="app-text-transition-container"]';

/**
 * The number X wrote into a label ("1551 件のいいね。いいねする", "1,551 Likes. Like").
 * The digits are what is read: the words around them are in X's interface language, and
 * the number itself is written out in full there rather than rounded off.
 *
 * Only the first run is taken, since the words that follow it may hold a number of their
 * own. Grouping characters within the run are dropped, so a language that writes 1,234 or
 * 1 234 comes out the same as one that writes 1234.
 *
 * null where the label holds no number at all. That is not the same as zero: replies,
 * reposts and likes say "0" outright, while a post whose views X does not show has nothing
 * there to read.
 */
export const countInLabel = (label: string | null | undefined): number | null => {
  // The characters a language may put between the groups of digits: a comma, a period,
  // or a space (ordinary, non-breaking or narrow)
  const run = label?.match(/\d[\d.,\u00a0\u202f ]*/)?.[0];
  if (!run) return null;
  return Number(run.replace(/\D/g, ''));
};

/**
 * What a link X wrote into the body points at, by the shape of its address.
 *
 * The path is what it goes by rather than the host: X Pro writes some of a post's links
 * to `pro.x.com` and some to `x.com` (measured on one page: 95 against 107), so a host
 * would answer for only half of them.
 *
 * A pasted URL is always shortened to `t.co`, whatever it points at, which is what tells
 * one from a hashtag or a mention — both of those are X's own addresses.
 * null for anything else, an address X wrote for its own purposes included.
 */
export const bodyLinkKind = (href: string): 'hashtag' | 'mention' | 'link' | null => {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.hostname === 't.co') return 'link';
  if (url.hostname !== 'x.com' && !url.hostname.endsWith('.x.com')) return null;
  const parts = url.pathname.split('/').filter((part) => part !== '');
  if (parts[0] === 'hashtag') return 'hashtag';
  // A mention is a link to somebody, which is one step and no further ("/alice").
  // A post's own address ("/alice/status/123") is two steps and is not one
  return parts.length === 1 ? 'mention' : null;
};

/**
 * The post's own body, the quoted post's left out. The same exclusion `postedAtOf` makes,
 * and for the same reason: what is counted should be what this post says, not what it quotes
 */
const ownBodiesIn = (tweet: Element, quote: Element | null): Element[] =>
  Array.from(tweet.querySelectorAll(TWEET_TEXT)).filter(
    (el) => quote === null || !quote.contains(el)
  );

/**
 * What the body holds, gone through once and sorted by what each link points at.
 * The pasted links are counted too, for the "has a link" trait — a post can carry one
 * without X drawing a card under it, which is what that trait is for
 */
const bodyLinksOf = (bodies: Element[]): { hashtag: number; mention: number; link: number } => {
  const counts = { hashtag: 0, mention: 0, link: 0 };
  for (const body of bodies) {
    for (const link of body.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const kind = bodyLinkKind(link.href);
      if (kind) counts[kind] += 1;
    }
  }
  return counts;
};

/**
 * What there is to count about the post.
 *
 * The reactions are read off the labels, and the quote frame is left out for the same
 * reason `postedAtOf` leaves it out: where a quoted post carries an action bar of its own,
 * those are the quoted post's numbers. What is counted in the body is counted from the
 * text this post wrote, which is why an empty body is 0 rather than "cannot be read".
 */
const countsOf = (
  tweet: Element,
  quote: Element | null,
  bodies: Element[],
  inBody: { hashtag: number; mention: number }
): Record<CountMetric, number | null> => {
  const read = (marker: string): number | null => {
    const marked = Array.from(tweet.querySelectorAll(marker)).find(
      (el) => quote === null || !quote.contains(el)
    );
    return marked ? countInLabel(marked.getAttribute('aria-label')) : null;
  };
  return {
    reply: read(COUNT_MARKERS.reply),
    repost: read(COUNT_MARKERS.repost),
    like: read(COUNT_MARKERS.like),
    view: read(COUNT_MARKERS.view),
    // The characters X itself wrote, counted the same way the text conditions read them
    textLength: bodies.reduce((total, body) => total + ownTextOf(body).length, 0),
    hashtag: inBody.hashtag,
    mention: inBody.mention,
  };
};

/**
 * The quote frame. The avatar rather than the body text is the clue, so it is found
 * even when the quoted post is images only.
 * Exported because the appearance moves the same frame into the post.
 * Excluding the post author's avatar is the point: searching merely for "a container
 * holding an avatar" would treat the post body as the frame and read the author's own
 * values the day X changes the shape wrapping the author's avatar.
 */
export const quoteFrameOf = (tweet: Element): Element | null => {
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
    // The same text the judging looked at, and the same text `ownTextNodesOf` walks
    // when the painting turns a position into a Range. A line of ours is left out of
    // both, so it shifts nothing wherever it sits and is never painted on
    value: ownTextOf(element),
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

const linkCardsIn = (tweet: Element): Element[] => Array.from(tweet.querySelectorAll(LINK_CARD));

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

/** What a card says. Either part is null when the card does not carry it */
export type CardText = { domain: string | null; title: string | null };

const trimmed = (el: Element | null | undefined): string | null => el?.textContent?.trim() || null;

/**
 * Reads a card's text. A card's link is a `t.co` short URL, so nothing beyond the domain
 * can be obtained.
 *
 * X draws a card in one of two layouts, and which one it picks is not a matter of which
 * site it is: both appear on both x.com and X Pro. The card itself decides.
 *   - small: a detail node lists the domain and the headline as its children
 *   - large: no detail node. The last block of the link holds them instead, as two
 *     children — or as one, when the card carries a call to action rather than a
 *     headline (X Pro's and x.com's ads both do). That one names no domain
 *
 * The appearance reads the same two parts when it moves a card's text into the post, so
 * it goes through here as well and the two sides cannot drift apart.
 */
export const cardTextOf = (card: Element): CardText => {
  const detail = card.querySelector(CARD_DETAIL);
  if (detail) return { domain: trimmed(detail.children[0]), title: trimmed(detail.children[1]) };

  const large = card.querySelector(CARD_LARGE_TEXT);
  if (!large) return { domain: null, title: null };
  if (large.children.length >= 2) {
    return { domain: trimmed(large.children[0]), title: trimmed(large.children[1]) };
  }
  return { domain: null, title: trimmed(large) };
};

/** One entry per card that carries that part. Cards without it are left out */
const cardTextsIn = (tweet: Element, pick: (card: CardText) => string | null): string[] =>
  linkCardsIn(tweet)
    .map((card) => pick(cardTextOf(card)))
    .filter((text): text is string => text !== null);

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
 * Whether that post is an ad. The wrapper sits between the cell and the post, so the
 * search is bounded to the cell: on its own, `closest` would keep climbing past it and
 * could pick up something outside the timeline.
 */
const isAdIn = (cell: Element, tweet: Element): boolean => {
  const placement = tweet.closest(AD_PLACEMENT);
  return placement !== null && cell.contains(placement);
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
  // The body is walked once: the counts, the language and the link trait all come from it
  const bodies = ownBodiesIn(tweet, quote);
  const inBody = bodyLinksOf(bodies);

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
      cardDomain: cardTextsIn(tweet, (card) => card.domain),
      cardTitle: cardTextsIn(tweet, (card) => card.title),
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
    isAd: isAdIn(cell, tweet),
    postedAt: postedAtOf(tweet, quote),
    counts: countsOf(tweet, quote, bodies, inBody),
  };
};
