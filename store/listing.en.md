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

Filters the X Pro and x.com timelines: collapse, hide or highlight posts, read picture descriptions, search, and tidy the page.

## Full description

Hide the posts you would rather not read from the X Pro (pro.x.com, formerly TweetDeck) and x.com timelines, and change how the rest looks.

■ Filter the timeline

A post that matches can be collapsed, hidden, tinted, or have only the matched words tinted.

What a rule can look at:
- The post text, the quoted text, the user ID, the display name, the reposter's ID, the reply-to ID, the link domain, the card headline, the Space name, the article headline, and more
- Contains, Matches exactly, Regular expression, Is the author
- What the post is: repost, quote, reply, poll, link card, Space, article, ad or promoted post, with a photo or video, with a Community Note
- How old it is: "older than 1 hour", "newer than 30 minutes"
- Every condition can be inverted

Rules can be reordered, and the first one that matches from the top decides what happens. Any rule can be switched off without being deleted.

■ Change how it looks

- Pack the posts, so more of them fit on screen
- Set a line limit on the post text, with the rest behind "Show more"
- Fold the line breaks in a post into spaces, so each one takes less room
- Show photos, videos, link cards and quoted posts as they are, as a mark, as text, or not at all
- Text size, largest thumbnail height, column width (X Pro only)
- Ten colors: the background, the author name, the post text, the secondary text, links, the line between posts, and more
- Colour the compose form by the account it will post as, so you can see at a glance who you are posting as
- Show the date and time instead of "2h"

■ Read the description written for a picture

What an author wrote for a picture can be written out under it. X Pro shows it nowhere itself.
It is there even when the pictures themselves are hidden, and it is on hover as well.

■ Detailed search (x.com)

A form beside the timeline for building an X search out of fields, so the operators do not have to be remembered.

- Keywords, accounts, a span of days, the language, whether it has a link or a photo, the least it must have in replies or likes
- On a search's results it takes the place of X's own search filters
- A search reached from a trend or a hashtag fills the form, so it can be narrowed down rather than retyped
- Things X's search cannot be asked for, such as leaving reposts out, or posts that matched only somebody's name

■ Tidy the page around the timeline (x.com)

- Take the whole rail away and let the timeline widen
- Take away what is in the rail, the items down the left, and the entries in the "More" menu, one at a time
- Take away what X slips in: the accounts it suggests, and "Discover more" under a post
- Bring new posts in by itself

■ Settings live in five scopes

Global, per account, per site (X Pro / x.com), per account on one site, and the column you are looking at on X Pro or the view you are on at x.com (home, notifications, bookmarks, a list, a profile, a search).
The narrower scope wins. "What applies" on the settings screen shows which scope each value came from.

■ The compose form (X Pro)

Open the compose form again after posting. Put the hashtags you wrote into the next one.
They are there for a run of posts sharing the same tags. Both start off.

■ Privacy

It sends nothing anywhere. It makes no network requests of its own, and it contains no analytics, no telemetry and no remotely hosted code.
Your settings stay on your own device.

■ Source

Apache License 2.0 / https://github.com/yuzneri/X-Tweaks
