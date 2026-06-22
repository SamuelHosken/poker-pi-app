export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-svh bg-ink text-paper"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}
