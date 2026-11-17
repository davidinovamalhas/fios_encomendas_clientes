-- =====================================================
-- ATUALIZAÇÃO v3 (para quem já correu o schema.sql da v2)
-- Acrescenta as datas de receção da tinturaria e da estamparia.
-- Não apaga nem altera dados. Colar no SQL Editor > Run (uma vez).
-- =====================================================
alter table public.artigos add column if not exists data_prev_rececao_tinturaria date;
alter table public.artigos add column if not exists data_prev_rececao_estamparia date;
notify pgrst, 'reload schema';
