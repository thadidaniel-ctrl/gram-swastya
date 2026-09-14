import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

// Firebase config from Vite env vars
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
};

const FCM_ENABLED = !!firebaseConfig.apiKey && !!firebaseConfig.vapidKey;

let firebaseModules = null;

async function loadFirebase() {
  if (!FCM_ENABLED) return null;
  if (firebaseModules) return firebaseModules;
  
  try {
    const [{ initializeApp }, { getMessaging, getToken }] = await Promise.all([
      import('firebase/app'),
      import('firebase/messaging'),
    ]);
    firebaseModules = { initializeApp, getMessaging, getToken };
    return firebaseModules;
  } catch (error) {
    console.error('Firebase SDK load failed:', error);
    return null;
  }
}

export function usePushNotifications({ patientId, onAcknowledge } = {}) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [token, setToken] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supportsPush, setSupportsPush] = useState(false);
  
  const onAcknowledgeRef = useRef(onAcknowledge);
  onAcknowledgeRef.current = onAcknowledge;
  
  const swRegistrationRef = useRef(null);

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      ('PushManager' in window || 'Notification' in window);
    setSupportsPush(supported);
    
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) {
      setIsLoading(false);
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      swRegistrationRef.current = reg;
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub);
      if (sub) {
        setToken(sub.endpoint);
      }
    } catch (error) {
      console.error('Push subscription check failed:', error);
      setError('Failed to check push subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!supportsPush) {
      setError('Push notifications not supported on this device');
      return null;
    }

    if (Notification.permission === 'denied') {
      setError('Notification permission blocked. Enable it in browser settings.');
      return null;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Notification permission denied');
        return null;
      }

      const reg = await navigator.serviceWorker.ready;
      swRegistrationRef.current = reg;

      // Try FCM first, fall back to Web Push (VAPID)
      let pushToken = null;
      let via = 'webpush';

      if (FCM_ENABLED) {
        pushToken = await getFCMToken(reg);
        via = pushToken ? 'fcm' : 'webpush';
      }

      if (!pushToken) {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
          || import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY;
        pushToken = await getWebPushToken(reg, vapidKey);
      }

      setToken(pushToken);
      setError(null);

      // Register token with backend
      await registerTokenWithBackend(pushToken, via);
      return pushToken;
    } catch (err) {
      console.error('Permission request failed:', err);
      setError('Failed to enable notifications');
      return null;
    }
  }, [supportsPush]);

  const getFCMToken = async (registration) => {
    if (!firebaseConfig.apiKey) return null;
    const modules = await loadFirebase();
    if (!modules) return null;

    const app = modules.initializeApp(firebaseConfig, 'gram-swasthya');
    const messaging = modules.getMessaging(app);

    const currentToken = await modules.getToken(messaging, {
      vapidKey: firebaseConfig.vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) return currentToken;

    // Try to refresh
    try {
      await registration.pushManager.getSubscription()?.unsubscribe();
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(firebaseConfig.vapidKey),
      });
    } catch (e) {
      // ignore, fallback happens in caller
    }

    setIsLoading(false);
    setError('FCM token generation failed');
    return null;
  };

  const getWebPushToken = async (registration, vapidKey) => {
    if (!vapidKey) {
      setError('Push service not configured (missing VAPID key)');
      setIsLoading(false);
      return null;
    }

    try {
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setSubscription(existing);
        setIsLoading(false);
        return existing.endpoint;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      setSubscription(sub);
      setIsLoading(false);
      return sub.endpoint;
    } catch (err) {
      console.error('Web Push subscribe failed:', err);
      setError('Failed to subscribe to push service');
      setIsLoading(false);
      return null;
    }
  };

  const registerTokenWithBackend = async (pushToken, via) => {
    try {
      const body = via === 'fcm'
        ? { fcmToken: pushToken }
        : { webPushEndpoint: pushToken };

      if (via === 'fcm' && patientId) {
        await api.updateProfile?.({ fcmToken: pushToken });
      } else if (via === 'webpush') {
        await api.request('/patient/webpush-token', {
          method: 'POST',
          body,
        });
      }
    } catch (error) {
      console.error('Registering push token failed:', error);
    }
  };

  // Acknowledge handler (browser notification click)
  const acknowledge = useCallback(async (notificationId, status) => {
    try {
      const res = await api.acknowledgeNotification?.(notificationId, status);
      onAcknowledgeRef.current?.(res?.data);
      return res;
    } catch (error) {
      console.error('Acknowledge failed:', error);
      return null;
    }
  }, []);

  const showTestNotification = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    const n = new Notification('Gram Swasthya', {
      body: 'Medicine reminder enabled!',
      icon: '/favicon.svg',
      tag: 'gram-swasthya',
      actions: [{ action: 'taken', title: '✓ Took it' }],
    });
    n.onclick = () => {
      n.close();
      window.focus();
    };
  }, []);

  return {
    permission,
    token,
    subscription,
    supportsPush,
    isLoading,
    error,
    requestPermission,
    acknowledge,
    showTestNotification,
    isFCM: FCM_ENABLED,
  };
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}