'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertOctagon,
  Bell,
  Check,
  ChevronDown,
  Loader2,
  Mic,
  Phone,
  Sparkles,
  Square,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch } from '@/lib/api';
import { isToday, isOverdue, timeAgo, timestamp, timeOnly } from '@/lib/format';
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
  PROPOSAL_SENT: 'Proposal sent',
  WON: 'Won',
  LOST: 'Lost',
};

export function LeadTimelineDialog({
  leadId,
  open,
  onOpenChange,
  now,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: Date;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compose form
  const [note, setNote] = useState('');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('09:00');
  const [submitting, setSubmitting] = useState(false);

  // AI summarise
  const [summarisingId, setSummarisingId] = useState<string | null>(null);

  // Recording
  type RecordState = 'idle' | 'recording' | 'uploading';
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup recording resources on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Reset state and fetch lead whenever opened for a new id.
  useEffect(() => {
    if (!open || !leadId) {
      setLead(null);
      setError(null);
      setNote('');
      setFollowUpEnabled(false);
      setFollowUpDate('');
      setFollowUpTime('09:00');
      setRecordState('idle');
      setRecordSeconds(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<{ lead: LeadDetail }>(`/api/v1/leads/${leadId}`)
      .then((data) => {
        if (!cancelled) setLead(data.lead);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load lead');
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
    setLead({ ...lead, status: next });
    try {
      await apiFetch<{ lead: { status: LeadStatus } }>(`/api/v1/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`Marked ${STATUS_LABELS[next]}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setLead({ ...lead, status: previous });
      const message = e instanceof Error ? e.message : 'Status update failed';
      setError(message);
      toast.error(message);
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
        { method: 'POST', body: JSON.stringify({ note: note.trim(), followUpAt }) },
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
      toast.success(followUpAt ? 'Logged. Follow-up set.' : 'Note logged.');
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save note';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
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
      toast.error(err instanceof Error ? err.message : 'Summarise failed');
    } finally {
      setSummarisingId(null);
    }
  };

  // Recording
  const uploadRecording = async (blob: Blob) => {
    if (!lead) return;
    setRecordState('uploading');
    const form = new FormData();
    form.append('file', blob, 'recording.webm');
    try {
      const { discussion } = await apiFetch<{ discussion: Discussion }>(
        `/api/v1/leads/${lead.id}/transcriptions`,
        { method: 'POST', body: form },
      );
      setLead({
        ...lead,
        discussions: [discussion, ...lead.discussions],
        lastDiscussionAt: discussion.createdAt,
      });
      toast.success('Meeting transcribed');
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setRecordState('idle');
      setRecordSeconds(0);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recordedChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        void uploadRecording(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecordSeconds(0);
      setRecordState('recording');
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      toast.error('Microphone unavailable. Check permissions.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const followUpToday = lead && isToday(lead.nextFollowUpAt, now);
  const followUpOverdue =
    lead &&
    !followUpToday &&
    isOverdue(lead.nextFollowUpAt, now) &&
    lead.status !== 'WON' &&
    lead.status !== 'LOST';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0">
        {/* Custom scroll area so header can stay sticky if we want */}
        <div className="max-h-[92vh] overflow-y-auto">
          {loading && (
            <div className="px-7 py-16 text-center text-[13px] text-ink-mute">
              <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
              Loading lead…
            </div>
          )}

          {!loading && error && !lead && (
            <div className="m-7 border-l-2 border-accent bg-accent-soft px-4 py-3 text-[13px] text-accent-deep">
              {error}
            </div>
          )}

          {lead && (
            <div className="p-7">
              {/* HEADER */}
              <header className="mb-6 pr-8">
                <DialogTitle className="font-display text-[40px] leading-[1.05] tracking-tightest">
                  {lead.name}
                </DialogTitle>
                {lead.company && (
                  <div className="mt-1 font-display italic text-[22px] leading-tight text-ink-mute">
                    {lead.company}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-label">
                  {/* Phone */}
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 text-ink-mute transition-colors hover:text-ink"
                    >
                      <Phone className="h-3 w-3" aria-hidden />
                      {lead.phone}
                    </a>
                  )}

                  {/* Status dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-ink-mute transition-colors hover:text-ink"
                      >
                        <span className="opacity-80">Status</span>
                        <StatusBadge status={lead.status} />
                        <ChevronDown className="h-3 w-3" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="border border-line bg-surface p-1 shadow-lift"
                    >
                      {LeadStatusValues.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onSelect={() => void handleStatusChange(s)}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 px-2 py-1.5 font-sans text-[13px]',
                            lead.status === s && 'bg-paper-deep',
                          )}
                        >
                          <Check
                            className={cn(
                              'h-3 w-3',
                              lead.status === s ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {STATUS_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Follow-up indicator */}
                  {followUpToday && lead.nextFollowUpAt && (
                    <span className="inline-flex items-center gap-1.5 text-ink">
                      <Bell className="h-3 w-3" aria-hidden />
                      <span suppressHydrationWarning>
                        Today {timeOnly(lead.nextFollowUpAt)}
                      </span>
                    </span>
                  )}
                  {followUpOverdue && lead.nextFollowUpAt && (
                    <span className="inline-flex items-center gap-1.5 text-accent">
                      <AlertOctagon className="h-3 w-3" aria-hidden />
                      Overdue
                    </span>
                  )}
                </div>
              </header>

              {error && lead && (
                <div className="mb-4 border-l-2 border-accent bg-accent-soft px-3 py-2 text-[12px] text-accent-deep">
                  {error}
                </div>
              )}

              {/* TIMELINE */}
              <section
                aria-label="Discussion timeline"
                className="mb-6 border-t border-line pt-6"
              >
                <DiscussionTimeline
                  discussions={lead.discussions}
                  onSummarise={handleSummarise}
                  summarisingId={summarisingId}
                  now={now}
                />
              </section>

              {/* RECORD BAR */}
              <RecordBar
                state={recordState}
                seconds={recordSeconds}
                onStart={startRecording}
                onStop={stopRecording}
              />

              {/* COMPOSE FORM */}
              <form
                onSubmit={handleSubmit}
                className="mt-4 border border-line bg-paper-subtle"
              >
                <div className="border-b border-line bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
                  Log a discussion
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you talk about? Quick bullets work — Leadflow's AI can summarise later."
                  rows={3}
                  className="border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:shadow-none"
                />
                <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface px-4 py-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-label text-ink-mute">
                    <input
                      type="checkbox"
                      checked={followUpEnabled}
                      onChange={(e) => setFollowUpEnabled(e.target.checked)}
                      className="h-3.5 w-3.5 accent-ink"
                    />
                    Set follow-up
                  </label>
                  {followUpEnabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="h-8 w-auto py-1 text-[12px]"
                        required
                      />
                      <Input
                        type="time"
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
                        className="h-8 w-auto py-1 text-[12px]"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={!note.trim() || submitting}
                    className={cn(
                      'ml-auto inline-flex h-8 items-center gap-1.5 bg-ink px-4 font-mono text-[10px] font-medium uppercase tracking-label text-paper',
                      'transition-colors hover:bg-ink-soft disabled:opacity-40 disabled:hover:bg-ink',
                    )}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving
                      </>
                    ) : (
                      'Save note'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------------- */

function DiscussionTimeline({
  discussions,
  onSummarise,
  summarisingId,
  now,
}: {
  discussions: Discussion[];
  onSummarise: (id: string) => void;
  summarisingId: string | null;
  now: Date;
}) {
  if (discussions.length === 0) {
    return (
      <div className="border border-dashed border-line bg-paper-subtle px-6 py-10 text-center">
        <p className="font-display text-xl text-ink">No discussions yet.</p>
        <p className="mt-2 text-[13px] text-ink-mute">
          Record a meeting above, or log a note below.
        </p>
      </div>
    );
  }

  // Group by day for journal-style date dividers.
  const groups = groupByDay(discussions);

  return (
    <ol className="relative space-y-7">
      <div
        aria-hidden
        className="absolute left-[7px] top-1 bottom-1 w-px bg-line"
      />
      {groups.map((group) => (
        <li key={group.dayKey} className="relative">
          <div className="mb-3 flex items-center gap-2 pl-7">
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
              {group.label}
            </span>
            <span aria-hidden className="h-px flex-1 bg-line-soft" />
          </div>
          <ol className="space-y-5">
            {group.items.map((d) => {
              const summary = d.aiMetadata?.summary;
              const isSummarising = summarisingId === d.id;
              const dotColor =
                d.source === 'TRANSCRIPTION'
                  ? 'bg-[hsl(var(--dot-transcription))]'
                  : 'bg-[hsl(var(--dot-manual))]';
              return (
                <li key={d.id} className="relative pl-7">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-[3px] top-2 h-2.5 w-2.5 rounded-full ring-2 ring-surface',
                      dotColor,
                    )}
                  />
                  {/* Timestamp + source */}
                  <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-ink-mute">
                    <span suppressHydrationWarning>{timestamp(d.createdAt)}</span>
                    <span aria-hidden>·</span>
                    <span suppressHydrationWarning>{timeAgo(d.createdAt, now)}</span>
                    {d.source === 'TRANSCRIPTION' && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-[hsl(var(--dot-transcription))]">
                          Transcribed
                        </span>
                      </>
                    )}
                  </div>

                  {/* AI summary — margin annotation */}
                  {summary && (
                    <div className="mb-2 border-l-2 border-ink/40 bg-paper-subtle px-3 py-2.5 animate-fade-in">
                      <div className="mb-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-eyebrow text-ink-mute">
                        <Sparkles className="h-3 w-3" aria-hidden />
                        AI summary
                      </div>
                      <p className="font-display italic text-[15px] leading-snug text-ink">
                        {summary}
                      </p>
                    </div>
                  )}

                  {/* Note body */}
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                    {d.note}
                  </p>

                  {/* Follow-up marker on this discussion */}
                  {d.followUpAt && (
                    <div className="mt-2 inline-flex items-center gap-1.5 border-l border-line-strong pl-2 font-mono text-[10px] uppercase tracking-label text-ink-soft">
                      <Bell className="h-3 w-3" aria-hidden />
                      Follow-up:{' '}
                      <span suppressHydrationWarning>{timestamp(d.followUpAt)}</span>
                    </div>
                  )}

                  {/* Summarise action */}
                  <button
                    type="button"
                    onClick={() => onSummarise(d.id)}
                    disabled={isSummarising}
                    className={cn(
                      'mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-label transition-colors',
                      'text-ink-mute hover:text-ink disabled:opacity-50',
                    )}
                  >
                    {isSummarising ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="h-3 w-3" aria-hidden />
                    )}
                    {isSummarising
                      ? 'Summarising'
                      : summary
                        ? 'Re-summarise'
                        : 'Summarise'}
                  </button>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function groupByDay(discussions: Discussion[]) {
  const map = new Map<string, Discussion[]>();
  for (const d of discussions) {
    const dayKey = new Date(d.createdAt).toDateString();
    const arr = map.get(dayKey) ?? [];
    arr.push(d);
    map.set(dayKey, arr);
  }
  return Array.from(map.entries()).map(([dayKey, items]) => {
    const date = new Date(dayKey);
    const label = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
    return { dayKey, items, label };
  });
}

function formatRecordTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function RecordBar({
  state,
  seconds,
  onStart,
  onStop,
}: {
  state: 'idle' | 'recording' | 'uploading';
  seconds: number;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border bg-surface px-4 py-3 transition-colors',
        state === 'recording' ? 'border-accent/60' : 'border-line',
      )}
    >
      {state === 'idle' && (
        <>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 bg-accent px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-label text-paper transition-colors hover:bg-accent-deep"
          >
            <Mic className="h-3.5 w-3.5" />
            Record meeting
          </button>
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-mute">
            Auto-transcribe & summarise with your AI rules
          </span>
        </>
      )}
      {state === 'recording' && (
        <>
          <span
            aria-hidden
            className="recording-dot inline-block h-2.5 w-2.5 rounded-full bg-accent"
          />
          <span className="font-mono text-[11px] uppercase tracking-label text-accent-deep">
            Recording
          </span>
          <span className="font-mono text-[14px] tabular-nums text-ink">
            {formatRecordTime(seconds)}
          </span>
          <button
            type="button"
            onClick={onStop}
            className="ml-auto inline-flex items-center gap-1.5 border border-line bg-paper px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-label text-ink transition-colors hover:bg-paper-deep"
          >
            <Square className="h-3 w-3" />
            Stop
          </button>
        </>
      )}
      {state === 'uploading' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-ink-mute" />
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-mute">
            Transcribing & summarising…
          </span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-label text-ink-mute">
            ~30s
          </span>
        </>
      )}
    </div>
  );
}
