"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, ALL_HREFS } from "./nav-config";
import { activeHref } from "@/lib/admin-nav";

export function AdminBottomNav() {
  const pathname = usePathname();
  const active = activeHref(pathname, ALL_HREFS);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = SECONDARY_NAV.some((n) => n.href === active);

  return (
    <>
      <nav
        className="glass fixed inset-x-3 z-40 flex items-center justify-around rounded-[22px] px-1.5 py-2 md:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {PRIMARY_NAV.map(({ href, label, Icon }) => {
          const isOn = href === active;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isOn ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium no-underline ${
                isOn ? "text-gold-soft" : "text-muted-foreground"
              }`}
            >
              <Icon className={`size-[22px] ${isOn ? "text-gold" : ""}`} />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium ${
            moreActive ? "text-gold-soft" : "text-muted-foreground"
          }`}
        >
          <MoreHorizontal className={`size-[22px] ${moreActive ? "text-gold" : ""}`} />
          Mais
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="glass absolute inset-x-0 bottom-0 rounded-t-3xl p-4"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <p className="px-1 pb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Mais
            </p>
            <div className="flex flex-col gap-1">
              {SECONDARY_NAV.map(({ href, label, Icon }) => {
                const isOn = href === active;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={isOn ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm no-underline ${
                      isOn
                        ? "border border-gold/30 bg-gold/10 text-paper"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <Icon className="size-5 text-gold" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
