/**
 * The script running in x.com's own world (the MAIN world). X Pro's (`main-world.ts`) reads
 * columns out of React and guards a store x.com does not have, so x.com gets this instead,
 * and it does one thing: open profiles on the chosen defaults (`profile/main.ts`).
 */
import { installProfileDefaults, PROFILE_DEFAULTS } from './profile/main.ts';
import {
  PROFILE_MEDIA_KINDS,
  PROFILE_POSTS_KINDS,
  PROFILE_SORTS,
  type ProfileSettings,
} from './settings/schema.ts';

const defaults = installProfileDefaults(window);

const isOneOf = <T extends string>(options: readonly T[], v: unknown): v is T =>
  options.includes(v as T);

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  // Only the extension's side of this same page can send it; anything else is ignored
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data as { type?: unknown; profile?: Partial<Record<keyof ProfileSettings, unknown>> } | null;
  if (data?.type !== PROFILE_DEFAULTS) return;
  const { posts, sort, media } = data.profile ?? {};
  if (
    isOneOf(PROFILE_POSTS_KINDS, posts) &&
    isOneOf(PROFILE_SORTS, sort) &&
    isOneOf(PROFILE_MEDIA_KINDS, media)
  ) {
    defaults.setProfile({ posts, sort, media });
  }
});
