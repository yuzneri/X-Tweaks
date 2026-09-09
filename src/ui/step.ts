/**
 * Stepping a number box up and down by one.
 *
 * The boxes stay `type="text"`: a `number` box answers with an empty value for what is not a number,
 * which reads the same as a box nobody filled in, and an empty box means "do not filter on this", so
 * a typo would quietly stop filtering (`ui/fields.tsx` keeps the sizes as text for the same reason).
 * The buttons give what a number box was wanted for without giving that up.
 */

/**
 * The box's next value, one step from what it holds. An empty string leaves the box empty, the box's
 * own way of saying "everything" (it reads "any" on screen).
 *
 * Stepping below one empties the box rather than landing on zero: with the direction a box starts on,
 * zero says "0 or more" — every post there is a number for, a rule that filters nothing, one press
 * away from an empty box. Zero can still be typed, and says something worth saying the other way
 * round ("0 or fewer likes" is a post nobody answered). A box holding something unreadable as a whole
 * number is treated as an empty one: the button was pressed to get a number.
 */
export const stepped = (value: string, delta: number): string => {
  const written = value.trim();
  const current = Number(written);
  const usable = written !== '' && Number.isInteger(current) && current >= 0 ? current : 0;
  const next = usable + delta;
  return next < 1 ? '' : String(next);
};
