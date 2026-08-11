import * as clientesRepo from './db/clientes.js';
import * as visitasRepo from './db/visitas.js';
import * as lembretesRepo from './db/lembretes.js';

const TIPOS = [
  { valor: 'abertura', rotulo: 'Abertura' },
  { valor: 'tecnica', rotulo: 'Técnica' },
  { valor: 'manutencao', rotulo: 'Manutenção' },
];

export async function renderRegistrarVisita(container, { aoSalvar, flash } = {}) {
  const clientes = await clientesRepo.listClientes();
  const hoje = new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    ${flash ? `<p style="color:green;">${flash}</p>` : ''}
    <h2>Registrar visita</h2>
    <form id="form-registrar-visita">
      <div class="campo">
        <label for="rv-cliente">Cliente</label>
        <select id="rv-cliente" required>
          <option value="">Selecione...</option>
          ${clientes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('')}
          <option value="__novo__">+ Novo cliente</option>
        </select>
      </div>

      <div class="campo" id="rv-novo-cliente-bloco" style="display:none;">
        <label for="rv-novo-nome">Nome do novo cliente</label>
        <input type="text" id="rv-novo-nome" />
        <label for="rv-novo-fazenda">Fazenda</label>
        <input type="text" id="rv-novo-fazenda" />
      </div>

      <div class="campo">
        <label for="rv-data">Data</label>
        <input type="date" id="rv-data" value="${hoje}" required />
      </div>

      <div class="campo">
        <label for="rv-tipo">Tipo</label>
        <select id="rv-tipo">
          ${TIPOS.map((t) => `<option value="${t.valor}">${t.rotulo}</option>`).join('')}
        </select>
      </div>

      <div class="campo">
        <label for="rv-resumo">Resumo da visita</label>
        <textarea id="rv-resumo" rows="8"></textarea>
      </div>

      <div class="campo">
        <label><input type="checkbox" id="rv-proxima-checkbox" /> Combinei a próxima visita</label>
      </div>

      <div class="campo" id="rv-proxima-bloco" style="display:none;">
        <label for="rv-proxima-data">Para quando?</label>
        <input type="datetime-local" id="rv-proxima-data" />
      </div>

      <button type="submit">Salvar visita</button>
      <p id="rv-mensagem" style="color:red;"></p>
    </form>
  `;

  const clienteSelect = container.querySelector('#rv-cliente');
  const novoClienteBloco = container.querySelector('#rv-novo-cliente-bloco');
  clienteSelect.addEventListener('change', () => {
    novoClienteBloco.style.display = clienteSelect.value === '__novo__' ? 'block' : 'none';
  });

  const proximaCheckbox = container.querySelector('#rv-proxima-checkbox');
  const proximaBloco = container.querySelector('#rv-proxima-bloco');
  proximaCheckbox.addEventListener('change', () => {
    proximaBloco.style.display = proximaCheckbox.checked ? 'block' : 'none';
  });

  container.querySelector('#form-registrar-visita').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensagem = container.querySelector('#rv-mensagem');
    mensagem.textContent = '';

    try {
      let clienteId = clienteSelect.value;

      if (clienteId === '__novo__') {
        const nome = container.querySelector('#rv-novo-nome').value.trim();
        if (!nome) {
          mensagem.textContent = 'Informe o nome do novo cliente.';
          return;
        }
        const fazenda = container.querySelector('#rv-novo-fazenda').value.trim();
        const novoCliente = await clientesRepo.createCliente({ nome, fazenda, status: 'prospeccao' });
        clienteId = novoCliente.id;
      } else if (!clienteId) {
        mensagem.textContent = 'Selecione um cliente.';
        return;
      }

      const data = container.querySelector('#rv-data').value;
      const tipo = container.querySelector('#rv-tipo').value;
      const resumo = container.querySelector('#rv-resumo').value;

      const visita = await visitasRepo.createVisita({ cliente_id: clienteId, data, tipo, resumo });

      if (proximaCheckbox.checked) {
        const proximaValor = container.querySelector('#rv-proxima-data').value;
        if (!proximaValor) {
          mensagem.textContent = 'Informe a data/hora da próxima visita, ou desmarque a opção.';
          return;
        }
        await lembretesRepo.createLembrete({
          cliente_id: clienteId,
          visita_id: visita.id,
          data_hora: new Date(proximaValor).toISOString(),
          texto: 'Retornar — visita combinada',
        });
      }

      aoSalvar?.();
      renderRegistrarVisita(container, { aoSalvar, flash: 'Visita registrada com sucesso.' });
    } catch (err) {
      mensagem.textContent = 'Erro ao salvar: ' + err.message;
    }
  });
}
