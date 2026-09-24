import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useHealthTrackerData } from '../useHealthMetrics';

const STORAGE_KEY = 'gramSwasthya_healthTracker';

describe('HealthTracker persistence (useHealthMetrics)', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes from localStorage when data exists', () => {
    const persisted = {
      user_id: 'user_123',
      metrics: { weight: [{ id: 'w1', value: 70 }] },
      goals: [],
      reminders: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

    const { result } = renderHook(() => useHealthTrackerData());
    expect(result.current.data.metrics.weight).toEqual([{ id: 'w1', value: 70 }]);
  });

  it('persists newly added metrics to localStorage', async () => {
    const { result } = renderHook(() => useHealthTrackerData());

    act(() => {
      result.current.addMetric('weight', { value: 68, unit: 'kg' });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.metrics.weight).toHaveLength(1);
    expect(stored.metrics.weight[0].value).toBe(68);
  });

  it('custom initialValue is used when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorage('custom_key', { count: 0 })
    );
    expect(result.current[0]).toEqual({ count: 0 });
  });
});