import { getSession, onAuthStateChange, signIn, signOut } from './auth.js';
import { sync, pendingCount, onSyncStatusChange } from './sync.js';
import { SECOES } from './schema.js';
import { renderForm, renderLista, collectFormData } from './render.js';
import { renderRegistrarVisita } from './visitaForm.js';
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

const ROTA_REGISTRAR_VISITA = 'registrar-visita';

const app = document.querySelector('#app');
let currentStatus = 'ocioso';
let editandoId = null;
let filtroStatusCliente = 'todos';

onSyncStatusChange((status) => {
  currentStatus = status;
  renderStatusBar();
});

function rotaAtiva() {
  const id = location.hash.replace('#', '');
  if (id === '') return ROTA_REGISTRAR_VISITA;
  if (id === ROTA_REGISTRAR_VISITA) return id;
  return SECOES.find((s) => s.id === id)?.id ?? ROTA_REGISTRAR_VISITA;
}

async function boot() {
  editandoId = null;
  const session = await getSession();
  if (session) {
    renderShell();
    await renderConteudo();
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

function renderShell() {
  const rota = rotaAtiva();
  const linkRegistrar = `<a href="#${ROTA_REGISTRAR_VISITA}" class="nav-link${rota === ROTA_REGISTRAR_VISITA ? ' ativo' : ''}">Registrar visita</a>`;
  const linksSecoes = SECOES.map(
    (s) => `<a href="#${s.id}" class="nav-link${s.id === rota ? ' ativo' : ''}">${s.titulo}</a>`
  ).join(' ');

  app.innerHTML = `
    <div id="status-bar"></div>
    <h1>Gestão Agro</h1>
    <div class="barra-acoes">
      <button id="btn-sync">Sincronizar agora</button>
      <button id="btn-logout">Sair</button>
    </div>
    <nav>${linkRegistrar} ${linksSecoes}</nav>
    <div id="conteudo"></div>
  `;

  document.querySelector('#btn-sync').addEventListener('click', () => sync());
  document.querySelector('#btn-logout').addEventListener('click', () => signOut());
  renderStatusBar();
}

async function renderConteudo() {
  const rota = rotaAtiva();
  const conteudo = document.querySelector('#conteudo');

  if (rota === ROTA_REGISTRAR_VISITA) {
    await renderRegistrarVisita(conteudo, {
      aoSalvar: () => {
        sync();
        renderStatusBar();
      },
    });
  } else {
    await renderSecaoGenerica(conteudo, rota);
  }
}

function renderFiltroClientes(secao) {
  if (secao.id !== 'clientes') return '';
  const botoes = FILTROS_STATUS_CLIENTE.map(
    (f) =>
      `<button data-filtro-status="${f.valor}" ${f.valor === filtroStatusCliente ? 'disabled' : ''}>${f.rotulo}</button>`
  ).join(' ');
  return `<div class="filtro-status">${botoes}</div>`;
}

async function renderSecaoGenerica(conteudo, secaoId) {
  const secao = SECOES.find((s) => s.id === secaoId);
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

  conteudo.innerHTML = `
    <h2>${secao.titulo}</h2>
    ${semClientes ? '<p>Cadastre um cliente antes de criar um registro aqui.</p>' : renderForm(secao, { clientes }, registroEditando)}
    ${renderFiltroClientes(secao)}
    ${renderLista(secao, registrosExibidos, { clientesById })}
  `;

  if (!semClientes) {
    conteudo.querySelector(`#form-${secao.id}`).addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = collectFormData(secao, e.target);
      if (editandoId) {
        await repo.update(editandoId, dados);
      } else {
        await repo.create(dados);
      }
      editandoId = null;
      sync();
      renderStatusBar();
      renderSecaoGenerica(conteudo, secaoId);
    });

    conteudo.querySelector('#btn-cancelar-edicao')?.addEventListener('click', () => {
      editandoId = null;
      renderSecaoGenerica(conteudo, secaoId);
    });
  }

  conteudo.querySelectorAll('[data-filtro-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filtroStatusCliente = btn.dataset.filtroStatus;
      renderSecaoGenerica(conteudo, secaoId);
    });
  });

  conteudo.querySelectorAll('[data-editar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editandoId = btn.dataset.editar;
      renderSecaoGenerica(conteudo, secaoId);
    });
  });

  conteudo.querySelectorAll('[data-excluir]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await repo.remove(btn.dataset.excluir);
      if (editandoId === btn.dataset.excluir) editandoId = null;
      sync();
      renderStatusBar();
      renderSecaoGenerica(conteudo, secaoId);
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
