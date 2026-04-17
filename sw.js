const CACHE = 'ud-v8';
const ASSETS = [
  '/proyecto-ud-terreno/',
  '/proyecto-ud-terreno/index.html',
  '/proyecto-ud-terreno/manifest.json',
  '/proyecto-ud-terreno/icon-192.png',
  '/proyecto-ud-terreno/icon-512.png'
];

// Instalar — cachear archivos principales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.allSettled(ASSETS.map(url => c.add(url).catch(() => {})));
    })
  );
  self.skipWaiting();
});

// Activar — limpiar caches antiguos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first para archivos locales, network first para Sheets/Drive
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // No cachear llamadas a Google Sheets o Drive
  if (url.hostname.includes('google') || url.hostname.includes('googleapis')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(response => {
          // Cachear solo respuestas válidas de nuestro dominio
          if (response && response.status === 200 && url.hostname === self.location.hostname) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Sin conexión — devolver index.html desde caché
          if (e.request.destination === 'document') {
            return caches.match('/proyecto-ud-terreno/index.html');
          }
        });
    })
  );
});
