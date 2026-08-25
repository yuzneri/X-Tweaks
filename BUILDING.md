# Building this add-on

This file is for Firefox add-on reviewers.
The submitted package contains generated files, so this explains how to reproduce them from the source.

## What is generated

The package holds `manifest.json` and `dist/` only.
Everything in `dist/` is produced from `src/` by `build.mjs`:

- `dist/main-world.js`, `dist/content.js`, `dist/options.js`, `dist/popup.js` are bundled from the TypeScript sources by esbuild, one bundle per entry point.
- `dist/options.html`, `dist/options.css`, `dist/popup.html`, `dist/popup.css`, `dist/panel.css` are copied verbatim from `src/`.

`icons/*.png` are rasterized from `icons/icon.svg`, which is the source of truth for them.
`npm run icons` regenerates them; it drives headless Chrome, because this project pulls in no image library.

`store/` holds the listing images for the Chrome Web Store, drawn by `npm run store` from the built options page.
They are not part of the add-on package and are in the source package only because they live in the repository.

Nothing is minified or obfuscated.
The bundles are readable, and `charset: 'utf8'` keeps non-ASCII text as it is rather than escaping it.

## Environment

Verified on Linux with:

- **Node.js 24.19.0** (https://nodejs.org/)
- **npm 11.17.0** (bundled with Node.js)

No other tool has to be installed.
The build itself is platform independent; it runs `node build.mjs` and nothing else.

The versions of every build dependency are pinned by `package-lock.json`.
The one that produces the output is **esbuild 0.28.2**.
TypeScript 7.0.2 is used for type checking only and emits nothing.

## Commands

```
npm ci
npm run build
```

`npm ci` installs exactly what `package-lock.json` pins.
It needs network access; the build step afterwards does not.

esbuild runs a postinstall script (`node install.js`) that puts its platform binary in place.
If your npm setup blocks install scripts, allow it for `esbuild`, or the build cannot run.

The output goes to `dist/`.

## Verifying against the submitted package

```
npm ci
npm run build
```

Then compare the resulting `dist/` with the `dist/` inside the submitted package.
They are byte identical.

The same check on this source tree:

```
$ diff -r dist/ <the dist/ extracted from the package>
（no output）
```

## Other commands

```
npm run check       # type check, unit tests and build
npm run lint:ext    # web-ext lint
npm run package     # check, then build the package into web-ext-artifacts/
```

`npm run check` runs the unit tests with `node --test`, which executes the `.ts` files directly.
That step needs a Node.js version with TypeScript type stripping enabled by default (24.19.0 has it).
Reviewers do not need to run it; `npm run build` alone reproduces the package.
