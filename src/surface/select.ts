/**
 * Which surface a page is. Decided from the host and never revisited: pro.x.com and
 * x.com are separate origins, so no navigation turns one into the other.
 */
import { proSurface } from './pro.ts';
import { xSurface } from './x.ts';
import type { Surface } from './index.ts';

export const PRO_HOST = 'pro.x.com';
export const X_HOST = 'x.com';

/**
 * null for a host that is neither. The content script is only registered for those two, so
 * it should not come up — but a surface guessed for an unknown host would resolve scopes
 * against a page nobody has looked at, and doing nothing is safer.
 */
export const surfaceFor = (hostname: string): Surface | null => {
  if (hostname === PRO_HOST) return proSurface;
  if (hostname === X_HOST) return xSurface;
  return null;
};
