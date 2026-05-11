'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { CreateLeadSchema } from '@leadflow/shared';

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
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Add New Lead</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Doe"
              autoFocus
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-company">
              Company{' '}
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="lead-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Stark Industries"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">
              Phone <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 555-0123"
              maxLength={30}
            />
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || submitting}>
              {submitting ? 'Saving...' : 'Save Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
