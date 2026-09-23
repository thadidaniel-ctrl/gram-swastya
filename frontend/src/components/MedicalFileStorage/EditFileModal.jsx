import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FileStorageStyles.module.css';

const CATEGORIES = [
  'Lab Report',
  'Prescription',
  'Medical Image',
  'Hospital Record',
  'Vaccination',
  'Insurance',
  'Other',
];

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

export default function EditFileModal({ file, folders = [], isOpen, onClose, onSave }) {
  const { t } = useTranslation('files');
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('Other');
  const [folderId, setFolderId] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fileNameRef = useRef(null);

  useEffect(() => {
    if (isOpen && file) {
      setFileName(file.originalName || file.fileName || '');
      setCategory(file.category || 'Other');
      setFolderId(file.folderId || file.folder?.id || '');
      setDescription(file.description || '');
      setTags(Array.isArray(file.tags) ? file.tags.join(', ') : (file.tags || ''));
      setDocumentDate(file.documentDate ? String(file.documentDate).slice(0, 10) : '');
      setSaving(false);
      setError(null);
    }
  }, [isOpen, file]);

  useEffect(() => {
    if (isOpen && fileNameRef.current) {
      fileNameRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !file) return null;

  const flatFolders = flattenFolders(folders);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileName.trim()) {
      setError('File name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        fileName: fileName.trim(),
        category,
        folderId: folderId || undefined,
        description: description.trim(),
        tags,
        documentDate: documentDate || null,
      });
    } catch (err) {
      setError(err.message || 'Failed to update file');
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>✏️ {t('files.edit')}</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div style={{ marginBottom: '12px' }}>
              <label className={styles.label}>{t('files.fileName')}</label>
              <input
                ref={fileNameRef}
                type="text"
                className={styles.input}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                maxLength={255}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className={styles.label}>Category</label>
                <select
                  className={`${styles.select} ${styles.input}`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={styles.label}>Folder</label>
                <select
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className={styles.label}>{t('files.documentDate')}</label>
                <input
                  type="date"
                  className={styles.input}
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
                <span className={styles.textSm} style={{ color: '#6b7280' }}>
                  Date shown on the document (optional)
                </span>
              </div>
              <div>
                <label className={styles.label}>Tags (comma separated)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. blood-test, yearly"
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className={styles.label}>{t('common.description')}</label>
              <textarea
                className={styles.input}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Optional notes about this document"
              />
            </div>

            {error && <div className={`${styles.textError} ${styles.mt4}`}>{error}</div>}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}