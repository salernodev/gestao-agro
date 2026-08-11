import { getAll, getById, putWithOutbox } from './db.js';

const STORE = 'visitas';

export function listVisitas() {
  return getAll(STORE).then((rows) => rows.filter((r) => !r.deleted));
}

export function listVisitasPorCliente(clienteId) {
  return listVisitas().then((rows) => rows.filter((r) => r.cliente_id === clienteId));
}

export function getVisita(id) {
  return getById(STORE, id);
}

export function createVisita(data) {
  const now = new Date().toISOString();
  const visita = {
    id: crypto.randomUUID(),
    cliente_id: data.cliente_id,
    data: data.data,
    hora: data.hora || null,
    tipo: data.tipo,
    resumo: data.resumo ?? '',
    observacoes: data.observacoes ?? '',
    updated_at: now,
    deleted: false,
  };
  return putWithOutbox(STORE, visita);
}

export function updateVisita(id, patch) {
  return getById(STORE, id).then((existing) => {
    if (!existing) throw new Error(`Visita ${id} não encontrada`);
    const updated = { ...existing, ...patch, id, updated_at: new Date().toISOString() };
    return putWithOutbox(STORE, updated);
  });
}

export function deleteVisita(id) {
  return updateVisita(id, { deleted: true });
}
