import React, { useState, useEffect, useCallback } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import { useTranslation } from 'react-i18next';
import styles from './FileStorageStyles.module.css';

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Activities' },
  { value: 'upload', label: 'Uploads' },
  { value: 'download', label: 'Downloads' },
  { value: 'preview', label: 'Previews' },
  { value: 'delete', label: 'Deletions' },
  { value: 'share', label: 'Shares' },
  { value: 'restore', label: 'Restores' },
];

const ACTIVITY_ICONS = {
  upload: '📤',
  download: '⬇️',
  preview: '👁️',
  delete: '🗑️',
  share: '🔗',
  restore: '🔄',
};

const ACTIVITY_LABELS = {
  upload: 'Uploaded',
  download: 'Downloaded',
  preview: 'Previewed',
  delete: 'Deleted',
  share: 'Shared',
  restore: 'Restored',
};

export default function ActivityTimeline({ fileId }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: currentPage, limit: pageSize };
      if (filterType !== 'all') params.type = filterType;
      if (fileId) params.fileId = fileId;

      const res = await fileStorageAPI.getActivity(params);
      setActivities(res.activities || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterType, fileId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const formatTimeAgo = (dateStr) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (error) {
    return (
      <div className={styles.alert} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px', borderRadius: '8px' }}>
        {error}
        <button className={`${styles.btn} ${styles.btnSm} ${styles.mt4}`} onClick={fetchActivity}>{t('common.retry')}</button>
      </div>
    );
  }

  return (
    <div className={styles.activityTimeline}>
      {/* Header with Filter */}
      <div className={styles.activityHeader}>
        <h3 className={styles.panelTitle}>📋 Activity Timeline</h3>
        <select
          className={`${styles.select} ${styles.input}`}
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
          style={{ minWidth: '180px' }}
        >
          {ACTIVITY_TYPES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        {loading ? (
          <div className={styles.timelineLoading}>
            <div className={styles.spinner} />
            <p className={styles.textMuted}>Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className={styles.timelineEmpty}>
            <p className={styles.textMuted}>No activity found</p>
            {filterType !== 'all' && (
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.mt4}`} onClick={() => setFilterType('all')}>
                Show all activities
              </button>
            )}
          </div>
        ) : (
          <>
            {activities.map((activity, index) => (
              <div key={activity._id} className={styles.timelineItem}>
                {/* Timeline connector line */}
                <div className={styles.timelineLine} style={{ top: index === 0 ? '24px' : 0 }} />
                
                {/* Activity Card */}
                <div className={`${styles.timelineCard} ${activity.success === false ? styles.timelineCardError : ''}`}>
                  {/* Time marker */}
                  <div className={styles.timelineMarker}>
                    <div className={styles.timelineDot} style={{ background: activity.success === false ? '#ef4444' : '#3b82f6' }} />
                  </div>
                  
                  {/* Content */}
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineRow}>
                      <div className={styles.timelineIcon} style={{ background: activity.success === false ? '#fef2f2' : '#eff6ff' }}>
                        {ACTIVITY_ICONS[activity.accessType] || '📄'}
                      </div>
                      <div className={styles.timelineInfo}>
                        <div className={styles.timelineAction}>
                          <strong>{ACTIVITY_LABELS[activity.accessType] || activity.accessType}</strong>
                          <span className={styles.timelineFile}>
                            {activity.fileName}
                            {activity.mimeType && <span className={styles.timelineMimeType}> ({activity.mimeType})</span>}
                          </span>
                        </div>
                        <div className={styles.timelineMeta}>
                          <span className={styles.timelineTime}>{formatTimeAgo(activity.timestamp)}</span>
                          <span className={`${styles.badge} ${styles.badgeGray}`}>
                            {activity.userType === 'doctor' ? '👨‍⚕️ Doctor' : '👤 Patient'}
                          </span>
                          {activity.ipAddress && <span className={styles.timelineIp}>{activity.ipAddress}</span>}
                        </div>
                      </div>
                    </div>
                    
                    {activity.duration && (
                      <div className={styles.timelineDetail}>
                        Duration: {activity.duration}s
                      </div>
                    )}
                    {activity.success === false && (
                      <div className={styles.timelineError}>
                        ⚠️ Action failed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.timelinePagination}>
            <button
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {t('common.previous')}
            </button>
            <span className={styles.paginationInfo}>
              Page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <button
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t('common.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}