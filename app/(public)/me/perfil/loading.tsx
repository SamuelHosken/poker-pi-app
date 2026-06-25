export default function PerfilLoading() {
  return (
    <div className="flex flex-col">
      <span className="h-3 w-16 animate-pulse rounded bg-ink-2" />
      <header className="mt-4 space-y-2">
        <span className="block h-3 w-24 animate-pulse rounded bg-ink-2" />
        <span className="block h-9 w-2/3 animate-pulse rounded bg-ink-2" />
      </header>
      <div className="mt-6 h-44 animate-pulse rounded-xl bg-ink-2" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-lg bg-ink-2" />
        <div className="h-20 animate-pulse rounded-lg bg-ink-2" />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-ink-2" />
        ))}
      </div>
    </div>
  );
}
