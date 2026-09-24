import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import { useTranslation } from 'react-i18next';
import BulkActions from './BulkActions';
import { ThumbnailImage } from './ProgressiveImage';
import { EmptyState } from '../../components/Common/EmptyState';
import styles from './FileStorageStyles.module.css';

const CATEGORY_LABELS = {
  lab_report: 'Lab Report',
  prescription: 'Prescription',
  diagnosis: 'Diagnosis',
  vaccination: 'Vaccination',
  insurance: 'Insurance',
  discharge_summary: 'Discharge Summary',
  imaging: 'Imaging',
  referral: 'Referral',
  consent_form: 'Consent Form',
  id_proof: 'ID Proof',
  other: 'Other',
  'Lab Report': 'Lab Report',
  'Prescription': 'Prescription',
  'Medical Image': 'Medical Image',
  'Hospital Record': 'Hospital Record',
  'Vaccination': 'Vaccination',
  'Insurance': 'Insurance',
  'Other': 'Other',
};

const CATEGORY_COLORS = {
  lab_report: 'badge-error',
  prescription: 'badge-warning',
  diagnosis: 'badge-info',
  vaccination: 'badge-info',
  insurance: 'badge-info',
  discharge_summary: 'badge-success',
  imaging: 'badge-info',
  referral: 'badge-info',
  consent_form: 'badge-warning',
  id_proof: 'badge-neutral',
  other: 'badge-neutral',
  'Lab Report': 'badge-error',
  'Prescription': 'badge-warning',
  'Medical Image': 'badge-info',
  'Hospital Record': 'badge-info',
  'Vaccination': 'badge-info',
  'Insurance': 'badge-info',
  'Other': 'badge-neutral',
};

function getFileIcon(mimeType) {
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
  if (mimeType === 'text/plain') return '📄';
  if (mimeType === 'application/zip') return '📦';
  return '📄';
}

function getFileColor(mimeType) {
  if (mimeType?.startsWith('image/')) return '#dbeafe';
  if (mimeType === 'application/pdf') return '#fee2e2';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '#dbeafe';
  if (mimeType === 'text/plain') return '#f3f4f6';
  if (mimeType === 'application/zip') return '#fef9c3';
  return '#f3f4f6';
}

// Lightweight thumbnail for image files (fetches a presigned preview URL lazily)
function FileThumb({ file }) {
  const isImage = file?.mimeType?.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isImage || !file?.id || fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    fileStorageAPI
      .getPreviewUrl(file.id)
      .then(res => {
        if (!cancelled) setPreviewUrl(res.data?.url || '');
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [isImage, file?.id]);

  const icon = (
    <div className={styles.fileIcon} style={{ background: getFileColor(file.mimeType), width: '100%', height: '120px', fontSize: '3rem', marginBottom: '12px' }}>
      {getFileIcon(file.mimeType)}
    </div>
  );

  if (!isImage || failed) return icon;
  if (!previewUrl) return icon;

  return (
    <div className={styles.fileIcon} style={{ width: '100%', height: '120px', marginBottom: '12px', overflow: 'hidden' }}>
      <ThumbnailImage
        src={previewUrl}
        alt={file.originalName || 'File preview'}
        mimeType={file.mimeType}
        fileSize={file.fileSize}
        lowBandwidthMode={typeof navigator !== 'undefined' && navigator.connection?.effectiveType === '2g'}
      />
    </div>
  );
}

export default function FileList({
  files = [],
  viewMode = 'grid',
  onViewModeChange,
  selectedFiles = [],
  onSelectionChange,
  onPreview,
  onDownload,
  onShare,
  onEdit,
  onDelete,
  onRestore,
  onBulkDelete,
  onBulkShare,
  onBulkMove,
  loading = false,
  emptyMessage = 'No files found',
  onUploadClick
}) {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState({ key: 'uploadedAt', direction: 'desc' });
  const [bulkLoading, setBulkLoading] = useState(false);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'uploadedAt' || sortConfig.key === 'documentDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [files, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Recovery helpers
  const getRecoveryStatus = (file) => {
    if (!file.isDeleted) return null;
    if (!file.recoveryExpiresAt) return { expired: true };
    const now = Date.now();
    const expiresAt = new Date(file.recoveryExpiresAt).getTime();
    const remaining = expiresAt - now;
    if (remaining <= 0) return { expired: true };
    return { expired: false, remaining };
  };

  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return 'Expired';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const isSelected = useCallback((fileId) => selectedFiles.includes(fileId), [selectedFiles]);

  const toggleSelection = useCallback((fileId) => {
    onSelectionChange?.(
      isSelected(fileId)
        ? selectedFiles.filter(id => id !== fileId)
        : [...selectedFiles, fileId]
    );
  }, [isSelected, selectedFiles, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    if (selectedFiles.length === sortedFiles.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(sortedFiles.map(f => f.id));
    }
  }, [selectedFiles.length, sortedFiles, onSelectionChange]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedFiles.length} files? This action cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await onBulkDelete?.(selectedFiles);
      onSelectionChange?.([]);
    } catch (error) {
      alert('Bulk delete failed: ' + error.message);
    } finally {
      setBulkLoading(false);
    }
  }, [selectedFiles, onBulkDelete, onSelectionChange]);

  const handleBulkShare = useCallback(async () => {
    setBulkLoading(true);
    try {
      await onBulkShare?.(selectedFiles);
    } catch (error) {
      alert('Bulk share failed: ' + error.message);
    } finally {
      setBulkLoading(false);
    }
  }, [selectedFiles, onBulkShare]);

  const handleBulkMove = useCallback(async () => {
    setBulkLoading(true);
    try {
      await onBulkMove?.(selectedFiles);
    } catch (error) {
      alert('Bulk move failed: ' + error.message);
    } finally {
      setBulkLoading(false);
    }
  }, [selectedFiles, onBulkMove]);

  const handleClearSelection = useCallback(() => {
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  const getCategoryBadge = (category) => (
    <span className={`${styles.badge} ${styles[CATEGORY_COLORS[category] || 'badgeGray']}`}>
      {CATEGORY_LABELS[category] || category}
    </span>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className={styles.flex} style={{ justifyContent: 'center', padding: '48px' }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <EmptyState
        icon="📁"
        title="No files found"
        description={emptyMessage}
        action={{ label: t('files.uploadFiles'), onClick: onUploadClick }}
      />
    );
  }

  const allSelected = selectedFiles.length > 0 && selectedFiles.length === sortedFiles.length;

  return (
    <div>
      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={selectedFiles.length}
        onDeleteAll={handleBulkDelete}
        onShareAll={handleBulkShare}
        onMoveAll={handleBulkMove}
        onClearSelection={handleClearSelection}
        loading={bulkLoading}
      />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <label className={styles.label} style={{ marginBottom: '4px' }}>View:</label>
          <div style={{ display: 'flex', gap: '4px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '4px' }}>
            <button
              className={`${styles.tab} ${viewMode === 'grid' ? styles.tabActive : ''}`}
              onClick={() => onViewModeChange?.('grid')}
              style={{ padding: '8px 12px', fontSize: '0.875rem' }}
            >
              ⊞ Grid
            </button>
            <button
              className={`${styles.tab} ${viewMode === 'list' ? styles.tabActive : ''}`}
              onClick={() => onViewModeChange?.('list')}
              style={{ padding: '8px 12px', fontSize: '0.875rem' }}
            >
              ☰ List
            </button>
          </div>
        </div>

        <div className={styles.toolbarGroup} style={{ marginLeft: 'auto' }}>
          <label className={styles.label} style={{ marginBottom: '4px' }}>{t('files.sortBy')}</label>
          <select
            className={`${styles.select} ${styles.input}`}
            style={{ width: 'auto', minWidth: '180px' }}
            value={`${sortConfig.key}:${sortConfig.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split(':');
              setSortConfig({ key, direction });
            }}
          >
            <option value="uploadedAt:desc">Newest First</option>
            <option value="uploadedAt:asc">Oldest First</option>
            <option value="originalName:asc">Name (A-Z)</option>
            <option value="originalName:desc">Name (Z-A)</option>
            <option value="fileSize:desc">Size (Largest)</option>
            <option value="fileSize:asc">Size (Smallest)</option>
            <option value="category:asc">Category</option>
          </select>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className={styles.fileGrid}>
          {sortedFiles.map(file => (
            <div
              key={file.id}
              className={`${styles.card} ${isSelected(file.id) ? styles.cardSelected : ''}`}
              onClick={() => toggleSelection(file.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.cardThumb}>
                <FileThumb file={file} />
              </div>
              <div style={{ padding: '0 12px 12px' }}>
                <p className={styles.fileName} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.originalName}
                </p>
                <div className={styles.flex} style={{ gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {getCategoryBadge(file.category)}
                </div>
                <p className={styles.fileMeta} style={{ marginTop: '8px' }}>
                  {formatDate(file.uploadedAt)} • {formatSize(file.fileSize)}
                </p>
                {file.documentDate && (
                  <p className={styles.fileMeta} style={{ marginTop: '4px', color: '#4b5563' }}>
                    📅 Document: {formatDate(file.documentDate)}
                  </p>
                )}
                {file.folder && (
                  <p className={styles.fileMeta} style={{ color: '#3b82f6' }}>
                    📁 {file.folder.name}
                  </p>
                )}
                {file.isDeleted && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                    {(() => {
                      const status = getRecoveryStatus(file);
                      if (status.expired) {
                        return (
                          <span className={`${styles.badge} ${styles.badgeRed}`} style={{ fontSize: '0.7rem' }}>
                            🗑️ Permanently deleted
                          </span>
                        );
                      }
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`${styles.badge} ${styles.badgeOrange}`} style={{ fontSize: '0.7rem' }}>
                            🔄 In Trash - {formatTimeRemaining(status.remaining)}
                          </span>
                          {onRestore && (
                            <button
                              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                              onClick={(e) => { e.stopPropagation(); onRestore?.(file); }}
                              style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                            >
                              ♻️ Restore
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isSelected(file.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelection(file.id); }}
                    style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className={styles.fileList}>
          {/* Header */}
          <div className={styles.fileItem} style={{ fontWeight: 600, color: '#6b7280', background: '#f9fafb', cursor: 'default' }}>
            <div style={{ width: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => { e.stopPropagation(); handleSelectAll(); }}
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                aria-label="Select all files"
              />
            </div>
            <div className={styles.fileInfo} style={{ flex: 3 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span onClick={() => handleSort('originalName')} style={{ cursor: 'pointer' }}>{t('files.fileName')}</span>
                {sortConfig.key === 'originalName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>{t('common.category')}</span>
              {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span onClick={() => handleSort('fileSize')} style={{ cursor: 'pointer' }}>Size</span>
              {sortConfig.key === 'fileSize' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span onClick={() => handleSort('uploadedAt')} style={{ cursor: 'pointer' }}>Uploaded</span>
              {sortConfig.key === 'uploadedAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>Folder</div>
            <div style={{ width: '80px', textAlign: 'center' }}>{t('common.actions')}</div>
          </div>

          {sortedFiles.map(file => (
            <div
              key={file.id}
              className={`${styles.fileItem} ${isSelected(file.id) ? styles.fileItemSelected : ''}`}
              onClick={(e) => {
                if (!e.target.closest('button') && !e.target.closest('input')) toggleSelection(file.id);
              }}
            >
              <input
                type="checkbox"
                checked={isSelected(file.id)}
                onChange={(e) => { e.stopPropagation(); toggleSelection(file.id); }}
                style={{ width: '18px', height: '18px', marginRight: '12px', accentColor: '#3b82f6' }}
                aria-label={`Select ${file.originalName}`}
              />
              <div className={styles.fileIcon} style={{ background: getFileColor(file.mimeType) }}>
                {getFileIcon(file.mimeType)}
              </div>
              <div className={styles.fileInfo} style={{ flex: 3, minWidth: 0 }}>
                <p className={styles.fileName}>{file.originalName}</p>
                <p className={styles.fileMeta}>
                  {file.description ? file.description.substring(0, 60) + (file.description.length > 60 ? '...' : '') : 'No description'}
                </p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {getCategoryBadge(file.category)}
              </div>
              <div style={{ flex: 1, textAlign: 'center', color: '#6b7280' }}>
                {formatSize(file.fileSize)}
              </div>
              <div style={{ flex: 1, textAlign: 'center', color: '#6b7280' }}>
                {formatDate(file.uploadedAt)}
                {file.documentDate && (
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    📅 {formatDate(file.documentDate)}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'center', color: '#6b7280' }}>
                {file.folder ? file.folder.name : '—'}
              </div>
              <div className={styles.fileActions} style={{ width: '140px', justifyContent: 'center', gap: '4px' }}>
                <button className={styles.btnIcon} onClick={(e) => { e.stopPropagation(); onPreview?.(file); }} title="Preview" aria-label={`Preview ${file.originalName}`}>👁️</button>
                <button className={styles.btnIcon} onClick={(e) => { e.stopPropagation(); onDownload?.(file); }} title="Download" aria-label={`Download ${file.originalName}`}>⬇️</button>
                <button className={styles.btnIcon} onClick={(e) => { e.stopPropagation(); onShare?.(file); }} title="Share" aria-label={`Share ${file.originalName}`}>🔗</button>
                <button className={styles.btnIcon} onClick={(e) => { e.stopPropagation(); onEdit?.(file); }} title="Edit" aria-label={`Edit ${file.originalName}`}>✏️</button>
                {file.isDeleted ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {(() => {
                      const status = getRecoveryStatus(file);
                      if (status.expired) {
                        return (
                          <span className={`${styles.badge} ${styles.badgeRed}`} style={{ fontSize: '0.65rem', marginRight: '4px' }}>
                            🗑️ Expired
                          </span>
                        );
                      }
                      return (
                        <button
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                          onClick={(e) => { e.stopPropagation(); onRestore?.(file); }}
                          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          title="Restore file"
                        >
                          ♻️
                        </button>
                      );
                    })()}
                    <button className={styles.btnIcon} onClick={(e) => { e.stopPropagation(); onDelete?.(file); }} title="Delete" style={{ color: '#ef4444' }}>🗑️</button>
                  </div>
                ) : (
                  <button className={styles.btnIcon} onClick={(e) => { e.stopPropagation(); onDelete?.(file); }} title="Delete" style={{ color: '#ef4444' }}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}