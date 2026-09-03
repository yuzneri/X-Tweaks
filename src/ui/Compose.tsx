/**
 * What the compose form does after a post. Unlike the filter and the appearance, these
 * are not per tier: there is one answer for the whole extension, so no value is inherited
 * and nothing is shown dimmed.
 *
 * No box of its own: these have a tab to themselves, and the tab's name is the heading.
 * Boxed as well, the same words would stand twice on the same screen. The one page that
 * does keep boxes is x.com's furniture, which has several groups inside one tab and needs
 * to say where each of them ends.
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
      {/*
        A plain checkbox, not the three-way select the tiers use. With no tier above,
        "unset" and "off" would be the same answer written twice
      */}
      <label class="row switch">
        <input
          type="checkbox"
          checked={compose.reopen}
          aria-describedby={KEEP_OPEN_NOTE}
          onChange={(event) => patch({ reopen: event.currentTarget.checked })}
        />
        <span>{m.compose.reopen.label}</span>
      </label>
      <p class="hint indent" id={KEEP_OPEN_NOTE}>
        {m.compose.reopen.note}
      </p>

      {/*
        Independent of the switch above. Where the form is opened again the tags go straight back
        in; with it left to close they wait for the next form opened by hand
      */}
      <label class="row switch">
        <input
          type="checkbox"
          checked={compose.keepHashtags}
          aria-describedby={KEEP_HASHTAGS_NOTE}
          onChange={(event) => patch({ keepHashtags: event.currentTarget.checked })}
        />
        <span>{m.compose.keepHashtags.label}</span>
      </label>
      <p class="hint indent" id={KEEP_HASHTAGS_NOTE}>
        {m.compose.keepHashtags.note}
      </p>
    </>
  );
};
