import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import { useTranslation } from 'react-i18next';
import styles from './FileStorageStyles.module.css';

export default function ShareModal({ 
  file, 
  isOpen, 
  onClose 
}) {
  const { t } = useTranslation('files');
  const [doctors, setDoctors] = useState([]);
  const [sharedWith, setSharedWith] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [permissions, setPermissions] = useState('view-only');
  const [message, setMessage] = useState(null);

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, file, loadData]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [doctorsRes] = await Promise.all([
        fileStorageAPI.getDoctorList(),
      ]);
      
      // We need a different endpoint for file details with shares
      // For now, we'll use a mock or the file data
      setDoctors(doctorsRes.data || []);
      setSharedWith(file.sharedWith || []);
    } catch (error) {
      console.error('Failed to load share data:', error);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleShare = async () => {
    if (!selectedDoctor) return;
    
    setMessage({ type: 'loading', text: t('files.sharing') });
    try {
      await fileStorageAPI.shareFile(file.id, {
        doctorId: selectedDoctor.id,
        expiresAt: expiresAt || undefined,
        permissions: 'view-only',
      });

      setMessage({ type: 'success', text: 'File shared successfully!' });
      setSelectedDoctor(null);
      setExpiresAt('');
      setPermissions('view-only');
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to share file' });
    }
  };

  const handleUnshare = async (doctorId) => {
    if (!confirm('Remove access for this doctor?')) return;
    
    try {
      await fileStorageAPI.unshareFile(file.id, doctorId);
      setMessage({ type: 'success', text: 'Access removed' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove access' });
    }
  };

  const filteredDoctors = doctors.filter(d => 
    !sharedWith.some(s => s.doctor?.id === d.id || s.doctor === d.id) &&
    (d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     d.specialization?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{t('files.share')} "{file?.originalName}"</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Share with doctor */}
          <div style={{ marginBottom: '24px' }}>
<h4 className={styles.label}>{t('files.shareWithDoctor')}</h4>
              
              <div style={{ marginBottom: '12px' }}>
                <label className={styles.label}>Search Doctors</label>
              <input
                ref={searchInputRef}
                type="text"
                className={styles.input}
                placeholder="Search by name or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px' }}>
              {loading ? (
                <div className={styles.flex} style={{ justifyContent: 'center', padding: '24px' }}>
                  <div className={styles.spinner} />
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className={styles.textMuted} style={{ padding: '24px', textAlign: 'center' }}>
                  No doctors found
                </div>
              ) : (
                filteredDoctors.map(doctor => (
                  <button
                    key={doctor.id}
                    className={styles.shareItem}
                    onClick={() => setSelectedDoctor(doctor)}
                    style={{ 
                      textAlign: 'left', 
                      background: selectedDoctor?.id === doctor.id ? '#eff6ff' : 'transparent',
                      borderColor: selectedDoctor?.id === doctor.id ? '#3b82f6' : '#e5e7eb',
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
                    {selectedDoctor?.id === doctor.id && (
                      <span className={styles.badge} style={{ background: '#dbeafe', color: '#1e40af' }}>Selected</span>
                    )}
                  </button>
                ))
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
              <div>
                <label className={styles.label}>Permission</label>
                <select
                  className={`${styles.select} ${styles.input}`}
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value)}
                >
                  <option value="view-only">View Only</option>
                </select>
              </div>
            </div>

            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleShare}
              disabled={!selectedDoctor || loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Sharing...' : t('files.share')}
            </button>
          </div>

          <div className={styles.divider} />

          {/* Currently shared with */}
          <h4 className={styles.label}>Currently Shared With</h4>
          
          {sharedWith.length === 0 ? (
            <p className={styles.textMuted} style={{ textAlign: 'center', padding: '24px' }}>
              Not shared with any doctors yet
            </p>
          ) : (
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              {sharedWith.map(share => (
                <div key={share.doctor?.id || share.doctor} className={styles.shareItem}>
                  <div className={styles.shareInfo}>
                    <div className={styles.shareAvatar}>
                      {share.doctor?.name?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div>
                      <p className={styles.shareName}>
                        Dr. {share.doctor?.name || 'Unknown Doctor'}
                      </p>
                      <p className={styles.shareMeta}>
                        {share.permissions} • {share.expiresAt ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}` : 'No expiry'}
                      </p>
                    </div>
                  </div>
                  <button
                    className={styles.btnIcon}
                    onClick={() => handleUnshare(share.doctor?.id || share.doctor)}
                    title="Remove access"
                    style={{ color: '#ef4444' }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {message && (
            <div className={`${styles.mt4} ${message.type === 'error' ? styles.textError : ''}`} style={message.type === 'success' ? { color: '#16a34a' } : {}}>
              {message.text}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}