/**
 * web-ext（Mozilla 公式ツール）の設定。
 * `npm run lint:ext` と `npm run package` の両方がここを読むので、
 * 除外の指定を1か所に持てる。
 *
 * ブラウザに要るのは manifest.json と dist/ だけ。
 * ソースはビルドの入力であって配布物ではないので、拡張の zip には入れない
 * （AMO へは別途ソース一式を提出する。手順は BUILDING.md）。
 */
export default {
  ignoreFiles: [
    'src',
    'src/**',
    'test',
    'test/**',
    'node_modules',
    'node_modules/**',
    '*.md',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'build.mjs',
    'web-ext-config.mjs',
    '.gitignore',
  ],
  build: {
    overwriteDest: true,
  },
};
