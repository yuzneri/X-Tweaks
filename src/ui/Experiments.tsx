/**
 * What is tried out on the page beyond what it draws. One answer for the whole extension,
 * like the compose form's settings, so nothing is inherited or shown dimmed. An entry of
 * its own under "More", named as experiments: each depends on X's internals and stops
 * working when they change, which the reader is told before any switch. No box, for the
 * reason Compose.tsx gives: the entry's name is the heading already.
 */
import type { ExperimentsSettings } from '../settings/schema.ts';
import { useMessages } from './messages.tsx';

/* The note is tied to the switch it describes, as in Compose.tsx, so a screen reader says what the switch entails */
const PRO_LOOP_GUARD_NOTE = 'xpro-experiments-pro-loop-guard-note';

type Props = {
  experiments: ExperimentsSettings;
  onChange: (experiments: ExperimentsSettings) => void;
};

export const Experiments = ({ experiments, onChange }: Props) => {
  const m = useMessages();
  return (
    <>
      <p class="hint">{m.experiments.note}</p>
      <label class="row switch">
        <input
          type="checkbox"
          checked={experiments.proLoopGuard}
          aria-describedby={PRO_LOOP_GUARD_NOTE}
          onChange={(event) => onChange({ ...experiments, proLoopGuard: event.currentTarget.checked })}
        />
        <span>{m.experiments.proLoopGuard.label}</span>
      </label>
      <p class="hint indent" id={PRO_LOOP_GUARD_NOTE}>
        {m.experiments.proLoopGuard.note}
      </p>
    </>
  );
};
