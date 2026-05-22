export default function TvConfigLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <div className="flex items-center justify-between gap-2">
        <span className="h-3 w-16 animate-pulse rounded bg-ink-2" />
        <span className="h-5 w-24 animate-pulse rounded-full bg-ink-2" />
      </div>

      <header className="space-y-2">
        <span className="block h-3 w-32 animate-pulse rounded bg-ink-2" />
        <span className="block h-9 w-2/3 animate-pulse rounded bg-ink-2" />
        <span className="block h-3 w-48 animate-pulse rounded bg-ink-2" />
      </header>

      {/* Telão público */}
      <div className="h-44 animate-pulse rounded-xl bg-ink-2" />

      {/* Mesas */}
      <div className="space-y-3">
        <span className="block h-3 w-24 animate-pulse rounded bg-ink-2" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-ink-2" />
          ))}
        </div>
      </div>
    </main>
  );
}
