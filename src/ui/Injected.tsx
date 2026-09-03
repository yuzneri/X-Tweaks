/**
 * What X slips into a timeline that is not a post.
 *
 * One answer for a whole site, like the compose form's settings and unlike the filter and
 * the appearance: nothing is inherited and nothing is shown dimmed. Both sites offer the
 * same two, so the same component stands under either site's whole-site page.
 *
 * A named box. It shares its tab with what x.com puts at the head of the timeline
 * (`XTimeline`), and a box is what says where one set ends and the next begins. On X Pro's
 * page it is alone in the tab, but the box stays: the same panel reading two ways
 * depending on the site would be worse than one box too many.
 */
import type { InjectedSettings } from '../settings/schema.ts';
import { ShownSwitch } from './fields.tsx';
import { useMessages } from './messages.tsx';

const WHO_NOTE = 'xpro-injected-who-note';
const DISCOVER_NOTE = 'xpro-injected-discover-note';

type Props = {
  injected: InjectedSettings;
  onChange: (injected: InjectedSettings) => void;
};

export const Injected = ({ injected, onChange }: Props) => {
  const m = useMessages();
  const patch = (part: Partial<InjectedSettings>) => onChange({ ...injected, ...part });

  return (
    <fieldset>
      <legend>{m.injected.label}</legend>
      <p class="hint">{m.injected.hint}</p>

      <ShownSwitch
        label={m.injected.whoToFollow.label}
        shown={injected.whoToFollow}
        describedBy={WHO_NOTE}
        onShown={(shown) => patch({ whoToFollow: shown })}
      />
      <p class="hint indent" id={WHO_NOTE}>
        {m.injected.whoToFollow.note}
      </p>

      <ShownSwitch
        label={m.injected.discoverMore.label}
        shown={injected.discoverMore}
        describedBy={DISCOVER_NOTE}
        onShown={(shown) => patch({ discoverMore: shown })}
      />
      <p class="hint indent" id={DISCOVER_NOTE}>
        {m.injected.discoverMore.note}
      </p>
    </fieldset>
  );
};
