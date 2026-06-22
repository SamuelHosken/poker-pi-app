"use client";

import { useEffect, useState } from "react";
import { avatarInitial } from "@/lib/avatar";

/**
 * V1.3 — Avatar compartilhado. Se tem URL, mostra a foto; senão, mostra
 * a inicial do nome estilizada. Usa `<img>` (não next/image) porque os
 * domínios são dinâmicos do Supabase Storage e queremos cache simples.
 * Falls back to initial when image fails to load (onError).
 */
export function AvatarImage({
  name,
  url,
  size = "md",
  variant = "outline",
  className,
}: {
  name: string;
  url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "outline" | "gold" | "inline";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const sizeClass = {
    sm: "size-9 text-sm",
    md: "size-12 text-lg",
    lg: "size-16 text-2xl",
    xl: "size-32 text-6xl sm:size-40 sm:text-7xl",
  }[size];

  const variantClass = {
    outline: "border border-gold/40 bg-ink-2 text-gold",
    gold: "bg-gold text-ink",
    inline: "border border-line bg-ink text-gold",
  }[variant];

  const cls = `flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-light ${sizeClass} ${variantClass} ${className ?? ""}`;

  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`${cls} object-cover`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={cls} aria-label={name}>
      {avatarInitial(name)}
    </div>
  );
}
