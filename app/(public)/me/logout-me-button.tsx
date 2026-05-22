import { logoutAction } from "@/app/admin/login/actions";

export function LogoutMeButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "rgba(212,175,55,0.3)",
        }}
        className="-mr-3 inline-flex h-11 cursor-pointer items-center px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper active:text-paper"
      >
        Sair
      </button>
    </form>
  );
}
