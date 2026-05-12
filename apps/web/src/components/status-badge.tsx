import { cn } from '@/lib/utils';
import type { LeadStatus } from '@leadflow/shared';

// Earth-toned palette. Each status looks like an inked stamp.
function getStatusStyle(status: LeadStatus): { label: string; className: string } {
  switch (status) {
    case 'NEW':
      return {
        label: 'New',
        className: 'bg-[hsl(var(--st-new-bg))] text-[hsl(var(--st-new-fg))]',
      };
    case 'CONTACTED':
      return {
        label: 'Contacted',
        className:
          'bg-[hsl(var(--st-contacted-bg))] text-[hsl(var(--st-contacted-fg))]',
      };
    case 'QUALIFIED':
      return {
        label: 'Qualified',
        className:
          'bg-[hsl(var(--st-qualified-bg))] text-[hsl(var(--st-qualified-fg))]',
      };
    case 'PROPOSAL_SENT':
      return {
        label: 'Proposal',
        className:
          'bg-[hsl(var(--st-proposal-bg))] text-[hsl(var(--st-proposal-fg))]',
      };
    case 'WON':
      return {
        label: 'Won',
        className: 'bg-[hsl(var(--st-won-bg))] text-[hsl(var(--st-won-fg))]',
      };
    case 'LOST':
      return {
        label: 'Lost',
        className: 'bg-[hsl(var(--st-lost-bg))] text-[hsl(var(--st-lost-fg))]',
      };
  }
}

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  const style = getStatusStyle(status);
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center px-2 font-mono text-[10px] font-medium uppercase tracking-label',
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
