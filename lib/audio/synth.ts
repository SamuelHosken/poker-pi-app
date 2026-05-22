/**
 * V1.3 — Efeitos sonoros sintetizados via Web Audio API.
 *
 * Não depende de arquivos .mp3. Cada efeito gera tons/envelopes em runtime.
 * Honra o toggle de som existente (`isSoundEnabled`).
 *
 * Vantagens:
 *   - Zero assets pra baixar
 *   - Latência mínima (sem fetch)
 *   - Funciona offline no SW cache não-existente
 *   - Controle total de timing e amplitude
 */

import { isSoundEnabled } from "@/lib/audio/play-sound";

export type SynthEffect =
  | "join" // jogador entra na mesa
  | "eliminate" // jogador eliminado
  | "chip-show" // mostrar fichas na TV
  | "reaction" // reação emoji
  | "level-up" // mudança de blind
  | "champion"; // campeão coroado

let ctxRef: AudioContext | null = null;
let masterGainRef: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctxRef) {
    // Resumes if suspended (autoplay policy)
    if (ctxRef.state === "suspended") {
      void ctxRef.resume();
    }
    return ctxRef;
  }
  type Win = Window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? (window as Win).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 1.0; // V1.3: subido (era 0.5) — som muito baixo
  master.connect(ctx.destination);
  ctxRef = ctx;
  masterGainRef = master;
  return ctx;
}

/** Toca um tom único com ADSR simples (attack curto, decay exponencial). */
function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startMs: number,
  durationMs: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const start = ctx.currentTime + startMs / 1000;
  const end = start + durationMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(start);
  osc.stop(end + 0.02);
}

/** Tom com glide de freq (frequência muda no tempo). */
function glide(
  ctx: AudioContext,
  dest: AudioNode,
  freqFrom: number,
  freqTo: number,
  startMs: number,
  durationMs: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const start = ctx.currentTime + startMs / 1000;
  const end = start + durationMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), end);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(start);
  osc.stop(end + 0.02);
}

export function playSynth(effect: SynthEffect, volumeScale = 1): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const dest = masterGainRef ?? ctx.destination;
  const v = (n: number) => n * volumeScale;

  // V1.3 — volumes 2-3× maiores do que antes pra serem audíveis em TV/celular
  switch (effect) {
    case "join": {
      // Pop ascendente alegre — 2 notas rápidas
      tone(ctx, dest, 523, 0, 110, v(0.5), "triangle"); // C5
      tone(ctx, dest, 784, 80, 160, v(0.55), "triangle"); // G5
      break;
    }
    case "eliminate": {
      // Descida grave + thud
      glide(ctx, dest, 480, 120, 0, 420, v(0.7), "sawtooth");
      tone(ctx, dest, 90, 380, 260, v(0.8), "square");
      break;
    }
    case "chip-show": {
      // Cha-ching: arpejo brilhante ascendente
      tone(ctx, dest, 880, 0, 140, v(0.5), "triangle"); // A5
      tone(ctx, dest, 1318, 90, 140, v(0.55), "triangle"); // E6
      tone(ctx, dest, 1760, 180, 240, v(0.55), "triangle"); // A6
      tone(ctx, dest, 2349, 270, 380, v(0.5), "sine"); // D7 (shimmer)
      break;
    }
    case "reaction": {
      // Pop bem curtinho mas mais presente
      tone(ctx, dest, 660, 0, 70, v(0.45), "triangle");
      tone(ctx, dest, 880, 50, 110, v(0.4), "sine");
      break;
    }
    case "level-up": {
      // Arpejo de chord triunfal (C - E - G - C)
      tone(ctx, dest, 523, 0, 220, v(0.55), "triangle"); // C5
      tone(ctx, dest, 659, 100, 220, v(0.55), "triangle"); // E5
      tone(ctx, dest, 784, 200, 300, v(0.6), "triangle"); // G5
      tone(ctx, dest, 1046, 320, 450, v(0.65), "triangle"); // C6
      break;
    }
    case "champion": {
      // Fanfarra: chord sustentado + arpejo final
      const sustain = 1200;
      tone(ctx, dest, 523, 0, sustain, v(0.4), "triangle"); // C5
      tone(ctx, dest, 659, 0, sustain, v(0.4), "triangle"); // E5
      tone(ctx, dest, 784, 0, sustain, v(0.4), "triangle"); // G5
      // Arpejo brilhante por cima
      tone(ctx, dest, 1046, 200, 280, v(0.55), "triangle");
      tone(ctx, dest, 1318, 380, 280, v(0.6), "triangle");
      tone(ctx, dest, 1568, 560, 280, v(0.65), "triangle");
      tone(ctx, dest, 2093, 740, 700, v(0.75), "triangle");
      break;
    }
  }
}
