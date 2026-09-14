import React from 'react';
import styles from './FileStorageStyles.module.css';

export default function BulkActions({
  selectedCount,
  onDeleteAll,
  onShareAll,
  onMoveAll,
  onClearSelection,
  loading = false,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className={styles.bulkActionsBar} role="status" aria-live="polite">
      <div className={styles.bulkActionsContent}>
        <span className={styles.bulkActionsLabel}>
          <strong>{selectedCount}</strong> file{selectedCount !== 1 ? 's' : ''} selected
        </span>
        
        <div className={styles.bulkActionsButtons}>
          <button
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
            onClick={onMoveAll}
            disabled={loading}
            title="Move to folder"
          >
            📁 Move
          </button>
          
          <button
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
            onClick={onShareAll}
            disabled={loading}
            title="Share with doctors"
          >
            🔗 Share
          </button>
          
          <button
            className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
            onClick={onDeleteAll}
            disabled={loading}
            title="Delete selected files"
          >
            🗑️ Delete
          </button>
          
          <button
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
            onClick={onClearSelection}
            disabled={loading}
            title="Clear selection"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}