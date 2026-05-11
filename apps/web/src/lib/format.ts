import { formatDistanceToNowStrict } from 'date-fns';

export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return 'never';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${formatDistanceToNowStrict(d)} ago`;
}

export function timeAgoShort(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return formatDistanceToNowStrict(d);
}

export function timeOnly(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function isToday(iso: string | Date | null | undefined): boolean {
  if (!iso) return false;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function isOverdue(iso: string | Date | null | undefined): boolean {
  if (!iso) return false;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.getTime() < Date.now();
}
