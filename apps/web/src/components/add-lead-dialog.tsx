'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { CreateLeadSchema } from '@leadflow/shared';
import { cn } from '@/lib/utils';

export function AddLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setCompany('');
      setPhone('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = CreateLeadSchema.safeParse({
      name: name.trim(),
      company: company.trim() || null,
      phone: phone.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Validation failed');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      toast.success(`Added ${parsed.data.name}`);
      onOpenChange(false);
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create lead';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-7">
        <div className="mb-4">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
            New entry
          </p>
          <DialogTitle className="font-display text-[32px] leading-tight">
            Add a lead
          </DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <Label htmlFor="lead-name">
              Name <span className="text-accent">*</span>
            </Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              autoFocus
              required
              maxLength={100}
            />
          </Field>
          <Field>
            <Label htmlFor="lead-company">Company</Label>
            <Input
              id="lead-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              maxLength={100}
            />
          </Field>
          <Field>
            <Label htmlFor="lead-phone">Phone</Label>
            <Input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 555-0123"
              maxLength={30}
            />
          </Field>

          {error && (
            <div className="border-l-2 border-accent bg-accent-soft px-3 py-2 text-[12px] text-accent-deep">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 items-center px-3 font-mono text-[10px] uppercase tracking-label text-ink-mute transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 bg-ink px-4 font-mono text-[10px] font-medium uppercase tracking-label text-paper',
                'transition-colors hover:bg-ink-soft disabled:opacity-40 disabled:hover:bg-ink',
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving
                </>
              ) : (
                'Save lead'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}
