import { redirect } from "next/navigation";

/*
  O painel mudou de casa em 14/08/2026. Esta rota so existe para o link antigo
  nao morrer.

  Ele desenhava o funil da LP a partir de `site_events`, e o app desenhava outro
  do mesmo dado, na aba Ingressos de `/admin/eventos/<id>/vendas`. Dois calculos
  da mesma coisa divergem na primeira mudanca, e o daqui ja tinha divergido: ele
  contava LINHA, o app precisa contar SESSAO, e nenhum dos dois escopava por
  edicao. A regra do `CLAUDE.md` da raiz resolve o empate sem discussao: se um
  admin vai OLHAR, e no app; se um comprador vai PAGAR, e aqui.

  `lib/analytics/dashboard.ts` foi apagado junto. O que a rota nova NAO levou foi
  a aba de inscricoes: os convidados foram para `/admin/inscritos`, deste mesmo
  projeto, porque `convite_opens` so e escrito por `/convite/[slug]`, que e
  pagina daqui.

  O destino e a LISTA de eventos, e nao a tela de uma edicao: o id que o app usa
  e `v2_events.id`, e este projeto so conhece `events.id`. Resolver a ponte aqui
  significaria este repositorio ler a tabela do app so para montar um link, e um
  toque a mais na lista custa menos que esse acoplamento.
*/
const APP = process.env.V2_BASE_URL || "https://app.mesapigroup.com";

export const dynamic = "force-dynamic";

export default async function DashboardMudouDeCasa() {
  redirect(`${APP}/admin`);
}
