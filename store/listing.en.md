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

Filters the X Pro and x.com timelines: collapse, hide or highlight posts, and change the text size, colors and time display.

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
- Eight colors: the background, the author name, the post text, the secondary text, links, the line between posts, and more
- Show the date and time instead of "2h"

■ Settings live in three scopes

Global, per account, and the column you are looking at on X Pro or the view you are on at x.com (home, notifications, bookmarks, a list, a profile, a search).
The narrower scope wins. "What applies" on the settings screen shows which scope each value came from.

■ The compose form (X Pro)

Open the compose form again after posting. Put the hashtags you wrote into the next one.
They are there for a run of posts sharing the same tags. Both start off.

■ Privacy

It sends nothing anywhere. It makes no network requests of its own, and it contains no analytics, no telemetry and no remotely hosted code.
Your settings stay on your own device.

■ Source

Apache License 2.0 / https://github.com/yuzneri/X-Tweaks
