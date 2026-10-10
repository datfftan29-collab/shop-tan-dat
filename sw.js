/* =========================================================
   SHOP TẤN ĐẠT — SERVICE WORKER (v13)
   Chỉ cache ảnh/font — KHÔNG cache HTML/CSS/JS
   ========================================================= */

const CACHE_NAME = 'shop-tan-dat-v13';  // ⬅️ Đổi số mỗi lần update

// Chỉ cache file ít thay đổi (ảnh, icon)
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/images/da.png',
  '/images/keothue.jpg',
  '/images/logovcb.jpg',
  '/images/logovtb.jpg',
  '/images/qrvtb.jpg',
  '/45.JPG'
];

/* Cài đặt — cache file tĩnh, bỏ qua file lỗi */
self.addEventListener('install', (event) => {
  console.log('🔧 SW đang cài đặt v13...');
  self.skipWaiting(); // Kích hoạt ngay, không chờ
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => console.warn('Bỏ qua:', url, err))
          )
        );
      })
      .then(() => console.log('✅ Cache xong'))
  );
});

/* Kích hoạt — xóa TẤT CẢ cache cũ */
self.addEventListener('activate', (event) => {
  console.log('🚀 SW đang kích hoạt v13...');
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
      .then(() => {
        // Thông báo cho tất cả tab reload
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

/* Fetch — HTML/CSS/JS luôn lấy từ network */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Bỏ qua API bên thứ 3
  if (url.hostname.includes('telegram.org')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('google.com')) return;
  if (url.hostname.includes('chatway.app')) return;

  const isHTML = event.request.destination === 'document' || url.pathname.endsWith('.html');
  const isJS   = url.pathname.endsWith('.js');
  const isCSS  = url.pathname.endsWith('.css');
  const isVideo = url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm');

  // HTML/CSS/JS/VIDEO → LUÔN lấy từ network, không cache
  if (isHTML || isJS || isCSS || isVideo) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback khi offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return caches.match(event.request);
      })
    );
    return;
  }

  // Ảnh/font → cache-first (nhanh)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

/* Nhận lệnh skipWaiting từ trang */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ SW Shop Tấn Đạt v13 đã load');
