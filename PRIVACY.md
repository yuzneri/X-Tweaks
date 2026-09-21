# Privacy policy

[日本語](PRIVACY.ja.md)

X Tweaks sends no analytics or usage data to its author or to third parties, and contains no remotely hosted code.
Only when marking X Pro notifications as read, it sends the read cursor from notifications fetched by X Pro back to X's API.

Last updated: 2026-09-21.

## What is stored

Two things, both on your own device:

- **The settings you enter**: filter rules, the colours, widths and sizes you pick, and which scope each of them belongs to.
- **The columns it sees on the page**: the names of your decks, the titles of your columns and the account each column belongs to. The settings screen needs them to list your columns so that you can set rules per column.

Both are kept in the extension's local storage (`storage.local`), which lives in your browser profile on your computer.
Nothing is put in synced storage, so nothing travels to another device or to a browser account.

## What is not stored

The extension reads the posts on the page to decide whether a rule matches, but it never keeps them.
The text of a post exists only for as long as the decision takes.

Notification read cursors and the authentication context needed to communicate with X are not persisted.
They are held only in the open page's memory and are lost when the page is closed or reloaded.

## What is shared

No analytics, usage data, settings or post contents are sent to the author of this extension or to any third party.

When the experimental notification-read feature is enabled, clicking a notification or actually scrolling an X Pro “All notifications” column sends its read cursor to X's API so that the notifications fetched so far can be marked as read. X is the only recipient. The feature is off by default, and merely fetching notifications sends nothing on the extension's behalf.

## Permissions

- **`storage`**: to keep the settings above.
- **`activeTab`**: the toolbar button opens the settings panel inside the X Pro or x.com tab you are looking at. This grants access to that one tab, and only after you click the button.
- **Access to `https://pro.x.com/*` and `https://x.com/*`**: the extension works on X Pro and on x.com, so it runs only there. It has no access to any other site.

## Removing your data

Uninstalling the extension deletes everything it stored.
Before that, the settings screen can export the settings to a file and import them back, so you can keep or move them yourself.

## Questions

Open an issue at https://github.com/yuzneri/X-Tweaks/issues.
