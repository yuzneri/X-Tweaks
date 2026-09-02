# X Tweaks

[日本語](README.ja.md)

A browser extension that hides unwanted posts from the X Pro (pro.x.com, formerly TweetDeck) and x.com timelines, and changes how they look.
Settings can be placed in three scopes: global, account, and the column or view being looked at.

## Install

- [Firefox add-on](https://addons.mozilla.org/firefox/addon/x-tweaks/)
- [Chrome extension](https://chromewebstore.google.com/detail/knbinffoidihjchpoahlnfpippkllcia)

## Filter

The conditions available are:

- **Text**: the post text, the quoted text, the user ID, the display name, the reposter’s user ID, the quoted user ID, the quoted display name, the reply-to user ID, a poll choice, the link domain, the card headline, the Space name, the article headline and intro
- **How to match**: Contains, Matches exactly, Regular expression, Is the author
- **What the post is**: Repost, Quote, Reply, With a Community Note, With a Community Note to rate, With a poll still open, With a finished poll, With a link card, With a Space, With an Article, Ad or promoted post, With a photo or video
- **Post age**: written as “older than 1 hour” or “newer than 30 minutes” (in minutes, hours or days)
- **Negation**: every condition can be inverted

The action on a match is one of:

- **Collapse**: folds the post into a single line; press “Show” to bring it back
- **Hide**: removes the post entirely
- **Highlight**: tints the post’s background
- **Emphasize**: tints only the matched text
- **Do nothing**: stops every setting for that post, including those of wider scopes

Rules can be reordered within a scope, and the first one that matches from the top decides what happens.
Each rule can be switched on and off without being deleted.

## Appearance

The following can be changed per column on X Pro, and per view (home, notifications, bookmarks, a list, somebody's profile, a search) on x.com:

- **Column width** (X Pro only)
- **Pack the posts**: packs the padding around a post, shrinks the avatar, and folds away the row of buttons. Repost and like move up beside the name, to the left of the “…”, while reply and the view count are hidden. No “Show more” is shown either, X’s own included: the rest of a post is read by opening it
- **Post text size**
- **Post text line limit**: a post past the limit opens with “Show more” (not while the posts are packed)
- **Line breaks in the post text**: each is folded into a single space, so a post takes less room
- **Photos and videos**: as they are, as their description (what the author wrote for the picture goes into the post as one line, “📷 the description”, and the picture comes off; a picture nobody described takes the mark alone), as a mark (they come off the timeline and a mark, 📷 or 🎬, goes into the post where they were), or not shown at all (off the timeline with nothing left behind)
- **Largest thumbnail height**
- **Link cards and articles**: as they are, as text in the post (each goes into the end of the post body as one line — “🔗 headline (domain)”, “📄 the article's headline” — and the box itself goes; a card's line keeps its link, in X’s own link color), as a mark (the words are dropped, leaving 🔗 or 📄), or not shown at all
- **Quoted posts**: the same four ways. As text it reads “💬 what the quote says (name @id)”, cut at 80 characters with the rest on hover. The line does not open anything: X Pro writes no address on a quote frame
- **Time display**: as it is, the date and time, or both
- **Accounts X suggests following**: the block X slips into a timeline goes in one piece, from its heading down to its “Show more” (on x.com the one in the rail beside the timeline goes with it)
- **Colors**: eight places can be colored
  - Behind the column name (X Pro only)
  - Column background — the timeline background on x.com
  - Column name (X Pro only)
  - Author name
  - Post text
  - Secondary text (times, counts, reply-to)
  - Links
  - Line between posts
- **What highlights blend over**: the background set above, or X’s own with that color ignored
- **When a highlight makes text unreadable**: whether the text color is fixed automatically

The description written for a picture is shown on hover whatever the setting says, X Pro showing it nowhere itself: on the line put into the post under “their description” and “a mark”, and on the picture itself under “as they are”.
A picture nobody described carries a word of X's own instead (“Image”, and another for a video), which is not passed on as a description. Those words are X's, in the language X is shown in, so they are worked out from the pages you read. What was worked out is shown under “Other → Settings”, where it can be corrected — a line written there is left as written.

Anything left unset keeps the way the site itself shows it.
A line put into a post goes at the end of the body: on a line of its own where the post's line breaks are kept, and on from the body where they are folded into spaces.
With a line limit set it is a mark alone, and a post the mark still fits under keeps it at the end. A post it does not fit under takes it in front of the body instead, so the limit neither cuts it away nor gives it a line of its own. On a post with no body it takes the place the box was in.
Where a post is open to be read — a column with one opened on X Pro, a post's own page on x.com — the packing, the line limit, the folding of line breaks and the hiding of cards and photos all stand down.

## Posting

Two things about the compose form for a new post can be changed. They apply to X Pro, and are one setting for the whole of it rather than being held per column.

- **Open the compose form again**: X Pro closes it on posting; this opens it again, ready to type the next post into
- **Put the hashtags back**: the tags that were written go into the next compose form, with the caret waiting in front of them — the form that opens again if it is kept open, or the next one opened by hand if it is not

They are there for a run of posts sharing the same tags.
Both start off, and left off X Pro behaves as it always has.

Replies and quotes are left alone, and a post that fails to go out changes nothing.

## Opening the settings

Most editing happens inside the site itself.

| Where | Entry point | What it opens |
| --- | --- | --- |
| X Pro | A column’s options (the “…” in its header) | That column’s settings |
| X Pro | The bottom-left menu | The global settings |
| x.com | The “More” menu in the side navigation | The settings for the view you are on |

The settings are split into tabs by site, because X Pro’s columns and x.com’s views never appear together on one screen.

## Development
```
npm install
npm run build
```

## Privacy

The extension sends nothing anywhere, and keeps your settings on your own device ([PRIVACY.md](PRIVACY.md)).

## License

Apache License 2.0 ([LICENSE](LICENSE)).
