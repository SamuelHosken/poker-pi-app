/**
 * Tela neutra exibida na rota pública `/tv/[id]` quando o evento não existe
 * (ou foi soft-deletado). Mantém a TV ligada e "limpa" — pronta pra um novo
 * evento — em vez de mostrar 404 ou dados obsoletos.
 */
export function EmptyTV({ reason }: { reason?: "deleted" | "missing" } = {}) {
  const subtitle =
    reason === "deleted"
      ? "Esse evento foi removido. Aguardando o próximo."
      : "Aguardando o próximo evento.";

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-ink text-paper">
      <div className="flex flex-col items-center gap-6 px-8 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-gold">
          Poker Pi
        </span>
        <h1 className="font-display text-5xl font-light tracking-tight text-paper sm:text-6xl md:text-7xl">
          Sem nenhum evento
        </h1>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-gray-soft sm:text-sm">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
