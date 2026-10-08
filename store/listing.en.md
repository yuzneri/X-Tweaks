# Store listing copy (English)

Where each part goes. **Do not paste the headings or the `---`.**

| Field | Chrome Web Store | Firefox (AMO) | Source |
| --- | --- | --- | --- |
| Name | taken from the manifest | taken from the manifest | `name` in `manifest.json` |
| Short description | **nothing to paste**: the manifest's `description` is shown as it is (132 characters) | paste into "Summary" (250 characters) | `_locales/en/messages.json` |
| Full description | paste into "Description" | paste into "About this extension" | below |

Chrome takes the short description from the manifest, so that one is edited in
`_locales/en/messages.json`. It is repeated below for AMO, and to be read over.

The text comes from `README.md`. Change what the extension does, change the README, then bring this in line.

---

## Name

X Tweaks

## Short description

Filters the X Pro and x.com timelines: hide or highlight posts, show exact counts and picture descriptions, search, tidy the page.

## Full description

Hide the posts you would rather not read from the X Pro (pro.x.com, formerly TweetDeck) and x.com timelines. You can also change how they look, and set up searching, how profiles open, and the page around the timeline.

■ Filter the timeline

A post that matches can be collapsed, hidden, tinted, or have only the matched words tinted. Choosing "Do nothing" stops every setting for that post, including those placed in wider scopes (see "Where settings can be placed" below).

A rule can look at:
- Text: the post text, the quoted text and its author, the user ID, the display name, the reposter's ID, the reply-to ID, a poll choice, the link domain, the card headline, the Space name, the article or trend headline, the post's language, a picture's description, and more. Matched by Contains, Matches exactly, Regular expression or Is the author
- What the post is: repost, quote, reply, poll, link card, Space, article, trend card, ad or promoted post, with a photo or video, a photo or video nobody described, verified account, a link in the text, with a Community Note, with a Community Note to rate
- How old it is: written as "older than 1 hour"
- How many: the counts (replies, reposts, likes, views), and the characters, hashtags and mentions in the text, written as "100 or more" or "5 or fewer"

The text and "what the post is" conditions can also be inverted.

Rules can be put in any order, and the first rule that matches is applied.

■ Change how it looks

- Pack the posts, so more of them fit on screen
- Set a line limit on the post text, with the rest behind "Show more"
- Remove the line breaks in a post, so each one takes less room
- Show photos, videos, link cards, articles, trend cards and quoted posts as they are, as a mark, as text, or not at all
- Show the counts X rounds off ("221.3K") as the number itself ("221,250")
- Change the text size, the largest thumbnail height and the column width (X Pro only)
- Change ten colors: the background, the author name, the post text, the secondary text, links, the line between posts, and more
- Colour the compose form by the account it will post as, so you can see at a glance who you are posting as
- Show the date and time instead of "2h"

■ Read the description written for a picture

What an author wrote for a picture can be written out under it.

■ Detailed search (x.com)

A form beside the timeline for building an X search out of fields, so the operators do not have to be remembered.

- Search by keywords, hashtags to exclude, cashtags, a span of days, the language, whether it has a link or a photo, and the least it must have in replies or likes
- Include and exclude accounts as authors, reply targets and mentions, and search the posts of a List's members
- On a search's results, it takes the place of X's own search filters
- A search reached from a trend or a hashtag fills the form, so it can be narrowed down rather than retyped
- Leave reposts, posts that matched only somebody's name, and posts with at least the given number of hashtags, reactions or views out of the results on screen
- Keep the searches you open in a history (the latest 50), and save a search under a name

■ The tabs a profile opens on (x.com)

Have profiles on x.com open on the tabs you prefer, such as All, Highlights, Popular or Photos.

■ Tidy the page around the timeline (x.com)

- Take the whole rail away and let the timeline widen
- Take away what is in the rail, the items down the left, and the entries in the "More" menu, one at a time
- Take away what X slips in: the accounts it suggests, and "Discover more" under a post
- Bring new posts in by itself

■ On X Pro only

- Pressing a trend card does nothing at all, so it is made to open the same page x.com does (always on)
- Open the compose form again after posting
- Put the hashtags you wrote into the next compose form

There are also two experiments, both off by default:
- Keep your reading position in a For you column when new posts arrive
- Mark notifications as read on X once you use an "All notifications" column

■ Where settings can be placed

Settings can be placed in five scopes: global, per account, per site (X Pro / x.com), per account on one site, and the column you are looking at on X Pro or the view you are on at x.com (home, notifications, bookmarks, a list, a profile, a search).

■ Privacy

It sends no analytics or usage data to the author or anyone else, and it contains no remotely hosted code.
Your settings stay on your own device.
Only when the experimental notification-read option is on does it send X the read cursor that marks your notifications as read.

■ Source

Apache License 2.0 / https://github.com/yuzneri/X-Tweaks
