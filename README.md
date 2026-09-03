# X Tweaks

[日本語](README.ja.md)

A browser extension that hides unwanted posts from the X Pro (pro.x.com, formerly TweetDeck) and x.com timelines, and changes how they look.
Settings can be placed in five scopes: global, account, site (X Pro / x.com), an account on one site, and the column or view being looked at.
The narrower scope wins, and a colour or size set by a wider one can be put back to how X shows it.

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

The following can be changed per column on X Pro, and per view (home, notifications, bookmarks, a list, somebody's profile, a search) on x.com.
The same items can also be set for the global, account, site and account-on-one-site scopes, with the narrower one winning:

- **Column width** (X Pro only)
- **Pack the posts**: packs the padding around a post, shrinks the avatar, and folds away the row of buttons. Repost and like move up beside the name, to the left of the “…”, while reply and the view count are hidden. No “Show more” is shown either, X’s own included: the rest of a post is read by opening it
- **Post text size**
- **Post text line limit**: a post past the limit opens with “Show more” (not while the posts are packed)
- **Characters shown of a description or quote**: how much of a picture's description, a quoted post or a card's headline goes on screen. 80 when unset; the rest opens with “Show more”
- **Line breaks in the post text**: each is folded into a single space, so a post takes less room
- **Photos and videos**: as they are; as they are with a description (the picture stays and what its author wrote for it is written underneath, with a “Show more” where there is more); as their description (those same words go into the post as one line, “📷 the description”, and the picture comes off; with several pictures each gets a mark of its own and its own words after it — “📷 📷 the second 📷 📷 the fourth” — and a picture nobody described takes the mark alone), as a mark (they come off the timeline and a mark, 📷 or 🎬, goes into the post where they were), or not shown at all (off the timeline with nothing left behind)
  There are as many marks as there were pictures (📷📷📷📷 for four), so what was taken away is still counted. A quoted post's pictures are not among them
- **Largest thumbnail height**
- **Link cards and articles**: as they are, as text in the post (each goes into the end of the post body as one line — “🔗 headline (domain)”, “📄 the article's headline” — and the box itself goes; a card's line keeps its link, in X’s own link color), as a mark (the words are dropped, leaving 🔗 or 📄), or not shown at all
- **Quoted posts**: the same four ways. As text it reads “💬 what the quote says (name @id)”, cut at 80 characters with the rest on hover. The line does not open anything: X Pro writes no address on a quote frame
- **Time display**: as it is, the date and time, or both
- **Colors**: ten places can be colored
  - Behind the column name (X Pro only)
  - Timeline background — inside a column on X Pro
  - Everything outside the timeline (x.com only) — the items down the left, the rail beside it, and the margins either side. The timeline itself is left as X draws it, so this and the one above can be set to different colors
  - Compose form background — decided by the account it will post as and by the site, so setting it on one account tells you at a glance which account a post is about to go out as, and one of the two sites can be given a different colour or none at all. It reaches X Pro's compose drawer, x.com's post window, and the box at the head of x.com's timeline
  - Column name (X Pro only)
  - Author name
  - Post text
  - Secondary text (times, counts, reply-to)
  - Links
  - Line between posts
- **What highlights blend over**: the timeline background set above, or X’s own with that color ignored
- **When a highlight makes text unreadable**: whether the text color is fixed automatically

On the settings screen, what belongs to a column (its width and the colors of its name) sits in a group of its own.
Every scope puts things in the same place, and what cannot apply is left out (x.com has no columns; X Pro has no page around the timeline).

The colour and size fields carry an “As X” switch that cancels what a wider scope set — shown only where there is something to cancel.
It is how an account's compose-form colour can be kept off one of the two sites, say.

Each site's tab lists the accounts again, under “Accounts on X Pro” and “Accounts on x.com”.
That is where an account's settings are changed, or kept away, on one of the two sites alone — the “Account” scope itself reaches both.

The description written for a picture is shown on hover whatever the setting says, X Pro showing it nowhere itself: on the line put into the post under “their description” and “a mark”, and on the picture itself under “as they are”.
A touch screen has no hover and cannot reach any of that, so where you want to read a description with nothing but a finger, choose “as they are, with a description” and it is written out under the picture.
A post with several pictures gathers them into one caption, a line apiece, each saying which picture it belongs to (“Picture 2:”). Pictures nobody described are skipped, so the numbers point at where a picture actually sits.
A quoted post's pictures are left alone whichever way things are shown: their descriptions are not written out, and they are not counted among the marks either. Those words are the quoted author's, and set down in the quoting post they would read as the quoting author's. The quoted post stands for itself, under its own setting.
Where X puts its own “ALT” button beside a picture — as it does on an opened post, on both sites — the description is left to that button rather than written out twice. Pictures without one still get a caption, opened post or not.
A picture nobody described carries a word of X's own instead (“Image”, and another for a video), which is not passed on as a description. Those words are X's, in the language X is shown in, so they are worked out from the pages you read. What was worked out is shown under “Other → Settings”, where it can be corrected — a line written there is left as written.

Anything left unset keeps the way the site itself shows it.
A line put into a post goes at the end of the body: on a line of its own where the post's line breaks are kept, and on from the body where they are folded into spaces.
80 characters is what goes in while skimming — settable per column, and the same for a caption under a picture as for a line put into a post — so a long description or a quoted post has more behind it. **A “Show more” appears where it does**, and pressing it puts the words in whole — even on a post the line limit never touched, the line's own held-back words being reason enough for the button. A line already showing all it has gets neither the button nor a tooltip on its mark, there being nothing to add.
Where the post is being shown cut short, the line is a mark alone and stands outside the body, between it and the “Show more” — the cut counts whatever is inside the body, and would take the mark with the rest. Pressing opens the body and the line together.
Cut short covers X's own doing as well as the line limit: X shortens a long post whether or not a limit is set. On a post with no body the line takes the place the box was in.
Where a post is open to be read — a column with one opened on X Pro, a post's own page on x.com — the packing, the line limit, the folding of line breaks and the hiding of cards and photos all stand down.

## What X slips in

Two blocks X puts into a timeline that are not posts can be taken away. They apply to both sites, and are one setting for the whole of a site rather than being held per column or per view: X decides where they go, not the reader.

- **Accounts X suggests following**: the block goes in one piece, from its heading down to its “Show more”, and so does the one X stacks in the rail beside the timeline on x.com
- **“Discover more” under a post**: the posts X appends under a conversation once the replies have run out. The conversation itself stays

Each site keeps its own answer, so a block can go on one and stay on the other.

“Accounts X suggests following” used to be a per-column setting under Appearance. It has moved here, and the old value is not carried over: if you had it on, switch it on again. Nothing else changes.

## Posting

Two things about the compose form for a new post can be changed. They apply to X Pro, and are one setting for the whole of it rather than being held per column.

- **Open the compose form again**: X Pro closes it on posting; this opens it again, ready to type the next post into
- **Put the hashtags back**: the tags that were written go into the next compose form, with the caret waiting in front of them — the form that opens again if it is kept open, or the next one opened by hand if it is not

They are there for a run of posts sharing the same tags.
Both start off, and left off X Pro behaves as it always has.

Replies and quotes are left alone, and a post that fails to go out changes nothing.

## Detailed search

A form for building an X search out of fields, so that the operators do not have to be remembered.
**x.com only** — X Pro has no search results page — and **off until asked for**.

It stands in the rail on the right, and where it goes depends on what X puts there:

- **On a timeline**: under X's own search box, which stays as it is. The box keeps its suggestions and the `/` key keeps working
- **On a search's results**: in place of X's own search filters. What those offer — from anyone or people you follow, anywhere or near you, and a link to X's advanced search — is a part of what this form asks, so leaving both would put the same questions on screen twice
- **On Explore**: at the head of the rail

Five fields are always on show: all of these keywords, this keyword as a whole, any of these keywords, none of these keywords, and hashtags.
Above them stands the choice of which tab of X's own to land on — top, latest, people, media or lists — carrying no heading of its own, the choices being their own names.
**It starts on latest.** Having said in detail what a search is for, you should not then have X decide which of the answers you see.
The rest sit in groups that start folded, in this order: “Accounts” (“From these accounts”, “Replying to these accounts” and “Mentioning these accounts”, each of which can be excluded instead); “When”, a span of days; “Filters” (whether it has a link, a photo, a video, or a verified author; whether it is a reply; the language; “only accounts you follow” and “only near you”); and “How much it got”, the least it must have in replies, likes and reposts.

A span is a date and a time, side by side; the time carries no label of its own, the date's naming both.
**Leave a time empty and the day is taken whole**, from its start to its end — so naming two dates means the whole of both.

The first field is passed to X untouched, so anybody who knows the operators can write one there and have it reach X as written.

### Leaving posts out of the results

Four things X's search cannot be asked for are done to the results after they arrive.
They sit inside “Filters” and are shown on every page, but they take effect only on a search's results — those results being what there is to leave out of.
**They are not saved**, but they are carried: running a search takes you to a new page, and arriving with the boxes cleared would mean ticking them again after every search.
They last as long as the tab and go with it.

- Reposts
- Posts with a hashtag
- Display-name-only posts
- User-ID-only posts

The last two need to know what was searched for, and do nothing without it.
An account the query names outright is never left out — a search for somebody's posts that hid them would answer nothing.

### The form and X's search box

The two are kept in step.
Opening a search's results fills the form from the address, so a search reached from a trend or a shared link can be taken up and narrowed down rather than retyped.
Typing in X's box fills the form, on any page.
Filled from either of those, a group stands open rather than folded, since a search narrowed by something out of sight is a search nobody can check.
The other way round happens on a search's results only, and never into the box in the rail: writing there sets X redrawing the rail, taking the form down with it.

Reading a query into the form and building it again gives the same query.
Which field each word came from cannot always be told, so the fields do not always come back the way somebody left them — an operator this extension does not offer still survives, and reaches X as it arrived.

## The page around the timeline

What x.com draws around the timeline can be taken away. These apply to x.com, and are one setting for the whole site rather than being held per view: the same furniture stands in the same place whichever view you are on.

- **Take the rail away and widen the timeline**: the whole rail goes, search box and all, and the timeline spreads into the room it was using — as far as 1050px, the width the two of them stood in together, and no further however wide the window is. The two are one switch because widening with the rail still on screen pushes the rail out of the window
- **What is in the rail**, one switch each: the pitch for Premium, Today’s News, What’s happening, Relevant people (the block beside somebody’s profile), and the small print. The search box is not on the list: a rail with nothing else in it is worth less than no rail, so take the whole rail away instead. With the rail gone these are moot, and the settings screen shows them so
- **The items down the left**, one switch each: Explore, Follow, Chat, Grok, History, Creator Studio, Articles, Premium, your profile, and the Post button. An item X is not showing you is simply not there to take away, and each is matched by where it leads, so Grok covers SuperGrok and Premium covers Premium+. Home, notifications and “More” are not on the list — “More” is the way into these settings, so hiding it would shut the door from the inside
- **The items inside the “More” menu**, one switch each: Lists, Communities, Community Notes, Business, Ads, Create your Space, Add muted word, and Settings and privacy. The menu itself stays, and so does the entry that opens these settings
- **The box for writing a post**: the one at the head of the timeline. The box for writing a reply on a post's own page is the same element of X's, and stays
- **The two bars in the bottom-right corner**: the one for Grok and the one for chat, each on its own switch
- **Bring new posts in by itself**: X holds new posts back and floats a button over the timeline offering them; this presses it as soon as it appears, so the timeline fills itself. Only while you are at the top — pressing it moves to the new posts, and further down that would pull you off what you were reading, so further down the offer is left standing until you come back up

A ticked box means the thing is on the page. Everything starts ticked, and what you untick goes away.
“Widen the timeline” and “Bring new posts in by itself” read the other way round: ticked means do it.

Taking the rail away also takes the detailed search form with it: the form stands in the rail, and with no rail there is nowhere to put it. The settings screen shows that switch held shut while the timeline is widened.

## Opening the settings

Most editing happens inside the site itself.

| Where | Entry point | What it opens |
| --- | --- | --- |
| X Pro | A column’s options (the “…” in its header) | That column’s settings |
| X Pro | The bottom-left menu | The global settings |
| x.com | The “More” menu in the side navigation | The settings for the view you are on |

Whichever entry point you use, a whole site's own settings — “What X slips in”, and on x.com the page around the timeline — are at the head of that site's list, above the columns or views.

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
