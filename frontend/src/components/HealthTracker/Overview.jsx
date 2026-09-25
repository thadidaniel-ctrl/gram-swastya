import React, { useMemo } from 'react';
import healthDefaults from '../../data/health-defaults.json';
import MetricCard from './MetricCard';
import { getMetricStatus, formatValue, formatTime, todayKey } from './utils';
import styles from './HealthTracker.module.css';

const METRIC_ORDER = [
  'weight',
  'blood_pressure',
  'glucose',
  'heart_rate',
  'water',
  'sleep'
];

export default function Overview({ metrics, onQuickAdd }) {
  const data = useMemo(() => metrics || {}, [metrics]);

  const todayMetrics = useMemo(() => {
    const today = todayKey();
    return METRIC_ORDER.map(type => {
      const entries = data[type] || [];
      const todayEntry = entries.find(e => e.date === today);
      return {
        type,
        config: healthDefaults.metrics[type],
        entry: todayEntry,
        status: todayEntry ? getMetricStatus(type, todayEntry) : 'unknown',
        lastTime: todayEntry ? formatTime(todayEntry.date, todayEntry.time) : null
      };
    });
  }, [data]);

  const medicationEntries = data.medication || [];
  const todayMeds = medicationEntries.filter(e => e.date === todayKey());
  const takenCount = todayMeds.filter(m => m.taken).length;
  const totalCount = todayMeds.length || 1;
  const medAdherence = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <div className={styles.overview}>
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <h2 className={styles.overviewTitle}>TODAY</h2>
          <span className={styles.overviewDate}>{new Date().toLocaleDateString('en-IN', {
            weekday: 'short', day: '2-digit', month: 'short'
          })}</span>
        </div>

        <div className={styles.metricsGrid}>
          {todayMetrics.map(({ type, config, entry, status, lastTime }) => (
            <MetricCard
              key={type}
              icon={config.icon}
              label={config.label}
              value={entry ? formatValue(type, entry) : '—'}
              status={status}
              lastTime={lastTime}
              onClick={() => onQuickAdd(type)}
            />
          ))}

          <MetricCard
            icon="💊"
            label="Medications"
            value={totalCount > 0 ? `${medAdherence}%` : '—'}
            status={medAdherence >= 100 ? 'normal' : medAdherence >= 75 ? 'alert' : 'high'}
            lastTime={totalCount > 0 ? `${takenCount}/${totalCount} taken` : 'No meds logged today'}
            onClick={() => onQuickAdd('medication')}
          />
        </div>

        <div className={styles.quickActions}>
          {METRIC_ORDER.slice(0, 4).map(type => (
            <button
              key={type}
              className={styles.quickActionBtn}
              onClick={() => onQuickAdd(type)}
            >
              <span>{healthDefaults.metrics[type].icon}</span>
              <span>{healthDefaults.metrics[type].label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}