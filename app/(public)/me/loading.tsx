export default function MeLoading() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <span className="block h-3 w-20 animate-pulse rounded bg-ink-2" />
          <span className="block h-8 w-48 animate-pulse rounded bg-ink-2" />
        </div>
        <span className="h-10 w-10 animate-pulse rounded-md bg-ink-2" />
      </header>

      <section className="mt-8 space-y-4 flex-1 sm:mt-10">
        <span className="block h-3 w-32 animate-pulse rounded bg-ink-2" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-ink-2"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
