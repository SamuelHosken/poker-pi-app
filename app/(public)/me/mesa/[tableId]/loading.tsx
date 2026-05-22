export default function MesaLoading() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-2">
        <span className="h-3 w-16 animate-pulse rounded bg-ink-2" />
        <span className="h-5 w-20 animate-pulse rounded-full bg-ink-2" />
      </div>

      <header className="mt-4 space-y-2">
        <span className="block h-3 w-24 animate-pulse rounded bg-ink-2" />
        <span className="block h-8 w-40 animate-pulse rounded bg-ink-2" />
      </header>

      <div className="mt-8 flex flex-1 flex-col items-center gap-6">
        <div className="relative mx-auto aspect-square w-full max-w-sm animate-pulse">
          <div className="absolute left-1/2 top-1/2 h-[52%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-ink-2" />
        </div>

        <div className="h-12 w-full animate-pulse rounded-md bg-ink-2" />
        <div className="h-32 w-full animate-pulse rounded-md bg-ink-2" />
      </div>
    </main>
  );
}
