const DB_NAME = 'GramSwasthyaVoice';
const DB_VERSION = 1;
const STORE_CONVERSATIONS = 'conversations';
const STORE_CACHED_RESPONSES = 'cachedResponses';
const STORE_PENDING_SYNC = 'pendingSync';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      if (!database.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const convStore = database.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id', autoIncrement: true });
        convStore.createIndex('sessionId', 'sessionId', { unique: false });
        convStore.createIndex('timestamp', 'timestamp', { unique: false });
        convStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORE_CACHED_RESPONSES)) {
        const cacheStore = database.createObjectStore(STORE_CACHED_RESPONSES, { keyPath: 'queryHash' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORE_PENDING_SYNC)) {
        const syncStore = database.createObjectStore(STORE_PENDING_SYNC, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  }
}

function generateQueryHash(query, language) {
  let hash = 0;
  const str = `${query}:${language}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function saveConversation(conversation) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    const data = {
      ...conversation,
      timestamp: Date.now(),
      synced: false,
    };
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getConversations(limit = 50) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');
    
    const results = [];
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getConversation(sessionId) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    const index = store.index('sessionId');
    const request = index.get(sessionId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function markConversationSynced(id) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    const request = store.get(id);
    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        data.synced = true;
        const updateRequest = store.put(data);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function cacheResponse(query, language, response, ttl = 3600) {
  await openDB();
  const queryHash = generateQueryHash(query, language);
  const expiresAt = Date.now() + ttl * 1000;
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHED_RESPONSES, 'readwrite');
    const store = tx.objectStore(STORE_CACHED_RESPONSES);
    const request = store.put({
      queryHash,
      query,
      language,
      response,
      timestamp: Date.now(),
      expiresAt,
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedResponse(query, language) {
  await openDB();
  const queryHash = generateQueryHash(query, language);
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHED_RESPONSES, 'readonly');
    const store = tx.objectStore(STORE_CACHED_RESPONSES);
    const request = store.get(queryHash);
    request.onsuccess = () => {
      const data = request.result;
      if (data && data.expiresAt > Date.now()) {
        resolve(data.response);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearExpiredCache() {
  await openDB();
  const now = Date.now();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHED_RESPONSES, 'readwrite');
    const store = tx.objectStore(STORE_CACHED_RESPONSES);
    const index = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function queueForSync(type, data) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_SYNC, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_SYNC);
    const request = store.add({
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingSync(limit = 50) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_SYNC, 'readonly');
    const store = tx.objectStore(STORE_PENDING_SYNC);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');
    
    const results = [];
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push({ id: cursor.primaryKey, ...cursor.value });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromSyncQueue(id) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_SYNC, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_SYNC);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function incrementSyncRetry(id) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_SYNC, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_SYNC);
    const request = store.get(id);
    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        data.retries = (data.retries || 0) + 1;
        const updateRequest = store.put(data);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearOldConversations(days = 30) {
  await openDB();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Offline pattern responses (matching backend patterns)
export const OFFLINE_PATTERNS = {
  medicines: {
    keywords: ['medicine', 'medication', 'drug', 'pill', 'tablet', 'dosage', 'prescription', 'reminder'],
    generateResponse: (patientData) => {
      const meds = patientData?.medicines?.filter(m => m.isActive) || [];
      if (meds.length === 0) {
        return {
          text_response: "You don't have any active medicines saved offline.",
          intent: 'medicine_info',
          entities: { medicines: [] },
          actions: [{ type: 'navigate', payload: { screen: 'medicines' }, description: 'View medicines' }],
          requires_handoff: false
        };
      }
      return {
        text_response: `You have ${meds.length} active medicine${meds.length > 1 ? 's' : ''}: ${meds.map(m => `${m.name} ${m.dosage} ${m.frequency}`).join(', ')}.`,
        intent: 'medicine_info',
        entities: { medicines: meds.map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency })) },
        actions: [{ type: 'navigate', payload: { screen: 'medicines' }, description: 'View all medicines' }],
        requires_handoff: false
      };
    }
  },
  appointments: {
    keywords: ['appointment', 'book', 'schedule', 'doctor', 'consultation', 'visit', 'meet'],
    generateResponse: (patientData) => {
      const upcoming = patientData?.appointments?.filter(a => 
        new Date(a.scheduledAt) > new Date() && ['scheduled', 'confirmed'].includes(a.status)
      ).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)) || [];
      
      if (upcoming.length === 0) {
        return {
          text_response: "You don't have any upcoming appointments saved offline.",
          intent: 'appointment_info',
          entities: { appointments: [] },
          actions: [{ type: 'navigate', payload: { screen: 'appointments' }, description: 'Book appointment' }],
          requires_handoff: false
        };
      }
      const next = upcoming[0];
      return {
        text_response: `Your next appointment is with ${next.doctor?.profile?.fullName || 'Doctor'} on ${new Date(next.scheduledAt).toLocaleString()} for ${next.type} consultation.`,
        intent: 'appointment_info',
        entities: { appointments: upcoming.slice(0, 3).map(a => ({ 
          doctor: a.doctor?.profile?.fullName, 
          time: a.scheduledAt, 
          type: a.type,
          status: a.status 
        })) },
        actions: [{ type: 'navigate', payload: { screen: 'appointments' }, description: 'View all appointments' }],
        requires_handoff: false
      };
    }
  },
  records: {
    keywords: ['record', 'history', 'diagnosis', 'health', 'report', 'vaccination', 'allergy'],
    generateResponse: (patientData) => {
      return {
        text_response: `You have ${patientData?.diagnoses?.length || 0} diagnoses, ${patientData?.medicines?.length || 0} medicines, ${patientData?.appointments?.length || 0} appointments, and ${patientData?.prescriptions?.length || 0} prescriptions in your health records.`,
        intent: 'health_records',
        entities: { 
          stats: {
            diagnoses: patientData?.diagnoses?.length || 0,
            medicines: patientData?.medicines?.length || 0,
            appointments: patientData?.appointments?.length || 0,
            prescriptions: patientData?.prescriptions?.length || 0
          }
        },
        actions: [{ type: 'navigate', payload: { screen: 'records' }, description: 'View health records' }],
        requires_handoff: false
      };
    }
  },
  emergency: {
    keywords: ['emergency', 'ambulance', 'urgent', 'critical', 'help', 'hospital', 'dying', 'heart attack', 'stroke'],
    generateResponse: () => {
      return {
        text_response: "This sounds like an emergency! Please call emergency services directly: 108 (India) or 911 (US).",
        intent: 'emergency',
        entities: { emergency: true },
        actions: [
          { type: 'call_ambulance', payload: { emergency_type: 'general' }, description: 'Book emergency ambulance' },
          { type: 'navigate', payload: { screen: 'ambulance' }, description: 'Open ambulance booking' }
        ],
        requires_handoff: false
      };
    }
  }
};

function detectOfflinePattern(query, patientData) {
  const normalized = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  for (const [patternName, pattern] of Object.entries(OFFLINE_PATTERNS)) {
    const keywordMatch = pattern.keywords.some(kw => normalized.includes(kw));
    if (keywordMatch) {
      return { patternName, pattern, matched: true };
    }
  }
  return { matched: false };
}

export async function getOfflineResponse(query, patientData) {
  const patternResult = detectOfflinePattern(query, patientData);
  
  if (patternResult.matched && patternResult.pattern.generateResponse) {
    try {
      return {
        ...patternResult.pattern.generateResponse(patientData),
        fromCache: true,
        patternMatched: patternResult.patternName,
        offline: true,
      };
    } catch (error) {
      console.error('Offline response generation failed:', error);
    }
  }
  
  return {
    text_response: "I'm currently offline and can't process that request. Please check your connection and try again.",
    intent: 'offline_fallback',
    entities: {},
    actions: [],
    requires_handoff: false,
    offline: true,
  };
}

export function isOnline() {
  return navigator.onLine;
}

export function setupOnlineListener(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}