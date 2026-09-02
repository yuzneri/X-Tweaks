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
- **Photos and videos**: as they are; as they are with a description (the picture stays and what its author wrote for it is written underneath, with a “Show more” where there is more); as their description (those same words go into the post as one line, “📷 the description”, and the picture comes off; with several pictures each gets a mark of its own and its own words after it — “📷 📷 the second 📷 📷 the fourth” — and a picture nobody described takes the mark alone), as a mark (they come off the timeline and a mark, 📷 or 🎬, goes into the post where they were), or not shown at all (off the timeline with nothing left behind)
  There are as many marks as there were pictures (📷📷📷📷 for four), so what was taken away is still counted. A quoted post's pictures are not among them
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
A touch screen has no hover and cannot reach any of that, so where you want to read a description with nothing but a finger, choose “as they are, with a description” and it is written out under the picture.
A post with several pictures gathers them into one caption, a line apiece, each saying which picture it belongs to (“Picture 2:”). Pictures nobody described are skipped, so the numbers point at where a picture actually sits.
A quoted post's pictures are left alone whichever way things are shown: their descriptions are not written out, and they are not counted among the marks either. Those words are the quoted author's, and set down in the quoting post they would read as the quoting author's. The quoted post stands for itself, under its own setting.
Where X puts its own “ALT” button beside a picture — as it does on an opened post, on both sites — the description is left to that button rather than written out twice. Pictures without one still get a caption, opened post or not.
A picture nobody described carries a word of X's own instead (“Image”, and another for a video), which is not passed on as a description. Those words are X's, in the language X is shown in, so they are worked out from the pages you read. What was worked out is shown under “Other → Settings”, where it can be corrected — a line written there is left as written.

Anything left unset keeps the way the site itself shows it.
A line put into a post goes at the end of the body: on a line of its own where the post's line breaks are kept, and on from the body where they are folded into spaces.
80 characters is what goes in while skimming — the same for a caption under a picture as for a line put into a post — so a long description or a quoted post has more behind it. **A “Show more” appears where it does**, and pressing it puts the words in whole — even on a post the line limit never touched, the line's own held-back words being reason enough for the button. A line already showing all it has gets neither the button nor a tooltip on its mark, there being nothing to add.
Where the post is being shown cut short, the line is a mark alone and stands outside the body, between it and the “Show more” — the cut counts whatever is inside the body, and would take the mark with the rest. Pressing opens the body and the line together.
Cut short covers X's own doing as well as the line limit: X shortens a long post whether or not a limit is set. On a post with no body the line takes the place the box was in.
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
