'use client';
import { Bell, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
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

export function LeadCard({
  lead,
  onClick,
}: {
  lead: LeadCardData;
  onClick?: (id: string) => void;
}) {
  const followUpToday = isToday(lead.nextFollowUpAt);
  const overdue =
    !followUpToday &&
    isOverdue(lead.nextFollowUpAt) &&
    lead.status !== 'WON' &&
    lead.status !== 'LOST';

  return (
    <Card
      onClick={() => onClick?.(lead.id)}
      className={cn(
        'cursor-pointer transition hover:bg-muted/40',
        overdue && 'border-red-300 bg-red-50/40',
        lead.status === 'WON' && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3
              className={cn(
                'truncate text-base font-semibold',
                lead.status === 'WON' && 'text-muted-foreground',
              )}
            >
              {lead.name}
            </h3>
            {lead.company && (
              <span className="truncate text-sm text-muted-foreground">({lead.company})</span>
            )}
          </div>

          {lead.lastNote && (
            <p className="mt-2 line-clamp-1 text-sm text-foreground">
              <span className="font-semibold">Last Note:</span> {lead.lastNote}
              <span className="ml-2 text-xs text-muted-foreground">
                {timeAgo(lead.lastDiscussionAt)}
              </span>
            </p>
          )}

          {followUpToday && lead.nextFollowUpAt && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
              <Bell className="h-3 w-3" />
              Follow-up today at {timeOnly(lead.nextFollowUpAt)}
            </div>
          )}

          {overdue && lead.nextFollowUpAt && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
              <AlertCircle className="h-3 w-3" />
              Overdue by {timeAgoShort(lead.nextFollowUpAt)}
            </div>
          )}
        </div>

        <StatusBadge status={lead.status} />
      </div>
    </Card>
  );
}
