export default function DinheiroLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="h-3 w-20 animate-pulse rounded bg-ink-2" />
        <span className="h-5 w-16 animate-pulse rounded-full bg-ink-2" />
      </div>

      <header className="mt-4 space-y-2">
        <span className="block h-3 w-24 animate-pulse rounded bg-ink-2" />
        <span className="block h-8 w-48 animate-pulse rounded bg-ink-2" />
        <span className="block h-3 w-64 animate-pulse rounded bg-ink-2" />
      </header>

      <div className="mt-6 flex flex-1 flex-col gap-6 sm:mt-8">
        <div className="h-56 w-full animate-pulse rounded-2xl bg-ink-2" />
        <div className="space-y-3">
          <span className="block h-3 w-32 animate-pulse rounded bg-ink-2" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square w-full animate-pulse rounded-2xl bg-ink-2"
              />
            ))}
          </div>
        </div>
        <div className="mt-auto grid grid-cols-[1fr_2fr] gap-2">
          <div className="h-12 animate-pulse rounded-md bg-ink-2" />
          <div className="h-12 animate-pulse rounded-md bg-ink-2" />
        </div>
      </div>
    </div>
  );
}
