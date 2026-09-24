import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gramSwasthya_healthTracker';

const DEFAULT_DATA = {
  user_id: 'user_123',
  metrics: {
    weight: [],
    blood_pressure: [],
    glucose: [],
    heart_rate: [],
    medication: [],
    water: [],
    sleep: [],
    symptoms: []
  },
  goals: [],
  reminders: []
};

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage key:', key, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('Error setting localStorage key:', key, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

export function useHealthTrackerData() {
  const [data, setData] = useLocalStorage(STORAGE_KEY, DEFAULT_DATA);

  const addMetric = useCallback((metricType, entry) => {
    setData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [metricType]: [
          { ...entry, id: `${metricType}_${Date.now()}`, createdAt: new Date().toISOString() },
          ...prev.metrics[metricType]
        ]
      }
    }));
  }, [setData]);

  const updateMetric = useCallback((metricType, id, updates) => {
    setData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [metricType]: prev.metrics[metricType].map(m =>
          m.id === id ? { ...m, ...updates } : m
        )
      }
    }));
  }, [setData]);

  const deleteMetric = useCallback((metricType, id) => {
    setData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [metricType]: prev.metrics[metricType].filter(m => m.id !== id)
      }
    }));
  }, [setData]);

  const getMetrics = useCallback((metricType, limit) => {
    const metrics = data.metrics[metricType] || [];
    return limit ? metrics.slice(0, limit) : metrics;
  }, [data]);

  const addGoal = useCallback((goal) => {
    setData(prev => ({
      ...prev,
      goals: [{ ...goal, id: `goal_${Date.now()}`, createdAt: new Date().toISOString() }, ...prev.goals]
    }));
  }, [setData]);

  const updateGoal = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, ...updates } : g)
    }));
  }, [setData]);

  const deleteGoal = useCallback((id) => {
    setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
  }, [setData]);

  const addReminder = useCallback((reminder) => {
    setData(prev => ({
      ...prev,
      reminders: [{ ...reminder, id: `rem_${Date.now()}`, createdAt: new Date().toISOString() }, ...prev.reminders]
    }));
  }, [setData]);

  const updateReminder = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  }, [setData]);

  const deleteReminder = useCallback((id) => {
    setData(prev => ({ ...prev, reminders: prev.reminders.filter(r => r.id !== id) }));
  }, [setData]);

  const getReminders = useCallback((date) => {
    if (!date) return data.reminders || [];
    const dateStr = date.toISOString().split('T')[0];
    return (data.reminders || []).filter(r => {
      if (!r.enabled) return false;
      if (r.frequency === 'daily') return true;
      if (r.frequency === 'weekly') {
        const reminderDate = new Date(r.createdAt).getDay();
        return date.getDay() === reminderDate;
      }
      if (r.frequency === 'monthly') {
        return new Date(r.createdAt).getDate() === date.getDate();
      }
      return r.date === dateStr;
    });
  }, [data]);

  const markReminderComplete = useCallback((id, date) => {
    const dateStr = date.toISOString().split('T')[0];
    setData(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => {
        if (r.id !== id) return r;
        const completed = r.completed || {};
        return { ...r, completed: { ...completed, [dateStr]: true } };
      })
    }));
  }, [setData]);

  const isReminderComplete = useCallback((id, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const reminder = (data.reminders || []).find(r => r.id === id);
    return reminder?.completed?.[dateStr] === true;
  }, [data]);

  return {
    data,
    setData,
    addMetric,
    updateMetric,
    deleteMetric,
    getMetrics,
    addGoal,
    updateGoal,
    deleteGoal,
    addReminder,
    updateReminder,
    deleteReminder,
    getReminders,
    markReminderComplete,
    isReminderComplete
  };
}