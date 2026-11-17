// Configuração do Supabase. Pode ficar no GitHub: a chave "anon" (ou "publishable") é pública por desenho.
// A segurança vem do login e das regras RLS definidas em supabase/schema.sql.
// NUNCA coloque aqui a chave "service_role".
// Deixe os valores vazios para usar a app só no navegador (sem Supabase).
window.APP_CONFIG = {
  SUPABASE_URL: "https://skcwubdocunxztnifkag.supabase.co",       // ex.: "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "sb_publishable_qJWGTj2LHLo6cMVZ8K4zlA_UIPmetzk"   // chave anon / publishable do projeto
};
