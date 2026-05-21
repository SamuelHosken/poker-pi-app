"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/admin/login/actions";

export function LogoutMeButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => logoutAction())}
      disabled={pending}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper disabled:opacity-50"
    >
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}
