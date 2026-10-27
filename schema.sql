-- Gestão Fios Encomendas: executar uma vez no Supabase (SQL Editor > New query > Run)

create table if not exists public.encomendas (
  id         text primary key,                 -- identificador da encomenda (ex.: 2026-625)
  data       jsonb not null,                   -- encomenda completa: artigos, composição, entradas, devoluções, malha
  updated_at timestamptz not null default now()
);

-- Segurança: só utilizadores com sessão iniciada acedem aos dados
alter table public.encomendas enable row level security;

drop policy if exists "encomendas_select" on public.encomendas;
drop policy if exists "encomendas_insert" on public.encomendas;
drop policy if exists "encomendas_update" on public.encomendas;
drop policy if exists "encomendas_delete" on public.encomendas;

create policy "encomendas_select" on public.encomendas for select to authenticated using (true);
create policy "encomendas_insert" on public.encomendas for insert to authenticated with check (true);
create policy "encomendas_update" on public.encomendas for update to authenticated using (true) with check (true);
create policy "encomendas_delete" on public.encomendas for delete to authenticated using (true);

-- Atualização em tempo real entre dispositivos (opcional, mas recomendado)
do $$
begin
  alter publication supabase_realtime add table public.encomendas;
exception when duplicate_object then null;
end $$;
