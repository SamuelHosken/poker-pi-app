"use client";

import Link from "next/link";
import { useState } from "react";
import { Gamepad2, LogOut } from "lucide-react";
import { AvatarImage } from "@/components/ui/avatar-image";
import { logoutAction } from "@/app/admin/login/actions";

export function AccountMenu({
  name,
  avatarUrl,
  variant,
}: {
  name: string;
  avatarUrl?: string | null;
  variant: "sidebar" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const panelPos =
    variant === "sidebar"
      ? "bottom-full left-0 mb-2"
      : "top-full right-0 mt-2";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          variant === "sidebar"
            ? "flex w-full items-center gap-3 rounded-2xl border border-hair bg-white/[0.03] p-2.5 text-left transition-colors hover:bg-white/[0.06]"
            : "flex size-11 items-center justify-center rounded-full"
        }
      >
        <AvatarImage name={name} url={avatarUrl} size="sm" variant="outline" />
        {variant === "sidebar" && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block text-xs text-muted-foreground">Jogar / Sair</span>
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div role="menu" className={`glass absolute z-50 w-52 rounded-2xl p-1.5 ${panelPos}`}>
            <Link
              href="/me"
              prefetch
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm no-underline hover:bg-white/5"
            >
              <Gamepad2 className="size-4 text-gold" /> Jogar como jogador
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" /> Sair
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
