import {
  CalendarDays,
  Users,
  UserPlus,
  Images,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; Icon: LucideIcon };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/admin/events", label: "Eventos", Icon: CalendarDays },
  { href: "/admin/profiles", label: "Perfis", Icon: Users },
  { href: "/admin/inscritos", label: "Inscritos", Icon: UserPlus },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/admin/galeria", label: "Galeria", Icon: Images },
  { href: "/admin/feedback", label: "Avaliações", Icon: Star },
  { href: "/admin/events/lixeira", label: "Lixeira", Icon: Trash2 },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];
export const ALL_HREFS: string[] = ALL_NAV.map((n) => n.href);
