'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pin, TrendingUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterChips, type FilterValue } from '@/components/filter-chips';
import { LeadCard, type LeadCardData } from '@/components/lead-card';
import { isToday } from '@/lib/format';

export function LeadListClient({
  initialLeads,
  initialError,
  initialFilter,
  initialQuery,
}: {
  initialLeads: LeadCardData[];
  initialError: string | null;
  initialFilter: FilterValue;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  // Debounce search input -> URL update -> server re-fetch.
  useEffect(() => {
    if (query === initialQuery) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (initialFilter !== 'all') params.set('status', initialFilter);
      if (query) params.set('q', query);
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : '/');
    }, 300);
    return () => clearTimeout(t);
  }, [query, initialFilter, initialQuery, router]);

  const handleFilter = (value: FilterValue) => {
    const params = new URLSearchParams();
    if (value !== 'all') params.set('status', value);
    if (query) params.set('q', query);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/');
  };

  const todayLeads = initialLeads.filter((l) => isToday(l.nextFollowUpAt));
  const todayIds = new Set(todayLeads.map((l) => l.id));
  const otherLeads = initialLeads.filter((l) => !todayIds.has(l.id));

  const hasFilter = initialFilter !== 'all' || initialQuery.length > 0;
  const isEmpty = !initialError && initialLeads.length === 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-5xl items-center justify-between py-4">
          <div className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <TrendingUp className="h-6 w-6" />
            <span>LeadFlow</span>
          </div>
          <Button>+ Add New Lead</Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl space-y-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FilterChips active={initialFilter} onChange={handleFilter} />
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads..."
              className="pl-9 pr-9"
              aria-label="Search leads"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {initialError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>API error:</strong> {initialError}
            <p className="mt-1 text-xs">
              Is the API running? Try{' '}
              <code className="rounded bg-red-100 px-1 py-0.5">pnpm --filter @leadflow/api dev</code>
              {' '}and make sure <code className="rounded bg-red-100 px-1 py-0.5">DEV_USER_ID</code>{' '}
              is set in <code className="rounded bg-red-100 px-1 py-0.5">.env.local</code>.
            </p>
          </div>
        )}

        {isEmpty && (
          <div className="rounded-lg border border-dashed bg-background p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {hasFilter ? 'No leads match your filters.' : 'No leads yet. Add your first lead to get started.'}
            </p>
          </div>
        )}

        {todayLeads.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Pin className="h-3.5 w-3.5" />
              Today&apos;s Follow-ups
            </h2>
            <div className="space-y-3">
              {todayLeads.map((l) => (
                <LeadCard key={l.id} lead={l} />
              ))}
            </div>
          </section>
        )}

        {otherLeads.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All Leads
            </h2>
            <div className="space-y-3">
              {otherLeads.map((l) => (
                <LeadCard key={l.id} lead={l} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
