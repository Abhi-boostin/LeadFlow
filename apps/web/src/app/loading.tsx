export default function Loading() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="font-display text-2xl leading-none">Leadflow</div>
          <div className="h-9 w-32 animate-pulse bg-paper-deep" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-4 w-2/3 max-w-md animate-pulse bg-paper-deep" />
          <div className="h-9 w-48 animate-pulse bg-paper-deep" />
        </div>
        <div className="border border-line bg-surface">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-5 border-b border-line px-6 py-5 last:border-b-0"
            >
              <div className="flex-1 space-y-2">
                <div className="h-5 w-1/3 animate-pulse bg-paper-deep" />
                <div className="h-3 w-2/3 animate-pulse bg-paper-deep" />
                <div className="h-3 w-1/4 animate-pulse bg-paper-deep" />
              </div>
              <div className="h-5 w-20 animate-pulse bg-paper-deep" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
