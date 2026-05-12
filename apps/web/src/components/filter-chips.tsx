'use client';
import { cn } from '@/lib/utils';

export type FilterValue =
  | 'all'
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'WON'
  | 'LOST';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL_SENT', label: 'Proposal' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

/**
 * Typographic switcher. No pills, no bubbles. Active state is an underline rule.
 * Reads like a tab strip from a newspaper masthead, not a checkbox row.
 */
export function FilterChips({
  active,
  onChange,
}: {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <div
      className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-1 font-mono text-[11px] uppercase tracking-label"
      role="tablist"
      aria-label="Filter leads by status"
    >
      {FILTERS.map((f, i) => {
        const isActive = active === f.value;
        return (
          <div key={f.value} className="flex items-center">
            {i > 0 && (
              <span aria-hidden className="px-1 text-ink-mute/40">
                /
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(f.value)}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'relative px-2 py-1.5 transition-colors',
                isActive ? 'text-ink' : 'text-ink-mute hover:text-ink-soft',
              )}
            >
              {f.label}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-2 -bottom-px h-px origin-left bg-ink transition-transform duration-300',
                  isActive ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
