/**
 * icons/icon.svg から PNG を焼く。
 *
 * この環境には ImageMagick も rsvg も無いので、Chrome の
 * `--screenshot` で描かせる。SVG が原本で、PNG は生成物。
 *
 * 使い方: node render-icons.mjs [chrome の実行パス]
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

/** 1枚焼く。`art` は canvas の中で図案が占める大きさ（余白を付けたいときに縮める） */
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
      // 角の外を透過させる。既定は白で塗られる
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

// ストア用だけは 128 の中に 96 で置く。Chrome ウェブストアが求める余白
render('store-icon-128', 128, 96);

rmSync(work, { recursive: true, force: true });
