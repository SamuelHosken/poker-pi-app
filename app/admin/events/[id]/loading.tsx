export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 space-y-10">
      <div className="h-4 w-32 animate-pulse rounded bg-ink-2" />
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded bg-ink-2" />
        <div className="h-16 w-3/4 animate-pulse rounded bg-ink-2" />
        <div className="h-4 w-48 animate-pulse rounded bg-ink-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-lg bg-ink-2" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-ink-2" />
    </main>
  );
}
