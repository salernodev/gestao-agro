const CACHE_NAME = 'gestao-agro-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './icons/icon.svg',
  './src/app.js',
  './src/auth.js',
  './src/config.js',
  './src/googleCalendar.js',
  './src/render.js',
  './src/relatorio.js',
  './src/schema.js',
  './src/supabaseClient.js',
  './src/sync.js',
  './src/visitaForm.js',
  './src/db/db.js',
  './src/db/clientes.js',
  './src/db/visitas.js',
  './src/db/lembretes.js',
  'https://esm.sh/@supabase/supabase-js@2?bundle',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Cache-first com atualização em segundo plano: serve rápido (e funciona
// offline) a partir do cache, e busca uma versão mais nova na rede para a
// próxima vez, sem bloquear a resposta atual.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const atualizarCache = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return response;
        })
        .catch(() => cached);

      return cached || atualizarCache;
    })
  );
});
