import { getAll, getById, putWithOutbox } from './db.js';

const STORE = 'lembretes';

export function listLembretes() {
  return getAll(STORE).then((rows) => rows.filter((r) => !r.deleted));
}

export function listLembretesPorCliente(clienteId) {
  return listLembretes().then((rows) => rows.filter((r) => r.cliente_id === clienteId));
}

export function getLembrete(id) {
  return getById(STORE, id);
}

export function createLembrete(data) {
  const now = new Date().toISOString();
  const lembrete = {
    id: crypto.randomUUID(),
    cliente_id: data.cliente_id ?? null,
    visita_id: data.visita_id ?? null,
    data_hora: data.data_hora,
    texto: data.texto,
    google_event_id: null,
    updated_at: now,
    deleted: false,
  };
  return putWithOutbox(STORE, lembrete);
}

export function updateLembrete(id, patch) {
  return getById(STORE, id).then((existing) => {
    if (!existing) throw new Error(`Lembrete ${id} não encontrado`);
    const updated = { ...existing, ...patch, id, updated_at: new Date().toISOString() };
    return putWithOutbox(STORE, updated);
  });
}

export function deleteLembrete(id) {
  return updateLembrete(id, { deleted: true });
}
