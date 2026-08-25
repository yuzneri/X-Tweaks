/**
 * Settings for web-ext (Mozilla's own tool).
 * Both `npm run lint:ext` and `npm run package` read this, so the exclusions live in one place.
 *
 * The browser needs manifest.json and dist/ only.
 * The sources are the input to the build rather than something to ship, so they stay out of the
 * add-on package (the full sources go to AMO separately; see BUILDING.md).
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
    'render-icons.mjs',
    'web-ext-config.mjs',
    '.gitignore',
    // The browser reads the PNGs only. The SVG they come from, and the one image for the store
    // listing, are not part of what is shipped.
    'icons/icon.svg',
    'icons/store-icon-128.png',
  ],
  build: {
    overwriteDest: true,
  },
};
