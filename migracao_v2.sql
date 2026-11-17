-- =====================================================
-- MIGRAÇÃO da versão 1 para a versão 2 (encomenda com vários artigos)
-- Só para quem JÁ correu o schema.sql antigo e tem dados.
-- Colar no Supabase > SQL Editor > New query > Run (uma única vez).
-- Cada encomenda antiga passa a ter 1 artigo com os mesmos dados.
-- O antigo campo "referencia" passa a ser o "N.º Encomenda".
-- =====================================================

begin;

alter table public.encomendas add column if not exists data_pedida_cliente date;

-- 1) cabeçalho
alter table public.encomendas rename column referencia to numero;
alter table public.encomendas add column if not exists ref_cliente text;

-- 2) tabela de artigos
create table if not exists public.artigos (
  id                          uuid primary key default gen_random_uuid(),
  encomenda_id                uuid not null references public.encomendas(id) on delete cascade,
  descricao                   text not null,
  cor                         text,
  quantidade_kg               numeric,
  origem_malha                text not null default 'interna'
                                check (origem_malha in ('interna','subcontratada')),
  malharia                    text,
  tinturaria                  text,
  tem_estamparia              boolean not null default false,
  estamparia                  text,
  estado                      text not null default 'producao'
                                check (estado in ('producao','tinturaria','estamparia','entrega','concluida')),
  data_pedida_cliente         date,
  data_prev_fim_malha         date,
  data_prev_envio_tinturaria  date,
  data_prev_entrega_cliente   date,
  notas                       text,
  criado_por                  uuid default auth.uid() references auth.users(id),
  criado_em                   timestamptz not null default now(),
  atualizado_em               timestamptz not null default now()
);

create index if not exists artigos_encomenda_idx on public.artigos(encomenda_id);
create index if not exists artigos_estado_idx    on public.artigos(estado);

-- 3) copiar os dados antigos para artigos
insert into public.artigos
  (encomenda_id, descricao, cor, quantidade_kg, origem_malha, malharia, tinturaria,
   tem_estamparia, estamparia, estado, data_pedida_cliente, data_prev_fim_malha,
   data_prev_envio_tinturaria, data_prev_entrega_cliente, criado_por, criado_em)
select id, artigo, cor, quantidade_kg, origem_malha, malharia, tinturaria,
       tem_estamparia, estamparia, estado, data_pedida_cliente, data_prev_fim_malha,
       data_prev_envio_tinturaria, data_prev_entrega_cliente, criado_por, criado_em
from public.encomendas;

-- 4) limpar colunas antigas do cabeçalho
alter table public.encomendas
  drop column artigo, drop column cor, drop column quantidade_kg,
  drop column origem_malha, drop column malharia, drop column tinturaria,
  drop column tem_estamparia, drop column estamparia, drop column estado,
  drop column data_pedida_cliente, drop column data_prev_fim_malha,
  drop column data_prev_envio_tinturaria, drop column data_prev_entrega_cliente;

-- 5) guias: podem indicar a que artigo se referem
alter table public.guias add column if not exists artigo_id uuid references public.artigos(id) on delete set null;

-- 6) trigger e segurança
drop trigger if exists trg_artigos_atualizado on public.artigos;
create trigger trg_artigos_atualizado
  before update on public.artigos
  for each row execute function public.set_atualizado_em();

alter table public.artigos enable row level security;
drop policy if exists "artigos_autenticados" on public.artigos;
create policy "artigos_autenticados" on public.artigos
  for all to authenticated using (true) with check (true);

commit;
