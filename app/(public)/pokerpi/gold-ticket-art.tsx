import Image from "next/image";

/**
 * Arte decorativa da placa de ouro (PNG sem fundo) flutuando no dark.
 * Apenas visual. O ingresso funcional com QR é a página/e-mail.
 */
export function GoldTicketArt() {
  return (
    <div className="relative w-full">
      {/* brilho dourado atrás */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 scale-125 blur-3xl"
        style={{ background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(216,176,108,0.4), rgba(23,18,15,0) 70%)" }}
      />
      <Image
        src="/event/ticket-gold-cut.webp"
        alt="Ingresso Poker Pi em placa de ouro"
        width={1200}
        height={1789}
        sizes="(max-width: 1024px) 80vw, 460px"
        className="w-full drop-shadow-[0_40px_70px_rgba(0,0,0,0.7)]"
      />
    </div>
  );
}
