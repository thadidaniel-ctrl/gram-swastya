import { useState, useEffect, useCallback, useRef } from 'react';
import { useFileStorageSync } from './useFileStorageSync';

const SYNC_INTERVAL = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

export function useOfflineSync(patientId, apiClient) {
  const {
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
    refreshCachedCollections,
    clearCache,
  } = useFileStorageSync(patientId);

  const [syncState, setSyncState] = useState({
    status: 'idle', // idle, syncing, success, error, conflict
    progress: 0,
    lastError: null,
    conflicts: [],
    lastSyncedAt: lastSync,
  });

  const [pendingChanges, setPendingChanges] = useState({
    files: [],
    folders: [],
    medicines: [],
  });

  const retryCountRef = useRef(0);
  const syncTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Queue a change for sync
  const queueChange = useCallback((type, change) => {
    setPendingChanges(prev => ({
      ...prev,
      [type]: [...prev[type], { ...change, timestamp: Date.now() }],
    }));
  }, []);

  // Keep latest syncState/pendingChanges in refs to avoid stale closures and infinite loops
  const syncStateRef = useRef(syncState);
  const pendingChangesRef = useRef(pendingChanges);
  useEffect(() => { syncStateRef.current = syncState; }, [syncState]);
  useEffect(() => { pendingChangesRef.current = pendingChanges; }, [pendingChanges]);

  // Schedule periodic sync (defined before sync to avoid TDZ)
  const scheduleNextSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      if (isOnline && patientId) syncRef.current?.();
    }, SYNC_INTERVAL);
  }, [isOnline, patientId]);

  const syncRef = useRef(null);

  // Sync with server
  const sync = useCallback(async (force = false) => {
    if (!patientId) return;
    // Use ref for syncing check to avoid dep loop
    if (syncStateRef.current.status === 'syncing' && !force) return;

    abortControllerRef.current = new AbortController();
    setSyncState(prev => ({ ...prev, status: 'syncing', progress: 0, lastError: null }));
    retryCountRef.current = 0;

    const attemptSync = async (attempt = 1) => {
      try {
        setSyncState(prev => ({ ...prev, progress: 10 }));

        // Get server manifest
        const lastSyncTime = syncStateRef.current.lastSyncedAt;
        const manifestUrl = lastSyncTime
          ? `/patient/file-storage/sync/manifest?lastSync=${encodeURIComponent(lastSyncTime)}`
          : '/patient/file-storage/sync/manifest';
        const response = await apiClient.get(manifestUrl, {
          signal: abortControllerRef.current.signal,
        });

        setSyncState(prev => ({ ...prev, progress: 40 }));

        const manifest = response.data;
        
        // Cache server data
        if (manifest.files?.length) await cacheFiles(manifest.files);
        if (manifest.folders?.length) await cacheFolders(manifest.folders);
        if (manifest.medicines?.length) await cacheMedicines(manifest.medicines);
        if (manifest.appointments?.length) await cacheAppointments(manifest.appointments);

        setSyncState(prev => ({ ...prev, progress: 60 }));

        // Apply pending local changes
        const pending = {
          files: pendingChangesRef.current.files,
          folders: pendingChangesRef.current.folders,
          medicines: pendingChangesRef.current.medicines,
        };

        if (Object.values(pending).some(arr => arr.length > 0)) {
          const applyResponse = await apiClient.post('/patient/file-storage/sync/apply', {
            changes: pending,
            resolutionStrategy: 'server_wins',
          }, { signal: abortControllerRef.current.signal });

          setSyncState(prev => ({ ...prev, progress: 80 }));

          const applyResult = applyResponse.data;
          
          if (applyResult.conflicts?.length > 0) {
            setSyncState(prev => ({
              ...prev,
              status: 'conflict',
              conflicts: applyResult.conflicts,
              progress: 90,
            }));
            return;
          }

          // Clear successfully applied changes
          setPendingChanges(prev => ({
            files: prev.files.filter(f => !applyResult.applied.some(a => a.id === (f.id || f.clientId))),
            folders: prev.folders.filter(f => !applyResult.applied.some(a => a.id === (f.id || f.clientId))),
            medicines: prev.medicines.filter(m => !applyResult.applied.some(a => a.id === (m.id || m.clientId))),
          }));
        }

        setSyncState(prev => ({
          ...prev,
          status: 'success',
          progress: 100,
          lastSyncedAt: new Date().toISOString(),
          lastError: null,
        }));

        // Schedule next sync
        scheduleNextSync();

      } catch (error) {
        if (error.name === 'AbortError') return;

        console.error(`Sync attempt ${attempt} failed:`, error);

        if (attempt < MAX_RETRIES) {
          retryCountRef.current = attempt;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
          return attemptSync(attempt + 1);
        }

        setSyncState(prev => ({
          ...prev,
          status: 'error',
          progress: 0,
          lastError: error.message || 'Sync failed',
        }));

        // Retry later
        setTimeout(() => scheduleNextSync(), RETRY_DELAY * MAX_RETRIES);
      }
    };

    attemptSync();
  }, [patientId, apiClient, cacheFiles, cacheFolders, cacheMedicines, cacheAppointments, scheduleNextSync]);
  syncRef.current = sync;

  // Handle online/offline
  useEffect(() => {
    if (isOnline) {
      setSyncState(prev => ({ ...prev, status: isOnline ? 'idle' : prev.status }));
      sync();
    } else {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      setSyncState(prev => ({ ...prev, status: 'offline' }));
    }

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [isOnline, sync]);

  // Initial sync on mount
  useEffect(() => {
    if (patientId) {
      refreshCachedCollections();
    }
    if (patientId && isOnline) {
      sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, isOnline]);

  // Resolve conflict
  const resolveConflict = useCallback(async (conflictId, resolution) => {
    try {
      await apiClient.post(`/patient/file-storage/sync/conflict/${conflictId}/resolve`, { resolution });
setSyncState(prev => ({
        ...prev,
        conflicts: prev.conflicts.filter(c => c.id !== conflictId),
      }));

      if (syncState.conflicts.length === 1) {
        setSyncState(prev => ({ ...prev, status: 'success', progress: 100 }));
        sync();
      }
    } catch (error) {
      console.error('Conflict resolution failed:', error);
    }
  }, [apiClient, syncState.conflicts, sync]);

  // Get cached data for offline access
  const getOfflineData = useCallback(async (type, id) => {
    const cached = {
      files: cachedFiles,
      folders: cachedFolders,
      medicines: cachedMedicines,
      appointments: cachedAppointments,
    };
    return cached[type]?.find(item => item.id === id) || null;
  }, [cachedFiles, cachedFolders, cachedMedicines, cachedAppointments]);

  // Clear all local data
  const clearLocalData = useCallback(async () => {
    await clearCache();
    setPendingChanges({ files: [], folders: [], medicines: [] });
    setSyncState(prev => ({ ...prev, lastSyncedAt: null }));
  }, [clearCache]);

  return {
    // State
    isOnline,
    syncing: syncState.status === 'syncing',
    syncState,
    pendingChangesCount: 
      pendingChanges.files.length + 
      pendingChanges.folders.length + 
      pendingChanges.medicines.length,

    // Actions
    sync,
    queueChange,
    resolveConflict,
    getOfflineData,
    clearLocalData,

    // Computed
    canSync: isOnline && !syncing,
    hasConflicts: syncState.conflicts.length > 0,
  };
}

// Lightweight API client wrapper
function createApiClient() {
  const baseURL = '/api';

  return {
    async get(url, options = {}) {
      const { signal, headers } = options;
      const response = await fetch(`${baseURL}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal,
      });
      const json = await response.json().catch(() => ({ message: 'Invalid response' }));
      if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
      return { data: json };
    },

    async post(url, data, options = {}) {
      const { signal, headers } = options;
      const response = await fetch(`${baseURL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
        signal,
      });
      const json = await response.json().catch(() => ({ message: 'Invalid response' }));
      if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
      return { data: json };
    },
  };
}

const apiClient = createApiClient();

export { apiClient };

export default useOfflineSync;