-- =====================================================
-- Malhas Acabadas - esquema da base de dados (Supabase) - VERSÃO 2
-- INSTALAÇÃO NOVA: colar no Supabase > SQL Editor > New query > Run
-- (Se já tinha corrido a versão 1, use antes o ficheiro migracao_v2.sql)
-- =====================================================

-- Encomenda (cabeçalho)
create table if not exists public.encomendas (
  id             uuid primary key default gen_random_uuid(),
  numero         text not null,        -- N.º Encomenda
  ref_cliente    text,                 -- Ref. Cliente
  cliente        text not null,
  notas          text,
  criado_por     uuid default auth.uid() references auth.users(id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

-- Artigos (linhas) de cada encomenda: cada um com as suas etapas, locais e datas
create table if not exists public.artigos (
  id                          uuid primary key default gen_random_uuid(),
  encomenda_id                uuid not null references public.encomendas(id) on delete cascade,
  descricao                   text not null,            -- artigo / malha
  cor                         text,
  quantidade_kg               numeric,

  origem_malha                text not null default 'interna'
                                check (origem_malha in ('interna','subcontratada')),
  malharia                    text,                     -- subcontratado (se aplicável)
  tinturaria                  text,
  tem_estamparia              boolean not null default false,
  estamparia                  text,

  estado                      text not null default 'producao'
                                check (estado in ('producao','tinturaria','estamparia','entrega','concluida')),

  data_pedida_cliente         date,   -- data que o cliente quer a malha
  data_prev_fim_malha         date,   -- previsão fim da produção da malha
  data_prev_envio_tinturaria  date,   -- previsão envio para a tinturaria
  data_prev_rececao_tinturaria date,  -- previsão receção da tinturaria (regresso)
  data_prev_rececao_estamparia date,  -- previsão receção da estamparia (regresso)
  data_prev_entrega_cliente   date,   -- previsão entrega ao cliente

  notas                       text,
  criado_por                  uuid default auth.uid() references auth.users(id),
  criado_em                   timestamptz not null default now(),
  atualizado_em               timestamptz not null default now()
);

-- Guias de transporte / remessa (da encomenda, opcionalmente de um artigo)
create table if not exists public.guias (
  id             uuid primary key default gen_random_uuid(),
  encomenda_id   uuid not null references public.encomendas(id) on delete cascade,
  artigo_id      uuid references public.artigos(id) on delete set null,
  tipo           text not null default 'transporte' check (tipo in ('transporte','remessa')),
  destino        text not null default 'tinturaria' check (destino in ('tinturaria','estamparia','cliente','outro')),
  numero         text not null,
  data           date not null default current_date,
  origem_local   text,
  quantidade_kg  numeric,
  notas          text,
  criado_por     uuid default auth.uid() references auth.users(id),
  criado_em      timestamptz not null default now()
);

create index if not exists artigos_encomenda_idx on public.artigos(encomenda_id);
create index if not exists artigos_estado_idx    on public.artigos(estado);
create index if not exists guias_encomenda_idx   on public.guias(encomenda_id);

-- atualizar "atualizado_em" automaticamente
create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists trg_encomendas_atualizado on public.encomendas;
create trigger trg_encomendas_atualizado
  before update on public.encomendas
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_artigos_atualizado on public.artigos;
create trigger trg_artigos_atualizado
  before update on public.artigos
  for each row execute function public.set_atualizado_em();

-- =====================================================
-- SEGURANÇA: só utilizadores com login têm acesso
-- =====================================================
alter table public.encomendas enable row level security;
alter table public.artigos    enable row level security;
alter table public.guias      enable row level security;

drop policy if exists "encomendas_autenticados" on public.encomendas;
create policy "encomendas_autenticados" on public.encomendas
  for all to authenticated using (true) with check (true);

drop policy if exists "artigos_autenticados" on public.artigos;
create policy "artigos_autenticados" on public.artigos
  for all to authenticated using (true) with check (true);

drop policy if exists "guias_autenticados" on public.guias;
create policy "guias_autenticados" on public.guias
  for all to authenticated using (true) with check (true);

-- (utilizadores anónimos não têm nenhuma policy => não veem nada)

-- (garante as colunas de receção mesmo que a tabela já existisse)
alter table public.artigos add column if not exists data_prev_rececao_tinturaria date;
alter table public.artigos add column if not exists data_prev_rececao_estamparia date;

-- pede ao Supabase para atualizar o que conhece da base de dados
notify pgrst, 'reload schema';
