'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const PRESETS: { label: string; sub: string; prompt: string }[] = [
  {
    label: 'Action items',
    sub: 'Bullet list of owners + tasks',
    prompt:
      'Extract action items and their owners from the discussion. Format as a bulleted list. Skip background or context that is not a task.',
  },
  {
    label: 'Dates & money',
    sub: 'Just the commitments',
    prompt:
      'Surface only: dates mentioned, money amounts, deadlines, named commitments. Use a bulleted list. Skip everything else.',
  },
  {
    label: 'Full summary',
    sub: 'Three-bullet brief',
    prompt:
      'Summarise the discussion in 3 bullets covering: what was discussed, blockers raised, next steps.',
  },
  {
    label: 'Sales objections',
    sub: 'Q-and-A format',
    prompt:
      'List every objection the prospect raised and how I responded to each. Format as Q: ... A: ... pairs.',
  },
];

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<{ user: { summarizationPrompt: string } }>('/api/v1/me')
      .then(({ user }) => {
        if (!cancelled) setPrompt(user.summarizationPrompt);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Failed to load settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const save = async () => {
    if (!prompt.trim() || saving) return;
    setSaving(true);
    try {
      await apiFetch('/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ summarizationPrompt: prompt.trim() }),
      });
      toast.success('Preferences saved');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-7">
        <div className="mb-2">
          <p className="mb-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
            <Sparkles className="h-3 w-3" />
            Preferences
          </p>
          <DialogTitle className="font-display text-[32px] leading-tight">
            How should AI write for you?
          </DialogTitle>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mute">
            This prompt sits behind every summarisation. The more specific you are, the
            sharper the output. Try a preset or write your own.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">Presets</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPrompt(p.prompt)}
                  disabled={loading}
                  className={cn(
                    'group flex flex-col items-start border border-line bg-surface p-3 text-left transition-colors',
                    'hover:border-ink hover:bg-paper-subtle disabled:opacity-50',
                  )}
                >
                  <span className="font-display text-[15px] leading-tight text-ink">
                    {p.label}
                  </span>
                  <span className="mt-0.5 font-mono text-[10px] uppercase tracking-label text-ink-mute">
                    {p.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summarisation-prompt">Custom prompt</Label>
            <Textarea
              id="summarisation-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder={
                loading ? 'Loading…' : 'Tell Leadflow how to write your summaries.'
              }
              disabled={loading}
              maxLength={2000}
            />
            <p className="font-mono text-[10px] uppercase tracking-label text-ink-mute">
              {prompt.length} / 2000
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 items-center px-3 font-mono text-[10px] uppercase tracking-label text-ink-mute transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={loading || saving || !prompt.trim()}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 bg-ink px-4 font-mono text-[10px] font-medium uppercase tracking-label text-paper',
                'transition-colors hover:bg-ink-soft disabled:opacity-40 disabled:hover:bg-ink',
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving
                </>
              ) : (
                'Save preferences'
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
