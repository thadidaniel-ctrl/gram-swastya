import { useState, useEffect, useCallback } from 'react';
import { useHealthTrackerData } from './useHealthMetrics';

export function useReminders(tracker = null) {
  const own = useHealthTrackerData();
  const { getReminders, markReminderComplete, isReminderComplete, data } = tracker || own;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
      checkUpcomingReminders();
    }, 60000);

    checkUpcomingReminders();
    return () => clearInterval(timer);
  }, [data.reminders, getReminders, isReminderComplete, checkUpcomingReminders]);

  const checkUpcomingReminders = useCallback(() => {
    const now = new Date();
    const reminders = getReminders(now);

    reminders.forEach(reminder => {
      if (isReminderComplete(reminder.id, now)) return;
      if (!reminder.time) return;

      const reminderTime = new Date(now);
      const [hours, minutes] = reminder.time.split(':').map(Number);
      reminderTime.setHours(hours, minutes, 0, 0);

      const diffMs = reminderTime - now;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins > 0 && diffMins <= 60) {
        setNotifications(prev =>
          prev.some(n => n.reminderId === reminder.id)
            ? prev
            : [...prev, {
                id: `notif_${Date.now()}_${reminder.id}`,
                reminderId: reminder.id,
                message: `${reminder.name || 'Reminder'} (${reminder.time})`,
                timeLeft: diffMins,
                timestamp: now
              }]
        );
      }
    });
  }, [getReminders, isReminderComplete]);

  const markTaken = useCallback((reminderId) => {
    markReminderComplete(reminderId, new Date());
    setNotifications(prev => prev.filter(n => n.reminderId !== reminderId));
  }, [markReminderComplete]);

  const snooze = useCallback((reminderId) => {
    setNotifications(prev => prev.filter(n => n.reminderId !== reminderId));
  }, []);

  const dismissNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  return {
    currentDate,
    notifications,
    markTaken,
    snooze,
    dismissNotification,
    getReminders,
    isReminderComplete
  };
}