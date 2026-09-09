/**
 * Telling, from the address of a request the page made, whether a post was sent. The
 * extension cannot ask X, and the compose form carries no marker saying so; what it can
 * see is the page's own resource timing, where the GraphQL call that creates a post shows
 * up by name.
 */

/**
 * The GraphQL operations that create a post. `CreateNoteTweet` is the long-form post
 * (Premium), the same event as far as this extension is concerned, so both count. The
 * names are matched in full: `CreateTweet` as a prefix would also catch operations that
 * merely start with it, and being wrong means acting on something that was not a post.
 */
const POST_OPERATIONS = new Set(['CreateTweet', 'CreateNoteTweet']);

/** The part of the path that says this is a GraphQL call rather than anything else X fetches */
const GRAPHQL = '/graphql/';

/**
 * Whether that address is a post being sent. The operation sits at the end of the path,
 * behind an id that changes whenever X deploys, so the id is not looked at
 * (`…/graphql/WXTdKnLddrQOunD6MhWi3g/CreateTweet`). An address that cannot be parsed is
 * not a post: resource timing hands over absolute URLs, so anything else means the
 * assumption behind this check is off.
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
