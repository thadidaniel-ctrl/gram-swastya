import React, { useState } from 'react';
import ReminderItem from './ReminderItem';
import { todayKey } from './utils';
import styles from './HealthTracker.module.css';

const REMINDER_TYPES = [
  { type: 'medication', icon: '💊', label: 'Medication' },
  { type: 'health_check', icon: '🩺', label: 'Health Check' },
  { type: 'water', icon: '💧', label: 'Water' },
  { type: 'exercise', icon: '🏃', label: 'Exercise' },
  { type: 'measurement', icon: '📏', label: 'Measurement' }
];

const EMPTY_FORM = {
  type: 'medication',
  name: '',
  time: '08:00',
  frequency: 'daily',
  enabled: true
};

export default function Reminders({ reminders, addReminder, markTaken, snooze, isReminderComplete }) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const allReminders = reminders || [];
  const upcoming = allReminders.filter(r => !isReminderComplete(r.id, new Date()));
  const completed = allReminders.filter(r => isReminderComplete(r.id, new Date()));

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const payload = formData.frequency === 'custom'
      ? { ...formData, date: todayKey() }
      : formData;
    addReminder({ ...payload, name: formData.name.trim() });
    handleCancel();
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setFormData(EMPTY_FORM);
  };

  const getTimeUntil = (timeStr) => {
    if (!timeStr) return 'All day';
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
    const diffMins = Math.floor((reminderTime - now) / 60000);

    if (diffMins <= 0) return 'Due now';
    if (diffMins < 60) return `in ${diffMins} min`;
    const hoursUntil = Math.floor(diffMins / 60);
    const minsUntil = diffMins % 60;
    return `in ${hoursUntil}h ${minsUntil}m`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className={styles.reminders}>
      <div className={styles.remindersHeader}>
        <h2 className={styles.title}>🔔 Reminders & Medications</h2>
        <button className={styles.fab} onClick={() => setShowAddForm(true)}>
          + Add Reminder
        </button>
      </div>

      {showAddForm && (
        <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h3>Add Reminder</h3>
              <button className={styles.modalClose} onClick={handleCancel}>✕</button>
            </header>
            <form onSubmit={handleFormSubmit} className={styles.reminderForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Reminder Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className={styles.select}
                >
                  {REMINDER_TYPES.map(t => (
                    <option key={t.type} value={t.type}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={formData.type === 'medication' ? 'Medication name (e.g., Aspirin 500mg)' : 'Reminder name'}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Time</label>
                <input
                  type="time"
                  className={styles.input}
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  className={styles.select}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={!formData.name.trim()}>
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {upcoming.length === 0 && completed.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔔</span>
          <h3>No Reminders Set</h3>
          <p>Add reminders for medications and health checks to stay on track.</p>
          <button className={styles.fab} onClick={() => setShowAddForm(true)}>
            + Add First Reminder
          </button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className={styles.reminderSection}>
              <h3 className={styles.sectionTitle}>🔔 Upcoming Today</h3>
              <div className={styles.remindersList}>
                {upcoming.map(reminder => (
                  <ReminderItem
                    key={reminder.id}
                    reminder={reminder}
                    timeUntil={getTimeUntil(reminder.time)}
                    onMarkTaken={() => markTaken(reminder.id)}
                    onSnooze={() => snooze(reminder.id)}
                    formatTime={formatTime}
                    isCompleted={false}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className={styles.reminderSection}>
              <h3 className={styles.sectionTitle}>✅ Completed Today</h3>
              <div className={styles.remindersList}>
                {completed.map(reminder => (
                  <ReminderItem
                    key={reminder.id}
                    reminder={reminder}
                    timeUntil=""
                    onMarkTaken={() => {}}
                    onSnooze={() => {}}
                    formatTime={formatTime}
                    isCompleted={true}
                    snoozeEnabled={false}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}