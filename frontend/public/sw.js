// Service Worker for Gram Swasthya Offline Support
const CACHE_NAME = 'gram-swasthya-v3';
const STATIC_CACHE = 'static-v3';
const DYNAMIC_CACHE = 'dynamic-v3';
const API_CACHE = 'api-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
];

const CACHE_STRATEGIES = {
  // Cache first for static assets
  static: ['/index.html', '/offline.html', '/manifest.json', '/favicon.svg'],
  // Network first for API calls, fallback to cache
  api: ['/api/'],
  // Stale while revalidate for other assets
  assets: ['/assets/', '/src/'],
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Handle static assets - Cache first
  if (STATIC_ASSETS.some(asset => url.pathname === asset) || 
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/src/')) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Default: Network first, fallback to cache
  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
});

async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) return offlinePage;
      return cache.match('/index.html');
    }
    throw error;
  }
}

async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add header to indicate cached response
      const response = cachedResponse.clone();
      response.headers.set('X-Cache', 'HIT');
      return response;
    }
    
    // Return offline page for navigation
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) return offlinePage;
      const offlineResponse = await cache.match('/index.html');
      if (offlineResponse) return offlineResponse;
    }
    
    // Return offline response for API
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Offline - data cached',
          offline: true 
        }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    throw error;
  }
}

// Background sync for pending requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-conversations') {
    event.waitUntil(syncConversations());
  }
  
  if (event.tag === 'sync-voice-requests') {
    event.waitUntil(syncVoiceRequests());
  }
});

async function syncConversations() {
  // Implementation would sync IndexedDB conversations to server
  console.log('Syncing conversations...');
}

async function syncVoiceRequests() {
  // Implementation would sync pending voice requests
  console.log('Syncing voice requests...');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      type: data.type || 'general',
      notificationId: data.data?.notificationId || '',
      medicineId: data.data?.medicineId || '',
      ...(data.data || {}),
    },
    actions: data.actions || [
      { action: 'taken', title: '✓ Took it' },
      { action: 'snooze', title: '⏰ Snooze 10 min' },
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const { action } = event;

  // Acknowledge dose taken/skipped
  if ((action === 'taken' || action === 'snooze') && data.notificationId) {
    event.waitUntil(
      acknowledgeNotification(data.notificationId, action === 'taken' ? 'taken' : 'snoozed')
    );
    return;
  }

  if (action === 'open' || action === undefined) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

async function acknowledgeNotification(notificationId, status) {
  const isDev = ['localhost:3000', 'localhost:5173'].includes(self.location.hostname);
  const baseURL = isDev ? 'http://localhost:5000/api' : '/api';

  const accessToken = await readTokenFromIndexedDB();

  try {
    const response = await fetch(`${baseURL}/patient/notifications/${notificationId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ status }),
    });
    return response;
  } catch (error) {
    // Queue for background sync when offline
    try {
      await new Promise((resolve) => {
        const req = indexedDB.open('GramSwasthyaVoice', 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('pendingSync', 'readwrite');
          const store = tx.objectStore('pendingSync');
          store.add({
            type: 'acknowledge_notification',
            data: { notificationId, status },
            timestamp: Date.now(),
            retries: 0,
          });
          resolve();
        };
        req.onerror = () => resolve();
      });
    } catch (e) {
      console.error('Failed to queue acknowledge:', e);
    }
  }
}

function readTokenFromIndexedDB() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('GramSwasthyaAuth', 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('tokens')) {
          resolve(null);
          return;
        }
        const tx = db.transaction('tokens', 'readonly');
        const store = tx.objectStore('tokens');
        const getReq = store.get('accessToken');
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('tokens')) {
          db.createObjectStore('tokens');
        }
      };
    } catch (error) {
      resolve(null);
    }
  });
}

// Background sync for pending acknowledgements
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-acknowledgements') {
    event.waitUntil(syncAcknowledgements());
  }
});

async function syncAcknowledgements() {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('GramSwasthyaVoice', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('pendingSync', 'readonly');
    const store = tx.objectStore('pendingSync');
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    for (const item of all) {
      if (item.type === 'acknowledge_notification') {
        await acknowledgeNotification(item.data.notificationId, item.data.status);
      }
    }
  } catch (error) {
    console.error('Sync acknowledgements failed:', error);
  }
}

// Periodic cache cleanup
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupOldCaches());
  }
});

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  for (const name of cacheNames) {
    if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(name)) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        const dateHeader = response.headers.get('date');
        
        if (dateHeader) {
          const cacheDate = new Date(dateHeader).getTime();
          if (Date.now() - cacheDate > maxAge) {
            await cache.delete(request);
          }
        }
      }
    }
  }
}