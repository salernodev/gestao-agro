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
  clientes: {
    list: clientesRepo.listClientes,
    create: clientesRepo.createCliente,
    update: clientesRepo.updateCliente,
    remove: clientesRepo.deleteCliente,
  },
  visitas: {
    list: visitasRepo.listVisitas,
    create: visitasRepo.createVisita,
    update: visitasRepo.updateVisita,
    remove: visitasRepo.deleteVisita,
  },
  lembretes: {
    list: lembretesRepo.listLembretes,
    create: lembretesRepo.createLembrete,
    update: lembretesRepo.updateLembrete,
    remove: lembretesRepo.deleteLembrete,
  },
};

const FILTROS_STATUS_CLIENTE = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'prospeccao', rotulo: 'Prospecção' },
  { valor: 'ativo', rotulo: 'Ativo' },
  { valor: 'manutencao', rotulo: 'Manutenção' },
];

const app = document.querySelector('#app');
let currentStatus = 'ocioso';
let editandoId = null;
let filtroStatusCliente = 'todos';

onSyncStatusChange((status) => {
  currentStatus = status;
  renderStatusBar();
});

function secaoAtiva() {
  const id = location.hash.replace('#', '');
  return SECOES.find((s) => s.id === id) ?? SECOES[0];
}

async function boot() {
  editandoId = null;
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

function renderFiltroClientes(secao) {
  if (secao.id !== 'clientes') return '';
  const botoes = FILTROS_STATUS_CLIENTE.map(
    (f) =>
      `<button data-filtro-status="${f.valor}" ${f.valor === filtroStatusCliente ? 'disabled' : ''}>${f.rotulo}</button>`
  ).join(' ');
  return `<div class="filtro-status">${botoes}</div>`;
}

async function renderApp() {
  const secao = secaoAtiva();
  const repo = REPOS[secao.id];

  const [registros, clientes] = await Promise.all([repo.list(), clientesRepo.listClientes()]);
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  const registrosExibidos =
    secao.id === 'clientes' && filtroStatusCliente !== 'todos'
      ? registros.filter((r) => r.status === filtroStatusCliente)
      : registros;

  const registroEditando = editandoId ? registros.find((r) => r.id === editandoId) ?? null : null;

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
    ${semClientes ? '<p>Cadastre um cliente antes de criar um registro aqui.</p>' : renderForm(secao, { clientes }, registroEditando)}
    ${renderFiltroClientes(secao)}
    ${renderLista(secao, registrosExibidos, { clientesById })}
  `;

  renderStatusBar();

  document.querySelector('#btn-sync').addEventListener('click', () => sync());
  document.querySelector('#btn-logout').addEventListener('click', () => signOut());

  if (!semClientes) {
    document.querySelector(`#form-${secao.id}`).addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = collectFormData(secao, e.target);
      if (editandoId) {
        await repo.update(editandoId, dados);
      } else {
        await repo.create(dados);
      }
      editandoId = null;
      sync();
      renderApp();
    });

    document.querySelector('#btn-cancelar-edicao')?.addEventListener('click', () => {
      editandoId = null;
      renderApp();
    });
  }

  app.querySelectorAll('[data-filtro-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filtroStatusCliente = btn.dataset.filtroStatus;
      renderApp();
    });
  });

  app.querySelectorAll('[data-editar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editandoId = btn.dataset.editar;
      renderApp();
    });
  });

  app.querySelectorAll('[data-excluir]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await repo.remove(btn.dataset.excluir);
      if (editandoId === btn.dataset.excluir) editandoId = null;
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
