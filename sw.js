// Service Worker — Guerreiro Mundial / Gerador de Fichas SFRPG
// Estratégia: NETWORK-FIRST para o HTML/JS principal.
// Motivo: o app tem um gate de autenticação (Supabase). Se este SW usasse
// cache-first, um usuário poderia ficar preso numa versão antiga do gate
// (chave/URL do Supabase desatualizada, lógica de auth velha) mesmo depois
// de você publicar uma correção. Cache só entra como fallback offline.

const CACHE_NAME = 'gm-sfrpg-v1';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // só intercepta GET; deixa POST/etc (chamadas ao Supabase) passarem direto
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // atualiza o cache com a resposta fresca (network-first)
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => {
        // offline: cai pro cache; se nem isso existir, falha visivelmente
        return caches.match(req).then((cached) => cached || Promise.reject('offline e sem cache'));
      })
  );
});
