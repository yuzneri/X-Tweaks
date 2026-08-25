/**
 * Assembles dist/.
 *
 * Each entry gets its own independent bundle. main-world in particular is kept a standalone
 * bundle, on the premise that it imports no other module.
 *
 * Nothing is minified. Keeping dist/ readable as it is leaves no room for it to be taken as
 * obfuscation in a store review, and makes it simpler to explain.
 */
import * as esbuild from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { watch as watchDir } from 'node:fs';

const watch = process.argv.includes('--watch');
// Source maps are emitted in development only. In a distributed build the only person
// debugging is the author, and with dist/ committed they would waste diff and size
const dev = watch || process.argv.includes('--dev');

const OUT = 'dist';

/**
 * Leaves nothing from the previous build.
 * Prevents old files from lingering in dist/ and being committed as they are when entries are
 * added or removed or source maps are switched. It is recreated, so copyStatic below does not hit ENOENT.
 */
const resetOutDir = async () => {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
};

// The settings page's HTML and CSS are placed as they are, untransformed
const STATIC = ['options.html', 'options.css', 'popup.html', 'popup.css'];
/** The components' CSS lives elsewhere in the source (the in-page panel takes it in as a string) */
const STATIC_UI = ['panel.css'];
const copyStatic = () =>
  Promise.all([
    ...STATIC.map((f) => copyFile(`src/${f}`, `${OUT}/${f}`)),
    ...STATIC_UI.map((f) => copyFile(`src/ui/${f}`, `${OUT}/${f}`)),
  ]);

const options = {
  entryPoints: ['src/main-world.ts', 'src/content.ts', 'src/options.tsx', 'src/popup.tsx'],
  outdir: OUT,
  bundle: true,
  // A content script cannot load ES modules, so every entry is wrapped in an IIFE
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  // Kept in step with minimum_chrome_version / strict_min_version in manifest.json
  target: ['chrome111', 'firefox140'],
  // By default non-ASCII is \u-escaped, making Japanese logs and messages unreadable.
  // In line with keeping dist/ readable (see the top of this file), it is emitted as UTF-8
  charset: 'utf8',
  // The injected styles are written as CSS and taken in as a string
  loader: { '.css': 'text' },
  sourcemap: dev ? 'linked' : false,
  logLevel: 'info',
};

await resetOutDir();

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  await copyStatic();
  // esbuild only watches the JavaScript dependency graph, so static files are watched here
  const watched = [...STATIC, ...STATIC_UI];
  watchDir('src', { recursive: true }, (_event, filename) => {
    // filename is relative to src, so the directory is dropped before comparing
    const name = filename?.split(/[\\/]/).pop();
    if (name && watched.includes(name)) copyStatic().then(() => console.log(`copied ${name}`));
  });
  console.log('watching...');
} else {
  await esbuild.build(options);
  await copyStatic();
}
