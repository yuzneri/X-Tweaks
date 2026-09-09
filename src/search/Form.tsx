/**
 * The detailed search form, as it stands in x.com's rail. Drawn with Preact rather than
 * assembled by hand the way `compose/switches.ts` is: that one has two checkboxes, this has
 * twenty-odd fields whose values must be read back together. The values live outside the
 * component (`state.ts`) — x.com redraws its rail as the reader moves about, and a query
 * half typed has to survive that.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Messages } from '../i18n/index.ts';
import { LANGUAGE_CODES } from './languages.ts';
import {
  buildQuery,
  emptyForm,
  emptyScopes,
  filledGroups,
  searchPath,
  type AccountField,
  type FilterChoice,
  type ResultTab,
  type Moment,
  type SearchForm,
  type SearchScopes,
} from './query.ts';
import {
  excludesAnything,
  noExclusions,
  THRESHOLDS,
  type Exclusions,
  type Threshold,
} from './exclude.ts';
import { stepped } from '../ui/step.ts';
import { mirror } from './mirror.ts';
import {
  clear,
  currentExclusions,
  currentForm,
  currentScopes,
  onChangedOutside,
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
 * A group that starts folded, and unfolds itself once it holds something.
 *
 * Folded by default: the rail is 350px wide, and the whole form open runs past the height of
 * a window — the five word fields are what a search usually needs, these what it sometimes
 * needs. Built on `<details>` rather than a button and hidden div, which gives the opening,
 * the keyboard handling and the "this is collapsed" announcement for free.
 *
 * Whether it stands open is held here, not left to the element, because a query can be
 * filled in from outside the fields — a search's address, X's own search box — and a group
 * holding values nobody can see is a search nobody can check. **It is only ever opened,
 * never shut**: folding it away as somebody clears a field would take the field they're
 * working in with it.
 */
const Group = ({
  label,
  children,
  name,
  filled,
}: {
  label: string;
  children: ComponentChildren;
  /** An extra class, for a group the stylesheet has something to say about */
  name?: string;
  /** Whether the fields inside hold anything (`filledGroups`) */
  filled: boolean;
}) => {
  const [open, setOpen] = useState(filled);
  useEffect(() => {
    if (filled) setOpen(true);
  }, [filled]);
  return (
    <details
      class={name ? `xpro-search-group ${name}` : 'xpro-search-group'}
      open={open}
      // What the reader does to the fold has the last word, and is what the next redraw
      // is drawn from
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary class="xpro-search-summary">{label}</summary>
      <div class="xpro-search-group-body">{children}</div>
    </details>
  );
};

/**
 * One account field: the names, and whether they are being excluded rather than asked for.
 * Hands back only the part that changed, never a whole `AccountField` built from the prop:
 * the prop holds the values as they stood when this render was made, so building
 * `{ ...field, exclude }` would carry the names back to what they were, and typing a name
 * then ticking the box would lose it. Merging is the caller's, against the values as they
 * stand now.
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
      The box is wrapped in its label rather than pointed at by an id, as every other field
      here is: an id built from the label would come from a translated string — changing with
      the language, carrying whatever spaces it puts in, no two labels guaranteed alike.
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

/**
 * A box for a whole number, with a button either side to step it. The look is this form's
 * own (`search/styles.css`) while the stepping is the settings screen's (`ui/step.ts`): the
 * two are drawn by different stylesheets, so what they share is the arithmetic rather than
 * the markup.
 */
const Number_ = ({
  label,
  words,
  value,
  onInput,
}: {
  label: string;
  /** The dictionary this form was handed. The buttons are named with what the box counts */
  words: Messages['search']['fields'];
  value: string;
  onInput: (value: string) => void;
}) => {
  return (
    <label class="xpro-search-field">
      <span class="xpro-search-label">{label}</span>
      <span class="xpro-search-number">
        <input
          type="text"
          inputMode="numeric"
          class="xpro-search-input"
          value={value}
          onInput={(event) => onInput(event.currentTarget.value)}
        />
        <button
          type="button"
          class="xpro-search-step"
          aria-label={words.stepDown(label)}
          onClick={() => onInput(stepped(value, -1))}
        >
          −
        </button>
        <button
          type="button"
          class="xpro-search-step"
          aria-label={words.stepUp(label)}
          onClick={() => onInput(stepped(value, 1))}
        >
          ＋
        </button>
      </span>
    </label>
  );
};

/**
 * One end of the span: a day, and a time of day within it. Two controls rather than one
 * `datetime-local`, which holds nothing at all until every part of it has been filled: a
 * reader naming two dates and no times got a search with no span in it and no sign of why
 * (`Moment`). Only the day is labelled on screen — the time sits beside it in a control that
 * says what it is by its own shape, and a second word above it was one word more than the
 * rail can spare. It is still named for anybody who cannot see that shape: the same word,
 * the two controls being two halves of one answer.
 */
const Span = ({
  label,
  moment,
  onChange,
}: {
  label: string;
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
    <input
      type="time"
      // Seconds as well, which is as fine as the query can say it (`epochSecondsOf`)
      step={1}
      class="xpro-search-input"
      aria-label={label}
      value={moment.time}
      onInput={(event) => onChange({ time: event.currentTarget.value })}
    />
  </div>
);

export const SearchFormView = ({ messages }: Props) => {
  /*
   * The component holds a copy so that typing redraws; the module outlives the component and
   * is what every change is built from. Built from `currentForm()` rather than the `form`
   * this render closed over: a handler holds the values as they stood when it was made, so
   * two fields changing before the next redraw would build on the same stale copy and the
   * second write would carry the first field back to what it was.
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
   * What X has no operator for. They change nothing about the query: what they do is done
   * to the results already on screen, by `hide.ts`, and only while this page is open
   */
  const [exclusions, setExclusions] = useState<Exclusions>(currentExclusions);
  const patchExclusions = (part: Partial<Exclusions>): void => {
    const next = { ...currentExclusions(), ...part };
    updateExclusions(next);
    setExclusions(next);
  };
  /**
   * What is in the number boxes, as it was typed. What is carried between pages is the
   * numbers alone, so the boxes cannot be drawn from that: a `0` on the way to `05` is not a
   * number this asks for, and drawing it back would take the character off the screen as it
   * was typed. Only what can be read out of what was typed reaches the exclusions.
   */
  const [atLeastText, setAtLeastText] = useState<Record<Threshold, string>>(() => {
    const { atLeast } = currentExclusions();
    const text = {} as Record<Threshold, string>;
    for (const name of THRESHOLDS) text[name] = atLeast[name] === null ? '' : String(atLeast[name]);
    return text;
  });

  /**
   * One of the numbers. An empty box, and anything not readable as a whole number of at
   * least one, leaves that one alone — the same as never having filled it in
   */
  const patchAtLeast = (name: Threshold, value: string): void => {
    setAtLeastText((text) => ({ ...text, [name]: value }));
    const written = value.trim();
    const least = Number(written);
    const usable = written !== '' && Number.isInteger(least) && least >= 1 ? least : null;
    patchExclusions({ atLeast: { ...currentExclusions().atLeast, [name]: usable } });
  };

  const m = messages.search.fields;
  const g = messages.search.groups;

  /*
   * Where this form would take the reader, worked out afresh on every redraw so the link
   * always carries what the fields say now. A plain link, not a script that navigates: x.com
   * writes its own trend links the same way, so X's router picks this up as it picks those
   * up and moves without reloading, and where it does not the browser follows the link
   * itself — slower, but the reader still lands on the right page.
   */
  const query = buildQuery(form);
  const path = searchPath(query, scopes);

  /** Which of the folded groups have something in them, and so should stand open */
  const filled = filledGroups(form, scopes);
  const go = useRef<HTMLAnchorElement>(null);

  /*
   * The same query, shown in X's own search box. An effect rather than a call in the
   * handlers: it should follow whatever the form says, however the form came to say it —
   * typed, cleared, or filled in from the address (`adoptQuery`).
   */
  useEffect(() => mirror(query), [query]);

  /*
   * The values can also be changed from outside this component — the reader typing into
   * X's own search box. The module is told first and tells this, which reads it again.
   */
  useEffect(() => onChangedOutside(() => setForm(currentForm())), []);

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
       * Enter is caught here rather than left to the form's own submission: a form with no
       * submit button submits on Enter only where it holds exactly one field that blocks
       * implicit submission, and this one holds thirteen, so Enter would do nothing at all
       * (measured).
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
      {/*
        Which of X's own tabs to land on. Not part of the query — it rides in the address
        (`searchPath`) — but at the head of the form all the same: it is the one control here
        that changes what a search is for rather than what it matches, and a reader looking
        for accounts rather than posts should not have to unfold anything to say so.
      */}
      <select
        class="xpro-search-input"
        // No label above it: the tab names read as what they are, and a word over them was
        // one line of the rail spent saying what the choices already say. Named for anybody
        // who cannot see them, the way the time of day is (`Span`).
        aria-label={m.tab}
        value={scopes.tab}
        onChange={(event) => patchScopes({ tab: event.currentTarget.value as ResultTab })}
      >
        {TABS.map((tab) => (
          <option key={tab} value={tab}>
            {m.tabs[tab]}
          </option>
        ))}
      </select>

      <Field label={m.all} value={form.all} onInput={(all) => patch({ all })} />
      <Field label={m.exact} value={form.exact} onInput={(exact) => patch({ exact })} />
      <Field label={m.any} value={form.any} onInput={(any) => patch({ any })} />
      <Field label={m.none} value={form.none} onInput={(none) => patch({ none })} />
      <Field
        label={m.hashtags}
        value={form.hashtags}
        onInput={(hashtags) => patch({ hashtags })}
      />

      <Group label={g.accounts} filled={filled.accounts}>
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

      <Group label={g.dates} filled={filled.dates}>
        <Span
          label={m.since}
          moment={form.since}
          onChange={(part) => patch({ since: { ...currentForm().since, ...part } })}
        />
        <Span
          label={m.until}
          moment={form.until}
          onChange={(part) => patch({ until: { ...currentForm().until, ...part } })}
        />
      </Group>

      {/*
        `excludesAnything` is asked here rather than inside `filledGroups`: the four are
        not part of the query, and the module that builds queries has no business knowing
        about them. Ticked, they are still something this group holds and should show.
      */}
      <Group label={g.filters} filled={filled.filters || excludesAnything(exclusions)}>
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
        {/*
          These two ride in the address rather than in the query (`searchPath`), which is why
          they are read from `scopes`. They sit here all the same: to a reader they narrow
          the results by the same kind of question as the fields above.
        */}
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
        {/*
          What X has no operator for. They ask the same kind of question as the rest of this
          group, but are answered here rather than by X — so they are marked off by the note,
          and by being the only part of the form that comes and goes: off a search's results
          there is nothing for them to act on, and the stylesheet takes the whole block away
          (`styles.css`).
        */}
        <div class="xpro-search-leave-out">
          <p class="xpro-search-note">{m.leaveOutNote}</p>
          {(
            [
              ['reposts', m.excludeReposts],
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
          {/*
            The ones said with a number: a post with that many or more goes. Empty leaves
            that one alone, which is what an empty box says everywhere else in this form
          */}
          {THRESHOLDS.map((name) => (
            <Number_
              key={name}
              words={m}
              label={m.excludeAtLeast[name]}
              value={atLeastText[name]}
              onInput={(value) => patchAtLeast(name, value)}
            />
          ))}
        </div>
      </Group>

      <Group label={g.engagement} filled={filled.engagement}>
        <Number_
          label={m.minReplies}
          words={m}
          value={form.minReplies}
          onInput={(minReplies) => patch({ minReplies })}
        />
        <Number_
          label={m.minFaves}
          words={m}
          value={form.minFaves}
          onInput={(minFaves) => patch({ minFaves })}
        />
        <Number_
          label={m.minRetweets}
          words={m}
          value={form.minRetweets}
          onInput={(minRetweets) => patch({ minRetweets })}
        />
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
