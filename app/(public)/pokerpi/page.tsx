import { getActiveEventPublic } from "@/lib/tickets/orders";
import { hasCapacity } from "@/lib/tickets/capacity";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function PokerPiPage() {
  const data = await getActiveEventPublic();

  if (!data) {
    return (
      <main className="min-h-dvh bg-ink text-paper flex flex-col items-center justify-center text-center px-5">
        <div className="text-gold text-6xl font-bold drop-shadow-[0_0_30px_rgba(217,184,118,0.35)]">π</div>
        <p className="mt-6 text-lg text-paper">Nenhum evento com vendas abertas no momento.</p>
        <p className="mt-2 text-sm text-gray-soft">Fique de olho — em breve.</p>
      </main>
    );
  }

  const { event, ticketTypes, soldCount } = data;
  const soldOut = !event.salesOpen || !hasCapacity(soldCount, event.capacity);
  const remaining = event.capacity != null ? Math.max(0, event.capacity - soldCount) : null;
  const whenText = new Date(event.startsAt).toLocaleString("pt-BR", {
    dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo",
  });

  return (
    <main className="min-h-dvh bg-ink text-paper">
      {/* HERO */}
      <section className="relative flex flex-col items-center px-5 pt-16 pb-12 text-center">
        <div className="text-gold text-6xl font-bold drop-shadow-[0_0_30px_rgba(217,184,118,0.35)]">π</div>
        <h1 className="mt-4 text-3xl font-bold text-gold sm:text-4xl">{event.name}</h1>
        <p className="mt-3 text-gray-soft">{whenText}</p>
        <p className="mt-1 text-sm text-gray-soft max-w-md">{event.locationText}</p>
        {remaining != null && (
          <p className="mt-4 text-xs uppercase tracking-wide text-gold/80">
            {remaining > 0 ? `${remaining} de ${event.capacity} vagas restantes` : "Esgotado"}
          </p>
        )}
        {!soldOut && (
          <a href="#ingressos" className="mt-6 rounded-full bg-gold px-7 py-3 font-bold text-ink">Garantir meu ingresso</a>
        )}
      </section>

      {/* INGRESSOS / CHECKOUT */}
      <section id="ingressos" className="mx-auto max-w-xl px-5 pb-20">
        <h2 className="mb-5 text-center text-xl font-semibold text-paper">Escolha seu ingresso</h2>
        <CheckoutForm types={ticketTypes} soldOut={soldOut} />
      </section>
    </main>
  );
}
