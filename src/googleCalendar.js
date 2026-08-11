import { getSupabase } from './supabaseClient.js';

const CHAVE_LOCAL = 'googleAgendaConectado';

export async function iniciarConexaoGoogle() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke('google-oauth-start');
  if (error) throw error;
  window.location.href = data.url;
}

// Não temos como consultar o status real no servidor pelo navegador (a
// tabela de tokens é bloqueada por design — só a Edge Function acessa).
// Guardamos localmente que a conexão já foi feita uma vez; é uma pista, não
// uma certeza (se o Marcos trocar de aparelho, vai precisar conectar de
// novo, o que não é um problema, só reautoriza).
export function googleConectado() {
  return localStorage.getItem(CHAVE_LOCAL) === 'true';
}

export function marcarGoogleConectado() {
  localStorage.setItem(CHAVE_LOCAL, 'true');
}
