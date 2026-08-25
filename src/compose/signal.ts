/**
 * Telling, from the address of a request the page made, whether a post was sent.
 *
 * The extension has no way to ask X whether a post went through, and the compose form
 * carries no marker saying so. What it can see is the page's own resource timing, where
 * the GraphQL call that creates a post shows up by name.
 */

/**
 * The GraphQL operations that create a post.
 * `CreateNoteTweet` is the long-form post (Premium); it is the same event as far as this
 * extension is concerned, so both count.
 *
 * The names are matched in full rather than by prefix. `CreateTweet` as a prefix would
 * also catch operations that merely start with it, and being wrong here means acting on
 * something that was not a post at all.
 */
const POST_OPERATIONS = new Set(['CreateTweet', 'CreateNoteTweet']);

/** The part of the path that says this is a GraphQL call rather than anything else X fetches */
const GRAPHQL = '/graphql/';

/**
 * Whether that address is a post being sent.
 *
 * The operation sits at the end of the path, behind an id that changes whenever X
 * deploys (`…/graphql/WXTdKnLddrQOunD6MhWi3g/CreateTweet`), so the id is not looked at.
 * An address that cannot be parsed is not a post: resource timing hands over absolute
 * URLs, and something else arriving means the assumption behind this whole check is off.
 */
export const createsPost = (url: string): boolean => {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return false;
  }
  if (!path.includes(GRAPHQL)) return false;

  const operation = path.slice(path.lastIndexOf('/') + 1);
  return POST_OPERATIONS.has(operation);
};
