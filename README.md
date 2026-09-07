# X Tweaks

[日本語](README.ja.md)

A browser extension that hides unwanted posts from the X Pro (pro.x.com, formerly TweetDeck) and x.com timelines, and changes how they look.

Settings can be placed in five scopes.
The narrower scope wins, and a colour or size set by a wider one can be put back to how X shows it.

- Global
- Account
- Site (X Pro / x.com)
- An account on one site
- The column (X Pro) or view (x.com) being looked at

## Install

- [Firefox add-on](https://addons.mozilla.org/firefox/addon/x-tweaks/)
- [Chrome extension](https://chromewebstore.google.com/detail/knbinffoidihjchpoahlnfpippkllcia)

## Filter

Rules say what to do with a post that matches.
The first rule that matches from the top decides, and each rule can be switched off without being deleted.

Conditions:

- **Text**: the post text, the quoted text, the user ID, the display name, the reposter’s user ID, the quoted user ID and display name, the reply-to user ID, a poll choice, the link domain, the card headline, the Space name, the article headline and intro, the language X read the post as (“ja”, “en”)
- **How to match**: Contains, Matches exactly, Regular expression, Is the author
- **What the post is**: Repost, Quote, Reply, With a Community Note, With a Community Note to rate, With a poll (open or finished), With a link card, With a Space, With an Article, Ad or promoted post, With a photo or video, Verified account, With a link in the text
- **Post age**: written as “older than 1 hour” (in minutes, hours or days). It is answered as the post is read, so only the old side is offered
- **How many**: the replies, reposts, likes and views, and the characters, hashtags and mentions in the text, written as “100 or more” or “5 or fewer”. A count X does not show matches no such condition
- **Negation**: the text and “what the post is” conditions can be inverted. The age and the counts have no inverted form — one names a side already, and the other has two

Actions:

- **Collapse**: folds the post into a single line (press “Show” to bring it back)
- **Hide**: removes the post entirely
- **Highlight**: tints the post’s background
- **Emphasize**: tints only the matched text
- **Do nothing**: stops every setting for that post, including those of wider scopes

## Appearance

Set per column on X Pro, and per view (home, notifications, bookmarks, a list, somebody’s profile, a search) on x.com.
The same items can also be set in any wider scope.

- **Column width** (X Pro only)
- **Pack the posts**: packs the padding, shrinks the avatar, and folds away the row of buttons
- **Post text size**
- **Post text line limit**: a post past the limit opens with “Show more”
- **Characters shown of a description or quote**: how much of a picture’s description, a quoted post or a card’s headline goes on screen (80 when unset)
- **Line breaks in the post text**: each is folded into a single space
- **Reply, repost, like and view counts**: X rounds the big ones off (“221.3K”); this shows the number itself. The counts X already writes out are left alone
- **Photos and videos**: as they are / as they are with a description / as their description / as a mark (📷 🎬) / not shown at all
- **Largest thumbnail height**
- **Link cards and articles**: as they are / as text (🔗 📄) / as a mark / not shown at all
- **Quoted posts**: the same four ways (as text it reads “💬 what the quote says (name @id)”)
- **Time display**: as it is / the date and time / both
- **Colors**: behind the column name, the timeline background, everything outside the timeline (x.com only), the compose form background, the column name, the author name, the post text, secondary text, links, and the line between posts
- **What highlights blend over**: the timeline background, or X’s own
- **When a highlight makes text unreadable**: whether the text color is fixed automatically

Anything left unset keeps the way the site itself shows it.
Where a post is open to be read, the packing, the line limit, the folding of line breaks and the hiding of cards and photos all stand down.

The compose form background is decided by the account the post will go out as and by the site.
Setting it per account tells you at a glance which account you are about to post as.

### Picture descriptions

- The description is shown on hover whatever the setting says, X Pro showing it nowhere itself
- A touch screen has no hover, so choose “as they are, with a description” to have it written out under the picture
- A post with several pictures gathers them into one caption, each line saying which picture it belongs to (“Picture 2:”)
- A quoted post’s pictures are left alone whichever way things are shown
- X’s own word for a picture nobody described (“Image”, and another for a video) is not passed on as a description. It is worked out from the pages you read, and can be corrected under “Other → Settings”

## What X slips in

Blocks X puts into a timeline that are not posts can be taken away.
One setting per site.

- **Accounts X suggests following**: the block goes in one piece, and so does the one X stacks in the rail on x.com
- **“Discover more” under a post**: the conversation itself stays

## Posting

Two things about the compose form for a new post (one setting for the whole of X Pro).
They are there for a run of posts sharing the same tags, and both start off.

- **Open the compose form again**: X Pro closes it on posting; this opens it again
- **Put the hashtags back**: the tags that were written go into the next compose form, with the caret waiting in front of them

Replies and quotes are left alone.

## Detailed search

A form for building an X search out of fields, so that the operators do not have to be remembered (**x.com only**).
Off until asked for.

It stands in the rail on the right, and where it goes depends on the page:

- **On a timeline**: under X’s own search box, which stays as it is
- **On a search’s results**: in place of X’s own search filters
- **On Explore**: at the head of the rail

Always on show are the tab to land on (top, latest, people, media or lists — it starts on latest) and five fields:

- All of these keywords (an operator written here reaches X as written)
- This keyword as a whole
- Any of these keywords
- None of these keywords
- These hashtags

The rest sit in groups that start folded:

- **Accounts**: from, replying to, or mentioning these accounts (each can be excluded instead)
- **When**: a date and a time. Leave a time empty and the day is taken whole
- **Filters**: whether it has a link, a photo, a video, or a verified author; whether it is a reply; the language; only accounts you follow; only near you
- **How much it got**: the least it must have in replies, likes and reposts

### Leaving posts out of the results

Four things X’s search cannot be asked for, done to the results after they arrive.
They sit inside “Filters”, and take effect on a search’s results.
They are not saved, but they are carried for as long as the tab is open.

- Reposts
- Posts with a hashtag
- Posts that matched the display name only
- Posts that matched the user ID only

The last two need to know what was searched for, and an account the query names outright is never left out.

### The form and X’s search box

- Opening a search’s results fills the form from the address, so a search reached from a trend or a hashtag can be narrowed down rather than retyped
- Typing in X’s box fills the form, on any page
- A group that has been filled stands open rather than folded
- The form fills X’s box on a search’s results only

An operator this extension does not offer still survives, and reaches X as it arrived.

## The page around the timeline

What x.com draws around the timeline can be taken away (one setting for the whole site).
A ticked box means the thing is on the page, and everything starts ticked.

- **Widen the timeline**: the whole rail goes, search box and all, and the timeline spreads as far as 1050px
- **What is in the rail**: The pitch for Premium, Today’s News, What’s happening, Relevant people, and Terms, privacy and the rest
- **The items down the left**: Explore, Follow, Chat, Grok, History (bookmarks, likes), Creator Studio, Articles, Premium, Profile, and the Post button
- **The items inside the “More” menu**: Lists, Communities, Community Notes, Business, Ads, Create your Space, Add muted word, and Settings and privacy
- **The compose form on the timeline**: the one at its head (the reply box stays)
- **The items in the bottom-right corner**: Grok and chat
- **Bring new posts in by itself**: presses X’s own button for new posts while you are at the top

Taking the rail away also takes the detailed search form with it.

## Opening the settings

Most editing happens inside the site itself.

| Where | Entry point | What it opens |
| --- | --- | --- |
| X Pro | A column’s options (the “…” in its header) | That column’s settings |
| X Pro | The bottom-left menu | The global settings |
| x.com | The “More” menu in the side navigation | The settings for the view you are on |

A whole site’s own settings (“What X slips in”, and on x.com the page around the timeline) are at the head of that site’s list.

## Development

```
npm install
npm run build
```

[BUILDING.md](BUILDING.md) has the full steps.

## Privacy

The extension sends nothing anywhere, and keeps your settings on your own device ([PRIVACY.md](PRIVACY.md)).

## License

Apache License 2.0 ([LICENSE](LICENSE)).
