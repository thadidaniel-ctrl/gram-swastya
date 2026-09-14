import React, { useState } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import styles from './FileStorageStyles.module.css';

const FOLDER_COLORS = [
  '#4287F5', '#EA4335', '#FBBC05', '#34A853',
  '#FF6D01', '#46BDD7', '#A142F4', '#E91E63',
  '#00BCD4', '#8BC34A',
];

export default function FolderManager({
  folders = [],
  selectedFolderId = null,
  onCreateFolder,
  onClose,
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    folderName: '',
    description: '',
    color: FOLDER_COLORS[0],
    parentFolderId: selectedFolderId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        folderName: formData.folderName.trim(),
        description: formData.description.trim(),
        color: formData.color,
        parentFolderId: formData.parentFolderId || null,
      };
      await onCreateFolder(data);
      setShowForm(false);
      setFormData({ ...formData, folderName: '', description: '' });
    } catch (err) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      folderName: '',
      description: '',
      color: FOLDER_COLORS[0],
      parentFolderId: selectedFolderId || '',
    });
    setError(null);
  };

  if (!showForm) {
    return (
      <button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => setShowForm(true)}
        style={{ width: '100%', marginBottom: '16px' }}
      >
        + New Folder
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          {selectedFolderId ? 'Create Subfolder' : 'New Folder'}
        </h2>
        <button className={styles.modalClose} onClick={handleCancel} aria-label="Close">✕</button>
      </div>

      <form onSubmit={handleSubmit} className={styles.panelBody}>
        {error && (
          <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="folder-name" className={styles.label}>Folder Name *</label>
          <input
            id="folder-name"
            type="text"
            className={styles.input}
            placeholder="Enter folder name"
            value={formData.folderName}
            onChange={(e) => setFormData({ ...formData, folderName: e.target.value })}
            maxLength={100}
            required
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="folder-description" className={styles.label}>Description</label>
          <textarea
            id="folder-description"
            className={styles.input}
            placeholder="Optional description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={500}
            rows={3}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className={styles.label}>Color</label>
          <div className={styles.colorPicker} role="radiogroup" aria-label="Folder color">
            {FOLDER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.colorOption} ${formData.color === color ? styles.colorOptionSelected : ''}`}
                onClick={() => setFormData({ ...formData, color })}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
                aria-pressed={formData.color === color}
              >
                {formData.color === color && '✓'}
              </button>
            ))}
          </div>
        </div>

        {folders.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="parent-folder" className={styles.label}>Parent Folder</label>
            <select
              id="parent-folder"
              className={`${styles.select} ${styles.input}`}
              value={formData.parentFolderId}
              onChange={(e) => setFormData({ ...formData, parentFolderId: e.target.value })}
            >
              <option value="">Root (no parent)</option>
              {folders
                .filter(f => f.id !== formData.parentFolderId)
                .map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} ({folder.fileCount || 0} files)
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className={styles.flex} style={{ justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Folder'}
          </button>
        </div>
      </form>
    </div>
  );
}