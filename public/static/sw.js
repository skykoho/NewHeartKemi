const CACHE_NAME = 'heartkemy-v1';
const urlsToCache = [
  '/',
  '/write',
  '/map',
  '/analysis',
  '/letters',
  '/static/manifest.json'
];

// 설치 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트 - Network First, Cache Fallback 전략
self.addEventListener('fetch', event => {
  // API 요청은 항상 네트워크 우선
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ success: false, error: 'Offline' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // 정적 리소스는 캐시 우선
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // 유효한 응답이 아니면 그대로 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답을 복제하여 캐시에 저장
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 오프라인 폴백 페이지
            return new Response(
              `<!DOCTYPE html>
              <html lang="ko">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>오프라인 - HeartKemy</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
                  }
                  .container {
                    text-align: center;
                    padding: 40px;
                  }
                  .emoji {
                    font-size: 80px;
                    margin-bottom: 20px;
                  }
                  h1 {
                    color: #2D3748;
                    margin-bottom: 10px;
                  }
                  p {
                    color: #718096;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="emoji">📡</div>
                  <h1>오프라인 상태입니다</h1>
                  <p>인터넷 연결을 확인해주세요</p>
                </div>
              </body>
              </html>`,
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
      })
  );
});

// 백그라운드 동기화 (선택적)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  // 오프라인에서 작성한 글을 동기화하는 로직
  console.log('Syncing posts...');
}

// 푸시 알림 (선택적)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'HeartKemy';
  const options = {
    body: data.body || '새로운 소식이 있습니다',
    icon: '/static/icon-192.png',
    badge: '/static/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
