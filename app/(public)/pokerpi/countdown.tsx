"use client";
import { useEffect, useState } from "react";
import { Reveal } from "./reveal";
import { FlickerText } from "./flicker-text";

type Parts = { days: number; hours: number; minutes: number };

function diff(targetMs: number): Parts | null {
  const ms = targetMs - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
  };
}

/**
 * Contador discreto pra noite. Fica mais abaixo na página de propósito: a LP é
 * chique, não é topo de funil agressivo. Sem urgência barata, só um respiro
 * elegante antes do fechamento. O cálculo é só visual (marketing), não tem nada
 * a ver com o cronômetro do torneio.
 */
export function Countdown({ targetIso }: { targetIso: string }) {
  const targetMs = new Date(targetIso).getTime();
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    setParts(diff(targetMs));
    const id = setInterval(() => setParts(diff(targetMs)), 30_000);
    return () => clearInterval(id);
  }, [targetMs]);

  // Antes de montar (SSR) ou se a data já passou, não renderiza nada.
  if (!parts) return null;

  const cells: { n: number; l: string }[] = [
    { n: parts.days, l: parts.days === 1 ? "Dia" : "Dias" },
    { n: parts.hours, l: "Horas" },
    { n: parts.minutes, l: "Min" },
  ];

  return (
    <section className="border-y border-white/10 bg-ink-warm">
      <Reveal className="mx-auto flex max-w-6xl flex-col items-center px-5 py-16 text-center sm:px-8 lg:py-20">
        <p className="font-condensed text-sm font-bold uppercase tracking-[0.3em] text-cream-soft">
          <FlickerText>A noite se aproxima</FlickerText>
        </p>
        <div className="mt-7 flex items-start gap-8 sm:gap-14">
          {cells.map((c) => (
            <div key={c.l} className="flex flex-col items-center">
              <span className="font-condensed text-[clamp(48px,11vw,96px)] font-extrabold leading-none text-cream tabular-nums">
                {String(c.n).padStart(2, "0")}
              </span>
              <span className="mt-2 font-condensed text-xs font-bold uppercase tracking-[0.24em] text-red-bright">
                {c.l}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
