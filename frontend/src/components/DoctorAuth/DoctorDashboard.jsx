import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonList } from '../../components/Common/SkeletonLoader';
import { EmptyState } from '../../components/Common/EmptyState';
import { useTranslation } from 'react-i18next';

export default function DoctorDashboard() {
  const { t } = useTranslation();
  const { doctor, logoutDoctor } = useAuth();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [sharedFilesLoading, setSharedFilesLoading] = useState(true);
  const [sharedFilesError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchSharedFiles();
  }, [fetchData, fetchSharedFiles]);

  const fetchSharedFiles = useCallback(async () => {
    try {
      const res = await api.getDoctorSharedFiles({ limit: 20 });
      if (res.success) setSharedFiles(res.files || []);
    } catch (error) {
      showToast('Could not load shared files', 'error');
    } finally {
      setSharedFilesLoading(false);
    }
  }, [showToast]);

  const openSharedFile = async (file, mode) => {
    try {
      const res = mode === 'download'
        ? await api.getDoctorSharedFileDownload(file.id)
        : await api.getDoctorSharedFilePreview(file.id);
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      showToast(`Failed to ${mode} file. Please try again.`, 'error');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    return (new Date(expiresAt).getTime() - Date.now()) <= 3 * 24 * 60 * 60 * 1000;
  };

  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return 'No expiry';
    const date = new Date(expiresAt);
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (days < 0) return `Expired ${label}`;
    if (days === 0) return `Expires today`;
    return `Expires ${label} (${days}d)`;
  };

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, patientsRes, apptsRes] = await Promise.all([
        api.getDoctorDashboard(),
        api.getDoctorPatients({ limit: 10 }),
        api.getDoctorAppointments({ limit: 10, status: 'confirmed' }),
      ]);

      if (dashRes.success) setDashboard(dashRes.dashboard);
      if (patientsRes.success) setPatients(patientsRes.patients);
      if (apptsRes.success) setAppointments(apptsRes.appointments);
    } catch (error) {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const todayAppointments = appointments.filter(a => {
    const apptDate = new Date(a.scheduledAt);
    const today = new Date();
    return apptDate.toDateString() === today.toDateString();
  });

  const stats = [
    { label: 'Total Patients', value: dashboard?.totalPatients || 0, icon: '👥', color: '#2E7D32' },
    { label: 'Today\'s Appointments', value: todayAppointments.length, icon: '📅', color: '#1976D2' },
    { label: 'Pending Prescriptions', value: dashboard?.pendingPrescriptions || 0, icon: '📋', color: '#F57C00' },
    { label: 'This Month', value: dashboard?.thisMonthConsultations || 0, icon: '📊', color: '#7B1FA2' },
  ];

  return (
    <div className="dashboard doctor-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dr. {doctor?.profile?.firstName} {doctor?.profile?.lastName}</h1>
          <p>{doctor?.profile?.specialization} • {doctor?.clinic?.name || 'Practice'}</p>
        </div>
        <button onClick={logoutDoctor} className="btn btn-outline">{t('nav.logout')}</button>
      </div>

      <div className="stats-grid">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20` }}>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div className="stat-info">
              <span className="stat-count">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h2>📅 Today's Appointments</h2>
            <Link to="/doctor/appointments" className="btn-link">View All</Link>
          </div>
          {loading ? (
            <SkeletonList count={3} itemHeight="90px" />
          ) : todayAppointments.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No appointments today"
              description="You have no appointments scheduled for today."
            />
          ) : (
            <div className="appointment-list">
              {todayAppointments.map(a => (
                <div key={a.id || a._id} className="appointment-card">
                  <div className="appt-time">
                    {new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="appt-patient">
                    <span className="patient-name">{a.patient?.profile?.firstName} {a.patient?.profile?.lastName}</span>
                    <span className="patient-age">{a.patient?.age} years</span>
                  </div>
                  <div className="appt-type">{a.type}</div>
                  <div className="appt-actions">
                    <button className="btn btn-primary btn-sm">Start</button>
                    <button className="btn btn-secondary btn-sm">Notes</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2>👥 Recent Patients</h2>
            <Link to="/doctor/patients" className="btn-link">View All</Link>
          </div>
          {patients.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No patients yet"
              description="You haven't been assigned any patients yet."
            />
          ) : (
            <ul className="item-list">
              {patients.slice(0, 5).map(p => (
                <li key={p.id || p._id} className="item">
                  <div className="item-main">
                    <span className="item-title">{p.name}</span>
                    <span className="item-age">{p.age} • {p.gender}</span>
                  </div>
                  <div className="item-meta">
                    Last visit: {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : 'Never'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2>⚡ Quick Actions</h2>
          </div>
          <div className="quick-actions">
            <button className="action-btn">
              <span className="action-icon">➕</span>
              <span>New Prescription</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">📝</span>
              <span>Write Notes</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">📅</span>
              <span>Schedule</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">📊</span>
              <span>Reports</span>
            </button>
          </div>
        </div>

        <div className="dashboard-card full-width">
          <div className="card-header">
            <h2>{t('doctor.sharedFiles')}</h2>
            <span className="dashboard-files-count">
              {sharedFiles.length} file{sharedFiles.length !== 1 ? 's' : ''}
            </span>
          </div>

          {sharedFilesError ? (
            <div className="empty-state">
              <p>⚠️ {sharedFilesError}</p>
            </div>
          ) : sharedFilesLoading ? (
            <SkeletonList count={3} itemHeight="70px" />
          ) : sharedFiles.length === 0 ? (
            <EmptyState
              icon="📎"
              title="No files shared with you"
              description="When patients share files with you, they'll appear here."
            />
          ) : (
            <div className="shared-files-list">
              {sharedFiles.map(file => (
                <div key={file.id} className="shared-file-item">
                  <div className="shared-file-icon">📄</div>
                  <div className="shared-file-main">
                    <span className="shared-file-name">{file.fileName}</span>
                    <span className="shared-file-meta">
                      {file.category} • {formatBytes(file.fileSize)} • from {file.patient?.name || 'Patient'}
                    </span>
                    <span className={`shared-file-expiry ${file.expiresAt && isExpiringSoon(file.expiresAt) ? 'warn' : ''}`}>
                      {file.expiresAt ? (new Date(file.expiresAt).getTime() < Date.now() ? '⛔ ' : '⏳ ') : '∞ '}{formatExpiry(file.expiresAt)}
                    </span>
                  </div>
                  <div className="shared-file-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openSharedFile(file, 'preview')}
                    >
                      Open
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openSharedFile(file, 'download')}
                    >
{t('common.download')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}