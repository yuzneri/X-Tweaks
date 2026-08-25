# X Pro Tweaks

[日本語](README.ja.md)

A browser extension that hides unwanted posts from the X Pro (pro.x.com, formerly TweetDeck) timeline and changes how it looks.
Settings can be placed in three scopes: global, account and column.

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

The following can be changed per column:

- **Column width**
- **Post text size**
- **Post text line limit**: a post past the limit opens with “Show more”
- **Largest thumbnail height**
- **Photos and videos**: they can be taken out of the timeline
- **Time display**: as X shows it, the date and time, or both
- **Colors**: eight places can be colored
  - Behind the column name
  - Column background
  - Column name
  - Author name
  - Post text
  - Secondary text (times, counts, reply-to)
  - Links and “Show more”
  - Line between posts
- **What highlights blend over**: the column background, or X’s background with the column color ignored
- **When a highlight makes text unreadable**: whether the text color is fixed automatically

Anything left unset keeps the way X Pro shows it.

## Posting

Two things about the compose form for a new post can be changed. They are one setting for the whole extension, not held per column or per account.

- **Keep the compose form open**: X Pro closes it on posting; this opens it again, ready to type the next post into
- **Put the hashtags back**: the tags that were written go back into the emptied box, with the caret waiting in front of them. Only while the form is kept open

They are there for a run of posts sharing the same tags.
Both start off, and left off X Pro behaves as it always has.

Replies and quotes are left alone, and a post that fails to go out changes nothing.

## Opening the settings

Most editing happens inside pro.x.com.

| Entry point | What it opens |
| --- | --- |
| A column’s options (the “…” in its header) | That column’s settings |
| X Pro’s bottom-left menu | The global settings |

## Development
```
npm install
npm run build
```

## Privacy

The extension sends nothing anywhere, and keeps your settings on your own device ([PRIVACY.md](PRIVACY.md)).

## License

Apache License 2.0 ([LICENSE](LICENSE)).
