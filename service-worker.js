const CACHE_NAME = 'tudao-burguers-v6'; // Versão do cache atualizada
// Lista de arquivos a serem cacheados.
const urlsToCache = [
  '/',
  '/index.html',
  '/politica-de-privacidade.html',
  '/estilo.css',
  '/script.js',
  '/manifest.json',
  '/imagens/logo.png',
  '/imagens/banner-principal.webp',
  '/imagens/about-us.webp',
  '/imagens/combo.webp',
  '/imagens/tudao-especial.webp',
  '/imagens/batata.webp',
  '/imagens/favicon-32x32.png',
  '/imagens/favicon-16x16.png',
  '/imagens/apple-touch-icon.png',
  '/imagens/icon-quality.svg',
  '/imagens/icon-eco.svg',
  '/imagens/icon-service.svg',
  '/imagens/instagram.svg',
  '/imagens/facebook.svg',
  '/imagens/avatar-1.webp',
  '/imagens/avatar-2.webp',
  '/imagens/avatar-3.webp'
];

// Instalação do Service Worker e cache dos assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Força a ativação do novo service worker
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta as requisições e serve do cache se disponível (estratégia Cache First)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se a resposta estiver no cache, retorna ela.
        if (response) {
          return response;
        }
        // Caso contrário, faz a requisição à rede...
        return fetch(event.request).then(fetchResponse => {
            // ...e armazena a nova resposta no cache para futuras visitas.
            return caches.open(CACHE_NAME).then(cache => {
                // Clona a resposta para que ela possa ser usada tanto pelo navegador quanto pelo cache.
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
            });
        });
      })
  );
});

// Limpa caches antigos na ativação do novo Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});