'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FilterChips, type FilterValue } from '@/components/filter-chips';
import { LeadCard, type LeadCardData } from '@/components/lead-card';
import { LeadTimelineDialog } from '@/components/lead-timeline-dialog';
import { AddLeadDialog } from '@/components/add-lead-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
import { UserMenu } from '@/components/user-menu';
import { setApiUserId } from '@/lib/api';
import { isToday, longDate } from '@/lib/format';

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export function LeadListClient({
  initialLeads,
  initialError,
  initialFilter,
  initialQuery,
  initialNow,
  currentUser,
}: {
  initialLeads: LeadCardData[];
  initialError: string | null;
  initialFilter: FilterValue;
  initialQuery: string;
  initialNow: string;
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Push the signed-in user's id into the API client so every client-side fetch
  // includes the correct X-User-Id header. Falls back to NEXT_PUBLIC_DEV_USER_ID
  // only when no real session exists.
  useEffect(() => {
    setApiUserId(currentUser.id);
    return () => setApiUserId(undefined);
  }, [currentUser.id]);

  // Reference time for every relative computation. Starts at server-rendered now (so SSR
  // and hydration agree) then updates after mount and ticks every minute.
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Debounced URL update on search input change.
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

  // Keyboard shortcuts: `/` to focus search.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('lead-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleFilter = (value: FilterValue) => {
    const params = new URLSearchParams();
    if (value !== 'all') params.set('status', value);
    if (query) params.set('q', query);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/');
  };

  const { todayLeads, otherLeads } = useMemo(() => {
    const today = initialLeads.filter((l) => isToday(l.nextFollowUpAt, now));
    const todayIds = new Set(today.map((l) => l.id));
    const others = initialLeads.filter((l) => !todayIds.has(l.id));
    return { todayLeads: today, otherLeads: others };
  }, [initialLeads, now]);

  const hasFilter = initialFilter !== 'all' || initialQuery.length > 0;
  const isEmpty = !initialError && initialLeads.length === 0;
  const dateLabel = longDate(now);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[26px] leading-none tracking-tightest">
              Leadflow
            </span>
            <span
              suppressHydrationWarning
              className="hidden font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute sm:inline"
            >
              {dateLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 bg-ink px-4 font-mono text-[10px] font-medium uppercase tracking-label text-paper transition-colors hover:bg-ink-soft active:translate-y-px"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Lead</span>
            </button>
            <UserMenu
              user={{
                name: currentUser.name,
                email: currentUser.email,
                image: currentUser.image,
              }}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* FILTER + SEARCH ROW */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FilterChips active={initialFilter} onChange={handleFilter} />
          <div className="relative w-full max-w-xs">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute"
            />
            <Input
              id="lead-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads"
              className="h-9 pl-9 pr-9 text-[13px]"
              aria-label="Search leads"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 items-center border border-line bg-paper px-1.5 font-mono text-[10px] text-ink-mute sm:inline-flex">
              {query ? '' : '/'}
            </kbd>
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-mute transition-colors hover:text-ink"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* ERROR */}
        {initialError && (
          <div className="border-l-2 border-accent bg-accent-soft px-4 py-3 text-[13px] text-accent-deep">
            <strong className="font-mono uppercase tracking-label text-[10px] mr-2">
              API unreachable
            </strong>
            <span className="text-ink-soft">{initialError}</span>
            <p className="mt-1 text-[11px] text-ink-mute">
              Start the API:{' '}
              <code className="font-mono">pnpm --filter @leadflow/api dev</code>. Confirm{' '}
              <code className="font-mono">NEXT_PUBLIC_DEV_USER_ID</code> is set in{' '}
              <code className="font-mono">.env</code>.
            </p>
          </div>
        )}

        {/* EMPTY */}
        {isEmpty && (
          <div className="border border-dashed border-line bg-surface px-8 py-20 text-center">
            <p className="font-display text-3xl text-ink">
              {hasFilter ? 'Nothing matches.' : 'No leads yet.'}
            </p>
            <p className="mt-3 text-sm text-ink-mute">
              {hasFilter
                ? 'Loosen your filter, or clear the search to see everyone.'
                : 'Click + New Lead to add your first one.'}
            </p>
          </div>
        )}

        {/* TODAY'S FOLLOW-UPS */}
        {todayLeads.length > 0 && (
          <section className="animate-fade-up">
            <SectionHeader
              label="Today's follow-ups"
              count={todayLeads.length}
              accent
            />
            <div className="border border-line bg-surface shadow-paper">
              {todayLeads.map((l) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  onClick={setOpenLeadId}
                  now={now}
                />
              ))}
            </div>
          </section>
        )}

        {/* ALL OTHERS */}
        {otherLeads.length > 0 && (
          <section className="animate-fade-up [animation-delay:80ms]">
            <SectionHeader
              label={todayLeads.length > 0 ? 'All other leads' : 'All leads'}
              count={otherLeads.length}
            />
            <div className="border border-line bg-surface shadow-paper">
              {otherLeads.map((l) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  onClick={setOpenLeadId}
                  now={now}
                />
              ))}
            </div>
          </section>
        )}

        {/* Footer eyebrow — adds a closing edge to the page */}
        <footer className="pt-8 text-center font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute/70">
          <span>Leadflow</span>
          <span aria-hidden className="mx-2 opacity-50">
            ·
          </span>
          <span>Field journal for sales</span>
          <span aria-hidden className="mx-2 opacity-50">
            ·
          </span>
          <span suppressHydrationWarning>{dateLabel}</span>
        </footer>
      </main>

      <LeadTimelineDialog
        leadId={openLeadId}
        open={openLeadId !== null}
        onOpenChange={(o) => {
          if (!o) setOpenLeadId(null);
        }}
        now={now}
      />
      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function SectionHeader({
  label,
  count,
  accent = false,
}: {
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="mb-3 flex items-end justify-between border-b border-line pb-2">
      <div className="flex items-baseline gap-3">
        {accent && (
          <span aria-hidden className="inline-block h-1.5 w-1.5 bg-accent" />
        )}
        <h2 className="font-display text-[26px] leading-none text-ink">{label}</h2>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
        {count} {count === 1 ? 'lead' : 'leads'}
      </span>
    </div>
  );
}
