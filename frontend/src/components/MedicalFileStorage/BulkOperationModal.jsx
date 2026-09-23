import React, { useState, useEffect, useRef } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import { useTranslation } from 'react-i18next';
import styles from './FileStorageStyles.module.css';

// Flatten a folder tree into a flat list (with depth for indentation)
function flattenFolders(folders, depth = 0, acc = []) {
  for (const folder of folders || []) {
    acc.push({ ...folder, depth });
    if (folder.children?.length) {
      flattenFolders(folder.children, depth + 1, acc);
    }
  }
  return acc;
}

export default function BulkOperationModal({
  isOpen,
  type, // 'move' | 'share'
  count,
  fileIds = [],
  folders = [],
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation('files');
  const [folderId, setFolderId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const folderSelectRef = useRef(null);
  const doctorSearchRef = useRef(null);

  useEffect(() => {
    if (isOpen && type === 'move') {
      setFolderId('');
      setError(null);
      // Focus the folder select
      if (folderSelectRef.current) {
        folderSelectRef.current.focus();
      }
    }
    if (isOpen && type === 'share') {
      setDoctorId('');
      setExpiresAt('');
      setSearchQuery('');
      setError(null);
      setSubmitting(false);
      loadDoctors();
      if (doctorSearchRef.current) {
        doctorSearchRef.current.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await fileStorageAPI.getDoctorList();
      setDoctors(res.data || []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  if (!isOpen) return null;

  const flatFolders = flattenFolders(folders);
  const noun = count === 1 ? 'file' : 'files';

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (type === 'move') {
        await fileStorageAPI.bulkMoveFiles(fileIds, folderId);
      } else {
        if (!doctorId) {
          setError('Please select a doctor');
          setSubmitting(false);
          return;
        }
        await fileStorageAPI.bulkShareFiles(fileIds, doctorId, expiresAt || undefined);
      }
      onConfirm();
    } catch (err) {
      setError(err.message || 'Operation failed');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {type === 'move' ? '📁 Move Files' : '🔗 Share Files'}
          </h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.textMuted} style={{ marginBottom: '16px' }}>
            Applying to <strong>{count}</strong> selected {noun}.
          </p>

          {type === 'move' && (
            <div>
              <label className={styles.label}>Move to folder</label>
              <select
                ref={folderSelectRef}
                className={`${styles.select} ${styles.input}`}
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">No folder (Root)</option>
                {flatFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {'\u00A0'.repeat(folder.depth * 3)}{folder.name || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'share' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label className={styles.label}>{t('files.shareWithDoctor')}</label>
                <input
                  ref={doctorSearchRef}
                  type="text"
                  className={styles.input}
                  placeholder="Search by name or specialization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ maxHeight: '180px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px' }}>
                {loadingDoctors ? (
                  <div className={styles.flex} style={{ justifyContent: 'center', padding: '24px' }}>
                    <div className={styles.spinner} />
                  </div>
                ) : doctors.filter((d) =>
                    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (d.specialization || '').toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 ? (
                  <div className={styles.textMuted} style={{ padding: '24px', textAlign: 'center' }}>
                    No doctors found
                  </div>
                ) : (
                  doctors
                    .filter((d) =>
                      (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (d.specialization || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((doctor) => (
                      <button
                        key={doctor.id}
                        type="button"
                        className={styles.shareItem}
                        onClick={() => setDoctorId(doctor.id)}
                        style={{
                          textAlign: 'left',
                          background: doctorId === doctor.id ? '#eff6ff' : 'transparent',
                          borderColor: doctorId === doctor.id ? '#3b82f6' : '#e5e7eb',
                        }}
                      >
                        <div className={styles.shareInfo}>
                          <div className={styles.shareAvatar}>
                            {doctor.name?.charAt(0)?.toUpperCase() || 'D'}
                          </div>
                          <div>
                            <p className={styles.shareName}>Dr. {doctor.name}</p>
                            <p className={styles.shareMeta}>{doctor.specialization || 'General Practice'}</p>
                          </div>
                        </div>
                        {doctorId === doctor.id && (
                          <span className={styles.badge} style={{ background: '#dbeafe', color: '#1e40af' }}>Selected</span>
                        )}
                      </button>
                    ))
                )}
              </div>

              <div>
                <label className={styles.label}>Expires (optional)</label>
                <input
                  type="date"
                  className={styles.input}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {error && <div className={`${styles.textError} ${styles.mt4}`}>{error}</div>}
        </div>

        <div className={styles.modalFooter}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSubmit}
            disabled={submitting || (type === 'share' && !doctorId)}
          >
            {submitting
              ? 'Working...'
              : type === 'move'
                ? 'Move Files'
                : 'Share Files'}
          </button>
        </div>
      </div>
    </div>
  );
}