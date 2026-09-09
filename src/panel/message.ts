/**
 * An instruction from the popup to the content script. Settings travel through storage,
 * but "open the panel in the tab I am looking at" is tab-specific and cannot go there.
 */
export const OPEN_PANEL = 'xpro-tweaks:open-panel';
