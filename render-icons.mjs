/**
 * Rasterizes icons/icon.svg into PNGs.
 *
 * Neither ImageMagick nor rsvg is around here, so Chrome draws them through `--screenshot`.
 * The SVG is the source of truth; the PNGs are generated from it.
 *
 * Usage: node render-icons.mjs [path to chrome]
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SIZES = [16, 32, 48, 96, 128];
const CHROME = process.argv[2] ?? 'google-chrome';

const svg = join(ROOT, 'icons', 'icon.svg');
const work = mkdtempSync(join(tmpdir(), 'xpro-icons-'));
copyFileSync(svg, join(work, 'icon.svg'));

/** Draws one. `art` is how much of the canvas the artwork takes; shrink it to leave a margin. */
const render = (name, canvas, art) => {
  const pad = (canvas - art) / 2;
  writeFileSync(
    join(work, `${name}.html`),
    `<!doctype html><html><body style="margin:0">` +
      `<img src="icon.svg" width="${art}" height="${art}" ` +
      `style="display:block;margin:${pad}px"></body></html>`
  );
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      // Keeps the area outside the rounded corners transparent; it is painted white by default
      '--default-background-color=00000000',
      `--window-size=${canvas},${canvas}`,
      `--screenshot=${join(work, `${name}.png`)}`,
      join(work, `${name}.html`),
    ],
    { stdio: 'ignore' }
  );
  copyFileSync(join(work, `${name}.png`), join(ROOT, 'icons', `${name}.png`));
  console.log(`icons/${name}.png`);
};

for (const size of SIZES) render(`icon-${size}`, size, size);

// The store one alone is 96 inside 128: the margin the Chrome Web Store asks for
render('store-icon-128', 128, 96);

rmSync(work, { recursive: true, force: true });
