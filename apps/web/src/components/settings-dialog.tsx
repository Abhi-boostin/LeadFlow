'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';

const PRESETS: { label: string; prompt: string }[] = [
  {
    label: 'Action items only',
    prompt:
      'Extract action items and owners from the discussion. Format as a bulleted list. Skip context or background that is not an action.',
  },
  {
    label: 'Dates & money',
    prompt:
      'Surface only: dates mentioned, money amounts, deadlines, named commitments. Use a bulleted list. Skip everything else.',
  },
  {
    label: 'Full summary',
    prompt:
      'Summarise the discussion in 3 bullets covering: what was discussed, blockers raised, next steps.',
  },
  {
    label: 'Sales objections',
    prompt:
      'List every objection the prospect raised and how I responded. Format as Q: ... A: ... pairs.',
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
      toast.success('Settings saved');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI Preferences
        </DialogTitle>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Presets
            </Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPrompt(p.prompt)}
                  disabled={loading}
                  className="rounded-full border bg-background px-3 py-1 text-xs transition hover:bg-muted disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summarisation-prompt">Summarisation prompt</Label>
            <Textarea
              id="summarisation-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder={
                loading ? 'Loading...' : 'Tell us how you want discussions summarised...'
              }
              disabled={loading}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              Sent as the system prompt to every AI summary. Be specific: &quot;extract dates and
              money&quot; beats &quot;summarise well&quot;. Re-summarise on any past discussion to
              apply your new rule.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={loading || saving || !prompt.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
