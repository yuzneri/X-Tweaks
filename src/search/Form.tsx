/**
 * The detailed search form, as it stands in x.com's rail.
 *
 * Drawn with Preact rather than assembled by hand the way `compose/switches.ts` is. That
 * one has two checkboxes; this has twenty-odd fields whose values have to be read back
 * together, and hand-built DOM at that size turns into a second, worse framework.
 *
 * The values live outside the component (`state.ts`). x.com redraws its rail as the reader
 * moves about, and a query half typed should survive that.
 */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Messages } from '../i18n/index.ts';
import { LANGUAGE_CODES } from './languages.ts';
import type { AccountField, FilterChoice, ResultTab, SearchForm, SearchScopes } from './query.ts';
import { currentForm, currentScopes, updateForm, updateScopes } from './state.ts';

type Props = { messages: Messages };

/** The tabs offered, in the order X shows them. `top` is the one X lands on unasked */
const TABS: ResultTab[] = ['top', 'live', 'user', 'media', 'list'];

const FILTER_CHOICES: FilterChoice[] = ['any', 'include', 'exclude'];

/** One line of the form: a label above the box it names */
const Field = ({
  label,
  value,
  onInput,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
}) => (
  <label class="xpro-search-field">
    <span class="xpro-search-label">{label}</span>
    <input
      type="text"
      class="xpro-search-input"
      value={value}
      onInput={(event) => onInput(event.currentTarget.value)}
    />
  </label>
);

/**
 * A group that starts folded.
 *
 * Folded by default because the rail is 350px wide and the whole form open runs past the
 * height of a window. The five word fields are what a search usually needs; these are what
 * it sometimes needs.
 *
 * Built on `<details>` rather than a button and a hidden div: the browser gives the
 * opening, the keyboard handling and the "this is collapsed" announcement for nothing, and
 * the state lives in the element, so it survives the form being moved between views.
 */
const Group = ({ label, children }: { label: string; children: ComponentChildren }) => (
  <details class="xpro-search-group">
    <summary class="xpro-search-summary">{label}</summary>
    <div class="xpro-search-group-body">{children}</div>
  </details>
);

/**
 * One account field: the names, and whether they are being excluded rather than asked for.
 *
 * Hands back only the part that changed, never a whole `AccountField` built from the prop.
 * The prop holds the values as they stood when this render was made, so a component
 * building `{ ...field, exclude }` would carry the names back to what they were — typing a
 * name and then ticking the box would lose the name. Merging is the caller's, against the
 * values as they stand now.
 */
const Accounts = ({
  label,
  excludeLabel,
  field,
  onChange,
}: {
  label: string;
  excludeLabel: string;
  field: AccountField;
  onChange: (part: Partial<AccountField>) => void;
}) => (
  <div class="xpro-search-field">
    {/*
      The box is wrapped in its label rather than pointed at by an id, the way every other
      field here is. An id built from the label would be built from a translated string —
      it changes with the language, carries whatever spaces that language puts in it, and
      leans on no two labels ever reading alike.
    */}
    <label class="xpro-search-field">
      <span class="xpro-search-label">{label}</span>
      <input
        type="text"
        class="xpro-search-input"
        value={field.names}
        onInput={(event) => onChange({ names: event.currentTarget.value })}
      />
    </label>
    <label class="xpro-search-check">
      <input
        type="checkbox"
        checked={field.exclude}
        onChange={(event) => onChange({ exclude: event.currentTarget.checked })}
      />
      <span>{excludeLabel}</span>
    </label>
  </div>
);

/** A number field. Empty is "not asked", which is why the value stays a string */
const Number_ = ({
  label,
  value,
  onInput,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
}) => (
  <label class="xpro-search-field">
    <span class="xpro-search-label">{label}</span>
    <input
      type="number"
      min="0"
      class="xpro-search-input"
      value={value}
      onInput={(event) => onInput(event.currentTarget.value)}
    />
  </label>
);

export const SearchFormView = ({ messages }: Props) => {
  /*
   * The component holds a copy so that typing redraws. The module is the one that outlives
   * the component, and it is the one every change is built from.
   *
   * Built from `currentForm()` rather than from the `form` this render closed over. A
   * handler holds the values as they stood when it was made, and two fields changing
   * before the next redraw would each build on that same stale copy — the second write
   * would carry the first field back to what it was and quietly undo it.
   */
  const [form, setForm] = useState<SearchForm>(currentForm);
  const patch = (part: Partial<SearchForm>): void => {
    const next = { ...currentForm(), ...part };
    updateForm(next);
    setForm(next);
  };

  // The three that ride in the address rather than in the query (`searchPath`)
  const [scopes, setScopes] = useState<SearchScopes>(currentScopes);
  const patchScopes = (part: Partial<SearchScopes>): void => {
    const next = { ...currentScopes(), ...part };
    updateScopes(next);
    setScopes(next);
  };

  const m = messages.search.fields;
  const g = messages.search.groups;

  return (
    <form
      class="xpro-search-form"
      // Nothing is sent anywhere: the search is a move to another address, made by the
      // button. Left alone, a press of Enter would reload the page instead
      onSubmit={(event) => event.preventDefault()}
    >
      <Field label={m.all} value={form.all} onInput={(all) => patch({ all })} />
      <Field label={m.exact} value={form.exact} onInput={(exact) => patch({ exact })} />
      <Field label={m.any} value={form.any} onInput={(any) => patch({ any })} />
      <Field label={m.none} value={form.none} onInput={(none) => patch({ none })} />
      <Field
        label={m.hashtags}
        value={form.hashtags}
        onInput={(hashtags) => patch({ hashtags })}
      />

      <Group label={g.accounts}>
        <Accounts
          label={m.from}
          excludeLabel={m.exclude}
          field={form.from}
          onChange={(part) => patch({ from: { ...currentForm().from, ...part } })}
        />
        <Accounts
          label={m.to}
          excludeLabel={m.exclude}
          field={form.to}
          onChange={(part) => patch({ to: { ...currentForm().to, ...part } })}
        />
        <Accounts
          label={m.mentioning}
          excludeLabel={m.exclude}
          field={form.mentioning}
          onChange={(part) => patch({ mentioning: { ...currentForm().mentioning, ...part } })}
        />
      </Group>

      <Group label={g.filters}>
        {(
          [
            ['verified', m.verified],
            ['links', m.links],
            ['images', m.images],
            ['videos', m.videos],
          ] as const
        ).map(([key, label]) => (
          <label key={key} class="xpro-search-field">
            <span class="xpro-search-label">{label}</span>
            <select
              class="xpro-search-input"
              value={form[key]}
              onChange={(event) =>
                patch({ [key]: event.currentTarget.value as FilterChoice })
              }
            >
              {FILTER_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {m.choices[choice]}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label class="xpro-search-field">
          <span class="xpro-search-label">{m.replies}</span>
          <select
            class="xpro-search-input"
            value={form.replies}
            onChange={(event) =>
              patch({ replies: event.currentTarget.value as SearchForm['replies'] })
            }
          >
            {/* No "include them as well": X documents no operator for it (`query.ts`) */}
            <option value="any">{m.repliesAny}</option>
            <option value="only">{m.repliesOnly}</option>
            <option value="exclude">{m.repliesExclude}</option>
          </select>
        </label>
        <label class="xpro-search-field">
          <span class="xpro-search-label">{m.lang}</span>
          <select
            class="xpro-search-input"
            value={form.lang}
            onChange={(event) => patch({ lang: event.currentTarget.value })}
          >
            <option value="">{m.langAny}</option>
            {LANGUAGE_CODES.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </Group>

      <Group label={g.engagement}>
        <Number_
          label={m.minReplies}
          value={form.minReplies}
          onInput={(minReplies) => patch({ minReplies })}
        />
        <Number_
          label={m.minFaves}
          value={form.minFaves}
          onInput={(minFaves) => patch({ minFaves })}
        />
        <Number_
          label={m.minRetweets}
          value={form.minRetweets}
          onInput={(minRetweets) => patch({ minRetweets })}
        />
      </Group>

      <Group label={g.dates}>
        <label class="xpro-search-field">
          <span class="xpro-search-label">{m.since}</span>
          <input
            type="datetime-local"
            // Seconds as well as the time of day: what the query carries is an instant
            // (`epochSecondsOf`), so there is no reason to round it off in the field
            step={1}
            class="xpro-search-input"
            value={form.since}
            onInput={(event) => patch({ since: event.currentTarget.value })}
          />
        </label>
        <label class="xpro-search-field">
          <span class="xpro-search-label">{m.until}</span>
          <input
            type="datetime-local"
            // Seconds as well as the time of day: what the query carries is an instant
            // (`epochSecondsOf`), so there is no reason to round it off in the field
            step={1}
            class="xpro-search-input"
            value={form.until}
            onInput={(event) => patch({ until: event.currentTarget.value })}
          />
        </label>
      </Group>

      {/*
        Not part of the query: these three go into the address (`searchPath`). Grouped
        apart from the fields above for that reason — they say where to look rather than
        what to look for
      */}
      <Group label={g.where}>
        <label class="xpro-search-field">
          <span class="xpro-search-label">{m.tab}</span>
          <select
            class="xpro-search-input"
            value={scopes.tab}
            onChange={(event) =>
              patchScopes({ tab: event.currentTarget.value as ResultTab })
            }
          >
            {TABS.map((tab) => (
              <option key={tab} value={tab}>
                {m.tabs[tab]}
              </option>
            ))}
          </select>
        </label>
        <label class="xpro-search-check">
          <input
            type="checkbox"
            checked={scopes.followedOnly}
            onChange={(event) => patchScopes({ followedOnly: event.currentTarget.checked })}
          />
          <span>{m.followedOnly}</span>
        </label>
        <label class="xpro-search-check">
          <input
            type="checkbox"
            checked={scopes.nearbyOnly}
            onChange={(event) => patchScopes({ nearbyOnly: event.currentTarget.checked })}
          />
          <span>{m.nearbyOnly}</span>
        </label>
      </Group>
    </form>
  );
};
