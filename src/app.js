import { getSession, onAuthStateChange, signIn, signOut } from './auth.js';
import { sync, pendingCount, onSyncStatusChange } from './sync.js';
import { SECOES } from './schema.js';
import { renderNav, renderForm, renderLista, collectFormData } from './render.js';
import * as clientesRepo from './db/clientes.js';
import * as visitasRepo from './db/visitas.js';
import * as lembretesRepo from './db/lembretes.js';

// Único ponto do app que sabe que "clientes/visitas/lembretes" existem de
// verdade — render.js e schema.js não conhecem essas entidades por nome.
const REPOS = {
  clientes: { list: clientesRepo.listClientes, create: clientesRepo.createCliente, remove: clientesRepo.deleteCliente },
  visitas: { list: visitasRepo.listVisitas, create: visitasRepo.createVisita, remove: visitasRepo.deleteVisita },
  lembretes: { list: lembretesRepo.listLembretes, create: lembretesRepo.createLembrete, remove: lembretesRepo.deleteLembrete },
};

const app = document.querySelector('#app');
let currentStatus = 'ocioso';

onSyncStatusChange((status) => {
  currentStatus = status;
  renderStatusBar();
});

function secaoAtiva() {
  const id = location.hash.replace('#', '');
  return SECOES.find((s) => s.id === id) ?? SECOES[0];
}

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
      <div class="campo"><label for="login-email">Email</label><input type="email" id="login-email" required /></div>
      <div class="campo"><label for="login-password">Senha</label><input type="password" id="login-password" required /></div>
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
  const secao = secaoAtiva();
  const repo = REPOS[secao.id];

  const [registros, clientes] = await Promise.all([repo.list(), clientesRepo.listClientes()]);
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  const precisaCliente = secao.campos.some((c) => c.tipo === 'select-cliente');
  const semClientes = precisaCliente && clientes.length === 0;

  app.innerHTML = `
    <div id="status-bar"></div>
    <h1>Gestão Agro</h1>
    <div class="barra-acoes">
      <button id="btn-sync">Sincronizar agora</button>
      <button id="btn-logout">Sair</button>
    </div>
    ${renderNav(SECOES, secao.id)}
    <h2>${secao.titulo}</h2>
    ${semClientes ? '<p>Cadastre um cliente antes de criar um registro aqui.</p>' : renderForm(secao, { clientes })}
    ${renderLista(secao, registros, { clientesById })}
  `;

  renderStatusBar();

  document.querySelector('#btn-sync').addEventListener('click', () => sync());
  document.querySelector('#btn-logout').addEventListener('click', () => signOut());

  if (!semClientes) {
    document.querySelector(`#form-${secao.id}`).addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = collectFormData(secao, e.target);
      await repo.create(dados);
      sync();
      renderApp();
    });
  }

  app.querySelectorAll('[data-excluir]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await repo.remove(btn.dataset.excluir);
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

window.addEventListener('hashchange', boot);
window.addEventListener('online', renderStatusBar);
window.addEventListener('offline', renderStatusBar);

onAuthStateChange(() => boot());
boot();
