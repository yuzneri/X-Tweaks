/**
 * Setting up the color picker (Coloris). A bare `<input type="color">` cannot handle opacity
 * (neither Chrome nor Firefox supports the alpha attribute) and its look is left to the OS, so it is not used.
 */
import Coloris from '@melloware/coloris';
import type { Messages } from '../i18n/index.ts';
import colorisCss from '@melloware/coloris/dist/coloris.css';
import { PALETTES, type PaletteKind } from './palettes.ts';

const STYLE_ID = 'xpro-coloris-style';

/**
 * The input fields the picker attaches to. A selector string makes it delegate events on document,
 * so fields appearing later are covered and no reattaching is needed on a Preact re-render.
 */
const FIELD_SELECTOR = '.colorcode';

/** The accessible-name strings passed to Coloris. Only `marker` follows Coloris's own form, where it substitutes `{s}` and `{v}` */
const a11yOf = ({ color: { picker } }: Messages) => ({
  open: picker.open,
  close: picker.closeLabel,
  clear: picker.clearLabel,
  marker: picker.marker('{s}', '{v}'),
  hueSlider: picker.hue,
  alphaSlider: picker.alpha,
  input: picker.input,
  format: picker.format,
  swatch: picker.swatch,
  instruction: picker.instruction,
});

let ready = false;

/**
 * Closes an open picker. It sits directly under `body`, so folding the in-page panel leaves it
 * stranded on the page. The chosen color is kept (`revert` is not passed), as when closing it by
 * clicking elsewhere.
 */
export const closeColorPicker = (): void => {
  if (ready) Coloris.close();
};

/**
 * Hands each kind of field its own swatches. Coloris has one picker for the whole document, so what
 * differs per field is registered as a "virtual instance" against the class the field carries
 * (`ui/fields.tsx` writes it). Registered once, after `init`: the sets change with neither the
 * language nor what is on screen.
 */
const setSwatches = (): void => {
  for (const [kind, swatches] of Object.entries(PALETTES) as [PaletteKind, string[]][]) {
    Coloris.setInstance(`.colorcode-${kind}`, { swatches });
  }
};

/**
 * Sets the picker up and applies the wording. It may be called on every language change: the
 * construction happens once, and after that only the wording is reapplied. The wording cannot be
 * passed before `Coloris.init()` because `configure` touches the constructed elements (passing it
 * earlier throws a `TypeError`).
 */
export const setupColorPicker = (messages: Messages): void => {
  const picker = messages.color.picker;
  if (ready) {
    // From the second call on, only the wording is reapplied. `el` is required by the types, but a
    // selector must not be passed: Coloris reattaches its delegation on document every time it
    // receives `el`, doubling the listening, and without `wrap` alongside it the default of true
    // would wrap the input in a div, rewriting DOM that Preact manages from the outside. An empty
    // array makes both no-ops.
    Coloris({
      el: [],
      clearLabel: picker.clear,
      closeLabel: picker.close,
      a11y: a11yOf(messages),
    });
    return;
  }
  ready = true;

  // Coloris starts from black when opened on an empty box, but an empty box means "use that kind's
  // default color", which reads better. Coloris opens on document's bubbling phase, so the value is
  // put in first, on the capture phase.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.classList.contains('colorcode') || target.value) return;
      const fallback = target.dataset.fallback;
      if (fallback) target.value = fallback;
    },
    true
  );

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = colorisCss;
    document.head.append(style);
  }

  Coloris.init();
  Coloris({
    el: FIELD_SELECTOR,
    // Stops the default of wrapping the input in a div: DOM that Preact manages, rewritten from
    // the outside, would disagree with its re-renders
    wrap: false,
    alpha: true,
    format: 'hex',
    // The settings screen follows the OS color scheme, so the picker follows it too
    themeMode: 'auto',
    // Every field carries a kind, so this is only what a field with none would get
    swatches: PALETTES.tint,
    // Coloris's own wording is English, so it is brought into line with the rest of the screen
    clearLabel: picker.clear,
    closeLabel: picker.close,
    a11y: a11yOf(messages),
  });
  setSwatches();
};
