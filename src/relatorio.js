import * as clientesRepo from './db/clientes.js';
import * as visitasRepo from './db/visitas.js';

const TIPOS_ROTULO = {
  abertura: 'Abertura',
  tecnica: 'Técnica',
  manutencao: 'Manutenção',
};

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export async function renderRelatorio(container, { mes } = {}) {
  const mesSelecionado = mes || mesAtual();

  const [visitas, clientes] = await Promise.all([visitasRepo.listVisitas(), clientesRepo.listClientes()]);
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  const visitasDoMes = visitas
    .filter((v) => v.data?.startsWith(mesSelecionado))
    .sort((a, b) => `${a.data}${a.hora ?? ''}`.localeCompare(`${b.data}${b.hora ?? ''}`));

  const porTipo = { abertura: 0, tecnica: 0, manutencao: 0 };
  const clientesVisitados = new Set();
  const porCliente = new Map();

  for (const v of visitasDoMes) {
    if (porTipo[v.tipo] != null) porTipo[v.tipo]++;
    clientesVisitados.add(v.cliente_id);

    const lista = porCliente.get(v.cliente_id) ?? [];
    lista.push(v);
    porCliente.set(v.cliente_id, lista);
  }

  const clientesOrdenados = [...porCliente.keys()].sort((a, b) => {
    const nomeA = clientesById.get(a)?.nome ?? '';
    const nomeB = clientesById.get(b)?.nome ?? '';
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });

  const nomeMes = capitalizar(
    new Date(`${mesSelecionado}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  );

  const listaHtml = clientesOrdenados.length
    ? clientesOrdenados
        .map((clienteId) => {
          const cliente = clientesById.get(clienteId);
          const visitasCliente = porCliente.get(clienteId);
          const itens = visitasCliente
            .map(
              (v) =>
                `<li>${formatarData(v.data)}${v.hora ? ' às ' + v.hora : ''} — ${TIPOS_ROTULO[v.tipo] ?? v.tipo}${v.resumo ? ': ' + v.resumo : ''}</li>`
            )
            .join('');
          return `<div class="relatorio-cliente"><h3>${cliente?.nome ?? 'Cliente removido'} (${visitasCliente.length})</h3><ul>${itens}</ul></div>`;
        })
        .join('')
    : '<p>Nenhuma visita registrada nesse mês.</p>';

  container.innerHTML = `
    <h2>Relatório mensal</h2>

    <div class="campo" id="rel-controles">
      <label for="rel-mes">Mês</label>
      <input type="month" id="rel-mes" value="${mesSelecionado}" />
      <button id="rel-imprimir">Imprimir / salvar PDF</button>
    </div>

    <div class="relatorio-resumo">
      <p><strong>${visitasDoMes.length}</strong> visita(s) em <strong>${nomeMes}</strong>, com <strong>${clientesVisitados.size}</strong> cliente(s) diferente(s).</p>
      <p>Abertura: ${porTipo.abertura} — Técnica: ${porTipo.tecnica} — Manutenção: ${porTipo.manutencao}</p>
    </div>

    ${listaHtml}
  `;

  container.querySelector('#rel-mes').addEventListener('change', (e) => {
    renderRelatorio(container, { mes: e.target.value });
  });

  container.querySelector('#rel-imprimir').addEventListener('click', () => window.print());
}
