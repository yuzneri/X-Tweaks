/**
 * What of the page x.com draws around the timeline is taken away. Like the compose form's
 * settings, and unlike the filter and the appearance, these are not per tier: there is one
 * answer for the whole site, so no value is inherited and nothing is shown dimmed.
 *
 * Laid out the way the page is: the items down the left, the menu they open, the rail on
 * the right, and the bars floating in the corner. A reader looking for a switch can point
 * at the thing on screen and know where to look.
 *
 * What x.com puts at the head of the timeline is not here but in `XTimeline` below: it is
 * the same stored settings, but it stands in the timeline rather than around it.
 *
 * One box here is not x.com's: the search form. It is a thing the extension adds rather
 * than one x.com draws, and it is stored apart for exactly that reason
 * (`SearchSettings`). It is shown here all the same, because where it goes is the rail —
 * the reader looking for it will look beside the rail's own switches, and taking the rail
 * away governs it the same way it governs them. Its own box is what keeps the two kinds
 * of switch from reading as one kind.
 *
 * Every switch sits in a named box. One standing outside them reads as belonging to
 * whichever box it happens to follow.
 */
import {
  X_MENU_KEYS,
  X_NAV_KEYS,
  X_RAIL_KEYS,
  type SearchSettings,
  type XChromeSettings,
} from '../settings/schema.ts';
import { ShownSwitch } from './fields.tsx';
import { useMessages } from './messages.tsx';

/*
 * The notes are tied to the switch they describe. Without the tie, a screen reader reaches
 * a switch and says only its name, leaving the reason on the screen for eyes alone.
 */
const WIDE_NOTE = 'xpro-chrome-wide-note';
const COMPOSE_NOTE = 'xpro-chrome-compose-note';
const SEARCH_NOTE = 'xpro-search-form-note';

/** What both screens here need. `XTimeline` needs nothing beyond it */
type ChromeProps = {
  chrome: XChromeSettings;
  onChange: (chrome: XChromeSettings) => void;
};

type Props = ChromeProps & {
  /**
   * The search form's switch. Passed beside the chrome rather than merged into it: it is
   * stored apart for the reason `SearchSettings` gives, and the screen is what puts the
   * two next to each other.
   */
  search: SearchSettings;
  onSearchChange: (search: SearchSettings) => void;
};

export const XChrome = ({ chrome, onChange, search, onSearchChange }: Props) => {
  const m = useMessages();
  const patch = (part: Partial<XChromeSettings>) => onChange({ ...chrome, ...part });

  /*
   * With the rail taken away every block in it has gone, whatever each switch says. They
   * are shown cleared and held shut to say so — the stored values are left alone, so
   * turning the widening off brings each block back to what it was set to.
   */
  const railGone = chrome.wideTimeline;

  return (
    <>
      {/* Each list is in the order X shows it, so it reads down the screen the way X's own does */}
      <fieldset>
        <legend>{m.xChrome.nav.label}</legend>
        {X_NAV_KEYS.map((key) => (
          <ShownSwitch
            key={key}
            label={m.xChrome.nav.items[key]}
            shown={chrome.nav[key]}
            onShown={(shown) => patch({ nav: { ...chrome.nav, [key]: shown } })}
          />
        ))}
      </fieldset>

      {/*
        Straight after the navigation, that being where the menu is opened from. A group of
        its own rather than more rows in the one above: these are behind a press, and what
        is always on screen is a different question from what is one level in.
      */}
      <fieldset>
        <legend>{m.xChrome.menu.label}</legend>
        {X_MENU_KEYS.map((key) => (
          <ShownSwitch
            key={key}
            label={m.xChrome.menu.items[key]}
            shown={chrome.menu[key]}
            onShown={(shown) => patch({ menu: { ...chrome.menu, [key]: shown } })}
          />
        ))}
      </fieldset>

      <fieldset>
        <legend>{m.xChrome.rail.label}</legend>
        {/*
          Taking the rail away governs the list under it, so it is not held shut with
          them: shut along with the list, there would be no way to turn it back off.
        */}
        <label class="row switch">
          <input
            type="checkbox"
            checked={chrome.wideTimeline}
            aria-describedby={WIDE_NOTE}
            onChange={(event) => patch({ wideTimeline: event.currentTarget.checked })}
          />
          <span>{m.xChrome.wideTimeline.label}</span>
        </label>
        <p class="hint indent" id={WIDE_NOTE}>
          {m.xChrome.wideTimeline.note}
        </p>
        {X_RAIL_KEYS.map((key) => (
          <ShownSwitch
            key={key}
            label={m.xChrome.rail.items[key]}
            shown={!railGone && chrome.rail[key]}
            disabled={railGone}
            onShown={(shown) => patch({ rail: { ...chrome.rail, [key]: shown } })}
          />
        ))}
      </fieldset>

      {/*
        Straight after the rail, that being where the form goes, and in a box of its own:
        the box above lists what x.com draws and each switch there says whether it stays,
        while this one says to add something. Among them it would read as one of them.

        Held shut with the rail taken away, the same as the blocks above and for the same
        reason — there is nowhere to put it. The stored value is left alone, so turning the
        widening off brings the form back if it was asked for.
      */}
      <fieldset>
        <legend>{m.search.label}</legend>
        <label class="row switch">
          <input
            type="checkbox"
            checked={!railGone && search.form}
            disabled={railGone}
            aria-describedby={SEARCH_NOTE}
            onChange={(event) => onSearchChange({ ...search, form: event.currentTarget.checked })}
          />
          <span>{m.search.form.label}</span>
        </label>
        <p class="hint indent" id={SEARCH_NOTE}>
          {railGone ? m.search.form.noteWide : m.search.form.note}
        </p>
      </fieldset>

      <fieldset>
        <legend>{m.xChrome.drawers.label}</legend>
        <ShownSwitch
          label={m.xChrome.drawers.items.grok}
          shown={chrome.grokDrawer}
          onShown={(shown) => patch({ grokDrawer: shown })}
        />
        <ShownSwitch
          label={m.xChrome.drawers.items.chat}
          shown={chrome.chatDrawer}
          onShown={(shown) => patch({ chatDrawer: shown })}
        />
      </fieldset>

    </>
  );
};

/**
 * The two x.com puts at the head of the timeline: the box a post is written in, and the
 * bar saying that new posts have arrived.
 *
 * Held apart from the rest of `XChrome` although it is the same stored settings. Those are
 * the page drawn *around* the timeline; these two stand *in* it, and the settings screen
 * groups them with the other things that appear in a timeline without being posts
 * (`Injected`). Reading a tab called "around the timeline" and finding the timeline's own
 * head in it was the confusion this splits apart.
 */
export const XTimeline = ({ chrome, onChange }: ChromeProps) => {
  const m = useMessages();
  const patch = (part: Partial<XChromeSettings>) => onChange({ ...chrome, ...part });

  return (
    <fieldset>
      <legend>{m.xChrome.timeline.label}</legend>
      <ShownSwitch
        label={m.xChrome.composeBox.label}
        shown={chrome.composeBox}
        describedBy={COMPOSE_NOTE}
        onShown={(shown) => patch({ composeBox: shown })}
      />
      <p class="hint indent" id={COMPOSE_NOTE}>
        {m.xChrome.composeBox.note}
      </p>

      <label class="row switch">
        <input
          type="checkbox"
          checked={chrome.autoNewPosts}
          onChange={(event) => patch({ autoNewPosts: event.currentTarget.checked })}
        />
        <span>{m.xChrome.autoNewPosts.label}</span>
      </label>
    </fieldset>
  );
};
