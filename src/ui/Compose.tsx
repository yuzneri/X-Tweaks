/**
 * What the compose form does after a post. Unlike the filter and the appearance, these
 * are not per tier: there is one answer for the whole extension, so no value is inherited
 * and nothing is shown dimmed.
 */
import type { ComposeSettings } from '../settings/schema.ts';
import { useMessages } from './messages.tsx';

/*
 * The notes are tied to the boxes they describe. The second switch is disabled while the
 * first is off, and the reason lives in its note — without the tie, a screen reader says
 * only that it cannot be used.
 */
const KEEP_OPEN_NOTE = 'xpro-compose-keep-open-note';
const KEEP_HASHTAGS_NOTE = 'xpro-compose-keep-hashtags-note';

type Props = {
  compose: ComposeSettings;
  onChange: (compose: ComposeSettings) => void;
};

export const Compose = ({ compose, onChange }: Props) => {
  const m = useMessages();
  const patch = (part: Partial<ComposeSettings>) => onChange({ ...compose, ...part });

  return (
    <>
      <p class="hint">{m.compose.hint}</p>

      {/*
        A plain checkbox, not the three-way select the tiers use. With no tier above,
        "unset" and "off" would be the same answer written twice
      */}
      <label class="row switch">
        <input
          type="checkbox"
          checked={compose.keepOpen}
          aria-describedby={KEEP_OPEN_NOTE}
          onChange={(event) => patch({ keepOpen: event.currentTarget.checked })}
        />
        <span>{m.compose.keepOpen.label}</span>
      </label>
      <p class="hint indent" id={KEEP_OPEN_NOTE}>
        {m.compose.keepOpen.note}
      </p>

      {/*
        Nested under the switch above, which is the one it depends on: with the form
        closed there is nowhere to put the tags. Rather than let it be switched on to no
        effect, it is disabled and says why
      */}
      <label class="row switch indent">
        <input
          type="checkbox"
          checked={compose.keepHashtags}
          disabled={!compose.keepOpen}
          aria-describedby={KEEP_HASHTAGS_NOTE}
          onChange={(event) => patch({ keepHashtags: event.currentTarget.checked })}
        />
        <span>{m.compose.keepHashtags.label}</span>
      </label>
      <p class="hint indent" id={KEEP_HASHTAGS_NOTE}>
        {compose.keepOpen ? m.compose.keepHashtags.note : m.compose.needsKeepOpen}
      </p>
    </>
  );
};
