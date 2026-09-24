import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';

const STORAGE_KEY = 'gramSwasthya_medicines';

function loadMedicines() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load medicines from localStorage:', error);
    return [];
  }
}

export function createDoseTime(time = '08:00', label = 'Morning', dose = '') {
  return {
    id: `dt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    time,
    label,
    dose,
    enabled: true,
  };
}

function toServerPayload(m) {
  return {
    name: m.name,
    genericName: m.genericName || '',
    strength: m.strength || '',
    form: m.form || 'tablet',
    frequency: m.frequency || 'daily',
    startDate: m.startDate,
    endDate: m.endDate || undefined,
    totalQuantity: m.totalQuantity,
    remainingQuantity: m.remainingQuantity,
    lowStockThreshold: m.lowStockThreshold,
    enableReminders: m.enableReminders,
    instructions: m.sideEffects || '',
    doseTimes: (m.doseTimes || []).map(dt => ({
      time: dt.time,
      label: dt.label || '',
      enabled: dt.enabled !== false,
    })),
  };
}

function fromServer(m) {
  return {
    id: m._id,
    serverId: m._id,
    name: m.name,
    genericName: m.genericName || '',
    strength: m.strength || '',
    form: m.form || 'tablet',
    frequency: m.frequency || 'daily',
    startDate: m.startDate,
    endDate: m.endDate,
    totalQuantity: m.totalQuantity,
    remainingQuantity: m.remainingQuantity,
    lowStockThreshold: m.lowStockThreshold,
    enableReminders: m.enableReminders,
    sideEffects: m.instructions || '',
    isActive: m.isActive !== false,
    doseLogs: [],
    doseTimes: (m.doseTimes || []).map((dt, i) => ({
      id: dt._id || `dt_srv_${i}`,
      time: dt.time,
      label: dt.label || '',
      dose: '',
      enabled: dt.isEnabled !== false,
    })),
    createdAt: m.createdAt,
  };
}

export function useMedicines() {
  const [medicines, setMedicines] = useState(loadMedicines);
  const medicinesRef = useRef(medicines);

  useEffect(() => {
    medicinesRef.current = medicines;
  }, [medicines]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    } catch (error) {
      console.error('Failed to save medicines to localStorage:', error);
    }
  }, [medicines]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body = await api.getMedicines();
        if (cancelled || !body || !body.success || !Array.isArray(body.medicines)) return;
        const server = body.medicines.map(fromServer);
        setMedicines(prev => {
          const local = prev || [];
          const serverIds = new Set(server.map(s => s.id));
          const keepLocal = local.filter(m => !serverIds.has(m.id));
          return [...server, ...keepLocal];
        });
      } catch (error) {
        // Offline or not authenticated — keep the localStorage cache.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addMedicine = useCallback((data) => {
    const local = {
      ...data,
      id: `med_${Date.now()}`,
      createdAt: new Date().toISOString(),
      doseLogs: [],
      isActive: true,
    };
    setMedicines(prev => [local, ...prev]);

    api
      .createMedicine(toServerPayload(local))
      .then(res => {
        if (res && res.success && res.medicine) {
          const serverId = res.medicine._id;
          setMedicines(prev =>
            prev.map(m => (m.id === local.id ? { ...m, id: serverId, serverId } : m))
          );
        }
      })
      .catch(() => {
        // Best-effort: medicine stays available locally until next sync.
      });
  }, []);

  const updateMedicine = useCallback((id, updates) => {
    const current = medicinesRef.current.find(m => m.id === id);
    const updated = current ? { ...current, ...updates } : updates;

    setMedicines(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));

    const serverId = (current && current.serverId) || id;
    const persist = current && current.serverId
      ? api.updateMedicine(serverId, toServerPayload(updated))
      : api.createMedicine(toServerPayload(updated)).then(res =>
          res && res.success && res.medicine ? { medicine: res.medicine } : { success: false }
        );

    persist
      .then(res => {
        if (res && res.success && res.medicine) {
          const serverId = res.medicine._id;
          setMedicines(prev =>
            prev.map(m => (m.id === id ? { ...m, id: serverId, serverId } : m))
          );
        }
      })
      .catch(() => {});
  }, []);

  const deleteMedicine = useCallback((id) => {
    const item = medicinesRef.current.find(m => m.id === id);
    setMedicines(prev => prev.filter(m => m.id !== id));
    if (item && (item.serverId || item.id)) {
      api.deleteMedicine(item.serverId || item.id).catch(() => {});
    }
  }, []);

  const logDose = useCallback((id, timeId, status) => {
    const dateStr = new Date().toISOString().split('T')[0];
    setMedicines(prev => prev.map(m => {
      if (m.id !== id) return m;
      const without = (m.doseLogs || []).filter(l => !(l.date === dateStr && l.timeId === timeId));
      if (!status) return { ...m, doseLogs: without };
      return {
        ...m,
        doseLogs: [...without, { date: dateStr, timeId, status, loggedAt: new Date().toISOString() }],
      };
    }));
  }, []);

  return {
    medicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    logDose,
  };
}