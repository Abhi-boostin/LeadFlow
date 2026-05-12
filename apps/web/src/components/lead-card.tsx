'use client';
import { ArrowUpRight, AlertOctagon, Bell } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import { timeAgo, timeAgoShort, timeOnly, isToday, isOverdue } from '@/lib/format';
import type { LeadStatus } from '@leadflow/shared';

export type LeadCardData = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  nextFollowUpAt: string | null;
  lastDiscussionAt: string | null;
  lastNote: string | null;
};

/**
 * A row, not a card. Table-density. Single horizontal divider between leads.
 * The left edge of each row is a colored hairline that marks urgency state.
 */
export function LeadCard({
  lead,
  onClick,
  now,
}: {
  lead: LeadCardData;
  onClick?: (id: string) => void;
  now: Date;
}) {
  const followUpToday = isToday(lead.nextFollowUpAt, now);
  const overdue =
    !followUpToday &&
    isOverdue(lead.nextFollowUpAt, now) &&
    lead.status !== 'WON' &&
    lead.status !== 'LOST';
  const closed = lead.status === 'WON' || lead.status === 'LOST';

  return (
    <button
      type="button"
      onClick={() => onClick?.(lead.id)}
      className={cn(
        'group relative flex w-full items-stretch border-b border-line bg-surface text-left',
        'transition-colors last:border-b-0',
        'hover:bg-paper-subtle focus:outline-none focus-visible:bg-paper-deep/60',
        closed && 'opacity-60 hover:opacity-100',
      )}
      aria-label={`Open ${lead.name}${lead.company ? ` at ${lead.company}` : ''}`}
    >
      {/* Left urgency indicator hairline */}
      <span
        aria-hidden
        className={cn(
          'w-[3px] shrink-0 transition-colors',
          overdue && 'bg-accent',
          followUpToday && !overdue && 'bg-ink',
          !overdue && !followUpToday && 'bg-transparent',
        )}
      />

      <div className="flex flex-1 items-start gap-5 px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          {/* Name + company row */}
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h3
              className={cn(
                'font-display text-[22px] leading-[1.1] text-ink',
                closed && 'text-ink-mute',
              )}
            >
              {lead.name}
            </h3>
            {lead.company && (
              <span className="font-display italic text-[15px] text-ink-mute leading-tight">
                {lead.company}
              </span>
            )}
          </div>

          {/* Last note */}
          {lead.lastNote && (
            <p
              className={cn(
                'mt-1.5 line-clamp-1 text-[13px] text-ink-soft',
                closed && 'text-ink-mute',
              )}
            >
              {lead.lastNote}
            </p>
          )}

          {/* Meta row: time-ago and flags */}
          <div className="mt-2 flex flex-wrap items-center gap-x-1 font-mono text-[10px] uppercase tracking-label text-ink-mute">
            <span suppressHydrationWarning>{timeAgo(lead.lastDiscussionAt, now)}</span>

            {followUpToday && lead.nextFollowUpAt && (
              <>
                <span aria-hidden className="px-1 opacity-50">
                  /
                </span>
                <span className="inline-flex items-center gap-1 text-ink">
                  <Bell className="h-3 w-3" aria-hidden />
                  <span suppressHydrationWarning>
                    Today {timeOnly(lead.nextFollowUpAt)}
                  </span>
                </span>
              </>
            )}

            {overdue && lead.nextFollowUpAt && (
              <>
                <span aria-hidden className="px-1 opacity-50">
                  /
                </span>
                <span className="inline-flex items-center gap-1 text-accent">
                  <AlertOctagon className="h-3 w-3" aria-hidden />
                  <span suppressHydrationWarning>
                    {timeAgoShort(lead.nextFollowUpAt, now)} overdue
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-3 pt-0.5">
          <StatusBadge status={lead.status} />
          <ArrowUpRight
            aria-hidden
            className="h-4 w-4 text-ink-mute opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
          />
        </div>
      </div>
    </button>
  );
}
