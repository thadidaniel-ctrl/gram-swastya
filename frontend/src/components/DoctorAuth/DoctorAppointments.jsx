import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonList } from '../../components/Common/SkeletonLoader';
import { EmptyState } from '../../components/Common/EmptyState';

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function DoctorAppointments() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDoctorAppointments({ page, search, status });
      if (res.success) {
        setAppointments(res.appointments || []);
        setPagination(res.pagination);
      }
    } catch (error) {
      showToast(`Failed to load appointments: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, showToast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="dashboard doctor-appointments">
      <div className="dashboard-header">
        <div>
          <h1>Appointments</h1>
          <p>{pagination ? `${pagination.total} total appointment(s)` : 'Manage your appointments'}</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Search by patient or phone..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search appointments"
        />
        <select
          className="select-input"
          value={status}
          onChange={e => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : appointments.length === 0 ? (
        <EmptyState title="No appointments found" message="Try a different filter or check back later." />
      ) : (
        <div className="list-cards">
          {appointments.map(a => (
            <div className="list-card" key={a.id}>
              <div className="list-card-avatar" aria-hidden="true">
                {a.patient?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="list-card-body">
                <div className="list-card-title">
                  {a.patient?.name || 'Patient'}
                  {a.isUpcoming && <span className="badge badge-success">Upcoming</span>}
                </div>
                <div className="list-card-subtitle">
                  {formatDateTime(a.scheduledAt)} • {a.type || 'Consultation'} {a.duration ? `• ${a.duration} min` : ''}
                </div>
                <div className="list-card-meta">
                  <span className={`badge status-${a.status}`}>{(a.status || '').toUpperCase()}</span>
                  {a.patient?.phone && <span>{a.patient.phone}</span>}
                </div>
              </div>
              <div className="list-card-actions">
                {a.patient?.phone && <a className="btn btn-outline btn-small" href={`tel:${a.patient.phone}`}>📞 Call</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            className="btn btn-outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}