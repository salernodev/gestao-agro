import { getAll, getById, putWithOutbox } from './db.js';

const STORE = 'clientes';

export function listClientes() {
  return getAll(STORE).then((rows) => rows.filter((r) => !r.deleted));
}

export function getCliente(id) {
  return getById(STORE, id);
}

export function createCliente(data) {
  const now = new Date().toISOString();
  const cliente = {
    id: crypto.randomUUID(),
    nome: data.nome,
    fazenda: data.fazenda ?? '',
    culturas: data.culturas ?? [],
    contato: data.contato ?? '',
    status: data.status ?? 'prospeccao',
    updated_at: now,
    deleted: false,
  };
  return putWithOutbox(STORE, cliente);
}

export function updateCliente(id, patch) {
  return getById(STORE, id).then((existing) => {
    if (!existing) throw new Error(`Cliente ${id} não encontrado`);
    const updated = { ...existing, ...patch, id, updated_at: new Date().toISOString() };
    return putWithOutbox(STORE, updated);
  });
}

export function deleteCliente(id) {
  return updateCliente(id, { deleted: true });
}
