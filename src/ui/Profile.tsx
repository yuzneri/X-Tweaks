/**
 * What a profile on x.com shows when it is opened.
 *
 * One answer for the whole site, like the furniture beside it: nothing is inherited and
 * nothing is shown dimmed. Selects rather than `ChoiceSelect`: there is no "not set" to fall
 * back to, each always holds a value, and X's own default is simply one of the options.
 */
import {
  PROFILE_MEDIA_KINDS,
  PROFILE_POSTS_KINDS,
  PROFILE_SORTS,
  type ProfileSettings,
} from '../settings/schema.ts';
import { useMessages } from './messages.tsx';

const NOTE = 'xpro-profile-note';

type Props = {
  profile: ProfileSettings;
  onChange: (profile: ProfileSettings) => void;
};

type RowProps<K extends keyof ProfileSettings> = Props & {
  item: K;
  options: readonly ProfileSettings[K][];
};

const Row = <K extends keyof ProfileSettings>({ profile, onChange, item, options }: RowProps<K>) => {
  const m = useMessages();
  const labels = m.profile[item].options as Record<ProfileSettings[K], string>;
  return (
    <label class="row">
      <span>{m.profile[item].label}</span>
      <select
        value={profile[item]}
        aria-describedby={NOTE}
        onChange={(e) =>
          onChange({ ...profile, [item]: e.currentTarget.value as ProfileSettings[K] })
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
};

export const Profile = ({ profile, onChange }: Props) => {
  const m = useMessages();
  return (
    <fieldset>
      <legend>{m.profile.label}</legend>
      <Row profile={profile} onChange={onChange} item="posts" options={PROFILE_POSTS_KINDS} />
      <Row profile={profile} onChange={onChange} item="sort" options={PROFILE_SORTS} />
      <Row profile={profile} onChange={onChange} item="media" options={PROFILE_MEDIA_KINDS} />
      <p class="hint" id={NOTE}>
        {m.profile.note}
      </p>
    </fieldset>
  );
};
