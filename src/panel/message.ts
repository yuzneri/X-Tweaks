/**
 * An instruction from the popup to the content script. Settings propagate through
 * storage, but "open the panel in the tab I am looking at" is tab-specific and cannot
 * be expressed there.
 */
export const OPEN_PANEL = 'xpro-tweaks:open-panel';
