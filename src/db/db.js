const DB_NAME = 'gestao-agro';
const DB_VERSION = 1;

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      const clientes = db.createObjectStore('clientes', { keyPath: 'id' });
      clientes.createIndex('status', 'status');
      clientes.createIndex('updated_at', 'updated_at');

      const visitas = db.createObjectStore('visitas', { keyPath: 'id' });
      visitas.createIndex('cliente_id', 'cliente_id');
      visitas.createIndex('updated_at', 'updated_at');

      const lembretes = db.createObjectStore('lembretes', { keyPath: 'id' });
      lembretes.createIndex('cliente_id', 'cliente_id');
      lembretes.createIndex('visita_id', 'visita_id');
      lembretes.createIndex('updated_at', 'updated_at');

      // Fila de sync (padrão outbox) — implementada na Fase 2, mas o
      // object store nasce aqui para não exigir outra migração de versão.
      db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getAll(storeName) {
  return openDatabase().then((db) => {
    const tx = db.transaction(storeName, 'readonly');
    return requestToPromise(tx.objectStore(storeName).getAll());
  });
}

export function getById(storeName, id) {
  return openDatabase().then((db) => {
    const tx = db.transaction(storeName, 'readonly');
    return requestToPromise(tx.objectStore(storeName).get(id));
  });
}

export function put(storeName, value) {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
    });
  });
}

export function remove(storeName, id) {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

// Grava a entidade E enfileira a mutação no outbox na mesma transação —
// assim uma gravação nunca fica "meio sincronizada": ou as duas coisas
// acontecem, ou nenhuma.
export function putWithOutbox(storeName, value) {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName, 'outbox'], 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.objectStore('outbox').add({
        entity: storeName,
        entity_id: value.id,
        payload: value,
        created_at: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
    });
  });
}

export function getOutboxEntries() {
  return getAll('outbox');
}

export function deleteOutboxEntry(seq) {
  return remove('outbox', seq);
}
