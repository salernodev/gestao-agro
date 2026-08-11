import { getSupabase } from './supabaseClient.js';

// Lê a sessão salva (localStorage) — se a lib do Supabase não carregar
// por falta de conexão/cache, trata como "sem sessão" em vez de quebrar
// o app: a camada offline continua utilizável mesmo assim.
export async function getSession() {
  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (err) {
    console.warn('Sessão indisponível (provável falta de conexão):', err);
    return null;
  }
}

export async function onAuthStateChange(callback) {
  try {
    const supabase = await getSupabase();
    supabase.auth.onAuthStateChange((_event, session) => callback(session));
  } catch (err) {
    console.warn('Não foi possível monitorar mudanças de sessão:', err);
  }
}

export async function signIn(email, password) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}
