const FAQS = [
  { q: "Tem rebuy?", a: "Tem. 1 rebuy por jogador até o nível 3 dos blinds. Depois disso, é mata-mata." },
  { q: "O que está incluso?", a: "Jantar e bebidas a noite toda. No plano Open Bar, o bar fica liberado do início ao fim." },
  { q: "Como funciona o check-in?", a: "Você recebe o ingresso com QR Code por e-mail na hora do pagamento. É só apresentar na entrada." },
  { q: "Posso transferir meu ingresso?", a: "Pode. Fale com a organização que a gente troca o nome do ingresso." },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
      <p className="text-center font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand">Dúvidas</p>
      <h2 className="mt-3 text-center font-condensed text-[clamp(34px,7vw,64px)] font-extrabold uppercase leading-[0.9] text-cream">
        Perguntas frequentes
      </h2>

      <dl className="mt-10 border-t border-white/10">
        {FAQS.map((f) => (
          <div key={f.q} className="border-b border-white/10 py-6">
            <dt className="font-condensed text-2xl font-bold uppercase leading-tight text-cream">{f.q}</dt>
            <dd className="mt-2 text-base leading-relaxed text-cream-soft">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
