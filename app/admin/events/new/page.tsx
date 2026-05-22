import Link from "next/link";
import { NewEventForm } from "./new-event-form";

export const metadata = {
  title: "Novo evento · Poker Pi",
};

export default function NewEventPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <Link
        href="/admin/events"
        className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
      >
        ← Eventos
      </Link>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Novo evento
        </span>
        <h1 className="font-display text-3xl font-light tracking-tight text-paper sm:text-4xl">
          Criar torneio
        </h1>
      </header>

      <NewEventForm />
    </main>
  );
}
