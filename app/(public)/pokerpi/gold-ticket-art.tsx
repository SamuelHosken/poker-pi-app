import Image from "next/image";

/**
 * Arte decorativa da placa de ouro (o "ingresso" como objeto de desejo).
 * Apenas visual — o ingresso funcional com QR é a página/e-mail.
 */
export function GoldTicketArt() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* brilho dourado atrás */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(217,184,118,0.35), rgba(10,10,12,0) 70%)" }}
      />
      <Image
        src="/event/ticket-gold-2.png"
        alt="Ingresso Poker Pi em placa de ouro"
        width={620}
        height={930}
        sizes="(max-width: 640px) 80vw, 300px"
        className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
        priority={false}
      />
    </div>
  );
}
