/** Ashgabat is UTC+5 all year (no DST). */
const ASHGABAT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Returns each UTC calendar day between `from` and `to`, inclusive. */
export function eachDay(from: Date, to: Date): Date[] {
  const start = toUtcMidnight(from);
  const end = toUtcMidnight(to);
  if (end < start) {
    throw new Error('`to` date must not be earlier than `from` date');
  }

  const days: Date[] = [];
  for (
    let cursor = start;
    cursor <= end;
    cursor = new Date(cursor.getTime() + DAY_MS)
  ) {
    days.push(new Date(cursor));
  }
  return days;
}

/**
 * Today's calendar day in Ashgabat as a UTC-midnight Date — comparable with
 * `@db.Date` columns, which Prisma returns as UTC midnight.
 */
export function todayInAshgabat(now: Date = new Date()): Date {
  return toUtcMidnight(new Date(now.getTime() + ASHGABAT_OFFSET_MS));
}

/** `YYYY-MM-DD` of a UTC-midnight date. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
