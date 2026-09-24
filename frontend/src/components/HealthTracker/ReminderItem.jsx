import React from 'react';
import styles from './HealthTracker.module.css';

export default function ReminderItem({ reminder, timeUntil, onMarkTaken, onSnooze, formatTime, isCompleted, snoozeEnabled = true }) {
  const { t } = useTranslation();
  const typeIcons = {
    medication: '💊',
    health_check: '🩺',
    water: '💧',
    exercise: '🏃',
    measurement: '📏'
  };

  const typeColors = {
    medication: '#7B1FA2',
    health_check: '#E91E63',
    water: '#00BCD4',
    exercise: '#F57C00',
    measurement: '#00897B'
  };

  const typeColor = typeColors[reminder.type] || '#2196F3';

  return (
    <div className={`${styles.reminderItem} ${isCompleted ? styles.completed : ''}`}>
      <div className={styles.reminderMain}>
        <span className={styles.reminderIcon} style={{ background: `${typeColor}20`, color: typeColor }}>
          {typeIcons[reminder.type] || '🔔'}
        </span>
        <div className={styles.reminderInfo}>
          <div className={styles.reminderNameRow}>
            <span className={styles.reminderName}>{reminder.name}</span>
            <span className={styles.reminderTime} style={{ color: typeColor }}>
              {formatTime(reminder.time)}
            </span>
          </div>
          <div className={styles.reminderDetails}>
            <span className={styles.reminderType}>{reminder.frequency === 'daily' ? 'Daily' : reminder.frequency === 'weekly' ? 'Weekly' : 'Monthly'}</span>
            {timeUntil && <span className={styles.reminderTimeUntil}>{timeUntil}</span>}
          </div>
        </div>
      </div>

      <div className={styles.reminderActions}>
        {isCompleted ? (
          <span className={styles.completedBadge}>✓ Done</span>
        ) : (
          <>
            {snoozeEnabled && (
              <button
                className={`${styles.btnSecondary} ${styles.snoozeBtn}`}
                onClick={() => onSnooze(30)}
              >
                ⏰ Snooze 30m
              </button>
            )}
            <button
              className={`${styles.btnPrimary} ${styles.takenBtn}`}
              onClick={onMarkTaken}
            >
              {reminder.type === 'medication' ? 'Taken' : 'Done'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}