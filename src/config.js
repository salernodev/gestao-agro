// Credenciais do Supabase (Project Settings > API no painel do Supabase).
// A anon key NÃO é segredo — ela só funciona dentro do que a RLS permite
// (ver supabase/schema.sql). Por isso pode ficar commitada aqui, sem build
// step para injetar variáveis de ambiente (o app roda como estático no
// GitHub Pages).
export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
export const SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI';
