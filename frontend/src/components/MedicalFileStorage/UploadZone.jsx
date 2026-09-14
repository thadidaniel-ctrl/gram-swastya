import React, { useState, useCallback, useRef } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import styles from './FileStorageStyles.module.css';

const CATEGORY_OPTIONS = [
  { value: 'Lab Report', label: 'Lab Report' },
  { value: 'Prescription', label: 'Prescription' },
  { value: 'Medical Image', label: 'Medical Image' },
  { value: 'Hospital Record', label: 'Hospital Record' },
  { value: 'Vaccination', label: 'Vaccination' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Other', label: 'Other' },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
];

export default function UploadZone({ 
  onUploadComplete, 
  folders = [], 
  selectedFolderId = null,
  isOpen = true,
  onClose 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [formData, setFormData] = useState({
    category: 'other',
    tags: '',
    description: '',
    folderId: selectedFolderId || '',
    documentDate: '',
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds 50MB limit`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File "${file.name}" has unsupported type: ${file.type}`;
    }
    return null;
  };

  const handleFiles = (files) => {
    const validFiles = [];
    const newErrors = {};

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors[file.name] = error;
      } else {
        validFiles.push(file);
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[selectedFiles[index]?.name];
      return newErrors;
    });
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const newProgress = {};
    selectedFiles.forEach((_, i) => newProgress[i] = 0);
    setProgress(newProgress);

    try {
      const formDataUpload = new FormData();
      selectedFiles.forEach(file => formDataUpload.append('files', file));
      formDataUpload.append('category', formData.category);
      formDataUpload.append('tags', formData.tags);
      formDataUpload.append('description', formData.description);
      formDataUpload.append('folderId', formData.folderId || '');
      if (formData.documentDate) {
        formDataUpload.append('documentDate', formData.documentDate);
      }

      // Simulate progress for UX (real progress would need XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const updated = { ...prev };
          let allComplete = true;
          Object.keys(updated).forEach(key => {
            if (updated[key] < 90) {
              updated[key] = Math.min(90, updated[key] + Math.random() * 10);
              allComplete = false;
            }
          });
          if (allComplete) clearInterval(progressInterval);
          return updated;
        });
      }, 200);

      const response = await fileStorageAPI.uploadFiles(formDataUpload);

      clearInterval(progressInterval);
      setProgress({});
      setSelectedFiles([]);
      setFormData({ ...formData, tags: '', description: '', documentDate: '' });
      setErrors({});
      
      onUploadComplete?.(response.data);
    } catch (error) {
      clearInterval(progressInterval);
      setProgress({});
      setErrors({ upload: error.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>📤 Upload Medical Files</h2>
        <button 
          className={styles.btnIcon}
          onClick={onClose}
          aria-label="Close upload panel"
        >
          ✕
        </button>
      </div>

      <div className={styles.panelBody}>
        <div 
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={uploading}
          />
          <div className={styles.dropzoneIcon}>
            {isDragging ? '📥' : '📁'}
          </div>
          <p className={styles.dropzoneText}>
            {isDragging ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
          </p>
          <p className={styles.dropzoneHint}>
            Supports: PDF, JPG, PNG, WebP, TIFF, DOC, DOCX, TXT, ZIP (max 50MB each)
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className={styles.mt4}>
            <h3 className={styles.label}>Selected Files ({selectedFiles.length})</h3>
            <div className={styles.fileList}>
              {selectedFiles.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <div className={styles.fileIcon} style={{ background: getFileColor(file.type) }}>
                    {getFileIcon(file.type)}
                  </div>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{file.name}</p>
                    <p className={styles.fileMeta}>
                      {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                      {errors[file.name] && <span className={styles.textError}> - {errors[file.name]}</span>}
                    </p>
                  </div>
                  <button
                    className={styles.btnIcon}
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className={styles.mt4}>
            <h3 className={styles.label}>File Details (applied to all)</h3>
            <div className={styles.flex} style={{ gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className={styles.label}>Category</label>
                <select
                  className={`${styles.select} ${styles.input}`}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={uploading}
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className={styles.label}>Folder</label>
                <select
                  className={`${styles.select} ${styles.input}`}
                  value={formData.folderId}
                  onChange={(e) => setFormData({ ...formData, folderId: e.target.value })}
                  disabled={uploading}
                >
                  <option value="">Root (no folder)</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className={styles.label}>Document Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={formData.documentDate}
                  onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                  disabled={uploading}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className={styles.mt4} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className={styles.label}>Tags (comma separated)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., diabetes, follow-up, urgent"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className={styles.mt4}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.input}
                rows={3}
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={uploading}
              />
            </div>

            {errors.upload && (
              <div className={`${styles.mt4} ${styles.textError}`}>{errors.upload}</div>
            )}

            <div className={styles.mt4} style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className={styles.btn}
                onClick={onClose}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={uploadFiles}
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}