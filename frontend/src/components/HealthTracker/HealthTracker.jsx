import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHealthTrackerData } from '../../hooks/useHealthMetrics';
import { useReminders } from '../../hooks/useReminders';
import healthDefaults from '../../data/health-defaults.json';
import Overview from './Overview';
import History from './History';
import Goals from './Goals';
import Reminders from './Reminders';
import QuickAddModal from './QuickAddModal';
import HealthDisclaimer from './HealthDisclaimer';
import styles from './HealthTracker.module.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'history', label: 'History', icon: '📜' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'reminders', label: 'Reminders', icon: '🔔' }
];

const METRIC_TYPES = [
  { type: 'weight', icon: '⚖️', label: 'Weight' },
  { type: 'blood_pressure', icon: '🩸', label: 'BP' },
  { type: 'glucose', icon: '🩹', label: 'Sugar' },
  { type: 'heart_rate', icon: '❤️', label: 'HR' },
  { type: 'water', icon: '💧', label: 'Water' },
  { type: 'sleep', icon: '😴', label: 'Sleep' },
  { type: 'medication', icon: '💊', label: 'Meds' },
  { type: 'symptoms', icon: '🤒', label: 'Symptoms' }
];

export default function HealthTracker() {
  const { t } = useTranslation('healthTracker');
  const tracker = useHealthTrackerData();
  const {
    data,
    addMetric,
    updateMetric,
    deleteMetric,
    addGoal,
    updateGoal,
    deleteGoal,
    getReminders,
    addReminder
  } = tracker;

  const { notifications, dismissNotification, markTaken, snooze, isReminderComplete } = useReminders(tracker);

  const [activeTab, setActiveTab] = useState('overview');
  const [modalMetric, setModalMetric] = useState(null);

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const openModal = (metricType) => {
    setModalMetric(metricType);
  };

  const closeModal = () => {
    setModalMetric(null);
  };

  const reminders = getReminders(new Date());

  const todayDate = new Date();
  const medicationEntries = (data.metrics.medication || []).filter(
    m => m.date === todayDate.toISOString().split('T')[0]
  );

  const modalConfig = modalMetric ? healthDefaults.metrics[modalMetric] : null;

  return (
    <div className={styles.container}>
      <HealthDisclaimer />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t('healthTracker.title')}</h1>
          <span className={styles.date}>{todayLabel}</span>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.tabPanels}>
        {activeTab === 'overview' && (
          <Overview
            metrics={data.metrics}
            onQuickAdd={openModal}
          />
        )}
        {activeTab === 'history' && (
          <History
            metrics={data.metrics}
            updateMetric={updateMetric}
            deleteMetric={deleteMetric}
          />
        )}
        {activeTab === 'goals' && (
          <Goals
            goals={data.goals}
            metrics={data.metrics}
            addGoal={addGoal}
            updateGoal={updateGoal}
            deleteGoal={deleteGoal}
          />
        )}
        {activeTab === 'reminders' && (
          <Reminders
            reminders={reminders}
            addReminder={addReminder}
            markTaken={markTaken}
            snooze={snooze}
            isReminderComplete={isReminderComplete}
          />
        )}
      </div>

      <div className={styles.quickAddSection}>
        <h3 className={styles.sectionTitle}>{t('healthTracker.addRecord')}</h3>
        <div className={styles.quickAddGrid} role="group" aria-label="Quick add metrics">
          {METRIC_TYPES.map(metric => (
            <button
              key={metric.type}
              className={styles.quickAddBtn}
              onClick={() => openModal(metric.type)}
              aria-label={`Log ${metric.label}`}
            >
              <span className={styles.quickAddIcon}>{metric.icon}</span>
              <span className={styles.quickAddLabel}>{metric.label}</span>
            </button>
          ))}
        </div>
      </div>

      <HealthDisclaimer variant="compact" />

      {modalMetric && modalConfig && (
        <QuickAddModal
          metricType={modalMetric}
          metricConfig={modalConfig}
          isMedicationChecklist={modalMetric === 'medication'}
          medicationEntries={medicationEntries}
          onSave={addMetric}
          updateMedication={updateMetric}
          onClose={closeModal}
        />
      )}

      {notifications.map(notification => (
        <div key={notification.id} className={styles.notification} role="alert">
          <span>{notification.message}</span>
          <div className={styles.notificationActions}>
            <button className={styles.notificationBtn} onClick={() => dismissNotification(notification.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}