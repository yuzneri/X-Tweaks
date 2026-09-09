/**
 * Reads what the judgement needs from a post cell — the only place that depends on the shape of
 * X's DOM, so it is the file to fix when X changes structure.
 */
import { ATTACHMENT_CLASS } from '../appearance/card.ts';
import { canEmphasize, type CountMetric, type MatchTarget } from '../settings/schema.ts';
import { descriptionOf } from '../appearance/alt.ts';
import type { Post } from './decide.ts';

/** The unit that gets collapsed. It sits outside the post proper, so the gap between posts folds with it */
export const CELL_SELECTOR = '[data-testid="cellInnerDiv"]';

const TWEET = '[data-testid="tweet"]';
const TWEET_TEXT = '[data-testid="tweetText"]';
const SOCIAL_CONTEXT = '[data-testid="socialContext"]';
const AUTHOR_AVATAR = '[data-testid="Tweet-User-Avatar"]';
const USER_NAME = '[data-testid="User-Name"]';
/**
 * The avatar marker X writes the screen name into. Exported: it also names a column's account (X
 * Pro) and the signed-in one (x.com), and three copies would drift apart.
 */
const AVATAR_NAME_PREFIX = 'UserAvatar-Container-';
export const AVATAR_NAME = `[data-testid^="${AVATAR_NAME_PREFIX}"]`;

/** The screen name written into an avatar's marker. null when that is not what the element is */
export const avatarNameOf = (avatar: Element | null | undefined): string | null => {
  const testId = avatar?.getAttribute('data-testid');
  return testId?.startsWith(AVATAR_NAME_PREFIX) ? testId.slice(AVATAR_NAME_PREFIX.length) : null;
};

/**
 * X's own "Show more", where X has cut a long post short. Exported: the appearance both reads it
 * (no caption of its own beside one) and hides it (with the posts packed).
 */
export const X_SHOW_MORE = '[data-testid="tweet-text-show-more-link"]';

/**
 * The photos and videos in a post, kept apart because the appearance marks them separately —
 * worth saying which hung off the post. Exported: the appearance hides and marks them too,
 * so "has a photo" and what the CSS hides mustn't drift apart.
 */
export const PHOTO = '[data-testid="tweetPhoto"]';
/**
 * The two markers X puts on one video, not alternatives — `videoComponent` sits inside
 * `videoPlayer`. Both are named because hiding rules must reach the inner box, which has its
 * own size (hiding the outer alone leaves the space); counting videos wants `isOutermostMedia`.
 */
export const VIDEO = ['[data-testid="videoPlayer"]', '[data-testid="videoComponent"]'];

/** A link into a post. Both the box around a photo and the time on a post carry one */
const POST_LINK = 'a[href*="/status/"]';
const MEDIA = [PHOTO, ...VIDEO].join(', ');
const PROFILE_LINK = 'a[role="link"][href^="https://x.com/"]';
/** X calls this Birdwatch internally, and that name is still in the marker */
const COMMUNITY_NOTE = '[data-testid="birdwatch-pivot"]';

/**
 * X's verified badge. The marker is X's own and does not change with the interface language,
 * unlike the label beside it ("認証済みアカウント"). Blue, gold and grey are one marker here
 */
const VERIFIED_BADGE = '[data-testid="icon-verified"]';

/**
 * The arrow shown only on notes awaiting a rating — a weak, decorative marker, since the wording
 * beside it is language-dependent. Falls back to "a note is attached" once it can no longer be
 * told apart.
 */
const NOTE_RATING_ARROW = '[data-testid="icon-arrow-right"]';

/**
 * Polls: choices are `radio` while voting is open, `list` once closed. The open side skips
 * `cardPoll` — carousel-style cards do not carry that marker — using the card frame instead, so
 * `radio` used elsewhere from matching.
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
 * A card that is neither poll nor carousel — the preview for a pasted URL. Exported: the
 * appearance restyles the same cards, so "has a link card" and the CSS target mustn't drift,
 * and without this it would swallow the polls sharing `card.wrapper`.
 */
export const LINK_CARD = `${CARD}:not(:has(${POLL})):not(:has(${CAROUSEL}))`;

const SPACE = 'a[href*="/i/spaces/"]';

/**
 * X's Articles, spotted by the cover image's marker. An "Article" label follows it, but its
 * wording is language-dependent and unused. Misses an article with no cover image, but never
 * matches wrongly.
 */
export const ARTICLE = '[data-testid="article-cover-image"]';

/** One account offered in a list, with a Follow button beside it */
export const USER_CELL = '[data-testid="UserCell"]';

/**
 * The link closing the "who to follow" block ("Show more"), leading to the full list. The
 * block is a heading, a run of `USER_CELL`s, and this link, each in its own cell. The
 * appearance goes by this link for want of anything marking the block as a whole: the
 * heading's wording is X's own, translated in one column and left in English in another, and
 * a run of accounts is itself the content on pages listing who follows whom — going by
 * `USER_CELL` alone would empty those.
 */
export const WHO_TO_FOLLOW_MORE = 'a[href*="/i/connect_people"]';

/**
 * The mark of an ad. X wraps a promoted post in an element that measures its screen position
 * and carries the impression pixels; an ordinary post is never inside one. The same marker
 * also appears *within* a post, around an embedded video, so only one *enclosing* the post
 * counts — "the post has this marker" would call every video post an ad. Checked by
 * presence, not absence: "no timestamp" would tip every post into "ad" the day X changes how
 * it shows times.
 */
const AD_PLACEMENT = '[data-testid="placementTracking"]';

/**
 * The description written for a photo, as X carries it. X writes it in two places — the
 * box's `aria-label` and the `img`'s `alt` — and inserts its own generic word where nobody
 * wrote one ("Image", 「画像」). That word cannot be told from a real description by
 * inspection alone, so `appearance/alt.ts` learns it from the page instead. The `img` is
 * read first: the box carries the marker, but the picture is what the description belongs to.
 */
export const altTextOf = (media: Element): string | null => {
  const written =
    media.querySelector('img')?.getAttribute('alt') ?? media.getAttribute('aria-label');
  return written?.trim() ? written : null;
};

/**
 * Whether this is the outermost marker on its media. X marks one video twice —
 * `videoComponent` inside `videoPlayer` (see `VIDEO`) — reading the same description off
 * either, so taken as two a video says everything twice: two identical caption lines, two in
 * the post's summary line. Anything counting media, or gathering what it says, checks this
 * first; the hide rules do not, since both markers are wanted there.
 */
export const isOutermostMedia = (media: Element): boolean =>
  media.parentElement?.closest(MEDIA) == null;

/**
 * What X writes on its own alt-text button — the button's face, not a marker. X gives it no
 * `data-testid`, and the tooltip beside it ("画像の説明を読む") is worded per language.
 * "ALT" is not: the same three letters in every locale seen, used as a badge not a word.
 */
const ALT_BUTTON_FACE = 'ALT';

/**
 * Whether X already offers the description of the pictures in this block.
 *
 * On a post opened to read, X puts an ALT button beside the picture — on both sites —
 * pressing it shows the whole description, so no caption is added. Checked per block, not
 * per scope, because X is sparing with it: on x.com an opened post's picture had the button
 * but none did in the replies below, and checking the whole scope would suppress captions
 * there too. If X ever translates the button's face, this stops recognising it and the
 * caption returns — the same words twice, the harmless way to be wrong.
 */
export const showsOwnAltButton = (block: Element): boolean =>
  Array.from(block.querySelectorAll('button')).some(
    (button) => button.textContent?.trim() === ALT_BUTTON_FACE
  );

/**
 * Whose post a picture belongs to, read from an address on the way out of it
 * (`…/someone/status/1234567890/photo/1`). A photo sits inside a link to itself but a video
 * does not, so the post's own link is asked instead — the cell's first such address, the time
 * element's, which links to the post; the photo's own link alone would leave every video
 * unattributed. Used to tell whose pictures a text turns up on (`appearance/alt.ts`); a
 * picture inside a quote is answered with the quoting account, close enough for telling
 * whether two pictures came from different people. null with no address to read.
 */
export const accountOfPicture = (media: Element): string | null => {
  const own = media.closest(POST_LINK)?.getAttribute('href');
  const inCell = media.closest(CELL_SELECTOR)?.querySelector(POST_LINK)?.getAttribute('href');
  return (own ?? inCell)?.match(/\/([^/]+)\/status\/\d+/)?.[1] ?? null;
};

/**
 * The screen name. On a repost the avatar points at the original author; on a quote the first
 * one points at the quoting side. Takes the first avatar found within, so passing the quote
 * frame returns the quoted post's author.
 */
export const authorOf = (root: Element): string | null =>
  avatarNameOf(root.querySelector(AUTHOR_AVATAR)?.querySelector(AVATAR_NAME));

/**
 * The profile name (display name). As with `authorOf`, whose it is depends on where the
 * search starts; the appearance reads it from a quote frame. The name area lists the display
 * name, the `@`ID and the time, so the first text not starting with `@` is taken.
 */
export const displayNameOf = (root: Element): string | null =>
  displayNameIn(root.querySelector(USER_NAME));

/**
 * The same, from a name area already found — reading a post asks for that area anyway, for the
 * verified badge, and finding it twice would mean walking the whole post twice.
 */
const displayNameIn = (nameEl: Element | null): string | null => {
  if (!nameEl) return null;
  for (const span of nameEl.querySelectorAll('span')) {
    const text = span.textContent?.trim();
    if (text && !text.startsWith('@') && text !== '·') return text;
  }
  return null;
};

const some = (value: string | null): string[] => (value === null ? [] : [value]);

/**
 * The text nodes X itself wrote in an element, in read order. Leaves out lines the
 * appearance adds in place of stripped attachments — they're the extension's own, and
 * counting them would make a body rule match a card's headline the body no longer shows. An
 * added line holds exactly one text node of its own making (`appearance/apply.ts` writes
 * nothing else into it), so the parent alone tells a node apart.
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
 * The text X itself wrote in an element. Built from the nodes above rather than from
 * `textContent`, so a position in this string means the same to whoever paints it
 * (`filter/emphasis.ts`): both count the same characters wherever an added line sits.
 */
export const ownTextOf = (el: Element): string =>
  ownTextNodesOf(el)
    .map((node) => node.data)
    .join('');

/**
 * When the post was made. A `time`'s `datetime` is ISO 8601 UTC and does not depend on the
 * UI language. Excludes the `time` inside the quote frame: a post with a quote holds two
 * `time` elements, and the one in the frame is the quoted post's.
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
 * Where the counts X shows under a post are written. Body counts have no marker of their own
 * — counted from the text instead (`countsOf`). Each pair is one button in two states:
 * pressing it swaps the marker (`like` becomes `unlike`), the count on either. Views are not a
 * button — X hangs them off a link into the post's analytics. Markers are gone by rather than
 * the icon's number, which X rounds off ("1.2万", "12K") past a threshold.
 *
 * Bookmarks are left out: in a timeline X leaves the number off the button, showing it only
 * on a post opened to read. It does count them, in the row's overall label ("60 件の返信、
 * 229 件のブックマーク、…"), but that label omits whatever stands at zero — so which number
 * is which cannot be told without knowing X's wording in the language shown.
 */
export const COUNT_MARKERS = {
  reply: '[data-testid="reply"]',
  repost: '[data-testid="retweet"], [data-testid="unretweet"]',
  like: '[data-testid="like"], [data-testid="unlike"]',
  view: 'a[href$="/analytics"]',
} as const;

/** Everything carrying a count, as one selector. What the appearance walks writing them out in full (`appearance/apply.ts`) */
export const COUNT_TARGETS = Object.values(COUNT_MARKERS).join(', ');

/** The counts X shows under a post, as against the ones counted in what it says */
type Reaction = keyof typeof COUNT_MARKERS;
const REACTIONS = Object.keys(COUNT_MARKERS) as Reaction[];

/**
 * The row of buttons under a post, where every count it shows sits. Named by the reply
 * button, not the role alone — an ad's second `group`, around the pictures, comes first
 * (`test/pro_ad.htm`: 2 of 99 posts); the appearance names the row the same way
 * (`appearance/css.ts`). Counts are searched for within it, not the whole post, which costs
 * more the bigger it is, while this row stays five elements. The appearance ignores this row
 * when spelling numbers out in full (`appearance/apply.ts`) — a rounded number is spelled out
 * wherever it stands, quoted posts included, while judging cares only about this post's own.
 */
const ACTION_BAR = '[role="group"]:has([data-testid="reply"])';

/**
 * The box X animates a count inside. Its text is the count as X shows it, rounded where X rounds
 * ("22万"), and it is what the appearance hides to put the full number in its place.
 */
export const COUNT_TEXT = '[data-testid="app-text-transition-container"]';

/**
 * The number X wrote into a label ("1551 件のいいね。いいねする", "1,551 Likes. Like"). Reads
 * the digits — the surrounding words are language-dependent, and the number is written in
 * full here, not rounded. Only the first run is taken, since later words may hold their own
 * number; grouping characters are dropped, so 1,234 and 1 234 both come out 1234. null for no
 * number at all, unlike zero: replies, reposts and likes say "0", while unshown views leave
 * nothing to read.
 */
export const countInLabel = (label: string | null | undefined): number | null => {
  // What a language may put between groups of digits: comma, period, or space (ordinary, non-breaking or narrow)
  const run = label?.match(/\d[\d.,\u00a0\u202f ]*/)?.[0];
  if (!run) return null;
  return Number(run.replace(/\D/g, ''));
};

/**
 * What a link X wrote into the body points at, by the shape of its address. Goes by the path
 * rather than the host: X Pro writes some of a post's links to `pro.x.com` and some to
 * `x.com`, so a host check would answer for only half. A pasted URL is always shortened to
 * `t.co` whatever it points at, which is what tells it apart from a hashtag or mention —
 * both X's own addresses. null for anything else, including an address X wrote for its own
 * purposes.
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
  // A mention is one step and no further ("/alice"); a post's own address ("/alice/status/123") is two
  return parts.length === 1 ? 'mention' : null;
};

/** The body text of a post, gone through once. Everything that reads the words works from here */
type Bodies = {
  /**
   * What the post says, one element at a time, including the quoted post's words. Listed
   * rather than concatenated: concatenating would keep "matches exactly" from ever holding
   * on a post with a quote, and would disagree with the unit emphasis paints.
   */
  all: string[];
  /** The quoted post's words alone, in the same shape */
  quoted: string[];
  /** The elements the post itself wrote, the quoted post's left out */
  own: Element[];
  /** How many characters the post itself wrote */
  ownLength: number;
};

/**
 * Reads the bodies once and sorts them by whose they are, told apart the same way
 * `postedAtOf` tells the time apart — what is counted should be what this post says, not what
 * it quotes. One pass because each of these costs a walk of the text nodes (`ownTextOf`),
 * the priciest thing done to a post; asked separately, a quoted post's words were walked
 * twice and the post's own three times over.
 */
const bodiesOf = (tweet: Element, quote: Element | null): Bodies => {
  const bodies: Bodies = { all: [], quoted: [], own: [], ownLength: 0 };
  for (const body of tweet.querySelectorAll(TWEET_TEXT)) {
    const text = ownTextOf(body);
    bodies.all.push(text);
    if (quote !== null && quote.contains(body)) {
      bodies.quoted.push(text);
      continue;
    }
    bodies.own.push(body);
    bodies.ownLength += text.length;
  }
  return bodies;
};

/**
 * What the body holds, gone through once and sorted by what each link points at. Pasted links
 * count too, for the "has a link" trait: a post can carry one with no card drawn
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
 * The language X read the post as, from the code it writes on the body ("ja", "en"). X also
 * uses codes of its own for a post with no real text ("qme" and the like), passed through
 * unchanged — their meaning is X's to say, and a rule can still match them. Read from the
 * post's own body, quoted excluded, so a Japanese post quoting an English one reads Japanese.
 */
const languageIn = (bodies: Element[]): string[] => {
  const lang = bodies[0]?.getAttribute('lang');
  return lang ? [lang] : [];
};

/**
 * What was written about the post's own pictures. X inserts its own word for an undescribed
 * picture ("画像", "Image"), which is not a real description; which words those are cannot be
 * listed in advance — they follow the shown language — so they're learned from the pages
 * read and passed in (`appearance/alt.ts`, `settings/schema.ts`). Quoted-post pictures are
 * left out, as the appearance leaves them out: they belong to the quoted post, not this one.
 */
const mediaDescriptionsIn = (
  media: Element[],
  quote: Element | null,
  generic: ReadonlySet<string>
): (string | null)[] =>
  media
    // One video answers to two markers, so only the outer one is taken (`isOutermostMedia`)
    .filter((el) => (quote === null || !quote.contains(el)) && isOutermostMedia(el))
    .map((el) => descriptionOf(altTextOf(el), generic));

/**
 * The first match in the post itself, skipping the quoted post's. A quoted post carries its
 * own name area, and sometimes its own button row, so taking whichever comes first could
 * answer for whoever was quoted — the same exclusion `postedAtOf` makes with the time.
 */
const ownIn = (tweet: Element, quote: Element | null, selector: string): Element | null => {
  // With nothing quoted there is nothing to skip. Most posts are this, and asking for every
  // match would search the whole post for a list nothing reads past the head of
  if (quote === null) return tweet.querySelector(selector);
  for (const el of tweet.querySelectorAll(selector)) {
    if (!quote.contains(el)) return el;
  }
  return null;
};

/** The row of buttons the post's own counts sit in */
const barIn = (tweet: Element, quote: Element | null): Element | null =>
  ownIn(tweet, quote, ACTION_BAR);

/**
 * What there is to count about the post. Reactions are read off the labels; the quote frame
 * is left out as `postedAtOf` leaves it out — a quoted post's own action bar holds its own
 * numbers. Body counts come from the text this post wrote, which is why an empty body is 0
 * rather than "cannot be read".
 */
const countsOf = (
  tweet: Element,
  quote: Element | null,
  bodies: Bodies,
  inBody: { hashtag: number; mention: number }
): Record<CountMetric, number | null> => {
  const reactions: Record<Reaction, number | null> = {
    reply: null,
    repost: null,
    like: null,
    view: null,
  };
  /*
   * The four numbers sit side by side in the button row, searched in one pass and sorted
   * afterwards — asked one marker at a time against the whole post, reading them walked
   * hundreds of elements four times over. A post with no row at all is searched whole: the
   * row is how X lays a post out today, and counts turning up elsewhere should read as shown.
   */
  const within = barIn(tweet, quote) ?? tweet;
  const read = new Set<Reaction>();
  for (const marked of within.querySelectorAll(COUNT_TARGETS)) {
    if (quote !== null && quote.contains(marked)) continue;
    for (const metric of REACTIONS) {
      // The first of each is the post's own: a marker met again belongs to something nested
      if (read.has(metric) || !marked.matches(COUNT_MARKERS[metric])) continue;
      read.add(metric);
      reactions[metric] = countInLabel(marked.getAttribute('aria-label'));
      // One element is one count: the markers name different buttons
      break;
    }
  }
  return {
    ...reactions,
    // The characters X itself wrote, counted the same way the text conditions read them
    textLength: bodies.ownLength,
    hashtag: inBody.hashtag,
    mention: inBody.mention,
  };
};

/**
 * The quote frame, found by the avatar rather than the body text, so it is found even when
 * the quoted post is images only. Exported: the appearance moves the same frame into the
 * post. Excludes the post author's own avatar deliberately — a bare "container holding an
 * avatar" check would treat the post body as the frame and read the author's own values, the
 * day X changes how it wraps the author's avatar.
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
 * Who reposted, from the target of the link wrapping the "… reposted" line. The display name on
 * that line runs together with UI-language boilerplate, so it is not used.
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
 * The profile links on the reply-target line. "Replying to @xxx" carries no marker and its
 * wording is language-dependent, so it is spotted structurally: before the body text, and
 * neither the name area, an avatar, nor the repost line. Whether it is the same person as the
 * author is not considered — a reply to oneself is still a reply.
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
 * Whether a vertical line connects this to the post above (a thread continuing). On a
 * thread's parent post X puts an extra container drawing a line below the avatar, only on
 * the parent side, so a post above carrying that container makes this cell a continuation —
 * a reply. Such replies show no "Replying to" line, so link-based detection misses them. A
 * "Show more replies" row in between is skipped, since what follows it is the same thread.
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
 * What emphasis paints. `value` is the string the rule matched against, `offset` where that
 * string starts within the element's text. The user-ID area is shown with the `@` included
 * while the judgement looks at it without, and that discrepancy is absorbed here.
 */
export type MarkTarget = { element: Element; value: string; offset: number };

/** Paints the body-text elements as they are. Changing the starting point narrows it to the quoted body */
const textTargetsIn = (root: Element): MarkTarget[] =>
  Array.from(root.querySelectorAll(TWEET_TEXT), (element) => ({
    element,
    // The same text the judging looked at, walked the same way by `ownTextNodesOf` to turn a
    // position into a Range. An added line is out of both: it shifts nothing, and is never painted
    value: ownTextOf(element),
    offset: 0,
  }));

/** Where the user ID or the display name sits in the name area, told apart as `authorOf` / `displayNameOf` do */
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

    if (!trimmed.startsWith('@')) {
      return [{ element: span, value: trimmed, offset: text.indexOf(trimmed) }];
    }
  }
  return [];
};

/**
 * The reply-target links. The judgement looks at the ID from the link target, the painted value
 * at the text on screen, so a case difference between the two shifts no position.
 */
const replyTargetsIn = (tweet: Element): MarkTarget[] =>
  replyLinksOf(tweet).flatMap((link) => {
    const text = link.textContent ?? '';
    const at = text.indexOf('@');
    return at < 0 ? [] : [{ element: link, value: text.slice(at + 1), offset: at + 1 }];
  });

/** The elements emphasis paints for the rule's target, pointing at the same places as the strings `readPost` judged on */
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
    // X's reading of the post rather than anything written in it: nothing on screen to paint
    case 'language':
      return [];
    // A description is shown under a picture only where the appearance puts it, that line being ours not X's
    case 'altText':
      return [];
    // Text from embedded things filters only: reached by child index, so a position shifts easily
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
 * A poll's choices: open, a `radio` is the container for one; in the results a `listitem` is. In
 * both the first `span` is the name, the percentage a separate `span` kept out.
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
 * Reads a card's text. A card's link is a `t.co` short URL, so nothing beyond the domain can
 * be read from it. X draws a card in one of two layouts, not by site — both appear on both
 * x.com and X Pro, the card itself deciding. In the small layout a detail node lists the
 * domain and headline as its two children; in the large there is no detail node, and the
 * link's last block holds them instead — two children, or one when the card carries a call
 * to action rather than a headline (X Pro's and x.com's ads both do), naming no domain. The
 * appearance reads the same two parts moving a card's text into the post, so it goes through
 * here and the two cannot drift apart.
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
 * A Space's name, read only once it is known to be a Space: whether `wrapperView` is unique to
 * Spaces cannot be settled from one sample, so the check comes first.
 */
const spaceNameIn = (tweet: Element): string[] => {
  if (!tweet.querySelector(SPACE)) return [];
  const text = tweet.querySelector(SPACE_BOX)?.children[1]?.textContent?.trim();
  return text ? [text] : [];
};

/**
 * An article's headline and opening, in the cover image's next sibling. The "Article" label sits
 * inside the cover image, so it does not get mixed in.
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
 * Whether that post is an ad. The wrapper sits between the cell and the post, so the search is
 * bounded to the cell: `closest` alone would climb past it into something outside the timeline.
 */
const isAdIn = (cell: Element, tweet: Element): boolean => {
  const placement = tweet.closest(AD_PLACEMENT);
  return placement !== null && cell.contains(placement);
};

/**
 * Turns a post cell into something judgeable. Returns null for items without the post marker
 * (notifications, trends), and for posts still mid-render with no author yet — picked up
 * again on the next change. `generic` is X's own words for an undescribed picture, deciding
 * whether a picture counts as described (`appearance/alt.ts`); left out, every picture reads
 * as described, which is what the search side wants, having no settings to learn them from.
 */
export const readPost = (cell: Element, generic: ReadonlySet<string> = new Set()): Post | null => {
  const tweet = cell.querySelector(TWEET);
  if (!tweet) return null;

  const author = authorOf(tweet);
  if (!author) return null;

  const quote = quoteFrameOf(tweet);
  // The name area answers both whose post it is and whether X vouches for them
  const nameArea = ownIn(tweet, quote, USER_NAME);
  const replyLinks = replyLinksOf(tweet);
  const followsThread = followsThreadLine(cell);
  // The body is walked once — the words, the counts, the language and the link trait all come from it
  const bodies = bodiesOf(tweet, quote);
  const inBody = bodyLinksOf(bodies.own);
  // Asked once as well: what hangs off the post answers both "is there a picture" and "was it described"
  const media = Array.from(tweet.querySelectorAll(MEDIA));
  const described = mediaDescriptionsIn(media, quote, generic);

  return {
    values: {
      text: bodies.all,
      quotedText: bodies.quoted,
      screenName: [author],
      displayName: some(displayNameIn(nameArea)),
      repostedBy: some(repostedByOf(tweet)),
      quotedScreenName: some(quote ? authorOf(quote) : null),
      quotedDisplayName: some(quote ? displayNameOf(quote) : null),
      replyTo: replyTo(replyLinks, followsThread, author),
      pollChoice: pollChoicesIn(tweet),
      cardDomain: cardTextsIn(tweet, (card) => card.domain),
      cardTitle: cardTextsIn(tweet, (card) => card.title),
      spaceName: spaceNameIn(tweet),
      articleText: articleTextIn(tweet),
      language: languageIn(bodies.own),
      altText: described.filter((text): text is string => text !== null),
    },
    isRepost: tweet.querySelector(SOCIAL_CONTEXT) !== null,
    // A quote is spotted by a second author avatar, the quoted post's, being present
    isQuote: tweet.querySelectorAll(AUTHOR_AVATAR).length > 1,
    isReply: replyLinks.length > 0 || followsThread,
    hasMedia: media.length > 0,
    communityNote: communityNoteOf(tweet),
    poll: pollOf(tweet),
    hasSpace: tweet.querySelector(SPACE) !== null,
    hasArticle: tweet.querySelector(ARTICLE) !== null,
    hasLinkCard: linkCardsIn(tweet).length > 0,
    isAd: isAdIn(cell, tweet),
    isVerified: nameArea?.querySelector(VERIFIED_BADGE) != null,
    // A post with no picture is not one: the trait is about a picture with nothing said about it
    hasUndescribedMedia: described.some((text) => text === null),
    hasBodyLink: inBody.link > 0,
    postedAt: postedAtOf(tweet, quote),
    counts: countsOf(tweet, quote, bodies, inBody),
  };
};
