import { NewEventForm } from "./new-event-form";

export const metadata = {
  title: "Novo evento · Poker Pi",
};

export default function NewEventPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Novo evento
        </span>
        <h1 className="mt-1 font-display text-4xl font-light tracking-tight text-paper">
          Criar torneio
        </h1>
      </header>

      <NewEventForm />
    </main>
  );
}
