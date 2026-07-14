const CACHE_NAME = 'nexus-chat-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nova Mensagem';
  const options = {
    body: data.body || 'Você recebeu uma nova mensagem no Noton Nexus.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  let targetUrl = event.notification.data || '/';
  const action = event.action;
  
  if (action === 'mark-read') {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'action=mark-read';
  } else if (action === 'reply') {
    const userReply = event.reply || '';
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'action=reply&text=' + encodeURIComponent(userReply);
  } else if (action === 'mute-1h') {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'action=mute-1h';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
