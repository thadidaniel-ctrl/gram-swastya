import React from 'react';
import styles from './HealthTracker.module.css';

export default function HealthDisclaimer({ variant = 'banner', className = '' }) {
  const { t } = useTranslation();
  const isModal = variant === 'modal';
  const isCompact = variant === 'compact';

  const disclaimerText = isModal
    ? "This information is educational only and is NOT a substitute for professional medical advice, diagnosis, or treatment. ALWAYS consult with a qualified doctor or healthcare provider before: taking any new medicine, changing your current medication, or using medicines together. In case of emergency, call ambulance or visit nearest hospital immediately. GramSwasthya is not liable for any adverse effects from self-medication or self-tracking."
    : isCompact
      ? "This tracker is for personal health awareness only. Always consult a qualified doctor before making medical decisions."
      : "⚕️ Always consult a qualified doctor before taking any medicine. Doses shown are general adult references only — never self-medicate with antibiotics or habit-forming medicines.";

  const icon = isModal ? '⚕️' : isCompact ? 'ℹ️' : '⚠️';

  return (
    <div className={`${styles.disclaimer} ${isModal ? styles.modalDisclaimer : isCompact ? styles.compactDisclaimer : ''} ${className}`} role="alert">
      <span className={styles.disclaimerIcon}>{icon}</span>
      <p className={styles.disclaimerText}>{disclaimerText}</p>
    </div>
  );
}