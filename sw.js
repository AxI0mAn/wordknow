const CACHE_NAME = 'word-know-v2'; // <--- Измените версию с v1 на v2 (при каждом изменении кода меняйте цифру)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/glassmorphism.css',
  './css/theme-light.css',
  './css/theme-dark.css',
  './js/storage.js',
  './js/session.js',
  './js/ui.js',
  './js/pwa.js',
  './js/app.js'
];

// Установка: кэшируем новые файлы и СРАЗУ заменяем старый Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting(); // <--- Принудительно активирует новый воркер сразу после установки
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Удален старый кэш:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      self.clients.claim(); // <--- Перехватывает управление страницей немедленно
    })
  );
});

// Стратегия: сначала сеть, при неудаче — кэш (чтобы код всегда был свежим)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Если сеть доступна, обновляем кэш на лету
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => {
        // Если интернета нет — берем из кэша
        return caches.match(event.request);
      })
  );
});