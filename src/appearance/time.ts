/**
 * Renders a post's timestamp in absolute form. How a date is written differs by language,
 * so the sentence building lives in the dictionaries.
 */
import type { Messages } from '../i18n/index.ts';

const pad = (n: number): string => String(n).padStart(2, '0');

/** Whether it was posted today, as the device clock sees the day */
const isToday = (postedAt: Date, now: Date): boolean =>
  postedAt.getFullYear() === now.getFullYear() &&
  postedAt.getMonth() === now.getMonth() &&
  postedAt.getDate() === now.getDate();

/**
 * The time to show on screen, and whether it is from today.
 *
 * Today: the clock time alone (`11:18`) — the date is obvious, and the "both" format fills
 * it in with the relative time in parentheses. Otherwise: start from the date
 * (`8月21日 19:03`), and add the year where it differs, since omitting it invites reading
 * "August last year" as "August this year".
 * `datetime` is UTC, but readers want their own clock, so it is rendered in the device's
 * time zone.
 */
export const describeTime = (
  postedAt: Date,
  now: Date,
  m: Messages
): { text: string; today: boolean } => {
  const hour = pad(postedAt.getHours());
  const minute = pad(postedAt.getMinutes());
  if (isToday(postedAt, now)) {
    return { text: m.appearance.timeClock(hour, minute), today: true };
  }
  const year = postedAt.getFullYear() === now.getFullYear() ? null : postedAt.getFullYear();
  return {
    text: m.appearance.timeAbsolute(year, postedAt.getMonth() + 1, postedAt.getDate(), hour, minute),
    today: false,
  };
};

/**
 * Turns a `time` element's `datetime` into the form to show. null when unreadable, not an
 * empty string: marking a cell with an empty value makes `::after` produce an empty box,
 * which reads as the timestamp having vanished.
 */
export const timeTextFrom = (
  datetime: string | null,
  now: Date,
  m: Messages
): { text: string; today: boolean } | null => {
  if (!datetime) return null;
  const parsed = Date.parse(datetime);
  return Number.isNaN(parsed) ? null : describeTime(new Date(parsed), now, m);
};
