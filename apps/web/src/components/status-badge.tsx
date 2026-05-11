import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@leadflow/shared';

function getStatusStyle(status: LeadStatus): { label: string; className: string } {
  switch (status) {
    case 'NEW':
      return { label: 'NEW', className: 'bg-green-100 text-green-800 hover:bg-green-100' };
    case 'CONTACTED':
      return { label: 'CONTACTED', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' };
    case 'QUALIFIED':
      return { label: 'QUALIFIED', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' };
    case 'PROPOSAL_SENT':
      return {
        label: 'PROPOSAL SENT',
        className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
      };
    case 'WON':
      return { label: 'WON', className: 'bg-gray-200 text-gray-700 hover:bg-gray-200' };
    case 'LOST':
      return { label: 'LOST', className: 'bg-red-100 text-red-800 hover:bg-red-100' };
  }
}

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const style = getStatusStyle(status);
  return <Badge className={cn(style.className, className)}>{style.label}</Badge>;
}
