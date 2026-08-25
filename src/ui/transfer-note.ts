/**
 * Decides which notice the import/export screen shows. Looking the wording up is `Transfer.tsx`'s job.
 * `node --test` cannot handle `.tsx`, so the decision lives here.
 */

/** What happened on the import/export screen, as far as the notice is concerned */
export type TransferOutcome = {
  /** The import refusal, already a sentence (how the reason is built lives in `Transfer.tsx`) */
  error: string | null;
  copied: 'done' | 'failed' | null;
  loaded: boolean;
  forgotten: 'done' | 'failed' | null;
};

/** The notice to show. `error` is the sentence itself; the rest are keys into the dictionary */
export type TransferNote =
  | { kind: 'error'; text: string }
  | { kind: 'copyFailed' | 'forgetFailed' | 'copied' | 'loaded' | 'forgotten' }
  | null;

/**
 * Only one notice is shown. A success notice can outlive a later failed action, so failures
 * are looked at before successes. An import refusal is the result of the very action pressed, so it comes first.
 */
export const noteOf = (outcome: TransferOutcome): TransferNote => {
  if (outcome.error !== null) return { kind: 'error', text: outcome.error };
  if (outcome.copied === 'failed') return { kind: 'copyFailed' };
  if (outcome.forgotten === 'failed') return { kind: 'forgetFailed' };
  if (outcome.copied === 'done') return { kind: 'copied' };
  if (outcome.loaded) return { kind: 'loaded' };
  if (outcome.forgotten === 'done') return { kind: 'forgotten' };
  return null;
};
