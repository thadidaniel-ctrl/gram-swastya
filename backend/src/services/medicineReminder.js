const cron = require('node-cron');
const logger = require('../utils/logger');
const { Medicine, Patient, Notification } = require('../models');
const { sendToToken } = require('./pushNotificationService');

const TRANSLATIONS = {
  en: {
    title_singular: 'Medicine Reminder',
    title_plural: 'Medicine Reminders',
    take: 'Take {name} {strength}',
    dose_label: 'Dose at {time}',
    refill_title: 'Medicine Refill Needed',
    refill_body: 'You have {qty} doses of {name} left. Please refill soon.',
    actions: [
      { action: 'taken', title: '✓ Took it' },
      { action: 'snooze', title: '⏰ Snooze 10 min' },
    ],
  },
  hi: {
    title_singular: 'दवा की याद दिलाता हूँ',
    title_plural: 'दवा की याद दिलाता हूँ',
    take: '{name} {strength} लें',
    dose_label: '{time} पर डोज़',
    refill_title: 'दवा फिर से भरने की ज़रूरत है',
    refill_body: '{name} की {qty} डोज़ बची हैं। कृपया जल्द ही फिर से भरवाएँ।',
    actions: [
      { action: 'taken', title: '✓ ले ली' },
      { action: 'snooze', title: '⏰ 10 मिनट बाद' },
    ],
  },
  te: {
    title_singular: 'మందు గుర్తింపు',
    title_plural: 'మందు గుర్తింపులు',
    take: '{name} {strength} తీసుకోండి',
    dose_label: '{time} డోస్',
    refill_title: 'మందు తిరిగి నింపాలి',
    refill_body: '{name} యొక్క {qty} డోసులు మిగిలి ఉన్నాయి. త్వరలో నింపండి.',
    actions: [
      { action: 'taken', title: '✓ తీసుకున్నాను' },
      { action: 'snooze', title: '⏰ 10 నిమిషాల తరువాత' },
    ],
  },
  ta: {
    title_singular: 'மருந்து நினைவூட்டல்',
    title_plural: 'மருந்து நினைவூட்டல்கள்',
    take: '{name} {strength} எடுத்துக் கொள்ளுங்கள்',
    dose_label: '{time} டோஸ்',
    refill_title: 'மருந்து நிரப்ப வேண்டும்',
    refill_body: '{name} இன் {qty} டோஸ் மீதம் உள்ளன. விரைவில் நிரப்பவும்.',
    actions: [
      { action: 'taken', title: '✓ எடுத்தேன்' },
      { action: 'snooze', title: '⏰ 10 நிமிடம் கழித்து' },
    ],
  },
  mr: {
    title_singular: 'औषध स्मरणपत्र',
    title_plural: 'औषध स्मरणपत्रे',
    take: '{name} {strength} घ्या',
    dose_label: '{time} वेळेचा डोस',
    refill_title: 'औषध पुन्हा भरावे लागेल',
    refill_body: '{name} चे {qty} डोस शिल्लक आहेत. कृपया लवकर भरवा.',
    actions: [
      { action: 'taken', title: '✓ घेतले' },
      { action: 'snooze', title: '⏰ 10 मिनिटांनी' },
    ],
  },
};

let reminderJob = null;

function formatTime(hour, minute) {
  const h = hour % 24;
  const m = Math.round(minute);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
}

function isDoseDue(doseTime, now) {
  const [hour, minute] = doseTime.time.split(':').map(Number);
  const dueTime = new Date(now);
  dueTime.setHours(hour, minute, 0, 0);

  const inPastWindow = now >= dueTime;
  const withinGraceWindow = now <= new Date(dueTime.getTime() + 30 * 60 * 1000);

  return inPastWindow && withinGraceWindow && doseTime.isEnabled !== false;
}

function getTranslation(language) {
  return TRANSLATIONS[language] || TRANSLATIONS.en;
}

async function getDueMedicines(now = new Date()) {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return Medicine.find({
    isActive: true,
    enableReminders: true,
    startDate: { $lte: now },
    $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }],
    doseTimes: { $not: { $size: 0 } },
  }).populate('patient', 'fcmToken preferredLanguage name');
}

async function hasAlreadyNotified(medicine, patientId, now) {
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000);
  const existing = await Notification.findOne({
    patient: patientId,
    medicine: medicine._id,
    type: 'medicine_reminder',
    createdAt: { $gte: windowStart },
  });
  return !!existing;
}

// Create a reminder notification + send push for one medicine
async function sendMedicineReminder(medicine, now) {
  const patient = medicine.patient;
  if (!patient) return;

  const t = getTranslation(patient.preferredLanguage || 'en');
  const dueTimes = medicine.doseTimes.filter(d => isDoseDue(d, now));

  if (dueTimes.length === 0) return null;

  const already = await hasAlreadyNotified(medicine, patient._id, now);
  if (already) return null;

  const dueLabel = dueTimes[0].label
    ? `${dueTimes[0].label} (${formatTime(...dueTimes[0].time.split(':').map(Number))})`
    : formatTime(...dueTimes[0].time.split(':').map(Number));

  const title = dueTimes.length > 1 ? t.title_plural : `${t.title_singular}: ${medicine.name}`;

  const body =
    t.take.replace('{name}', medicine.name).replace('{strength}', medicine.strength) +
    ` — ${t.dose_label.replace('{time}', dueLabel)}`;

  const notification = await Notification.create({
    patient: patient._id,
    medicine: medicine._id,
    type: 'medicine_reminder',
    title,
    body,
    data: {
      medicineName: medicine.name,
      strength: medicine.strength,
      doseTime: dueTimes[0].time,
      doseLabel: dueLabel,
      scheduleTimes: medicine.doseTimes.map(d => d.time),
    },
    deliveredVia: 'fcm',
  });

  let pushResult = null;
  try {
    pushResult = await sendToToken(patient.fcmToken, {
      title,
      body,
      type: 'medicine_reminder',
      medicineId: medicine._id.toString(),
      notificationId: notification._id.toString(),
      tag: `medicine-${medicine._id.toString()}`,
      channelId: 'medicine_reminders',
      actions: t.actions,
      data: {
        medicineId: medicine._id.toString(),
        notificationId: notification._id.toString(),
        doseTime: dueTimes[0].time,
      },
    });
  } catch (error) {
    logger.error('Push send failed:', {
      medicine: medicine._id,
      patient: patient._id,
      error: error.message,
    });
  }

  logger.info('Medicine reminder sent', {
    medicine: medicine.name,
    patient: patient._id,
    pushStatus: pushResult?.status,
  });

  return { notification, pushResult, medicine };
}

// Check refill needs for low-stock medicines (needsRefill is a virtual, query real fields)
async function sendRefillReminder() {
  const medicines = await Medicine.find({
    isActive: true,
    enableReminders: true,
    $expr: { $lte: ['$remainingQuantity', '$lowStockThreshold'] },
  }).populate('patient', 'fcmToken preferredLanguage name');

  for (const medicine of medicines) {
    const alreadyNotified = await Notification.findOne({
      patient: medicine.patient._id,
      medicine: medicine._id,
      type: 'refill',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (alreadyNotified) continue;

    const t = getTranslation(medicine.patient.preferredLanguage || 'en');
    const title = t.refill_title;
    const body = t.refill_body
      .replace('{name}', medicine.name)
      .replace('{qty}', String(medicine.remainingQuantity));

    await Notification.create({
      patient: medicine.patient._id,
      medicine: medicine._id,
      type: 'refill',
      title,
      body,
      deliveredVia: 'fcm',
    });

    await sendToToken(medicine.patient.fcmToken, {
      title,
      body,
      type: 'refill',
      medicineId: medicine._id.toString(),
      channelId: 'refill',
      tag: `refill-${medicine._id.toString()}`,
    });
  }
}

// Mark dose as missed if notification acknowledged as not taken
async function markUnacknowledgedDosesAsMissed() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const stale = await Notification.find({
    type: 'medicine_reminder',
    read: false,
    'response.acknowledged': false,
    createdAt: { $lt: cutoff },
  });

  for (const item of stale) {
    item.response.acknowledged = true;
    item.response.acknowledgedAt = new Date();
    item.response.status = 'missed';
    await item.save();

    if (item.medicine) {
      const medicine = await Medicine.findById(item.medicine);
      if (medicine) {
        const scheduledTime = item.createdAt || new Date();
        const lookupWindow = 15 * 60 * 1000;
        let doseLog = medicine.doseLogs.find(
          d => Math.abs(new Date(d.scheduledTime) - new Date(scheduledTime)) < lookupWindow
        );

        if (!doseLog) {
          doseLog = { scheduledTime, status: 'missed' };
          medicine.doseLogs.push(doseLog);
        } else if (doseLog.status !== 'taken') {
          doseLog.status = 'missed';
          doseLog.notes = doseLog.notes || 'Missed (unacknowledged reminder)';
        }
        await medicine.save();
      }
    }
  }

  if (stale.length > 0) {
    logger.info(`Marked ${stale.length} unacknowledged reminders as missed`);
  }
}

// The main hourly job that runs the reminder flow
async function runReminderCheck() {
  const now = new Date();
  logger.info(`Running medicine reminder check at ${now.toISOString()}`);

  const medicines = await getDueMedicines(now);

  if (medicines.length === 0) {
    logger.info('No medicines due now');
    return { checked: 0, sent: 0 };
  }

  let sent = 0;
  for (const medicine of medicines) {
    try {
      const result = await sendMedicineReminder(medicine, now);
      if (result) sent += 1;
    } catch (tokenError) {
      // 401 from FCM means token invalid - skip, don't crash
      if (tokenError.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Cleaning invalid FCM token for patient ${medicine.patient?._id}`);
        if (medicine.patient?._id) {
          await Patient.updateOne({ _id: medicine.patient._id }, { $set: { fcmToken: null } });
        }
      } else {
        logger.error('Reminder processing failed:', {
          medicine: medicine.name,
          error: tokenError.message,
        });
      }
    }
  }

  logger.info(`Medicine reminder check complete: ${sent} reminders sent`);

  // Only run refill checks on the first check of the day (1 AM cron handles it)
  return { checked: medicines.length, sent };
}

// Export the runReminderCheck for the refill job
function startMedicineReminderCron() {
  if (reminderJob) {
    logger.warn('Medicine reminder cron already running');
    return;
  }

  // Run reminder check every hour at minute 0 (05:00 - 22:00 IST)
  reminderJob = cron.schedule(
    '0 5-22 * * *',
    async () => {
      try {
        await runReminderCheck();
      } catch (error) {
        logger.error('Cron job title: medicine reminder failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  // Refill check once daily at 1 AM IST
  cron.schedule(
    '0 1 * * *',
    async () => {
      try {
        await sendRefillReminder();
      } catch (error) {
        logger.error('Cron job: refill reminder failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  // Mark unacknowledged doses missed every 30 min
  cron.schedule(
    '*/30 * * * *',
    async () => {
      try {
        await markUnacknowledgedDosesAsMissed();
      } catch (error) {
        logger.error('Cron job: mark missed doses failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  logger.info(
    'Medicine reminder cron jobs started (hourly reminders, daily refill, 30min missed check)'
  );
}

function stopMedicineReminderCron() {
  if (reminderJob) {
    reminderJob.stop();
    reminderJob = null;
    logger.info('Medicine reminder cron stopped');
  }
}

async function validateAndSendTest(medicines) {
  const results = [];
  const now = new Date();

  for (const medicine of medicines) {
    const result = await sendMedicineReminder(medicine, now);
    results.push({
      medicine: medicine.name,
      sent: !!result,
      message: result ? 'Reminder sent' : 'Medicine not due or already notified',
    });
  }

  return results;
}

module.exports = {
  startMedicineReminderCron,
  stopMedicineReminderCron,
  runReminderCheck,
  sendTestReminder: validateAndSendTest,
  markUnacknowledgedDosesAsMissed,
  TRANSLATIONS,
};
