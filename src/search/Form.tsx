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
import { useRef, useState } from 'preact/hooks';
import type { Messages } from '../i18n/index.ts';
import { LANGUAGE_CODES } from './languages.ts';
import {
  buildQuery,
  emptyForm,
  emptyScopes,
  searchPath,
  type AccountField,
  type FilterChoice,
  type ResultTab,
  type Moment,
  type SearchForm,
  type SearchScopes,
} from './query.ts';
import { noExclusions, type Exclusions } from './exclude.ts';
import {
  clear,
  currentExclusions,
  currentForm,
  currentScopes,
  updateExclusions,
  updateForm,
  updateScopes,
} from './state.ts';

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
const Group = ({
  label,
  children,
  name,
}: {
  label: string;
  children: ComponentChildren;
  /** An extra class, for a group the stylesheet has something to say about */
  name?: string;
}) => (
  <details class={name ? `xpro-search-group ${name}` : 'xpro-search-group'}>
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

/**
 * One end of the span: a day, and a time of day within it.
 *
 * Two controls rather than one `datetime-local`. That one holds nothing at all until every
 * part of it has been filled, so a reader naming two dates and no times got a search with
 * no span in it and no sign of why (`Moment`).
 */
const Span = ({
  label,
  timeLabel,
  moment,
  onChange,
}: {
  label: string;
  timeLabel: string;
  moment: Moment;
  onChange: (part: Partial<Moment>) => void;
}) => (
  <div class="xpro-search-field xpro-search-span">
    <label class="xpro-search-field">
      <span class="xpro-search-label">{label}</span>
      <input
        type="date"
        class="xpro-search-input"
        value={moment.date}
        onInput={(event) => onChange({ date: event.currentTarget.value })}
      />
    </label>
    <label class="xpro-search-field">
      <span class="xpro-search-label">{timeLabel}</span>
      <input
        type="time"
        // Seconds as well, which is as fine as the query can say it (`epochSecondsOf`)
        step={1}
        class="xpro-search-input"
        value={moment.time}
        onInput={(event) => onChange({ time: event.currentTarget.value })}
      />
    </label>
  </div>
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

  /*
   * The four X has no operator for. They change nothing about the query: what they do is
   * done to the results already on screen, by `hide.ts`, and only while this page is open
   */
  const [exclusions, setExclusions] = useState<Exclusions>(currentExclusions);
  const patchExclusions = (part: Partial<Exclusions>): void => {
    const next = { ...currentExclusions(), ...part };
    updateExclusions(next);
    setExclusions(next);
  };

  const m = messages.search.fields;
  const g = messages.search.groups;

  /*
   * Where this form would take the reader, worked out afresh on every redraw so the link
   * always carries what the fields say now.
   *
   * The search is a plain link, not a script that navigates. x.com writes its own trend
   * links the same way, so X's router picks this up as it picks those up and moves without
   * reloading. Where it does not, the browser follows the link itself and the reader still
   * lands on the right page — slower, but never wrong. That is why there is no fallback
   * here to write: an anchor already has one.
   */
  const query = buildQuery(form);
  const path = searchPath(query, scopes);
  const go = useRef<HTMLAnchorElement>(null);

  /** Empties the form, and what this component is showing along with it */
  const reset = (): void => {
    clear();
    setForm(emptyForm());
    setScopes(emptyScopes());
    setExclusions(noExclusions());
  };

  return (
    <form
      class="xpro-search-form"
      /*
       * Enter is caught here rather than left to the form's own submission. A form with no
       * submit button submits on Enter only where it holds exactly one field that blocks
       * implicit submission, and this one holds thirteen — left to the browser, Enter would
       * do nothing at all (measured).
       */
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        // Inside a select or a details summary, Enter is theirs. Only a text-like field
        // means "I have finished typing"
        if (!(event.target instanceof HTMLInputElement)) return;
        event.preventDefault();
        if (query !== '') go.current?.click();
      }}
      // Kept even though nothing submits today: the day a submit button is added here,
      // this is what stops the page being sent somewhere and reloaded
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
        <p class="xpro-search-note">{m.datesNote}</p>
        <Span
          label={m.since}
          timeLabel={m.timeOfDay}
          moment={form.since}
          onChange={(part) => patch({ since: { ...currentForm().since, ...part } })}
        />
        <Span
          label={m.until}
          timeLabel={m.timeOfDay}
          moment={form.until}
          onChange={(part) => patch({ until: { ...currentForm().until, ...part } })}
        />
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

      {/*
        Not part of the query. X has no operator for any of these, so they are done to the
        results after they arrive, and they last no longer than this visit to the page
      */}
      <Group label={g.leaveOut} name="xpro-search-leave-out">
        <p class="xpro-search-note">{m.leaveOutNote}</p>
        {(
          [
            ['reposts', m.excludeReposts],
            ['hashtags', m.excludeHashtags],
            ['nameOnly', m.excludeNameOnly],
            ['handleOnly', m.excludeHandleOnly],
          ] as const
        ).map(([key, label]) => (
          <label key={key} class="xpro-search-check">
            <input
              type="checkbox"
              checked={exclusions[key]}
              onChange={(event) => patchExclusions({ [key]: event.currentTarget.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </Group>

      <div class="xpro-search-actions">
        <button type="button" class="xpro-search-reset" onClick={reset}>
          {m.reset}
        </button>
        {/*
          An anchor without an href is not a link: it cannot be focused or followed, which
          is exactly what an empty form should offer. Written this way rather than as a
          disabled button so that the one control is a link whenever it leads anywhere.
        */}
        <a
          ref={go}
          class="xpro-search-go"
          href={query === '' ? undefined : path}
          aria-disabled={query === '' ? 'true' : undefined}
        >
          {m.go}
        </a>
      </div>
    </form>
  );
};
