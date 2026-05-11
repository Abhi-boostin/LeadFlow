export default function HomePage() {
  return (
    <main className="container mx-auto max-w-4xl py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-600">LeadFlow</h1>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add New Lead
        </button>
      </header>
      <p className="mt-8 text-sm text-muted-foreground">
        Scaffold ready. Lead list, filters, and timeline dialog land in the next commits.
      </p>
    </main>
  );
}
