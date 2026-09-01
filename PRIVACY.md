# Privacy policy

[日本語](PRIVACY.ja.md)

X Tweaks sends nothing anywhere.
It makes no network requests of its own, and it contains no analytics, no telemetry and no remotely hosted code.

Last updated: 2026-09-01.

## What is stored

Two things, both on your own device:

- **The settings you enter**: filter rules, the colours, widths and sizes you pick, and which scope each of them belongs to.
- **The columns it sees on the page**: the names of your decks, the titles of your columns and the account each column belongs to. The settings screen needs them to list your columns so that you can set rules per column.

Both are kept in the extension's local storage (`storage.local`), which lives in your browser profile on your computer.
Nothing is put in synced storage, so nothing travels to another device or to a browser account.

## What is not stored

The extension reads the posts on the page to decide whether a rule matches, but it never keeps them.
The text of a post exists only for as long as the decision takes.

## What is shared

Nothing.
No data is sent to the author of this extension, and none is sent to any third party.

## Permissions

- **`storage`**: to keep the settings above.
- **`activeTab`**: the toolbar button opens the settings panel inside the X Pro or x.com tab you are looking at. This grants access to that one tab, and only after you click the button.
- **Access to `https://pro.x.com/*` and `https://x.com/*`**: the extension works on X Pro and on x.com, so it runs only there. It has no access to any other site.

## Removing your data

Uninstalling the extension deletes everything it stored.
Before that, the settings screen can export the settings to a file and import them back, so you can keep or move them yourself.

## Questions

Open an issue at https://github.com/yuzneri/X-Tweaks/issues.
