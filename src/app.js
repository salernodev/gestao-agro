import { getSession, onAuthStateChange, signIn, signOut } from './auth.js';
import { sync, pendingCount, onSyncStatusChange } from './sync.js';
import { listClientes, createCliente, deleteCliente } from './db/clientes.js';
import { listVisitas, createVisita, deleteVisita } from './db/visitas.js';
import { listLembretes, createLembrete, deleteLembrete } from './db/lembretes.js';

const app = document.querySelector('#app');

let currentStatus = 'ocioso';

onSyncStatusChange((status) => {
  currentStatus = status;
  renderStatusBar();
});

async function boot() {
  const session = await getSession();
  if (session) {
    await renderApp();
    sync();
  } else {
    renderLogin();
  }
}

function renderLogin() {
  app.innerHTML = `
    <h1>Gestão Agro</h1>
    <p>Entre com o usuário criado no painel do Supabase (Authentication → Users).</p>
    <form id="login-form">
      <div><label>Email <input type="email" id="login-email" required /></label></div>
      <div><label>Senha <input type="password" id="login-password" required /></label></div>
      <button type="submit">Entrar</button>
      <p id="login-erro" style="color:red;"></p>
    </form>
  `;

  document.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#login-email').value;
    const password = document.querySelector('#login-password').value;
    try {
      await signIn(email, password);
    } catch (err) {
      document.querySelector('#login-erro').textContent = 'Não foi possível entrar: ' + err.message;
    }
  });
}

async function renderApp() {
  const [clientes, visitas, lembretes] = await Promise.all([
    listClientes(),
    listVisitas(),
    listLembretes(),
  ]);

  const temCliente = clientes.length > 0;

  app.innerHTML = `
    <div id="status-bar"></div>
    <h1>Gestão Agro — teste da camada offline + sync (Fases 1 e 2)</h1>
    <p>
      Esta tela é temporária, só para confirmar que os dados ficam salvos no
      navegador mesmo sem internet, e que sincronizam com o Supabase quando a
      conexão volta. A interface real do app vem na Fase 3.
    </p>

    <button id="btn-sync">Sincronizar agora</button>
    <button id="btn-logout">Sair</button>

    <p></p>
    <button id="btn-cliente">+ Cliente de teste</button>
    <button id="btn-visita" ${temCliente ? '' : 'disabled'}>+ Visita de teste</button>
    <button id="btn-lembrete" ${temCliente ? '' : 'disabled'}>+ Lembrete de teste</button>

    <h2>Clientes (${clientes.length})</h2>
    <ul>
      ${clientes
        .map((c) => `<li>${c.nome} — ${c.status} <button data-del-cliente="${c.id}">excluir</button></li>`)
        .join('') || '<li>(nenhum ainda)</li>'}
    </ul>

    <h2>Visitas (${visitas.length})</h2>
    <ul>
      ${visitas
        .map((v) => `<li>${v.data} — ${v.tipo}: ${v.resumo} <button data-del-visita="${v.id}">excluir</button></li>`)
        .join('') || '<li>(nenhuma ainda)</li>'}
    </ul>

    <h2>Lembretes (${lembretes.length})</h2>
    <ul>
      ${lembretes
        .map((l) => `<li>${l.data_hora} — ${l.texto} <button data-del-lembrete="${l.id}">excluir</button></li>`)
        .join('') || '<li>(nenhum ainda)</li>'}
    </ul>
  `;

  renderStatusBar();

  document.querySelector('#btn-sync').addEventListener('click', () => sync());
  document.querySelector('#btn-logout').addEventListener('click', () => signOut());

  document.querySelector('#btn-cliente').addEventListener('click', async () => {
    const n = clientes.length + 1;
    await createCliente({ nome: `Cliente teste ${n}`, fazenda: 'Fazenda Teste', status: 'prospeccao' });
    sync();
    renderApp();
  });

  document.querySelector('#btn-visita')?.addEventListener('click', async () => {
    const cliente = clientes[0];
    await createVisita({
      cliente_id: cliente.id,
      data: new Date().toISOString().slice(0, 10),
      tipo: 'tecnica',
      resumo: `Visita de teste com ${cliente.nome}`,
    });
    sync();
    renderApp();
  });

  document.querySelector('#btn-lembrete')?.addEventListener('click', async () => {
    const cliente = clientes[0];
    await createLembrete({
      cliente_id: cliente.id,
      data_hora: new Date().toISOString(),
      texto: `Ligar para ${cliente.nome}`,
    });
    sync();
    renderApp();
  });

  app.querySelectorAll('[data-del-cliente]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCliente(btn.dataset.delCliente);
      sync();
      renderApp();
    });
  });

  app.querySelectorAll('[data-del-visita]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteVisita(btn.dataset.delVisita);
      sync();
      renderApp();
    });
  });

  app.querySelectorAll('[data-del-lembrete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteLembrete(btn.dataset.delLembrete);
      sync();
      renderApp();
    });
  });
}

async function renderStatusBar() {
  const bar = document.querySelector('#status-bar');
  if (!bar) return;
  const pending = await pendingCount();
  const online = navigator.onLine ? 'online' : 'offline (dados salvos localmente)';
  bar.textContent = `Status: ${online} — ${currentStatus} — ${pending} pendente(s) de sincronizar`;
}

window.addEventListener('online', renderStatusBar);
window.addEventListener('offline', renderStatusBar);

onAuthStateChange(() => boot());
boot();
