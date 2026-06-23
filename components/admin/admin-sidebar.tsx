"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Spade } from "lucide-react";
import { ALL_NAV, ALL_HREFS } from "./nav-config";
import { activeHref } from "@/lib/admin-nav";
import { AccountMenu } from "./account-menu";

export function AdminSidebar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const active = activeHref(pathname, ALL_HREFS);

  return (
    <aside className="glass sticky top-3 m-3 hidden h-[calc(100svh-1.5rem)] w-60 flex-col rounded-3xl p-3 md:flex">
      <div className="flex items-center gap-2.5 px-2 py-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-gold text-ink">
          <Spade className="size-4" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Poker Pi</span>
      </div>

      <p className="px-2 pb-2 pt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Gestão
      </p>

      <nav className="flex flex-col gap-1">
        {ALL_NAV.map(({ href, label, Icon }) => {
          const isOn = href === active;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isOn ? "page" : undefined}
              className={
                isOn
                  ? "flex items-center gap-3 rounded-xl border border-gold/30 bg-gradient-to-b from-gold/15 to-gold/5 px-3 py-2.5 text-sm text-paper no-underline"
                  : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-white/5 hover:text-paper"
              }
            >
              <Icon className={`size-[18px] ${isOn ? "text-gold" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-3">
        <AccountMenu name={name} avatarUrl={avatarUrl} variant="sidebar" />
      </div>
    </aside>
  );
}
