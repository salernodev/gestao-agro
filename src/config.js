// Credenciais do Supabase (Project Settings > API no painel do Supabase).
// A anon key NÃO é segredo — ela só funciona dentro do que a RLS permite
// (ver supabase/schema.sql). Por isso pode ficar commitada aqui, sem build
// step para injetar variáveis de ambiente (o app roda como estático no
// GitHub Pages).
export const SUPABASE_URL = 'https://sjiiywxaoqfjprixpdfc.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_HH7Yn8d91HJaFrXn12356w_qPuWV4zu';
