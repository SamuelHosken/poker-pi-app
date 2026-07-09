import { Reveal } from "./reveal";
import { BlurWord } from "./blur-word";
import { FlickerText } from "./flicker-text";
import { TrackedLink } from "./tracked-link";

const WHATSAPP_GROUP = "https://chat.whatsapp.com/KJmiMjtr2a26tgr8Tz0Zn9?mode=gi_t";

const FAQS = [
  { q: "Tem rebuy?", a: "Tem sim, quando você quiser. Cada jogador tem direito a até 2 rebuys, e o rebuy custa o dobro do valor de entrada do torneio." },
  { q: "O que está incluso?", a: "Jantar e bebidas a noite toda. No plano Open Bar, o bar fica liberado do início ao fim." },
  { q: "Como funciona o check-in?", a: "Você recebe o ingresso com QR Code por e-mail na hora do pagamento. É só apresentar na entrada." },
  { q: "Posso transferir meu ingresso?", a: "Pode. Fale com a organização no grupo do Poker Pi que a gente troca o nome do ingresso." },
];

export function Faq({ eventId }: { eventId: string }) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <p className="text-center font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-bright">
          <FlickerText>Dúvidas</FlickerText>
        </p>
        <h2 className="mt-3 text-center font-condensed text-[clamp(34px,7vw,64px)] font-extrabold uppercase leading-[0.9] text-cream">
          Perguntas <BlurWord amount={0.7}>frequentes</BlurWord>
        </h2>
      </Reveal>

      <dl className="mt-10 border-t border-white/10">
        {FAQS.map((f, i) => (
          <Reveal key={f.q} delay={i * 0.06} className="border-b border-white/10 py-6">
            <dt className="font-condensed text-2xl font-bold uppercase leading-tight text-cream">{f.q}</dt>
            <dd className="mt-2 text-base leading-relaxed text-cream-soft">{f.a}</dd>
          </Reveal>
        ))}
      </dl>

      <Reveal className="mt-10 flex flex-col items-center gap-3 text-center">
        <p className="text-base text-cream-soft">Ainda com dúvida? Fala com a gente.</p>
        <TrackedLink
          event="whatsapp_click"
          eventId={eventId}
          href={WHATSAPP_GROUP}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center rounded-full border-2 border-cream/70 px-7 font-condensed text-base font-bold uppercase tracking-wide text-cream transition-colors hover:border-red-bright hover:text-red-bright"
        >
          Entrar no grupo do Poker Pi
        </TrackedLink>
      </Reveal>
    </section>
  );
}
