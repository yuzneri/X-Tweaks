export const HOVER_READ_MS = 3_000;

/** One read per continuous visit. Moving between children does not restart the delay. */
export class HoverReadTracker<T> {
  private current: { column: T; columnId: string } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private valid: (column: T, columnId: string) => boolean;
  private read: (columnId: string) => void;

  constructor(valid: (column: T, columnId: string) => boolean, read: (columnId: string) => void) {
    this.valid = valid;
    this.read = read;
  }

  enter(column: T, columnId: string): void {
    if (this.current?.column === column && this.current.columnId === columnId) return;
    this.clear();
    const visit = { column, columnId };
    this.current = visit;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.current === visit && this.valid(column, columnId)) this.read(columnId);
    }, HOVER_READ_MS);
  }

  clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.current = null;
  }
}
