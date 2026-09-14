import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function MedicineReminderSettings() {
  const { patient } = useAuth();
  const [enableReminders, setEnableReminders] = useState(true);
  const [enablePush, setEnablePush] = useState(true);
  const [dontNotifyBefore, setDontNotifyBefore] = useState('22:00');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [error, setError] = useState(null);

  const push = usePushNotifications({ patientId: patient?.id });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReminderPreferences();
      const prefs = res.data;
      setEnableReminders(prefs.enableReminders);
      setEnablePush(prefs.enablePushNotifications);
      setDontNotifyBefore(prefs.dontNotifyBefore || '22:00');
      setError(null);
    } catch (err) {
      setError('Failed to load reminder preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableReminders = async (value) => {
    setEnableReminders(value);
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.updateReminderPreferences({ enableReminders: value });
      setEnableReminders(res.data.enableReminders);
      setSaveMsg({ type: 'success', text: 'Reminder setting saved' });
    } catch (err) {
      setEnableReminders(!value);
      setSaveMsg({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnablePush = async (value) => {
    setEnablePush(value);
    setIsSaving(true);
    setSaveMsg(null);
    try {
      if (value) {
        const token = await push.requestPermission();
        if (!token) {
          throw new Error('Permission not granted');
        }
        push.showTestNotification();
      }
      const res = await api.updateReminderPreferences({ enablePushNotifications: value });
      setEnablePush(res.data.enablePushNotifications);
      setSaveMsg({ type: 'success', text: 'Notifications updated' });
    } catch (err) {
      setEnablePush(!value);
      setSaveMsg({ type: 'error', text: err.message || 'Failed to enable notifications' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDailyQuiet = async (value) => {
    setDontNotifyBefore(value);
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.updateReminderPreferences({ dontNotifyBefore: value });
      setDontNotifyBefore(res.data.dontNotifyBefore);
      setSaveMsg({ type: 'success', text: 'Quiet hours saved' });
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Failed to save quiet hours' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestReminder = async () => {
    setSaveMsg(null);
    try {
      const res = await api.testReminder();
      setSaveMsg({
        type: 'success',
        text: res.data?.length
          ? 'Test reminder sent!'
          : (res.message || 'No active medicines found'),
      });
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Test failed. Check your medicines.' });
    }
  };

  if (isLoading) {
    return (
      <div className="medicine-reminders settings panel">
        <div className="panel-header">
          <h2>💊 Medicine Reminders</h2>
        </div>
        <div className="panel-body text-center">
          <div className="spinner" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="medicine-reminders settings panel">
      <div className="panel-header">
        <h2>💊 Medicine Reminders</h2>
        <p className="panel-subtitle">
          Never miss a dose. Get a notification on your phone at each scheduled
          medicine time.
        </p>
      </div>

      <div className="panel-body">
        {error && <div className="alert alert-error">{error}</div>}
        {saveMsg && (
          <div className={`alert alert-${saveMsg.type}`}>{saveMsg.text}</div>
        )}

        <div className="setting-group">
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-title">Enable medicine reminders</span>
              <span className="setting-desc">
                Get notified at each medicine dose time
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={enableReminders}
                onChange={(e) => handleEnableReminders(e.target.checked)}
                disabled={isSaving}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-title">Push notifications</span>
              <span className="setting-desc">
                Send browser/mobile notifications. One-time permission needed.
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={enablePush}
                onChange={(e) => handleEnablePush(e.target.checked)}
                disabled={isSaving || (enablePush && push.permission === 'denied')}
              />
              <span className="slider" />
            </label>
          </div>

          {!push.supportsPush ? (
            <div className="setting-note warning">
              Push notifications are not supported on this device. Reminders
              will be shown in the app instead.
            </div>
          ) : push.permission === 'denied' ? (
            <div className="setting-note warning">
              Notification permission is blocked. Enable it in your browser
              settings to receive reminders.
            </div>
          ) : push.permission !== 'granted' && enablePush ? (
            <div className="setting-note info">
              Click the toggle above to allow notifications.
            </div>
          ) : null}

          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-title">Do not notify before</span>
              <span className="setting-desc">
                Don't send reminders before this time
              </span>
            </div>
            <input
              type="time"
              className="time-input"
              value={dontNotifyBefore}
              onChange={(e) => handleDailyQuiet(e.target.value)}
            />
          </div>
        </div>

        <div className="setting-actions">
          <button
            className="btn btn-primary"
            onClick={handleTestReminder}
            disabled={isSaving}
          >
            🔔 Send Test Reminder
          </button>
        </div>

        <div className="reminder-info">
          <h4>How it works</h4>
          <ol>
            <li>Add your medicines with their daily dose times.</li>
            <li>We check every hour whether any dose is due.</li>
            <li>A notification appears: "Take Aspirin 100mg".</li>
            <li>Tap <strong>"Took it"</strong> to confirm, or{" "}
              <strong>"Snooze"</strong> to be reminded again.</li>
          </ol>
          <p className="info-footnote">
            Dose history is saved so your doctor can see adherence.
          </p>
        </div>
      </div>
    </div>
  );
}