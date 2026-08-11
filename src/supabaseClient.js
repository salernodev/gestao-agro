import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let clientPromise = null;

// Import dinâmico (não estático) de propósito: se o navegador estiver sem
// cache e sem internet no primeiro carregamento, isso falha sem quebrar o
// resto do app — a camada offline (IndexedDB) continua funcionando
// normalmente, só o sync fica indisponível até haver rede.
export function getSupabase() {
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2?bundle').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    );
  }
  return clientPromise;
}
