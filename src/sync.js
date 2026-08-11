import { getSupabase } from './supabaseClient.js';
import { getOutboxEntries, deleteOutboxEntry, getAll, put, getById } from './db/db.js';
import { updateLembrete } from './db/lembretes.js';

const ENTIDADES = ['clientes', 'visitas', 'lembretes'];

const listeners = new Set();
let syncing = false;

export function onSyncStatusChange(callback) {
  listeners.add(callback);
}

function notify(status) {
  listeners.forEach((cb) => cb(status));
}

export function pendingCount() {
  return getOutboxEntries().then((entries) => entries.length);
}

// Processa a fila em ordem de criação — importante porque uma visita só
// pode ser gravada no servidor depois que o cliente dela já existir lá
// (FK), e a ordem de criação garante isso naturalmente.
async function pushOutbox(supabase) {
  const entries = await getOutboxEntries();

  for (const entry of entries) {
    const { error } = await supabase.from(entry.entity).upsert(entry.payload, { onConflict: 'id' });
    if (error) throw error;
    await deleteOutboxEntry(entry.seq);

    if (entry.entity === 'lembretes') {
      await mirrorLembrete(supabase, entry.payload);
    }
  }
}

// Espelha um lembrete no Google Agenda. Best-effort: se o Marcos ainda não
// conectou a Agenda (ou a chamada falha por qualquer motivo), só registra
// no console e segue — isso nunca deve travar o sync dos dados em si.
async function mirrorLembrete(supabase, payload) {
  try {
    const cliente = payload.cliente_id ? await getById('clientes', payload.cliente_id) : null;

    const { data, error } = await supabase.functions.invoke('google-calendar-mirror', {
      body: {
        cliente_nome: cliente?.nome ?? null,
        data_hora: payload.data_hora,
        texto: payload.texto,
        google_event_id: payload.google_event_id,
        deleted: payload.deleted,
      },
    });

    if (error) {
      console.warn('Espelhamento no Google Agenda não realizado (provavelmente ainda não conectado):', error);
      return;
    }

    if (data?.google_event_id !== payload.google_event_id) {
      await updateLembrete(payload.id, { google_event_id: data.google_event_id });
    }
  } catch (err) {
    console.warn('Erro ao espelhar lembrete no Google Agenda:', err);
  }
}

async function pullEntity(supabase, entity) {
  const { data, error } = await supabase.from(entity).select('*');
  if (error) throw error;

  const localRows = await getAll(entity);
  const localById = new Map(localRows.map((row) => [row.id, row]));

  for (const remote of data) {
    const local = localById.get(remote.id);
    const isNewer = !local || new Date(remote.updated_at) > new Date(local.updated_at);
    if (!isNewer) continue;

    const { user_id, ...record } = remote;
    await put(entity, record);
  }
}

async function pullAll(supabase) {
  for (const entity of ENTIDADES) {
    await pullEntity(supabase, entity);
  }
}

export async function sync() {
  if (syncing || !navigator.onLine) return;

  syncing = true;
  notify('sincronizando');

  try {
    const supabase = await getSupabase();
    await pushOutbox(supabase);
    await pullAll(supabase);
    notify('sincronizado');
  } catch (err) {
    console.error('Falha na sincronização, tentaremos de novo depois:', err);
    notify('erro');
  } finally {
    syncing = false;
  }
}

window.addEventListener('online', () => sync());
