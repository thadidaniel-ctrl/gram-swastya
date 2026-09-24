import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'GramSwasthyaFileStorage';
const DB_VERSION = 2;
const STORE_NAME = 'files';
const METADATA_STORE = 'metadata';

let dbPromise = null;

// Convert an IndexedDB request into a Promise
function reqAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function initDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('patientId', 'patientId', { unique: false });
        store.createIndex('folderId', 'folderId', { unique: false });
        store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        store.createIndex('isDeleted', 'isDeleted', { unique: false });
      }

      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

const COLLECTION_TYPES = ['files', 'folders', 'medicines', 'appointments'];

export function useFileStorageSync(patientId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedFiles, setCachedFiles] = useState([]);
  const [cachedFolders, setCachedFolders] = useState([]);
  const [cachedMedicines, setCachedMedicines] = useState([]);
  const [cachedAppointments, setCachedAppointments] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached data on mount
  useEffect(() => {
    if (patientId) {
      Promise.all([loadCachedFiles(), loadLastSync()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Generic read of a collection from the metadata store
  const readCollection = useCallback(
    async (type) => {
      if (!patientId) return [];
      try {
        const db = await initDB();
        const tx = db.transaction(METADATA_STORE, 'readonly');
        const result = await reqAsPromise(tx.objectStore(METADATA_STORE).get(`col:${patientId}:${type}`));
        return Array.isArray(result?.value) ? result.value : [];
      } catch (error) {
        console.error(`Error reading cached ${type}:`, error);
        return [];
      }
    },
    [patientId]
  );

  // Generic write of a collection into the metadata store
  const writeCollection = useCallback(
    async (type, items) => {
      if (!patientId) return;
      try {
        const db = await initDB();
        const tx = db.transaction(METADATA_STORE, 'readwrite');
        await reqAsPromise(
          tx.objectStore(METADATA_STORE).put({
            key: `col:${patientId}:${type}`,
            value: items,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.error(`Error caching ${type}:`, error);
      }
    },
    [patientId]
  );

  const mergeCollection = (existing, incoming, idField = 'id') => {
    const map = new Map(existing.map(item => [item[idField], item]));
    incoming.forEach(item => map.set(item[idField], item));
    return Array.from(map.values());
  };

  const loadCachedFiles = useCallback(async () => {
    if (!patientId) return;

    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('patientId');
      const files = (await reqAsPromise(index.getAll(patientId))) || [];
      files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      setCachedFiles(files);
    } catch (error) {
      console.error('Error loading cached files:', error);
    }
  }, [patientId]);

  const loadLastSync = useCallback(async () => {
    if (!patientId) return;

    try {
      const db = await initDB();
      const tx = db.transaction(METADATA_STORE, 'readonly');
      const result = await reqAsPromise(tx.objectStore(METADATA_STORE).get(`lastSync_${patientId}`));
      if (result?.value) {
        setLastSync(new Date(result.value));
      }
    } catch (error) {
      console.error('Error loading last sync:', error);
    }
  }, [patientId]);

  const saveLastSync = useCallback(
    async (timestamp = new Date()) => {
      if (!patientId) return;

      try {
        const db = await initDB();
        const tx = db.transaction(METADATA_STORE, 'readwrite');
        await reqAsPromise(
          tx.objectStore(METADATA_STORE).put({
            key: `lastSync_${patientId}`,
            value: timestamp.toISOString(),
          })
        );
        setLastSync(timestamp);
      } catch (error) {
        console.error('Error saving last sync:', error);
      }
    },
    [patientId]
  );

  const cacheFiles = useCallback(
    async (files) => {
      if (!patientId || !files?.length) return;

      try {
        const db = await initDB();
        for (const file of files) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          await reqAsPromise(
            store.put({
              ...file,
              patientId,
              cachedAt: new Date().toISOString(),
            })
          );
          await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
        }
        setCachedFiles(prev => {
          const merged = mergeCollection(prev, files);
          merged.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
          return merged;
        });
      } catch (error) {
        console.error('Error caching files:', error);
      }
    },
    [patientId]
  );

  const cacheFolders = useCallback(
    async (folders) => {
      if (!patientId || !folders?.length) return;
      setCachedFolders(prev => mergeCollection(prev, folders));
      await writeCollection('folders', folders);
    },
    [patientId, writeCollection]
  );

  const cacheMedicines = useCallback(
    async (medicines) => {
      if (!patientId || !medicines?.length) return;
      setCachedMedicines(prev => mergeCollection(prev, medicines));
      await writeCollection('medicines', medicines);
    },
    [patientId, writeCollection]
  );

  const cacheAppointments = useCallback(
    async (appointments) => {
      if (!patientId || !appointments?.length) return;
      setCachedAppointments(prev => mergeCollection(prev, appointments));
      await writeCollection('appointments', appointments);
    },
    [patientId, writeCollection]
  );

  const loadCachedCollections = useCallback(async () => {
    const [folders, medicines, appointments] = await Promise.all(
      COLLECTION_TYPES.filter(t => t !== 'files').map(readCollection)
    );
    setCachedFolders(folders);
    setCachedMedicines(medicines);
    setCachedAppointments(appointments);
  }, [readCollection]);

  const clearCache = useCallback(async () => {
    if (!patientId) return;

    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.objectStore(STORE_NAME).index('patientId');
      const keys = (await reqAsPromise(index.getAllKeys(patientId))) || [];
      for (const key of keys) {
        await reqAsPromise(tx.objectStore(STORE_NAME).delete(key));
      }

      const metaTx = db.transaction(METADATA_STORE, 'readwrite');
      const metaStore = metaTx.objectStore(METADATA_STORE);
      for (const type of COLLECTION_TYPES) {
        await reqAsPromise(metaStore.delete(`col:${patientId}:${type}`));
      }

      setCachedFiles([]);
      setCachedFolders([]);
      setCachedMedicines([]);
      setCachedAppointments([]);
      setLastSync(null);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [patientId]);

  const syncFiles = useCallback(
    async (fetchFn) => {
      if (!patientId || !isOnline || syncing) return [];

      setSyncing(true);
      try {
        const freshFiles = await fetchFn();
        if (freshFiles?.length) {
          await cacheFiles(freshFiles);
        }
        return freshFiles || [];
      } catch (error) {
        console.error('Sync failed:', error);
        throw error;
      } finally {
        setSyncing(false);
      }
    },
    [patientId, isOnline, syncing, cacheFiles]
  );

  const getCachedFile = useCallback(async (fileId) => {
    if (!fileId) return null;
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      return await reqAsPromise(tx.objectStore(STORE_NAME).get(fileId));
    } catch (error) {
      console.error('Error getting cached file:', error);
      return null;
    }
  }, []);

  const refreshCachedCollections = useCallback(async () => {
    await loadCachedCollections();
  }, [loadCachedCollections]);

  return {
    isOnline,
    cachedFiles,
    cachedFolders,
    cachedMedicines,
    cachedAppointments,
    lastSync,
    syncing,
    cacheFiles,
    cacheFolders,
    cacheMedicines,
    cacheAppointments,
    loadCachedFiles,
    loadCachedCollections,
    refreshCachedCollections,
    saveLastSync,
    clearCache,
    syncFiles,
    getCachedFile,
  };
}

export default useFileStorageSync;