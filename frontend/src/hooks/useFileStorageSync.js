import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'GramSwasthyaFileStorage';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const METADATA_STORE = 'metadata';

let dbPromise = null;

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

export function useFileStorageSync(patientId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedFiles, setCachedFiles] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncFiles();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [patientId]);

  // Load cached files on mount
  useEffect(() => {
    if (patientId) {
      loadCachedFiles();
      loadLastSync();
    }
  }, [patientId]);

  const loadCachedFiles = useCallback(async () => {
    if (!patientId) return;
    
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('patientId');
      const request = index.getAll(patientId);
      
      request.onsuccess = () => {
        const files = request.result || [];
        // Sort by uploadedAt desc
        files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        setCachedFiles(files);
      };
      request.onerror = () => console.error('Failed to load cached files');
    } catch (error) {
      console.error('Error loading cached files:', error);
    }
  }, [patientId]);

  const loadLastSync = useCallback(async () => {
    if (!patientId) return;
    
    try {
      const db = await initDB();
      const transaction = db.transaction(METADATA_STORE, 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(`lastSync_${patientId}`);
      
      request.onsuccess = () => {
        if (request.result) {
          setLastSync(new Date(request.result.value));
        }
      };
    } catch (error) {
      console.error('Error loading last sync:', error);
    }
  }, [patientId]);

  const saveLastSync = useCallback(async (timestamp = new Date()) => {
    if (!patientId) return;
    
    try {
      const db = await initDB();
      const transaction = db.transaction(METADATA_STORE, 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      await store.put({ key: `lastSync_${patientId}`, value: timestamp.toISOString() });
      setLastSync(timestamp);
    } catch (error) {
      console.error('Error saving last sync:', error);
    }
  }, [patientId]);

  const cacheFiles = useCallback(async (files) => {
    if (!patientId || !files?.length) return;
    
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      for (const file of files) {
        await store.put({
          ...file,
          patientId,
          cachedAt: new Date().toISOString(),
        });
      }
      
      // Also update cached state
      const allFiles = [...files, ...cachedFiles.filter(f => !files.some(nf => nf.id === f.id))];
      allFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      setCachedFiles(allFiles);
      
      await saveLastSync();
    } catch (error) {
      console.error('Error caching files:', error);
    }
  }, [patientId, cachedFiles, saveLastSync]);

  const clearCache = useCallback(async () => {
    if (!patientId) return;
    
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('patientId');
      const request = index.getAllKeys(patientId);
      
      request.onsuccess = () => {
        const keys = request.result || [];
        const deleteTransaction = db.transaction(STORE_NAME, 'readwrite');
        const deleteStore = deleteTransaction.objectStore(STORE_NAME);
        keys.forEach(key => deleteStore.delete(key));
        
        setCachedFiles([]);
        setLastSync(null);
      };
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [patientId]);

  const syncFiles = useCallback(async (fetchFn) => {
    if (!patientId || !isOnline || syncing) return;
    
    setSyncing(true);
    try {
      const freshFiles = await fetchFn();
      if (freshFiles?.length) {
        await cacheFiles(freshFiles);
      }
      return freshFiles;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [patientId, isOnline, syncing, cacheFiles]);

  const getCachedFile = useCallback(async (fileId) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(fileId);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached file:', error);
      return null;
    }
  }, []);

  return {
    isOnline,
    cachedFiles,
    lastSync,
    syncing,
    cacheFiles,
    loadCachedFiles,
    clearCache,
    syncFiles,
    getCachedFile,
  };
}

export default useFileStorageSync;