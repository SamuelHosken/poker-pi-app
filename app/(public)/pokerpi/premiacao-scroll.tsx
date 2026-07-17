"use client";
import { useEffect, useRef } from "react";
import { CtaLink } from "./cta-link";

/**
 * Seção-âncora da premiação: um troféu π dourado (frames renderizados no
 * Higgsfield) gira preso na tela enquanto o scroll revela os degraus da
 * premiação, alternando os lados. O troféu vem em preto puro e some via
 * `mix-blend-mode: screen`, então o preto da seção o costura sem borda.
 *
 * Tudo que é movimento (troféu deslizando esquerda/direita) e texto é feito
 * aqui em CSS/HTML, não dentro do vídeo. Ver [[ux-frontend-workstream]].
 */

// Frames extraídos do vídeo do turntable (public/event/trofeu/f-000.webp ...).
const FRAME_COUNT = 81;
const framePath = (i: number) => `/event/trofeu/f-${String(i).padStart(3, "0")}.webp`;
const POSTER = "/event/trofeu/poster.webp";

// Onde o troféu fica (deslocamento do centro, em % da largura do palco) em
// cada ponto do scroll. Center -> esquerda -> direita -> esquerda -> center.
// Posição horizontal (% da largura). Em 3 etapas: cada prêmio tem um platô
// (o troféu para no lado enquanto o valor fica na tela), depois volta a andar.
const X_KEYS: [number, number][] = [
  [0.0, 0],
  [0.22, -19],
  [0.38, -19], // segura na esquerda (1º)
  [0.47, 19],
  [0.63, 19], // segura na direita (2º)
  [0.72, -19],
  [0.86, -19], // segura na esquerda (3º)
  [1.0, 0],
];
// Progresso do GIRO (frame) em função do scroll: platôs alinhados aos prêmios,
// então o troféu gira -> PARA (segura o scroll) -> gira, em 3 etapas.
// Valores "desenrolados" (podem passar de 1): o frame é (valor % 1), então o
// giro sempre anda pra frente e "dá a volta" no seam sem rodar pra trás.
// Começa em 0.90 (frame dos ~9s do vídeo, near-front) e fecha voltando à frente.
const ROT_KEYS: [number, number][] = [
  [0.0, 0.9],
  [0.22, 1.1],
  [0.38, 1.1], // parado no 1º (de frente, π legível)
  [0.47, 1.52],
  [0.63, 1.52], // parado no 2º (3/4)
  [0.72, 1.65],
  [0.86, 1.65], // parado no 3º (3/4 cheio, sem perfil fino)
  [1.0, 2.0],
];
// Deslocamento vertical (% da altura): sobe no início e no fim pra o texto
// (R$ 650 na abertura, recap no fecho) caber embaixo sem sobrepor o troféu.
const Y_KEYS: [number, number][] = [
  [0.0, -17],
  [0.14, -3],
  [0.86, -3],
  [1.0, -24],
];

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function smoothstep(t: number) {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}
// Interpola uma tabela de keyframes [progresso, valor] para o progresso p.
function interpKeys(keys: [number, number][], p: number) {
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (p <= b[0]) return lerp(a[1], b[1], smoothstep((p - a[0]) / (b[0] - a[0])));
  }
  return keys[keys.length - 1]![1];
}
// Opacidade de um bloco centrado em `at`, com janela `w`, mais uma
// distância de translate pra entrada suave.
function beat(p: number, at: number, w: number) {
  const d = Math.abs(p - at) / w; // 0 no centro, 1 na borda
  const vis = smoothstep(1 - clamp(d, 0, 1));
  return { opacity: vis, shift: (1 - vis) * 26 };
}

type Prize = { tag: string; value: string; note?: string; side: "left" | "right" };
const PRIZES: Prize[] = [
  { tag: "1º lugar", value: "400", note: "+ troféu do campeão", side: "right" },
  { tag: "2º lugar", value: "200", side: "left" },
  { tag: "3º lugar", value: "50", side: "right" },
];
const PRIZE_AT = [0.3, 0.55, 0.78];

export function PremiacaoScroll({ eventId, soldOut }: { eventId: string; soldOut: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deskCanvasRef = useRef<HTMLCanvasElement>(null);
  const trophyRef = useRef<HTMLDivElement>(null);
  const overlineRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const prizeRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    // No desktop a seção vira layout estático com vídeo em loop; não precisa do
    // scroll-scrubbing nem de pré-carregar os 81 frames.
    if (window.matchMedia("(min-width: 1024px)").matches) return;

    const frames: HTMLImageElement[] = [];
    let loaded = 0;
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.onload = () => {
        loaded++;
        onScroll();
      };
      img.src = framePath(i);
      frames[i] = img;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;

    function sizeCanvas() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }

    function paint(frameIdx: number) {
      if (!canvas || !ctx) return;
      const img = frames[clamp(frameIdx, 0, FRAME_COUNT - 1) | 0];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      // object-fit: contain, centralizado no palco, um pouco menor pra sobrar
      // respiro pro texto ao lado e embaixo.
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * 0.66;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const p = clamp(-rect.top / (total || 1), 0, 1);

        paint(((interpKeys(ROT_KEYS, p) % 1) + 1) % 1 * (FRAME_COUNT - 1));

        if (trophyRef.current) {
          trophyRef.current.style.transform = `translate(${interpKeys(X_KEYS, p)}%, ${interpKeys(Y_KEYS, p)}%)`;
        }
        if (overlineRef.current) {
          overlineRef.current.style.opacity = String(1 - smoothstep((p - 0.86) / 0.1));
        }
        if (introRef.current) {
          const b = beat(p, 0.02, 0.14);
          introRef.current.style.opacity = String(b.opacity);
          introRef.current.style.transform = `translateY(${b.shift}px)`;
        }
        if (finalRef.current) {
          const b = beat(p, 0.99, 0.12);
          finalRef.current.style.opacity = String(b.opacity);
          finalRef.current.style.transform = `translateY(${-b.shift}px)`;
        }
        PRIZE_AT.forEach((at, i) => {
          const node = prizeRefs.current[i];
          if (!node) return;
          const b = beat(p, at, 0.13);
          const dir = PRIZES[i]!.side === "right" ? 1 : -1;
          node.style.opacity = String(b.opacity);
          node.style.transform = `translateX(${dir * b.shift}px)`;
        });
      });
    }

    sizeCanvas();
    const onResize = () => {
      sizeCanvas();
      onScroll();
    };
    // Primeira pintura quando os frames-chave chegarem.
    const warm = setInterval(() => {
      onScroll();
      if (loaded >= Math.min(6, FRAME_COUNT)) clearInterval(warm);
    }, 120);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();
    return () => {
      clearInterval(warm);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
    <section ref={sectionRef} className="relative bg-black lg:hidden" style={{ height: "440vh" }}>
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* overline fixa */}
        <div
          ref={overlineRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-20 will-change-[opacity]"
        >
          <p className="font-condensed text-sm font-bold uppercase tracking-[0.28em] text-red-bright">
            Premiação garantida
          </p>
        </div>

        {/* troféu (frames em canvas, some no preto via screen) */}
        <div
          ref={trophyRef}
          className="absolute inset-0 z-10 will-change-transform"
          style={{ transform: "translateX(0%)" }}
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ mixBlendMode: "screen" }}
            aria-hidden
          />
          {/* poster/fallback embaixo do canvas caso os frames não carreguem */}
          <img
            src={POSTER}
            alt="Troféu Poker Pi"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-contain opacity-0"
            style={{ mixBlendMode: "screen" }}
          />
        </div>

        {/* intro: R$ 650 embaixo, troféu sobe pra não sobrepor */}
        <div
          ref={introRef}
          className="absolute inset-x-0 bottom-[8%] z-20 flex flex-col items-center px-6 text-center will-change-transform"
        >
          <h2 className="font-condensed font-extrabold uppercase leading-[0.82] text-cream">
            <span className="block text-[clamp(64px,21vw,116px)]">
              <span className="align-top text-[0.4em] font-bold text-cream/80">R$ </span>
              <span className="text-red-bright">650</span>
            </span>
          </h2>
          <p className="mt-4 max-w-[15rem] text-sm leading-relaxed text-cream/60">
            em prêmios, no mínimo garantido. Role pra ver a divisão.
          </p>
        </div>

        {/* degraus da premiação */}
        {PRIZES.map((prize, i) => (
          <div
            key={prize.tag}
            ref={(n) => {
              prizeRefs.current[i] = n;
            }}
            className={[
              "absolute top-1/2 z-20 flex -translate-y-1/2 flex-col will-change-transform",
              prize.side === "right"
                ? "right-[7%] items-end text-right"
                : "left-[7%] items-start text-left",
            ].join(" ")}
            style={{ opacity: 0, maxWidth: "52%" }}
          >
            <span className="font-condensed text-lg font-bold uppercase tracking-[0.22em] text-red-bright">
              {prize.tag}
            </span>
            <span className="mt-1 whitespace-nowrap font-condensed text-[clamp(56px,17vw,88px)] font-extrabold uppercase leading-[0.86] text-cream">
              <span className="align-top text-[0.4em] font-bold text-cream/80">R$ </span>
              {prize.value}
            </span>
            {prize.note && (
              <span className="mt-2 max-w-[11rem] text-sm leading-snug text-cream/55">
                {prize.note}
              </span>
            )}
          </div>
        ))}

        {/* fecho: escala de premiação + buy-in + CTA */}
        <div
          ref={finalRef}
          className="absolute inset-x-0 bottom-[13%] z-20 flex flex-col items-center gap-[18px] px-[22px] text-center will-change-transform"
          style={{ opacity: 0 }}
        >
          <div className="flex w-full max-w-xs flex-col">
            {PRIZES.map((prize, i) => (
              <div
                key={prize.tag}
                className={[
                  "flex items-center justify-between gap-3.5 py-[11px]",
                  i < PRIZES.length - 1 ? "border-b border-white/[0.09]" : "",
                ].join(" ")}
              >
                <span className="font-condensed text-[15px] font-extrabold uppercase tracking-[0.18em] text-red-bright">
                  {i + 1}º Lugar
                </span>
                <span className="flex flex-col items-end">
                  <span className="whitespace-nowrap font-condensed text-[40px] font-extrabold leading-[0.85] text-cream">
                    <span className="align-top text-[0.42em] text-cream/70">R$ </span>
                    {prize.value}
                  </span>
                  {prize.note && (
                    <span className="mt-[3px] text-[11px] leading-none text-cream/50">{prize.note}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-[9px]">
            <span className="font-condensed text-[11px] font-bold uppercase tracking-[0.2em] text-cream/40">
              Entrada do torneio · à parte
            </span>
            <div className="flex gap-2.5">
              {[
                { k: "Buy-in", v: "25" },
                { k: "Re-buy · 1x", v: "45" },
              ].map((b) => (
                <div
                  key={b.k}
                  className="flex items-baseline gap-[7px] rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"
                >
                  <span className="font-condensed text-xs font-bold uppercase tracking-[0.1em] text-cream/50">
                    {b.k}
                  </span>
                  <span className="whitespace-nowrap font-condensed text-xl font-extrabold text-cream">
                    <span className="align-top text-[0.6em] text-cream/60">R$ </span>
                    {b.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {!soldOut && (
            <CtaLink
              eventId={eventId}
              className="inline-flex h-[54px] items-center rounded-full bg-red-bright px-[34px] font-condensed text-lg font-bold uppercase tracking-wide text-cream transition-transform active:scale-[0.99]"
            >
              Quero disputar
            </CtaLink>
          )}
        </div>
      </div>
    </section>

    {/* Desktop: troféu girando em loop de um lado, prêmios do outro (sem scroll) */}
    <section className="hidden bg-black lg:block">
      <div className="mx-auto grid max-w-6xl grid-cols-[0.9fr_1.1fr] items-center gap-12 px-8 py-32">
        <div className="flex justify-center">
          <video
            className="w-full max-w-sm"
            style={{ mixBlendMode: "screen" }}
            src="/event/trofeu/giro360.mp4"
            poster={POSTER}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
          />
        </div>

        <div className="flex flex-col items-start">
          <p className="font-condensed text-sm font-bold uppercase tracking-[0.28em] text-red-bright">
            Premiação garantida
          </p>
          <h2 className="mt-3 font-condensed text-[clamp(56px,7vw,104px)] font-extrabold uppercase leading-[0.85] text-cream">
            <span className="align-top text-[0.4em] font-bold text-cream/80">R$ </span>
            <span className="text-red-bright">650</span>
          </h2>
          <p className="mt-3 max-w-sm text-base text-cream/60">em prêmios, no mínimo garantido.</p>

          <div className="mt-8 flex w-full max-w-md flex-col">
            {PRIZES.map((prize, i) => (
              <div
                key={prize.tag}
                className={[
                  "flex items-center justify-between gap-4 py-3.5",
                  i < PRIZES.length - 1 ? "border-b border-white/[0.09]" : "",
                ].join(" ")}
              >
                <span className="font-condensed text-base font-extrabold uppercase tracking-[0.18em] text-red-bright">
                  {i + 1}º Lugar
                </span>
                <span className="flex items-baseline gap-3">
                  {prize.note && <span className="text-sm text-cream/50">{prize.note}</span>}
                  <span className="whitespace-nowrap font-condensed text-[44px] font-extrabold leading-none text-cream">
                    <span className="align-top text-[0.42em] text-cream/70">R$ </span>
                    {prize.value}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-center gap-4">
            <span className="font-condensed text-[11px] font-bold uppercase tracking-[0.2em] text-cream/40">
              Entrada · à parte
            </span>
            <div className="flex gap-2.5">
              {[
                { k: "Buy-in", v: "25" },
                { k: "Re-buy · 1x", v: "45" },
              ].map((b) => (
                <div
                  key={b.k}
                  className="flex items-baseline gap-[7px] rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"
                >
                  <span className="font-condensed text-xs font-bold uppercase tracking-[0.1em] text-cream/50">
                    {b.k}
                  </span>
                  <span className="whitespace-nowrap font-condensed text-xl font-extrabold text-cream">
                    <span className="align-top text-[0.6em] text-cream/60">R$ </span>
                    {b.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!soldOut && (
            <CtaLink
              eventId={eventId}
              className="mt-9 inline-flex h-14 items-center rounded-full bg-red-bright px-9 font-condensed text-lg font-bold uppercase tracking-wide text-cream transition-transform hover:bg-red-deep active:scale-[0.99]"
            >
              Quero disputar
            </CtaLink>
          )}
        </div>
      </div>
    </section>
    </>
  );
}
