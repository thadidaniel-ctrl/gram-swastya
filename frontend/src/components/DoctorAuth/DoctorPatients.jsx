import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonList } from '../../components/Common/SkeletonLoader';
import { EmptyState } from '../../components/Common/EmptyState';

export default function DoctorPatients() {
  const { showToast } = useToast();
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDoctorPatients({ page, search });
      if (res.success) {
        setPatients(res.patients || []);
        setPagination(res.pagination);
      }
    } catch (error) {
      showToast(`Failed to load patients: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="dashboard doctor-patients">
      <div className="dashboard-header">
        <div>
          <h1>My Patients</h1>
          <p>{pagination ? `${pagination.total} total patient(s)` : 'Manage your patients'}</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search patients"
        />
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : patients.length === 0 ? (
        <EmptyState title="No patients found" message="Try a different search or check back later." />
      ) : (
        <div className="list-cards">
          {patients.map(p => (
            <div className="list-card" key={p._id}>
              <div className="list-card-avatar" aria-hidden="true">
                {p.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div className="list-card-body">
                <div className="list-card-title">
                  {p.name}
                  {!p.isActive && <span className="badge badge-alert">Inactive</span>}
                </div>
                <div className="list-card-subtitle">
                  {p.phone || 'No phone'} • {p.age ? `${p.age} yrs` : '-'} {p.gender ? `• ${p.gender}` : ''} {p.bloodType ? `• ${p.bloodType}` : ''}
                </div>
                <div className="list-card-meta">
                  <span>{p.totalAppointments ?? 0} total • {p.upcomingAppointments ?? 0} upcoming</span>
                  <span>Last visit: {formatDate(p.lastAppointment)}</span>
                </div>
              </div>
              <div className="list-card-actions">
                {p.phone && <a className="btn btn-outline btn-small" href={`tel:${p.phone}`}>📞 Call</a>}
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