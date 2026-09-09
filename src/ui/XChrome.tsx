/**
 * What of the page x.com draws around the timeline is taken away. Unlike the filter and the
 * appearance (and like the compose form's settings), these are not per tier: one answer for
 * the whole site, so nothing is inherited or shown dimmed.
 *
 * Laid out as the page is — items down the left, the menu they open, the rail on the right,
 * the bars floating in the corner — so a reader looking for a switch can point at the thing
 * on screen. What x.com puts at the head of the timeline is in `XTimeline` below instead: the
 * same stored settings, but standing in the timeline rather than around it.
 *
 * One box here is not x.com's: the search form, added by the extension rather than drawn by
 * x.com, stored apart for that reason (`SearchSettings`). Shown here anyway, since it belongs
 * in the rail — beside the rail's own switches, governed by taking the rail away the same
 * way — but kept in its own box, since a switch outside a named box reads as belonging to
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
 * The notes are tied to the switch they describe; without the tie, a screen reader reaches
 * a switch and says only its name, leaving the reason on screen for eyes alone.
 */
const WIDE_NOTE = 'xpro-chrome-wide-note';
const COMPOSE_NOTE = 'xpro-chrome-compose-note';
const SEARCH_NOTE = 'xpro-search-form-note';

/** What both screens here need; `XTimeline` needs nothing beyond it */
type ChromeProps = {
  chrome: XChromeSettings;
  onChange: (chrome: XChromeSettings) => void;
};

type Props = ChromeProps & {
  /**
   * The search form's switch, passed beside the chrome rather than merged into it: it is
   * stored apart for the reason `SearchSettings` gives, and the screen puts the two together.
   */
  search: SearchSettings;
  onSearchChange: (search: SearchSettings) => void;
};

export const XChrome = ({ chrome, onChange, search, onSearchChange }: Props) => {
  const m = useMessages();
  const patch = (part: Partial<XChromeSettings>) => onChange({ ...chrome, ...part });

  /*
   * With the rail taken away every block in it has gone, whatever each switch says, so they
   * show cleared and held shut. Stored values are left alone: turning the widening off
   * brings each block back to what it was set to
   */
  const railGone = chrome.wideTimeline;

  return (
    <>
      {/* Each list is in the order X shows it, reading down the screen as X's own does */}
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
        Straight after the navigation, where the menu opens from. A group of its own, not more
        rows above: these are behind a press, a different question from what is always on screen
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
          Taking the rail away governs the list under it, so it is not held shut with them:
          shut along with the list, there would be no way to turn it back off
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
        Straight after the rail, where the form goes, in a box of its own: the box above lists
        what x.com draws (each switch saying whether it stays), while this one adds something,
        so among them it would read as one of them. Held shut with the rail taken away, for
        the same reason as the blocks above — nowhere to put it. The stored value is left
        alone, so turning the widening off brings the form back if it was asked for
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
 * The two x.com puts at the head of the timeline: the box a post is written in, and the bar
 * saying new posts have arrived. Held apart from the rest of `XChrome`, though the same
 * stored settings: those are the page drawn *around* the timeline, these two stand *in* it,
 * grouped on the settings screen with other things appearing in a timeline without being
 * posts (`Injected`) — splitting apart the confusion of finding the timeline's own head
 * inside a tab called "around the timeline".
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
