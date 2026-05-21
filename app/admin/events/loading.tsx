export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-ink-2" />
      <div className="h-12 w-64 animate-pulse rounded bg-ink-2" />
      <ul className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="h-16 animate-pulse rounded-lg bg-ink-2" />
        ))}
      </ul>
    </main>
  );
}
