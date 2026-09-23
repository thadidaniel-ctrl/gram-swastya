import React from 'react';
import { clampProgress } from './utils';
import styles from './HealthTracker.module.css';

export default function GoalCard({ goal, config, current, progress, onEdit, onDelete }) {
  const { t } = useTranslation('healthTracker');
  const safeProgress = clampProgress(progress);

  const formatCurrent = (type, value) => {
    if (value == null) return '—';
    if (type === 'blood_pressure') {
      if (typeof value !== 'object' || value.systolic == null) return '—';
      return `${value.systolic}/${value.diastolic} mmHg`;
    }
    const unit = config.unit || '';
    return `${value} ${unit}`.trim();
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    const daysLeft = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed';
  };

  return (
    <div className={styles.goalCard}>
      <div className={styles.goalHeader}>
        <div className={styles.goalIcon}>{config.icon}</div>
        <div className={styles.goalInfo}>
          <h3 className={styles.goalTitle}>{config.label}</h3>
          <p className={styles.goalTarget}>Target: {goal.target} {config.unit}</p>
        </div>
        <div className={styles.goalActions}>
          <button className={styles.btnIcon} onClick={() => onEdit(goal)} aria-label="Edit goal">✏️</button>
          <button className={styles.btnIcon} onClick={() => onDelete(goal.id)} aria-label="Delete goal">🗑️</button>
        </div>
      </div>

      <div className={styles.goalProgress}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${safeProgress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(safeProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className={styles.progressLabels}>
          <span className={styles.progressCurrent}>Current: {formatCurrent(goal.type, current)}</span>
          <span className={styles.progressPercent}>{Math.round(safeProgress)}%</span>
        </div>
      </div>

      {goal.deadline && (
        <div className={styles.goalDeadline}>
          <span>📅 {formatDeadline(goal.deadline)}</span>
        </div>
      )}

      <div className={styles.goalStatus}>
        {safeProgress >= 100 ? (
          <span className={styles.statusSuccess}>🎉 Goal Achieved!</span>
        ) : (
          <span className={styles.statusOngoing}>Keep going! You're {Math.round(safeProgress)}% there.</span>
        )}
      </div>
    </div>
  );
}