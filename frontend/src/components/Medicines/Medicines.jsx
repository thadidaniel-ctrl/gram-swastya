import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMedicines, createDoseTime } from '../../hooks/useMedicines';
import interactionPairs from '../../data/medicine-interactions.json';
import styles from './Medicines.module.css';

const FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch'];
const FREQUENCIES = ['daily', 'weekly', 'as_needed'];
const TIME_LABELS = ['Morning', 'Afternoon', 'Evening', 'Night', 'Other'];

const ALERTS_KEY = 'gramSwasthya_medAlerts';
const PREFS_KEY = 'gramSwasthya_medPrefs';

const SOUNDS = [
  { id: 'none', label: 'None' },
  { id: 'soft', label: 'Soft' },
  { id: 'chime', label: 'Chime' },
  { id: 'classic', label: 'Classic' },
];

const DEFAULT_PREFS = {
  sound: 'chime',
  voiceOn: true,
  quietStart: '22:00',
  smsOn: false,
};

const snoozeKey = (medId, timeId) => `${medId}::${timeId}`;

function loadPrefs() {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_PREFS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch (error) {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save reminder settings:', error);
  }
}

function formatClock(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function isInQuietWindow(quietStart, now) {
  if (!quietStart) return false;
  const [qh, qm] = quietStart.split(':').map(Number);
  const quietMin = (Number.isFinite(qh) ? qh : 22) * 60 + (Number.isFinite(qm) ? qm : 0);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= quietMin || nowMin < 6 * 60;
}

let audioCtx = null;

function getAudioCtx() {
  const AC = typeof window !== 'undefined'
    ? window.AudioContext || window.webkitAudioContext
    : null;
  if (!AC) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AC();
    } catch (error) {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    try {
      audioCtx.resume();
    } catch (error) {
      return null;
    }
  }
  return audioCtx;
}

function playTone(freq, start, duration, volume) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.05);
  } catch (error) {
    console.warn('Sound could not be played:', error);
  }
}

function playSound(id) {
  if (!id || id === 'none') return;
  if (id === 'soft') {
    playTone(620, 0, 0.5, 0.08);
    playTone(520, 0.35, 0.6, 0.08);
  } else if (id === 'chime') {
    playTone(660, 0, 0.5, 0.1);
    playTone(880, 0.35, 0.7, 0.1);
    playTone(990, 0.7, 0.8, 0.09);
  } else if (id === 'classic') {
    playTone(880, 0, 0.18, 0.12);
    playTone(880, 0.25, 0.18, 0.12);
    playTone(1174, 0.55, 0.5, 0.12);
  }
}

function speak(text) {
  if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('Voice reminder failed:', error);
  }
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function timeToMinutes(timeStr) {
  const parts = String(timeStr || '').split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function isDueToday(medicine, date) {
  if (medicine.frequency === 'as_needed') return false;
  if (!Array.isArray(medicine.doseTimes) || medicine.doseTimes.length === 0) return false;
  if (medicine.frequency === 'weekly') {
    return date.getDay() === new Date(medicine.startDate).getDay();
  }
  return true;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date(todayKey());
  return Math.ceil((target - today) / (24 * 60 * 60 * 1000));
}

function matchesToken(medicine, token) {
  if (!token) return false;
  const name = `${medicine.name || ''} ${medicine.genericName || ''}`.toLowerCase();
  return name.includes(token.toLowerCase());
}

function computeWarnings(medicines) {
  const warnings = [];
  for (let i = 0; i < medicines.length; i += 1) {
    for (let j = i + 1; j < medicines.length; j += 1) {
      for (const pair of interactionPairs) {
        const first = matchesToken(medicines[i], pair.a) && matchesToken(medicines[j], pair.b);
        const second = matchesToken(medicines[i], pair.b) && matchesToken(medicines[j], pair.a);
        if (first || second) {
          warnings.push({
            level: pair.level,
            message: pair.message,
            a: medicines[i].name,
            b: medicines[j].name,
          });
        }
      }
    }
  }
  return warnings;
}

function emptyForm() {
  return {
    name: '',
    genericName: '',
    strength: '',
    form: 'tablet',
    frequency: 'daily',
    startDate: todayKey(),
    endDate: '',
    expiryDate: '',
    totalQuantity: '',
    remainingQuantity: '',
    lowStockThreshold: '5',
    sideEffects: '',
    enableReminders: true,
    doseTimes: [createDoseTime('08:00', 'Morning', '')],
  };
}

export default function Medicines() {
  const { t } = useTranslation('medicines');
  const { medicines, addMedicine, updateMedicine, deleteMedicine, logDose } = useMedicines();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [alertsOn, setAlertsOn] = useState(() => {
    if (typeof Notification === 'undefined') return false;
    try {
      return window.localStorage.getItem(ALERTS_KEY) === '1' && Notification.permission === 'granted';
    } catch (error) {
      return false;
    }
  });
  const [prefs, setPrefs] = useState(loadPrefs);
  const [toasts, setToasts] = useState([]);
  const [snoozes, setSnoozes] = useState({});
  const [now, setNow] = useState(() => new Date());
  const firedRef = useRef(new Set());

  const showToast = useCallback((message, kind = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000);
  }, []);

  const updatePref = useCallback((key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      return next;
    });
  }, []);

  const today = todayKey();

  const schedule = useMemo(() => {
    const date = new Date(`${today}T00:00:00`);
    return medicines
      .filter(m => isDueToday(m, date))
      .map(m => ({
        ...m,
        doses: (m.doseTimes || [])
          .filter(dt => dt.enabled)
          .map(dt => {
            const log = (m.doseLogs || []).find(l => l.date === today && l.timeId === dt.id);
            const timeMin = timeToMinutes(dt.time);
            return {
              timeId: dt.id,
              time: dt.time,
              label: dt.label,
              dose: dt.dose,
              status: log ? log.status : null,
              missed: !log && timeMin !== null && timeMin <= now.getHours() * 60 + now.getMinutes(),
            };
          }),
      }));
  }, [medicines, today, now]);

  const adherence = useMemo(() => {
    let scheduled = 0;
    let taken = 0;
    schedule.forEach(m => {
      m.doses.forEach(d => {
        scheduled += 1;
        if (d.status === 'taken' || d.status === 'delayed') taken += 1;
      });
    });
    const pct = scheduled > 0 ? Math.round((taken / scheduled) * 100) : null;
    return { scheduled, taken, pct };
  }, [schedule]);

  const warnings = useMemo(() => computeWarnings(medicines), [medicines]);

  const refillMeds = useMemo(
    () => medicines.filter(m => Number(m.remainingQuantity) <= Number(m.lowStockThreshold)),
    [medicines]
  );

  const expiredMeds = useMemo(
    () => medicines.filter(m => m.expiryDate && daysUntil(m.expiryDate) <= 30),
    [medicines]
  );

  useEffect(() => {
    if (!alertsOn || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return undefined;
    }
    let timer = null;

    const plan = () => {
      const now = new Date();
      const candidates = [];
      medicines.forEach(m => {
        if (!isDueToday(m, now)) return;
        (m.doseTimes || []).forEach(dt => {
          if (!dt.enabled) return;
          const target = new Date(now);
          target.setHours(0, 0, 0, 0);
          target.setHours(Number(String(dt.time).split(':')[0]) || 0, Number(String(dt.time).split(':')[1]) || 0, 0, 0);
          const delay = target - now;
          if (Number.isFinite(delay) && delay > 1500 && delay < 24 * 60 * 60 * 1000) {
            candidates.push({ delay, name: m.name, time: dt.time, label: dt.label, dose: dt.dose });
          }
        });
      });

      if (candidates.length === 0) return;
      const soonest = candidates.reduce((a, b) => (a.delay < b.delay ? a : b));
      timer = window.setTimeout(() => {
        try {
          new Notification(`💊 ${soonest.name}`, {
            body: `${soonest.label || 'Dose'} — ${soonest.dose ? `${soonest.dose} ` : ''}at ${soonest.time}`,
            tag: `medicine-${soonest.name}-${soonest.time}`,
          });
        } catch (error) {
          console.warn('Dose alert failed:', error);
        }
        plan();
      }, soonest.delay);
    };

    plan();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [alertsOn, medicines]);

  const startAlerts = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      const on = permission === 'granted';
      setAlertsOn(on);
      window.localStorage.setItem(ALERTS_KEY, on ? '1' : '0');
    } catch (error) {
      console.error('Could not enable dose alerts:', error);
    }
  };

  const stopAlerts = () => {
    setAlertsOn(false);
    window.localStorage.setItem(ALERTS_KEY, '0');
  };

  useEffect(() => {
    const unlock = () => {
      getAudioCtx();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const fireReminder = useCallback((medicine, dose, reason) => {
    const timeMin = timeToMinutes(dose.time);
    const current = new Date();
    if (timeMin === null || timeMin > current.getHours() * 60 + current.getMinutes()) return;
    const inQuiet = isInQuietWindow(prefs.quietStart, current);
    const doseText = dose.dose ? ` (${dose.dose})` : '';
    showToast(`Time to take ${medicine.name}${doseText} — ${reason}`, 'info');
    if (!inQuiet) {
      playSound(prefs.sound);
      if (prefs.voiceOn) speak(`Time to take ${medicine.name}. ${dose.dose ? `${dose.dose}.` : ''}`);
    }
  }, [prefs, showToast]);

  const fireBrowserAlert = useCallback((title, body) => {
    if (typeof Notification === 'undefined' || !alertsOn) return;
    if (Notification.permission !== 'granted') return;
    if (isInQuietWindow(prefs.quietStart, new Date())) return;
    try {
      new Notification(title, { body, tag: `medicine-${title}` });
    } catch (error) {
      console.warn('Notification failed:', error);
    }
  }, [alertsOn, prefs]);

  useEffect(() => {
    schedule.forEach(med => {
      med.doses.forEach(dose => {
        if (dose.status) return;
        const blocked = snoozes[snoozeKey(med.id, dose.timeId)];
        if (blocked && blocked.until > now) return;
        const timeMin = timeToMinutes(dose.time);
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (timeMin === null || timeMin > nowMin || nowMin - timeMin >= 10) return;
        const key = `${med.id}_${dose.timeId}_${today}`;
        if (firedRef.current.has(key)) return;
        firedRef.current.add(key);
        fireReminder(med, dose, 'dose due');
        fireBrowserAlert(`💊 ${med.name}`, `Time to take your ${dose.label || 'dose'}.`);
      });
    });
  }, [now, schedule, snoozes, today, fireReminder, fireBrowserAlert]);

  useEffect(() => {
    const current = new Date();
    Object.entries(snoozes).forEach(([key, entry]) => {
      if (entry.until > current) return;
      const [medId, timeId] = key.split('::');
      const medicine = medicines.find(m => m.id === medId);
      if (medicine) {
        const dose = (medicine.doseTimes || []).find(d => d.id === timeId);
        fireReminder(
          medicine,
          { time: dose?.time || '', label: dose?.label, dose: dose?.dose },
          'snooze finished'
        );
        fireBrowserAlert(`💊 ${medicine.name}`, 'Your snoozed dose is due again.');
      }
      setSnoozes(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    });
  }, [snoozes, medicines, fireReminder, fireBrowserAlert]);

  const handleSnooze = (medicine, dose, mins) => {
    const until = new Date(Date.now() + mins * 60000);
    setSnoozes(prev => ({ ...prev, [snoozeKey(medicine.id, dose.timeId)]: { until, mins } }));
    showToast(`Snoozed ${medicine.name} for ${mins} minutes`);
    fireBrowserAlert(`💊 ${medicine.name}`, `Dose snoozed for ${mins} minutes.`);
  };

  const handleMarkAllTaken = () => {
    let marked = 0;
    schedule.forEach(med => {
      med.doses.forEach(dose => {
        if (!dose.status) {
          logDose(med.id, dose.timeId, 'taken');
          marked += 1;
        }
      });
    });
    showToast(marked > 0 ? `Marked ${marked} dose${marked > 1 ? 's' : ''} as taken` : 'Nothing pending to mark');
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (medicine) => {
    setEditingId(medicine.id);
    setForm({
      name: medicine.name || '',
      genericName: medicine.genericName || '',
      strength: medicine.strength || '',
      form: medicine.form || 'tablet',
      frequency: medicine.frequency || 'daily',
      startDate: medicine.startDate || today,
      endDate: medicine.endDate || '',
      expiryDate: medicine.expiryDate || '',
      totalQuantity: medicine.totalQuantity ?? '',
      remainingQuantity: medicine.remainingQuantity ?? '',
      lowStockThreshold: medicine.lowStockThreshold ?? '5',
      sideEffects: medicine.sideEffects || '',
      enableReminders: medicine.enableReminders !== false,
      doseTimes: (medicine.doseTimes || []).map(dt => ({ ...dt })),
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleDelete = (medicine) => {
    const confirmed = window.confirm(`Delete "${medicine.name}" from your medicines?`);
    if (confirmed) deleteMedicine(medicine.id);
  };

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateDoseTime = (id, updates) => {
    setForm(prev => ({
      ...prev,
      doseTimes: (prev.doseTimes || []).map(dt => (dt.id === id ? { ...dt, ...updates } : dt)),
    }));
  };

  const addDoseTime = () => {
    setForm(prev => ({
      ...prev,
      doseTimes: [...(prev.doseTimes || []), createDoseTime('12:00', 'Afternoon', '')],
    }));
  };

  const removeDoseTime = (id) => {
    setForm(prev => ({
      ...prev,
      doseTimes: (prev.doseTimes || []).filter(dt => dt.id !== id),
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Please enter the medicine name.';
    if (!form.strength.trim()) return 'Please enter the strength or dose (e.g. 500mg).';
    if (!form.startDate) return 'Please choose a start date.';
    if (form.endDate && form.endDate < form.startDate) {
      return 'End date cannot be before the start date.';
    }
    if (form.expiryDate && form.expiryDate < form.startDate) {
      return 'Expiry date cannot be before the start date.';
    }
    const enabledTimes = (form.doseTimes || []).filter(dt => dt.enabled && dt.time);
    if (form.frequency !== 'as_needed' && enabledTimes.length === 0) {
      return 'Add at least one dose time (as-needed medicines can be left without fixed times).';
    }
    const numbers = [
      ['Total quantity', form.totalQuantity],
      ['Remaining quantity', form.remainingQuantity],
      ['Low-stock threshold', form.lowStockThreshold],
    ];
    for (const [label, value] of numbers) {
      if (value !== '' && (Number(value) < 0 || !Number.isFinite(Number(value)))) {
        return `${label} must be a valid number of 0 or more.`;
      }
    }
    if (form.remainingQuantity !== '' && form.totalQuantity !== '' && Number(form.remainingQuantity) > Number(form.totalQuantity)) {
      return 'Remaining quantity cannot be more than the total quantity.';
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const payload = {
      name: form.name.trim(),
      genericName: form.genericName.trim(),
      strength: form.strength.trim(),
      form: form.form,
      frequency: form.frequency,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      expiryDate: form.expiryDate || undefined,
      totalQuantity: form.totalQuantity === '' ? 0 : Number(form.totalQuantity),
      remainingQuantity: form.remainingQuantity === '' ? 0 : Number(form.remainingQuantity),
      lowStockThreshold: form.lowStockThreshold === '' ? 5 : Number(form.lowStockThreshold),
      sideEffects: form.sideEffects.trim(),
      enableReminders: form.enableReminders,
      doseTimes: (form.doseTimes || [])
        .map(dt => ({
          ...dt,
          time: dt.time,
          dose: (dt.dose || '').trim(),
        })),
    };
    if (editingId) {
      updateMedicine(editingId, payload);
    } else {
      addMedicine(payload);
    }
    closeForm();
  };

  const handleStatus = (medicineId, timeId, status) => {
    const medicine = schedule.find(m => m.id === medicineId);
    const dose = medicine ? medicine.doses.find(d => d.timeId === timeId) : null;
    logDose(medicineId, timeId, dose && dose.status === status ? null : status);
  };

  const severity = adherence.pct === null ? 'neutral' : adherence.pct >= 80 ? 'good' : adherence.pct >= 50 ? 'mid' : 'low';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>💊 {t('medicines.title')}</h1>
          <p className={styles.subtitle}>
            Track doses, adherence, refills, expiry and side effects.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={openAdd}>＋ Add Medicine</button>
      </header>

      <p className={styles.disclaimer}>
        This information is educational only and is NOT a substitute for professional medical
        advice. Always consult a qualified doctor before starting, stopping or combining medicines.
      </p>

      {warnings.length > 0 && (
        <div className={`${styles.alertBanner} ${styles.alertSevere}`}>
          <div className={styles.alertTitle}>
            ⚠️ Possible interaction{`${warnings.length > 1 ? 's' : ''}`} detected
          </div>
          {warnings.map((w, idx) => (
            <div key={idx} className={styles.alertText}>
              <strong>{w.a}</strong> with <strong>{w.b}</strong> — {w.message}
            </div>
          ))}
          <div className={styles.alertNote}>
            Please discuss this with your doctor or pharmacist before continuing both medicines.
          </div>
        </div>
      )}

      {refillMeds.length > 0 && (
        <div className={`${styles.alertBanner} ${styles.alertModerate}`}>
          <div className={styles.alertTitle}>⚠️ Refill needed</div>
          {refillMeds.map(m => {
            const remaining = Number(m.remainingQuantity);
            return (
              <div key={m.id} className={styles.alertText}>
                <strong>{m.name}</strong> — {remaining <= 0 ? 'Out of stock' : `${remaining} doses left`}.
                Please refill soon.
              </div>
            );
          })}
        </div>
      )}

      {expiredMeds.length > 0 && (
        <div className={`${styles.alertBanner} ${styles.alertModerate}`}>
          <div className={styles.alertTitle}>⚠️ Expiry check</div>
          {expiredMeds.map(m => {
            const remaining = daysUntil(m.expiryDate);
            return (
              <div key={m.id} className={styles.alertText}>
                <strong>{m.name}</strong> —
                {remaining < 0
                  ? ' expired, do not use it any more'
                  : remaining === 0
                    ? ' expires today'
                    : ` expires in ${remaining} day${remaining > 1 ? 's' : ''}`}
                .
              </div>
            );
          })}
        </div>
      )}

      <section className={styles.todayCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Today's Doses</h2>
          <div className={styles.alertToggleWrap}>
            <button className={styles.btnSmall} onClick={handleMarkAllTaken}>✓ Mark all taken</button>
            {typeof Notification !== 'undefined' &&
              (alertsOn
                ? (
                  <button className={styles.btnSmall} onClick={stopAlerts}>🔕 Off</button>
                )
                : (
                  <button className={styles.btnSmall} onClick={startAlerts}>🔔 Alerts</button>
                ))}
          </div>
        </div>

        <div className={styles.adherenceRow}>
          <div className={styles.adherenceLabel}>
            {adherence.pct === null ? 'No doses scheduled today' : `Adherence ${adherence.pct}%`}
          </div>
          {adherence.pct !== null && (
            <div className={styles.adherenceBar}>
              <div
                className={`${styles.adherenceFill} ${severity === 'good' ? styles.fillGood : severity === 'mid' ? styles.fillMid : styles.fillLow}`}
                style={{ width: `${adherence.pct}%` }}
              />
            </div>
          )}
          {adherence.pct !== null && (
            <div className={styles.adherenceValue}>
              {adherence.taken} of {adherence.scheduled}
            </div>
          )}
        </div>

        {schedule.length === 0 && (
          <div className={styles.emptyStateSmall}>
            Nothing scheduled today. Add a medicine or relax — as-needed medicines are not counted.
          </div>
        )}

        {schedule.map(medicine => (
          <div key={medicine.id} className={styles.scheduleItem}>
            <div className={styles.scheduleInfo}>
              <span className={styles.scheduleName}>{medicine.name}</span>
              {medicine.genericName ? (
                <span className={styles.scheduleGeneric}>Generic: {medicine.genericName}</span>
              ) : null}
            </div>
            <div className={styles.doseActions}>
              {medicine.doses.length === 0 && (
                <span className={styles.statusPill}>As needed</span>
              )}
              {medicine.doses.map(dose => (
                <div key={dose.timeId} className={styles.doseRow}>
                  <span className={styles.doseLabel}>
                    {dose.label || 'Dose'} · {dose.time}
                    {dose.dose ? ` · ${dose.dose}` : ''}
                  </span>
                  <span className={styles.doseButtons}>
                    <button
                      type="button"
                      className={`${styles.doseBtn} ${dose.status === 'taken' ? `${styles.doseBtnActive} ${styles.doseBtnTaken}` : ''}`}
                      onClick={() => handleStatus(medicine.id, dose.timeId, 'taken')}
                      aria-pressed={dose.status === 'taken'}
                    >
                      {t('medicines.taken')}
                    </button>
                    <button
                      type="button"
                      className={`${styles.doseBtn} ${dose.status === 'skipped' ? `${styles.doseBtnActive} ${styles.doseBtnSkipped}` : ''}`}
                      onClick={() => handleStatus(medicine.id, dose.timeId, 'skipped')}
                      aria-pressed={dose.status === 'skipped'}
                    >
                      {t('medicines.skipped')}
                    </button>
                    <button
                      type="button"
                      className={`${styles.doseBtn} ${dose.status === 'delayed' ? `${styles.doseBtnActive} ${styles.doseBtnDelayed}` : ''}`}
                      onClick={() => handleStatus(medicine.id, dose.timeId, 'delayed')}
                      aria-pressed={dose.status === 'delayed'}
                    >
                      Delayed
                    </button>
                  </span>
                  <span className={styles.snoozeGroup}>
                    <span className={styles.snoozeLabel}>{t('medicines.snooze')}</span>
                    {[15, 30, 60].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        className={styles.snoozeBtn}
                        onClick={() => handleSnooze(medicine, dose, mins)}
                      >
                        {mins}m
                      </button>
                    ))}
                  </span>
                  {snoozes[snoozeKey(medicine.id, dose.timeId)]?.until > now ? (
                    <span className={`${styles.statusPill} ${styles.statusSnoozed}`}>
                      ⏰ Snoozed till{' '}
                      {formatClock(snoozes[snoozeKey(medicine.id, dose.timeId)].until)}
                    </span>
                  ) : dose.status ? (
                    <span className={`${styles.statusPill} ${dose.status === 'taken' ? styles.statusTaken : dose.status === 'skipped' ? styles.statusSkipped : styles.statusDelayed}`}>
                      {dose.status}
                    </span>
                  ) : dose.missed ? (
                    <span className={`${styles.statusPill} ${styles.statusMissed}`}>Missed</span>
                  ) : (
                    <span className={`${styles.statusPill} ${styles.statusUpcoming}`}>Upcoming</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className={styles.todayCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Reminder & Alert Settings</h2>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsInfo}>
            <span className={styles.settingsLabel}>Reminder sound</span>
            <span className={styles.settingsHint}>Played when a dose is due</span>
          </div>
          <select
            className={styles.settingsSelect}
            value={prefs.sound}
            onChange={e => updatePref('sound', e.target.value)}
            aria-label="Reminder sound"
          >
            {SOUNDS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            className={styles.btnSmall}
            onClick={() => {
              if (isInQuietWindow(prefs.quietStart, new Date())) {
                showToast('Quiet hours are active — sound muted', 'info');
              } else {
                playSound(prefs.sound);
              }
            }}
          >
            ▶ Test
          </button>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsInfo}>
            <span className={styles.settingsLabel}>Voice reminders</span>
            <span className={styles.settingsHint}>Speak dose alerts aloud (text-to-speech)</span>
          </div>
          <button
            type="button"
            className={`${styles.btnToggle} ${prefs.voiceOn ? styles.btnToggleOn : ''}`}
            onClick={() => updatePref('voiceOn', !prefs.voiceOn)}
            aria-pressed={prefs.voiceOn}
          >
            {prefs.voiceOn ? 'On' : 'Off'}
          </button>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsInfo}>
            <span className={styles.settingsLabel}>Quiet hours (silent mode)</span>
            <span className={styles.settingsHint}>Mutes sound and voice after this time</span>
          </div>
          <input
            type="time"
            className={styles.settingsTime}
            value={prefs.quietStart}
            onChange={e => updatePref('quietStart', e.target.value)}
            aria-label="Quiet hours start"
          />
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsInfo}>
            <span className={styles.settingsLabel}>SMS reminders (optional)</span>
            <span className={styles.settingsHint}>Helpful in areas without internet. Needs SMS service.</span>
          </div>
          <button
            type="button"
            className={`${styles.btnToggle} ${prefs.smsOn ? styles.btnToggleOn : ''}`}
            onClick={() => updatePref('smsOn', !prefs.smsOn)}
            aria-pressed={prefs.smsOn}
          >
            {prefs.smsOn ? 'On' : 'Off'}
          </button>
        </div>

        <p className={styles.settingsNote}>
          Push and browser alerts automatically follow your device's silent /
          do-not-disturb mode. Snooze options are 15, 30 and 60 minutes.
        </p>
      </section>

      {medicines.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💊</span>
          <h2 className={styles.emptyTitle}>No medicines yet</h2>
          <p className={styles.emptyText}>
            Tap “Add Medicine” to record your first medicine, its doses, refill count and expiry date.
          </p>
<button className={styles.btnPrimary} onClick={openAdd}>＋ {t('medicines.addMedicine')}</button>
        </div>
      ) : (
        <section>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>My Medicines</h2>
          </div>
          <div className={styles.medicinesList}>
            {medicines.map(medicine => {
              const refill = Number(medicine.remainingQuantity) <= Number(medicine.lowStockThreshold);
              const expInfo = medicine.expiryDate ? daysUntil(medicine.expiryDate) : null;
              return (
                <div key={medicine.id} className={styles.medicineCard}>
                  <div className={styles.medCardHeader}>
                    <div>
                      <span className={styles.medBrand}>{medicine.name}</span>
                      {medicine.genericName ? (
                        <span className={styles.medGeneric}>Generic: {medicine.genericName}</span>
                      ) : null}
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.editBtn} onClick={() => openEdit(medicine)}>Edit</button>
                      <button className={styles.delBtn} onClick={() => handleDelete(medicine)}>Delete</button>
                    </div>
                  </div>
                  <div className={styles.medMeta}>
                    {medicine.form} {medicine.strength} · {medicine.frequency}
                  </div>
                  <div className={styles.scheduleChips}>
                    {(medicine.doseTimes || []).filter(dt => dt.enabled).map(dt => (
                      <span key={dt.id} className={styles.scheduleChip}>
                        <span className={styles.chipTime}>{dt.label || 'Dose'} · {dt.time}</span>
                        {dt.dose ? <span className={styles.chipDose}>{dt.dose}</span> : null}
                      </span>
                    ))}
                    {(medicine.doseTimes || []).filter(dt => dt.enabled).length === 0 && (
                      <span className={styles.scheduleChip}>As needed</span>
                    )}
                  </div>
                  <div className={styles.badgeRow}>
                    {medicine.expiryDate && expInfo !== null && (
                      <span className={`${styles.badge} ${expInfo < 0 ? styles.badgeExpired : expInfo <= 30 ? styles.badgeExpiring : styles.badgeOk}`}>
                        {expInfo < 0
                          ? 'Expired'
                          : expInfo === 0
                            ? 'Expires today'
                            : `Expires in ${expInfo}d`}
                      </span>
                    )}
                    {refill && (
                      <span className={`${styles.badge} ${Number(medicine.remainingQuantity) <= 0 ? styles.badgeOut : styles.badgeRefill}`}>
                        {Number(medicine.remainingQuantity) <= 0
                          ? 'Out of stock'
                          : `Refill soon · ${medicine.remainingQuantity} left`}
                      </span>
                    )}
                  </div>
                  {medicine.sideEffects ? (
                    <p className={styles.sideEffects}>
                      <strong>Side effects:</strong> {medicine.sideEffects}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showForm && (
        <div className={styles.modalOverlay} onClick={closeForm}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingId ? 'Edit Medicine' : 'Add Medicine'}
              </h3>
              <button className={styles.modalClose} onClick={closeForm}>✕</button>
            </header>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Medicine name *</label>
                  <input
                    className={styles.input}
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="e.g., Aspirin"
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Generic name</label>
                  <input
                    className={styles.input}
                    value={form.genericName}
                    onChange={e => setField('genericName', e.target.value)}
                    placeholder="e.g., Acetylsalicylic acid"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Strength / dose *</label>
                  <input
                    className={styles.input}
                    value={form.strength}
                    onChange={e => setField('strength', e.target.value)}
                    placeholder="e.g., 500mg"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Form</label>
                  <select
                    className={styles.input}
                    value={form.form}
                    onChange={e => setField('form', e.target.value)}
                  >
                    {FORMS.map(f => (
                      <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Frequency</label>
                  <select
                    className={styles.input}
                    value={form.frequency}
                    onChange={e => setField('frequency', e.target.value)}
                  >
                    {FREQUENCIES.map(f => (
                      <option key={f} value={f}>
                        {f === 'as_needed' ? 'As needed' : f.charAt(0).toUpperCase() + f.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Dose times per day (different doses allowed)</label>
                {(form.doseTimes || []).map(dt => (
                  <div key={dt.id} className={styles.doseTimeRow}>
                    <select
                      className={styles.doseTimeSelect}
                      value={dt.label}
                      onChange={e => updateDoseTime(dt.id, { label: e.target.value })}
                    >
                      {TIME_LABELS.map(label => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      className={styles.doseTimeInput}
                      value={dt.time}
                      onChange={e => updateDoseTime(dt.id, { time: e.target.value })}
                    />
                    <input
                      className={styles.doseTimeDose}
                      value={dt.dose}
                      onChange={e => updateDoseTime(dt.id, { dose: e.target.value })}
                      placeholder="dose e.g. 500mg"
                    />
                    <label className={styles.inlineCheck}>
                      <input
                        type="checkbox"
                        checked={dt.enabled !== false}
                        onChange={e => updateDoseTime(dt.id, { enabled: e.target.checked })}
                      />
                      on
                    </label>
                    <button
                      type="button"
                      className={styles.removeDoseBtn}
                      onClick={() => removeDoseTime(dt.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" className={styles.addDoseBtn} onClick={addDoseTime}>
                  + Add another time
                </button>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start date *</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={form.startDate}
                    onChange={e => setField('startDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>End date</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={form.endDate}
                    onChange={e => setField('endDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Expiry date</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={form.expiryDate}
                    onChange={e => setField('expiryDate', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Total quantity</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={form.totalQuantity}
                    onChange={e => setField('totalQuantity', e.target.value)}
                    placeholder="e.g., 30"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Remaining quantity</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={form.remainingQuantity}
                    onChange={e => setField('remainingQuantity', e.target.value)}
                    placeholder="e.g., 12"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Refill when left at</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={form.lowStockThreshold}
                    onChange={e => setField('lowStockThreshold', e.target.value)}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Side effects / notes</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={form.sideEffects}
                  onChange={e => setField('sideEffects', e.target.value)}
                  placeholder="e.g., mild nausea, take with food"
                />
              </div>

              <label className={styles.inlineCheck}>
                <input
                  type="checkbox"
                  checked={form.enableReminders}
                  onChange={e => setField('enableReminders', e.target.checked)}
                />
                Enable dose alerts while this page is open
              </label>

              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingId ? 'Save Changes' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.toastWrap} role="region" aria-live="polite" aria-atomic="true" aria-label="Notifications">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${styles.toast} ${t.kind === 'info' ? styles.toastInfo : styles.toastWarn}`}
            role="alert"
          >
            <span>{t.message}</span>
            <button
              type="button"
              className={styles.toastClose}
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}