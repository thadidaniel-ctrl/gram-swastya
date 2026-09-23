import React, { useEffect, useState, useRef } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import { useTranslation } from 'react-i18next';
import styles from './FileStorageStyles.module.css';

export default function FilePreview({ 
  file, 
  isOpen, 
  onClose,
  onDownload 
}) {
  const { t } = useTranslation('files');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const closeBtnRef = useRef(null);
  const previewUrlRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fileStorageAPI.getPreviewUrl(file.id);
        previewUrlRef.current = res.data.url;
        setPreviewUrl(res.data.url);
      } catch (err) {
        setError(err.message || 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [isOpen, file]);

  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType === 'text/plain') return '📄';
    if (mimeType === 'application/zip') return '📦';
    return '📄';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDocDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: '900px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{file?.originalName || 'File Preview'}</h3>
          <button ref={closeBtnRef} className={styles.modalClose} onClick={onClose} aria-label="Close preview">✕</button>
        </div>

        <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', height: 'calc(90vh - 140px)' }}>
          {/* File Info Bar */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '16px', 
            padding: '16px', 
            background: '#f9fafb', 
            borderBottom: '1px solid #e5e7eb',
            fontSize: '0.875rem'
          }}>
            <div className={styles.flex} style={{ gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>{getFileIcon(file?.mimeType)}</span>
              <div>
                <p style={{ fontWeight: 500, color: '#111827' }}>{file?.originalName}</p>
                <p className={styles.textSm} style={{ color: '#6b7280' }}>
                  {formatSize(file?.fileSize)} • {file?.mimeType} • Uploaded {formatDate(file?.uploadedAt)}
                  {formatDocDate(file?.documentDate) ? ` • 📅 Document ${formatDocDate(file?.documentDate)}` : ''}
                </p>
              </div>
            </div>

            {file?.category && (
              <span className={`${styles.badge} ${styles.badgeBlue}`}>{file.category.replace('_', ' ')}</span>
            )}
            {(() => {
              const tagsArray = Array.isArray(file?.tags)
                ? file.tags
                : typeof file?.tags === 'string' && file.tags
                  ? file.tags.split(',').map(t => t.trim()).filter(Boolean)
                  : [];
              return tagsArray.length > 0 ? (
                <span className={`${styles.badge} ${styles.badgeGray}`}>
                  {tagsArray.slice(0, 3).join(', ')}{tagsArray.length > 3 && ` +${tagsArray.length - 3}`}
                </span>
              ) : null;
            })()}
            {file?.folder && (
              <span className={styles.textSm} style={{ color: '#3b82f6' }}>📁 {file.folder.name}</span>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button 
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => onDownload?.(file)}
                disabled={loading}
              >
                ⬇️ {t('common.download')}
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '24px' }}>
            {loading ? (
              <div className={styles.flex} style={{ flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <div className={styles.spinner} style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
                <p className={styles.textMuted}>Loading preview...</p>
              </div>
            ) : error ? (
              <div className={styles.flex} style={{ flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '48px' }}>
                <span style={{ fontSize: '4rem' }}>⚠️</span>
                <p style={{ color: '#ef4444', fontWeight: 500 }}>Cannot preview this file</p>
                <p className={styles.textMuted}>{error}</p>
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => onDownload?.(file)}
                >
                  Download Instead
                </button>
              </div>
            ) : file?.mimeType?.startsWith('image/') && previewUrl ? (
              <img 
                src={previewUrl} 
                alt={file.originalName}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
              />
            ) : file?.mimeType === 'application/pdf' && previewUrl ? (
              <iframe 
                src={previewUrl}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                title={file.originalName}
              />
            ) : (
              <div className={styles.flex} style={{ flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '48px' }}>
                <span style={{ fontSize: '5rem' }}>{getFileIcon(file?.mimeType)}</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 500, color: '#111827' }}>
                  Preview not available for this file type
                </p>
                <p className={styles.textMuted}>
                  {file?.mimeType} files cannot be previewed in the browser.
                </p>
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => onDownload?.(file)}
                >
                  Download to View
                </button>
              </div>
            )}
          </div>
        </div>

<div className={styles.modalFooter}>
           <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
             {t('common.close')}
           </button>
           <button 
             className={`${styles.btn} ${styles.btnPrimary}`}
             onClick={() => onDownload?.(file)}
             disabled={loading}
           >
             {t('common.download')}
           </button>
         </div>
      </div>
    </div>
  );
}