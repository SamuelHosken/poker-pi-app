import {
  CalendarDays,
  UserPlus,
  Star,
  ScanLine,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

/*
  A navegação deste admin depois que o torneio v1 saiu daqui.

  Perfis, Galeria e Lixeira eram telas do torneio e vivem hoje no app
  (app.mesapigroup.com). O que ficou é o que este projeto passou a ser: vender
  ingresso, conferir quem pagou, receber na portaria e ler avaliação.

  O "Painel" saiu da navegação principal em 14/08/2026 e virou o atalho externo
  abaixo. Ele mostrava o funil da LP, e o funil passou a ser desenhado no app,
  dentro da edição a que ele pertence. Um item que parece desta casa e pula de
  domínio ao ser tocado é pior do que um item declaradamente de fora: por isso
  ele tem endereço absoluto, ícone de saída e vive no menu secundário.
*/

export type NavItem = { href: string; label: string; Icon: LucideIcon };

/** O painel mora no app. Absoluto de propósito: não é rota deste projeto. */
export const PAINEL_NO_APP = "https://app.mesapigroup.com/admin";

export const PRIMARY_NAV: NavItem[] = [
  { href: "/admin/events", label: "Eventos", Icon: CalendarDays },
  { href: "/admin/inscritos", label: "Inscritos", Icon: UserPlus },
  { href: "/admin/checkin", label: "Check-in", Icon: ScanLine },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/admin/feedback", label: "Avaliações", Icon: Star },
  { href: PAINEL_NO_APP, label: "Painel no app", Icon: BarChart3 },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];
export const ALL_HREFS: string[] = ALL_NAV.map((n) => n.href);
