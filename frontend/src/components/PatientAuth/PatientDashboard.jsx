import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonCard } from '../../components/Common/SkeletonLoader';
import { EmptyState } from '../../components/Common/EmptyState';
import { useTranslation } from 'react-i18next';

export default function PatientDashboard() {
  const { t } = useTranslation(['patient', 'common']);
  const { patient } = useAuth();
  const { showToast } = useToast();
  const [healthHistory, setHealthHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthHistory();
  }, [fetchHealthHistory]);

  const fetchHealthHistory = useCallback(async () => {
    try {
      const response = await api.getHealthHistory();
      if (response.success) {
        setHealthHistory(response.healthHistory);
      }
    } catch (error) {
      showToast('Failed to load health history', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const stats = [
    { label: 'Diagnoses', count: healthHistory?.diagnoses?.length || 0, icon: '🔍', color: 'var(--color-success-main)' },
    { label: 'Medicines', count: healthHistory?.medicines?.length || 0, icon: '💊', color: 'var(--color-info-main)' },
    { label: 'Appointments', count: healthHistory?.appointments?.length || 0, icon: '📅', color: 'var(--color-warning-main)' },
    { label: 'Prescriptions', count: healthHistory?.prescriptions?.length || 0, icon: '📋', color: '#7B1FA2' },
  ];

  const upcomingAppointments = healthHistory?.appointments
    ?.filter(a => a.scheduledAt && new Date(a.scheduledAt) > new Date())
    ?.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    ?.slice(0, 3) || [];

  const activeMedicines = healthHistory?.medicines
    ?.filter(m => m.isActive)
    ?.slice(0, 3) || [];

  const recentDiagnoses = healthHistory?.diagnoses
    ?.slice(0, 3) || [];

  const firstName = patient?.name?.split(' ')[0] || 'Patient';

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="page-header mb-6">
        <h1 className="page-title">{t('patient.welcome')}, {firstName}</h1>
        <p className="page-subtitle">Your health dashboard overview</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <Link
            key={stat.label}
            to={`/${stat.label.toLowerCase()}`}
            className="card card-interactive p-4 flex items-center gap-4"
            style={{ '--stat-color': stat.color }}
          >
            <div
              className="stat-icon flex items-center justify-center rounded-lg"
              style={{
                width: '56px',
                height: '56px',
                backgroundColor: `${stat.color}20`,
              }}
              aria-hidden="true"
            >
              <span style={{ color: stat.color, fontSize: '1.5rem' }}>{stat.icon}</span>
            </div>
            <div className="stat-info">
              <span className="stat-count block text-2xl font-bold text-primary">{stat.count}</span>
              <span className="stat-label text-sm text-secondary">{stat.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Dashboard Cards */}
      <div className="dashboard-grid grid gap-6">
        {/* Recent Diagnoses */}
        <section className="card" aria-labelledby="diagnoses-heading">
          <header className="card-header flex items-center justify-between p-4 border-b border-light">
            <h2 id="diagnoses-heading" className="text-lg font-semibold text-primary">🔍 Recent Diagnoses</h2>
            <Link to="/symptom-checker" className="btn btn-ghost btn-sm">View All</Link>
          </header>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : recentDiagnoses.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No diagnoses yet"
                description="Run a symptom check to see potential conditions."
                action={{ label: 'Run Symptom Check', to: '/symptom-checker' }}
              />
            ) : (
              <ul className="space-y-3" role="list">
                {recentDiagnoses.map(d => (
                  <li key={d.id || d._id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg" aria-hidden="true">🏥</span>
                      <div>
                        <p className="font-medium text-primary">{d.conditions?.[0]?.conditionName || 'Diagnosis'}</p>
                        <p className="text-sm text-secondary">{d.recommendation || 'General consultation'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge badge-${d.riskLevel || 'low'}`}
                        style={{
                          '--badge-bg': d.riskLevel === 'high' ? 'var(--color-error-light)' :
                                      d.riskLevel === 'medium' ? 'var(--color-warning-light)' : 'var(--color-success-light)',
                          '--badge-color': d.riskLevel === 'high' ? 'var(--color-error-dark)' :
                                        d.riskLevel === 'medium' ? 'var(--color-warning-dark)' : 'var(--color-success-dark)',
                        }}
                      >
                        {d.riskLevel || 'low'}
                      </span>
                      <time className="text-sm text-secondary">{formatDate(d.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Active Medicines */}
        <section className="card" aria-labelledby="medicines-heading">
          <header className="card-header flex items-center justify-between p-4 border-b border-light">
            <h2 id="medicines-heading" className="text-lg font-semibold text-primary">💊 Active Medicines</h2>
            <Link to="/medicines" className="btn btn-ghost btn-sm">View All</Link>
          </header>
          <div className="p-4">
            {activeMedicines.length === 0 ? (
              <EmptyState
                icon="💊"
                title="No active medicines"
                description="Add your medicines to track doses and reminders."
                action={{ label: 'Add Medicine', to: '/medicines' }}
              />
            ) : (
              <ul className="space-y-3" role="list">
                {activeMedicines.map(m => (
                  <li key={m.id || m._id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg" aria-hidden="true">💊</span>
                      <div>
                        <p className="font-medium text-primary">{m.name}</p>
                        <p className="text-sm text-secondary">{m.dosage} • {m.frequency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.isLowStock && (
                        <span className="badge badge-warning" style={{ '--badge-bg': 'var(--color-warning-light)', '--badge-color': 'var(--color-warning-dark)' }}>
                          Low Stock
                        </span>
                      )}
                      {m.remainingQuantity !== undefined && (
                        <span className="text-sm text-secondary">
                          {m.remainingQuantity}/{m.totalQuantity} left
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Upcoming Appointments */}
        <section className="card" aria-labelledby="appointments-heading">
          <header className="card-header flex items-center justify-between p-4 border-b border-light">
            <h2 id="appointments-heading" className="text-lg font-semibold text-primary">📅 Upcoming Appointments</h2>
            <Link to="/appointments" className="btn btn-ghost btn-sm">View All</Link>
          </header>
          <div className="p-4">
            {upcomingAppointments.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No upcoming appointments"
                description="Schedule your next consultation."
                action={{ label: t('patient.bookAppointment'), to: '/appointments' }}
              />
            ) : (
              <ul className="space-y-3" role="list">
                {upcomingAppointments.map(a => (
                  <li key={a.id || a._id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg" aria-hidden="true">👨‍⚕️</span>
                      <div>
                        <p className="font-medium text-primary">{a.doctor?.profile?.fullName || 'Doctor'}</p>
                        <p className="text-sm text-secondary">{a.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <time className="text-sm text-secondary block">{formatDateTime(a.scheduledAt)}</time>
                      <span className="badge badge-info" style={{ '--badge-bg': 'var(--color-info-light)', '--badge-color': 'var(--color-info-dark)' }}>
                        {a.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Quick Actions - Full Width */}
        <section className="card" aria-labelledby="actions-heading">
          <header className="card-header p-4 border-b border-light">
            <h2 id="actions-heading" className="text-lg font-semibold text-primary">Quick Actions</h2>
          </header>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Link to="/symptom-checker" className="card card-interactive p-4 text-center">
                <span className="text-3xl block mb-2" aria-hidden="true">🔍</span>
                <span className="font-medium text-primary">Symptom Checker</span>
              </Link>
              <Link to="/voice-assistant" className="card card-interactive p-4 text-center">
                <span className="text-3xl block mb-2" aria-hidden="true">🎤</span>
                <span className="font-medium text-primary">Voice Assistant</span>
              </Link>
              <Link to="/ambulance" className="card card-interactive p-4 text-center border-warning-main">
                <span className="text-3xl block mb-2" aria-hidden="true">🚑</span>
                <span className="font-medium text-warning">Call Ambulance</span>
              </Link>
              <Link to="/records" className="card card-interactive p-4 text-center">
                <span className="text-3xl block mb-2" aria-hidden="true">📋</span>
                <span className="font-medium text-primary">Health Records</span>
              </Link>
              <Link to="/files" className="card card-interactive p-4 text-center">
                <span className="text-3xl block mb-2" aria-hidden="true">📁</span>
                <span className="font-medium text-primary">{t('nav.files')}</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}