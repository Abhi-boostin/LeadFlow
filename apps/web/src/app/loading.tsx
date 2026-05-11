import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-5xl items-center justify-between py-4">
          <div className="text-xl font-bold text-blue-600">LeadFlow</div>
          <Skeleton className="h-10 w-32" />
        </div>
      </header>
      <main className="container mx-auto max-w-5xl space-y-6 py-8">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </main>
    </div>
  );
}
