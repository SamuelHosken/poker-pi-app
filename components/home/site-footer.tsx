import { HOME } from "./content";

/**
 * Rodapé institucional — descrição do negócio + contato (grupo do WhatsApp).
 * O Asaas costuma exigir contato e descrição visíveis.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-hair bg-ink px-5 py-12 sm:px-10 sm:py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md">
          <div className="font-display text-2xl font-light tracking-tight text-paper">
            Poker <span className="italic text-gold">Pi</span>
            <span className="text-red-poker">.</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-soft">
            {HOME.description}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-gray-mid">
            Contato
          </span>
          <a
            href={HOME.whatsappGroup}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-paper transition-colors hover:text-gold"
          >
            Grupo do WhatsApp →
          </a>
          <span className="font-mono text-[11px] text-gray-mid">
            {HOME.city}
          </span>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl items-center justify-between border-t border-hair pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-mid">
        <span>© 2026 {HOME.brand}</span>
        <span className="hidden sm:inline">O poker é matemática ♠</span>
      </div>
    </footer>
  );
}
