/**
 * SSR-safe time formatting.
 *
 * The "now" reference is passed in by the caller so the server and client compute
 * identical strings during hydration. Without this, every `new Date()` call would
 * produce a different result on the two passes and React would log a hydration
 * mismatch warning.
 */

type Maybe<T> = T | null | undefined;

function asDate(input: Maybe<string | Date>): Date | null {
  if (!input) return null;
  return typeof input === 'string' ? new Date(input) : input;
}

function distanceLabel(date: Date, reference: Date, suffix = true): string {
  const diff = Math.abs(reference.getTime() - date.getTime());
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const mo = Math.round(day / 30);
  const yr = Math.round(day / 365);

  let core: string;
  if (sec < 45) core = `${sec}s`;
  else if (min < 45) core = `${min}m`;
  else if (hr < 24) core = `${hr}h`;
  else if (day < 30) core = `${day}d`;
  else if (mo < 12) core = `${mo}mo`;
  else core = `${yr}y`;

  return suffix ? `${core} ago` : core;
}

export function timeAgo(iso: Maybe<string | Date>, now: Date): string {
  const d = asDate(iso);
  if (!d) return 'never';
  return distanceLabel(d, now, true);
}

export function timeAgoShort(iso: Maybe<string | Date>, now: Date): string {
  const d = asDate(iso);
  if (!d) return '';
  return distanceLabel(d, now, false);
}

export function isToday(iso: Maybe<string | Date>, now: Date): boolean {
  const d = asDate(iso);
  if (!d) return false;
  return d.toDateString() === now.toDateString();
}

export function isOverdue(iso: Maybe<string | Date>, now: Date): boolean {
  const d = asDate(iso);
  if (!d) return false;
  return d.getTime() < now.getTime();
}

/**
 * Hour:minute display. Locale + timezone dependent, so suppressHydrationWarning
 * the consuming span. Returns lower-cased am/pm (e.g. "2:00 pm") for an editorial feel.
 */
export function timeOnly(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .replace(/AM|PM/g, (m) => m.toLowerCase());
}

/**
 * Compact absolute date like "May 6 · 2:14 pm". Locale-dependent; suppress hydration.
 */
export function timestamp(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = timeOnly(d);
  return `${date} · ${time}`;
}

/**
 * Long-form date for headers, e.g. "Tuesday · 6 May".
 */
export function longDate(now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
  } catch {
    return '';
  }
}
