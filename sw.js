/* =========================================================
   SHOP TẤN ĐẠT — SERVICE WORKER (PWA)
   ========================================================= */

const CACHE_NAME = 'shop-tan-dat-v2';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/main.css',
  '/main.js',
  '/intro.mp4',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/images/da.png',
  '/images/keothue.jpg',
  '/images/logovcb.jpg',
  '/images/logovtb.jpg',
  '/images/qrvtb.jpg',
  '/45.JPG',
  '/parada.mp3',
  '/doaquynhlan.mp3',
  '/ngayminhctay.mp3',
  '/thuongnhaudenthe.mp3',
  '/thuongphanhongnhan.mp3'
];

/* Cài đặt — cache toàn bộ file */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker đang cài đặt...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Đang cache các file...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('✅ Đã cache xong!');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('⚠️ Lỗi cache (bỏ qua file lỗi):', err);
      })
  );
});

/* Kích hoạt — xóa cache cũ */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker đang kích hoạt...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('🗑️ Xóa cache cũ:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/* Fetch — trả về cache nếu có */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname.includes('telegram.org')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('google.com')) return;
  if (url.hostname.includes('chatway.app')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse.clone());
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('✅ Shop Tấn Đạt Service Worker đã load');
