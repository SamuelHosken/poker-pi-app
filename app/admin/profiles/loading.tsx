export default function ProfilesLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <header className="space-y-4 sm:flex sm:items-end sm:justify-between sm:space-y-0">
        <div className="space-y-2">
          <span className="block h-3 w-20 animate-pulse rounded bg-ink-2" />
          <span className="block h-9 w-48 animate-pulse rounded bg-ink-2" />
        </div>
        <div className="h-12 w-full animate-pulse rounded-md bg-ink-2 sm:w-40" />
      </header>

      <ul className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-16 animate-pulse rounded-md bg-ink-2" />
        ))}
      </ul>
    </main>
  );
}
