'use client';
import { useState } from 'react';
import { Pin, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterChips, type FilterValue } from '@/components/filter-chips';
import { LeadCard, type LeadCardData } from '@/components/lead-card';
import { isToday } from '@/lib/format';

// Placeholder data matching the wireframe.
// Replaced by real API fetches in the next commit.
const PLACEHOLDER_LEADS: LeadCardData[] = [
  {
    id: '1',
    name: 'Sarah Connor',
    company: 'Acme Corp',
    phone: '555-0199',
    status: 'PROPOSAL_SENT',
    nextFollowUpAt: (() => {
      const d = new Date();
      d.setHours(14, 0, 0, 0);
      return d.toISOString();
    })(),
    lastDiscussionAt: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 2);
      return d.toISOString();
    })(),
    lastNote: 'Sent pricing tier PDF. Said she would review with her boss.',
  },
  {
    id: '2',
    name: 'Hank Scorpio',
    company: 'Globex',
    phone: null,
    status: 'NEW',
    nextFollowUpAt: null,
    lastDiscussionAt: (() => {
      const d = new Date();
      d.setHours(d.getHours() - 2);
      return d.toISOString();
    })(),
    lastNote: 'Inbound lead from website contact form.',
  },
  {
    id: '3',
    name: 'Bill Lumbergh',
    company: 'Initech',
    phone: null,
    status: 'CONTACTED',
    nextFollowUpAt: null,
    lastDiscussionAt: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    })(),
    lastNote: 'Left a voicemail with his assistant.',
  },
  {
    id: '4',
    name: 'Bruce Wayne',
    company: 'Wayne Ent',
    phone: null,
    status: 'WON',
    nextFollowUpAt: null,
    lastDiscussionAt: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 21);
      return d.toISOString();
    })(),
    lastNote: 'Contract signed! Sending welcome package.',
  },
];

export default function HomePage() {
  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered =
    filter === 'all'
      ? PLACEHOLDER_LEADS
      : PLACEHOLDER_LEADS.filter((l) => l.status === filter);

  const todayLeads = filtered.filter((l) => isToday(l.nextFollowUpAt));
  const todayIds = new Set(todayLeads.map((l) => l.id));
  const otherLeads = filtered.filter((l) => !todayIds.has(l.id));

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

      <main className="container mx-auto max-w-5xl space-y-8 py-8">
        <FilterChips active={filter} onChange={setFilter} />

        {todayLeads.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Pin className="h-3.5 w-3.5" />
              Today's Follow-ups
            </h2>
            <div className="space-y-3">
              {todayLeads.map((l) => (
                <LeadCard key={l.id} lead={l} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            All Leads
          </h2>
          <div className="space-y-3">
            {otherLeads.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">
                No leads match this filter.
              </p>
            ) : (
              otherLeads.map((l) => <LeadCard key={l.id} lead={l} />)
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
