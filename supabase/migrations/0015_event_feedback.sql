-- =========================================================================
-- V1.3: avaliação pós-evento (event_feedback)
-- =========================================================================
-- Formulário público que o organizador manda pra quem foi no poker.
-- 5 notas de 0 a 10 + 1 campo aberto de sugestão. Sem auth: qualquer pessoa
-- com o link responde (role anon). Leitura é só do admin (via service role,
-- que ignora RLS) — não há policy de SELECT pública pra manter respostas
-- privadas.

create table public.event_feedback (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  rating_organizacao  integer not null check (rating_organizacao between 0 and 10),
  rating_torneio      integer not null check (rating_torneio between 0 and 10),
  rating_jantar       integer not null check (rating_jantar between 0 and 10),
  rating_bar          integer not null check (rating_bar between 0 and 10),
  rating_estrutura    integer not null check (rating_estrutura between 0 and 10),
  suggestion          text,
  created_at          timestamptz not null default now()
);

create index idx_event_feedback_event on public.event_feedback(event_id);

alter table public.event_feedback enable row level security;

-- Qualquer um (mesmo anônimo) pode enviar, desde que o evento exista e não
-- esteja na lixeira. As notas já são validadas pelos CHECKs acima.
create policy event_feedback_insert_public on public.event_feedback
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.deleted_at is null
    )
  );

-- Sem policy de SELECT: respostas só são lidas pelo painel admin, que usa o
-- service role (bypassa RLS).
