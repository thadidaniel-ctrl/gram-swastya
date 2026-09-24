import React from 'react';
import { STATUS_COLORS, STATUS_ICONS } from './utils';
import styles from './HealthTracker.module.css';

export default function MetricCard({ icon, label, value, status = 'unknown', lastTime, onClick }) {
  const { t } = useTranslation();
  const color = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const statusIcon = STATUS_ICONS[status] || STATUS_ICONS.unknown;

  return (
    <button
      className={styles.metricCard}
      onClick={onClick}
      disabled={!onClick}
      style={{ borderLeftColor: color }}
    >
      <div className={styles.metricHeader}>
        <span className={styles.metricIcon}>{icon}</span>
        <span className={styles.metricLabel}>{label}</span>
      </div>
      <div className={styles.metricValue}>
        <span className={styles.metricNumber}>{value}</span>
        <span className={styles.metricStatus} style={{ color }}>
          <span className={styles.statusIcon}>{statusIcon}</span>
        </span>
      </div>
      {lastTime && (
        <div className={styles.metricTime}>
          Last: {lastTime}
        </div>
      )}
    </button>
  );
}