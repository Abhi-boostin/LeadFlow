'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, Check, ChevronDown, Phone, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { LeadStatusValues, type LeadStatus } from '@leadflow/shared';

type AiMetadata = {
  summary?: string;
  promptUsed?: string;
  model?: string;
  generatedAt?: string;
};

type Discussion = {
  id: string;
  note: string;
  followUpAt: string | null;
  createdAt: string;
  source: string;
  aiMetadata?: AiMetadata | null;
};

type LeadDetail = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  nextFollowUpAt: string | null;
  lastDiscussionAt: string | null;
  createdAt: string;
  discussions: Discussion[];
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL_SENT: 'Proposal Sent',
  WON: 'Won',
  LOST: 'Lost',
};

export function LeadTimelineDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discussion form state
  const [note, setNote] = useState('');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('09:00');
  const [submitting, setSubmitting] = useState(false);

  // Per-discussion summarise state
  const [summarisingId, setSummarisingId] = useState<string | null>(null);

  // Reset state whenever the dialog opens for a new lead.
  useEffect(() => {
    if (!open || !leadId) {
      setLead(null);
      setError(null);
      setNote('');
      setFollowUpEnabled(false);
      setFollowUpDate('');
      setFollowUpTime('09:00');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<{ lead: LeadDetail }>(`/api/v1/leads/${leadId}`)
      .then((data) => {
        if (cancelled) return;
        setLead(data.lead);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load lead');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  const handleStatusChange = async (next: LeadStatus) => {
    if (!lead || next === lead.status) return;
    const previous = lead.status;
    // Optimistic update.
    setLead({ ...lead, status: next });
    try {
      await apiFetch<{ lead: { status: LeadStatus } }>(`/api/v1/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`Status: ${STATUS_LABELS[next]}`);
      startTransition(() => router.refresh());
    } catch (e) {
      // Rollback.
      setLead({ ...lead, status: previous });
      const message = e instanceof Error ? e.message : 'Status update failed';
      setError(message);
      toast.error(message);
    }
  };

  const handleSummarise = async (discussionId: string) => {
    if (!lead || summarisingId) return;
    setSummarisingId(discussionId);
    try {
      const { summary } = await apiFetch<{ summary: string; cached: boolean }>(
        `/api/v1/discussions/${discussionId}/summarize`,
        { method: 'POST' },
      );
      setLead({
        ...lead,
        discussions: lead.discussions.map((d) =>
          d.id === discussionId
            ? { ...d, aiMetadata: { ...(d.aiMetadata ?? {}), summary } }
            : d,
        ),
      });
      toast.success('Summarised');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Summarise failed';
      toast.error(message);
    } finally {
      setSummarisingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !note.trim() || submitting) return;

    let followUpAt: string | null = null;
    if (followUpEnabled && followUpDate) {
      const time = followUpTime || '09:00';
      const d = new Date(`${followUpDate}T${time}`);
      if (Number.isNaN(d.getTime())) {
        setError('Follow-up date or time is invalid');
        return;
      }
      followUpAt = d.toISOString();
    }

    setSubmitting(true);
    setError(null);
    try {
      const { discussion } = await apiFetch<{ discussion: Discussion }>(
        `/api/v1/leads/${lead.id}/discussions`,
        {
          method: 'POST',
          body: JSON.stringify({ note: note.trim(), followUpAt }),
        },
      );
      setLead({
        ...lead,
        discussions: [discussion, ...lead.discussions],
        lastDiscussionAt: discussion.createdAt,
        nextFollowUpAt: followUpAt ?? lead.nextFollowUpAt,
      });
      setNote('');
      setFollowUpEnabled(false);
      setFollowUpDate('');
      setFollowUpTime('09:00');
      toast.success(followUpAt ? 'Note saved, follow-up set' : 'Note saved');
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save note';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {loading && (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        )}

        {!loading && error && !lead && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {lead && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="min-w-0">
                <DialogTitle className="truncate text-xl">
                  {lead.name}
                  {lead.company && (
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      ({lead.company})
                    </span>
                  )}
                </DialogTitle>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {lead.phone}
                  </a>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm hover:bg-muted"
                  >
                    <StatusBadge status={lead.status} />
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {LeadStatusValues.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => {
                        void handleStatusChange(s);
                      }}
                    >
                      {lead.status === s ? (
                        <Check className="mr-2 h-3.5 w-3.5" />
                      ) : (
                        <span className="mr-2 inline-block h-3.5 w-3.5" />
                      )}
                      {STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {error && lead && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                {error}
              </div>
            )}

            <DiscussionTimeline
              discussions={lead.discussions}
              onSummarise={handleSummarise}
              summarisingId={summarisingId}
            />

            <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Log a new discussion..."
                rows={3}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={followUpEnabled}
                    onChange={(e) => setFollowUpEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Set Follow-up
                </label>
                {followUpEnabled && (
                  <>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="h-9 w-auto"
                      required
                    />
                    <Input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="h-9 w-auto"
                    />
                  </>
                )}
                <Button
                  type="submit"
                  disabled={!note.trim() || submitting}
                  className="ml-auto bg-foreground text-background hover:bg-foreground/90"
                >
                  {submitting ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DiscussionTimeline({
  discussions,
  onSummarise,
  summarisingId,
}: {
  discussions: Discussion[];
  onSummarise: (id: string) => void;
  summarisingId: string | null;
}) {
  if (discussions.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        No discussions logged yet. Add one below.
      </p>
    );
  }
  return (
    <ol className="relative space-y-4 border-l-2 border-muted pl-6">
      {discussions.map((d) => {
        const summary = d.aiMetadata?.summary;
        const isSummarising = summarisingId === d.id;
        return (
          <li key={d.id} className="relative">
            <span
              className={cn(
                'absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full border-2 border-background',
                d.source === 'TRANSCRIPTION' ? 'bg-purple-500' : 'bg-blue-500',
              )}
            />
            <div className="text-xs text-muted-foreground">
              {new Date(d.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              <span className="ml-2">({timeAgo(d.createdAt)})</span>
            </div>
            <div className="mt-1.5 rounded-md border bg-background p-3">
              {summary && (
                <div className="mb-3 rounded-md border border-purple-200 bg-purple-50/60 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-700">
                    <Sparkles className="h-3 w-3" />
                    AI Summary
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-purple-950">{summary}</p>
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm">{d.note}</p>
              {d.followUpAt && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  <Bell className="h-3 w-3" />
                  Follow-up:{' '}
                  {new Date(d.followUpAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={() => onSummarise(d.id)}
                disabled={isSummarising}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                {isSummarising ? 'Summarising...' : summary ? 'Re-summarise' : 'Summarise'}
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
