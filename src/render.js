// Motor de render genérico: só entende a forma declarativa de "seção" e
// "campo" (schema.js). Não conhece clientes/visitas/lembretes por nome —
// isso é o que permite adicionar uma entidade nova sem tocar aqui.

export function renderNav(secoes, ativaId) {
  const links = secoes
    .map((s) => `<a href="#${s.id}" class="nav-link${s.id === ativaId ? ' ativo' : ''}">${s.titulo}</a>`)
    .join(' ');
  return `<nav>${links}</nav>`;
}

export function renderForm(secao, contexto = {}, registroEditando = null) {
  const campos = secao.campos
    .map((campo) => renderCampo(secao, campo, contexto, registroEditando))
    .join('');

  return `
    <form id="form-${secao.id}" data-secao="${secao.id}">
      ${campos}
      <button type="submit">${registroEditando ? 'Salvar alterações' : 'Salvar'}</button>
      ${registroEditando ? '<button type="button" id="btn-cancelar-edicao">Cancelar</button>' : ''}
    </form>
  `;
}

function renderCampo(secao, campo, contexto, registroEditando) {
  const inputId = `campo-${secao.id}-${campo.id}`;
  const obrig = campo.obrigatorio ? 'required' : '';
  const valorAtual = registroEditando ? registroEditando[campo.id] : undefined;
  let input;

  if (campo.tipo === 'textarea') {
    input = `<textarea id="${inputId}" name="${campo.id}" ${obrig}>${valorAtual ?? ''}</textarea>`;
  } else if (campo.tipo === 'select') {
    const selecionado = valorAtual ?? campo.padrao;
    const opcoes = campo.opcoes
      .map((o) => `<option value="${o.valor}" ${o.valor === selecionado ? 'selected' : ''}>${o.rotulo}</option>`)
      .join('');
    input = `<select id="${inputId}" name="${campo.id}" ${obrig}>${opcoes}</select>`;
  } else if (campo.tipo === 'select-cliente') {
    const clientes = contexto.clientes ?? [];
    const opcoes = clientes
      .map((c) => `<option value="${c.id}" ${c.id === valorAtual ? 'selected' : ''}>${c.nome}</option>`)
      .join('');
    input = `<select id="${inputId}" name="${campo.id}" ${obrig}>${opcoes}</select>`;
  } else if (campo.tipo === 'date') {
    const valor = valorAtual ?? (campo.padrao === 'hoje' ? new Date().toISOString().slice(0, 10) : '');
    input = `<input type="date" id="${inputId}" name="${campo.id}" value="${valor}" ${obrig} />`;
  } else if (campo.tipo === 'time') {
    const valor = valorAtual ?? (campo.padrao === 'agora' ? horaAtual() : '');
    input = `<input type="time" id="${inputId}" name="${campo.id}" value="${valor}" ${obrig} />`;
  } else if (campo.tipo === 'datetime') {
    const valor = valorAtual ? isoParaDatetimeLocal(valorAtual) : '';
    input = `<input type="datetime-local" id="${inputId}" name="${campo.id}" value="${valor}" ${obrig} />`;
  } else {
    input = `<input type="text" id="${inputId}" name="${campo.id}" value="${valorAtual ?? ''}" ${obrig} />`;
  }

  return `<div class="campo"><label for="${inputId}">${campo.label}</label>${input}</div>`;
}

function horaAtual() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoParaDatetimeLocal(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function collectFormData(secao, formEl) {
  const dados = {};
  for (const campo of secao.campos) {
    const el = formEl.elements.namedItem(campo.id);
    if (!el) continue;
    dados[campo.id] = campo.tipo === 'datetime' && el.value ? new Date(el.value).toISOString() : el.value;
  }
  return dados;
}

export function renderLista(secao, registros, contexto = {}) {
  if (registros.length === 0) return '<p>(nenhum registro ainda)</p>';

  const linhas = registros
    .map((registro) => {
      const resumo = secao.campos
        .map((campo) => formatarValor(campo, registro[campo.id], contexto))
        .filter(Boolean)
        .join(' — ');
      return `<li>${resumo} <button data-editar="${registro.id}">editar</button> <button data-excluir="${registro.id}">excluir</button></li>`;
    })
    .join('');

  return `<ul>${linhas}</ul>`;
}

function formatarValor(campo, valor, contexto) {
  if (valor == null || valor === '') return '';

  if (campo.tipo === 'select' && campo.opcoes) {
    return campo.opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
  }

  if (campo.tipo === 'select-cliente') {
    return contexto.clientesById?.get(valor)?.nome ?? valor;
  }

  const texto = String(valor);
  return texto.length > 60 ? texto.slice(0, 57) + '...' : texto;
}
