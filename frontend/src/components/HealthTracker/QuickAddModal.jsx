import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { todayKey } from './utils';
import styles from './HealthTracker.module.css';

export default function QuickAddModal({
  metricType,
  metricConfig,
  isMedicationChecklist = false,
  medicationEntries = [],
  onSave,
  updateMedication,
  onClose
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(() => getInitialFormData(metricType, isMedicationChecklist));
  const [error, setError] = useState(null);
  const [showMedForm, setShowMedForm] = useState(false);

  const firstInputRef = useRef(null);

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  function getInitialFormData(type, checklist) {
    if (checklist) return { medications: [] };
    if (type === 'blood_pressure') return { systolic: '', diastolic: '', notes: '' };
    if (type === 'medication') {
      return { name: '', dose: '', time: nowTime() };
    }
    if (type === 'symptoms') return { symptoms: [], notes: '' };
    return { value: '', time: nowTime(), notes: '' };
  }

  function nowTime() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  const validateForm = () => {
    if (metricType === 'blood_pressure') {
      const sys = Number(formData.systolic);
      const dia = Number(formData.diastolic);
      if (!Number.isFinite(sys) || !Number.isFinite(dia)) {
        setError('Please enter both systolic and diastolic values');
        return false;
      }
      if (sys < 60 || sys > 250 || dia < 30 || dia > 150) {
        setError('Please enter valid blood pressure values');
        return false;
      }
    } else if (metricType === 'medication') {
      if (!formData.name.trim()) {
        setError('Please enter medication name');
        return false;
      }
    } else if (metricType === 'symptoms') {
      if (!formData.symptoms.length && !formData.notes.trim()) {
        setError('Please select at least one symptom or add notes');
        return false;
      }
    } else {
      const val = Number(formData.value);
      if (!Number.isFinite(val) || val < 0) {
        setError(`Please enter a valid value for ${metricConfig.label}`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const buildEntry = () => {
    const date = todayKey();
    if (metricType === 'blood_pressure') {
      return { systolic: Number(formData.systolic), diastolic: Number(formData.diastolic), time: formData.time || '00:00', date, notes: formData.notes || '' };
    }
    if (metricType === 'medication') {
      return { name: formData.name.trim(), dose: formData.dose.trim(), time: formData.time || '00:00', date, taken: true };
    }
    if (metricType === 'symptoms') {
      return { symptoms: formData.symptoms, notes: formData.notes.trim(), time: formData.time || '00:00', date };
    }
    return { value: Number(formData.value), time: formData.time || '00:00', date, notes: formData.notes || '' };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (onSave) onSave(metricType, buildEntry());
    onClose();
  };

  const handleQuickAdjust = (delta) => {
    if (metricType === 'blood_pressure') return;
    const current = Number(formData.value) || 0;
    const step = metricConfig.step || 1;
    const next = current + delta * step;
    setFormData(prev => ({
      ...prev,
      value: Number(next.toFixed(step < 1 ? 1 : 0))
    }));
  };

  const handleSymptomToggle = (symptom) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const toggleMedicationTaken = (id, taken) => {
    if (updateMedication) updateMedication('medication', id, { taken: !taken });
  };

  const markAllTaken = () => {
    if (!updateMedication) return;
    medicationEntries.forEach(m => {
      if (!m.taken) updateMedication('medication', m.id, { taken: true });
    });
  };

  if (isMedicationChecklist && !showMedForm) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <header className={styles.modalHeader}>
            <h3>💊 Today's Medications</h3>
            <button className={styles.modalClose} onClick={onClose}>✕</button>
          </header>
          {medicationEntries.length === 0 ? (
            <div className={styles.medicationEmpty}>
              <span className={styles.emptyIcon}>💊</span>
              <p>No medications logged today.</p>
              <button className={styles.btnPrimary} onClick={() => setShowMedForm(true)}>
                + Log Medication
              </button>
            </div>
          ) : (
            <>
              <div className={styles.medicationChecklist}>
                {medicationEntries.map(m => (
                  <div key={m.id} className={styles.medicationItem}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={!!m.taken}
                        onChange={() => toggleMedicationTaken(m.id, m.taken)}
                      />
                      <span className={styles.medName}>{m.name}</span>
                      <span className={styles.medTime}>{m.time || ''}</span>
                      <span className={`${styles.medStatus} ${m.taken ? styles.taken : styles.pending}`}>
                        {m.taken ? 'Taken' : 'Pending'}
                      </span>
                    </label>
                  </div>
                ))}
                <button className={styles.btnSecondary} onClick={markAllTaken}>
                  Mark All as Taken
                </button>
                <button className={styles.btnPrimary} onClick={() => setShowMedForm(true)}>
                  + Log Medication
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h3>{metricConfig.icon} Log {metricConfig.label}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {metricType === 'blood_pressure' ? (
            <div className={styles.bpInputs}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Systolic (top)</label>
                <input
                  ref={firstInputRef}
                  type="number"
                  className={styles.input}
                  value={formData.systolic}
                  onChange={e => setFormData(prev => ({ ...prev, systolic: e.target.value }))}
                  min={metricConfig.systolic?.min || 60}
                  max={metricConfig.systolic?.max || 250}
                  placeholder={metricConfig.systolic?.placeholder}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Diastolic (bottom)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={formData.diastolic}
                  onChange={e => setFormData(prev => ({ ...prev, diastolic: e.target.value }))}
                  min={metricConfig.diastolic?.min || 30}
                  max={metricConfig.diastolic?.max || 150}
                  placeholder={metricConfig.diastolic?.placeholder}
                  required
                />
              </div>
            </div>
          ) : metricType === 'symptoms' ? (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Symptoms</label>
                <div className={styles.symptomChips}>
                  {(metricConfig.commonSymptoms || []).map((symptom, index) => (
                    <button
                      key={symptom}
                      ref={index === 0 ? firstInputRef : null}
                      type="button"
                      className={`${styles.symptomChip} ${(formData.symptoms || []).includes(symptom) ? styles.selected : ''}`}
                      onClick={() => handleSymptomToggle(symptom)}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('healthTracker.notes')}</label>
                <textarea
                  className={styles.input}
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional details..."
                  rows={3}
                />
              </div>
            </>
          ) : metricType === 'medication' ? (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Medication Name</label>
                <input
                  ref={firstInputRef}
                  type="text"
                  className={styles.input}
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Aspirin 500mg"
                  required
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Dose</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.dose}
                  onChange={e => setFormData(prev => ({ ...prev, dose: e.target.value }))}
                  placeholder="e.g., 500mg"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Time</label>
                <input
                  type="time"
                  className={styles.input}
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>{metricConfig.label} ({metricConfig.unit})</label>
                <div className={styles.numberInput}>
                  <button type="button" className={styles.adjustBtn} onClick={() => handleQuickAdjust(-1)}>−</button>
                  <input
                    ref={firstInputRef}
                    type="number"
                    step={metricConfig.step || 1}
                    min="0"
                    className={styles.input}
                    value={formData.value}
                    onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder={metricConfig.placeholder}
                    required
                    autoFocus
                  />
                  <button type="button" className={styles.adjustBtn} onClick={() => handleQuickAdjust(1)}>+</button>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Time</label>
                <input
                  type="time"
                  className={styles.input}
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Notes (Optional)</label>
                <textarea
                  className={styles.input}
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes... (e.g., after breakfast, feeling dizzy)"
                  rows={2}
                />
              </div>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary}>
              Save {metricConfig.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}