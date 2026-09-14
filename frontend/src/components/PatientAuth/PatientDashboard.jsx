import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export default function PatientDashboard() {
  const { patient, logoutPatient } = useAuth();
  const [healthHistory, setHealthHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchHealthHistory();
  }, []);

  const fetchHealthHistory = async () => {
    try {
      const response = await api.getHealthHistory();
      if (response.success) {
        setHealthHistory(response.healthHistory);
      }
    } catch (error) {
      console.error('Failed to fetch health history:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Diagnoses', count: healthHistory?.diagnoses?.length || 0, icon: '🔍', color: '#2E7D32' },
    { label: 'Medicines', count: healthHistory?.medicines?.length || 0, icon: '💊', color: '#1976D2' },
    { label: 'Appointments', count: healthHistory?.appointments?.length || 0, icon: '📅', color: '#F57C00' },
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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {patient?.name?.split(' ')[0] || 'Patient'}</h1>
          <p>Your health dashboard overview</p>
        </div>
        <button onClick={logoutPatient} className="btn btn-outline">Logout</button>
      </div>

      <div className="stats-grid">
        {stats.map(stat => (
          <Link to={`/${stat.label.toLowerCase()}`} key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20` }}>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div className="stat-info">
              <span className="stat-count">{stat.count}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>🔍 Recent Diagnoses</h3>
            <Link to="/symptom-checker" className="btn-link">View All</Link>
          </div>
          {loading ? (
            <div className="loading-placeholder">Loading...</div>
          ) : recentDiagnoses.length === 0 ? (
            <div className="empty-state">
              <p>No diagnoses yet</p>
              <Link to="/symptom-checker" className="btn btn-primary btn-sm">Run Symptom Check</Link>
            </div>
          ) : (
            <ul className="item-list">
              {recentDiagnoses.map(d => (
                <li key={d.id || d._id} className="item">
                  <div className="item-main">
                    <span className="item-title">{d.conditions?.[0]?.conditionName || 'Diagnosis'}</span>
                    <span className={`badge badge-${d.riskLevel || 'low'}`}>{d.riskLevel || 'low'}</span>
                  </div>
                  <div className="item-meta">
                    {new Date(d.createdAt).toLocaleDateString()} • {d.recommendation || 'clinic'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>💊 Active Medicines</h3>
            <Link to="/medicines" className="btn-link">View All</Link>
          </div>
          {activeMedicines.length === 0 ? (
            <div className="empty-state">
              <p>No active medicines</p>
            </div>
          ) : (
            <ul className="item-list">
              {activeMedicines.map(m => (
                <li key={m.id || m._id} className="item">
                  <div className="item-main">
                    <span className="item-title">{m.name}</span>
                    <span className="item-dosage">{m.dosage} • {m.frequency}</span>
                  </div>
                  <div className="item-meta">
                    {m.remainingQuantity !== undefined ? `${m.remainingQuantity}/${m.totalQuantity} left` : ''}
                    {m.isLowStock && ' ⚠️ Low Stock'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>📅 Upcoming Appointments</h3>
            <Link to="/appointments" className="btn-link">View All</Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming appointments</p>
              <Link to="/appointments" className="btn btn-primary btn-sm">Book Appointment</Link>
            </div>
          ) : (
            <ul className="item-list">
              {upcomingAppointments.map(a => (
                <li key={a.id || a._id} className="item">
                  <div className="item-main">
                    <span className="item-title">{a.doctor?.profile?.fullName || 'Doctor'}</span>
                    <span className="item-type">{a.type}</span>
                  </div>
                  <div className="item-meta">
                    {new Date(a.scheduledAt).toLocaleString()} • {a.status}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions">
            <Link to="/symptom-checker" className="action-btn">
              <span className="action-icon">🔍</span>
              <span>Symptom Checker</span>
            </Link>
            <Link to="/voice-assistant" className="action-btn">
              <span className="action-icon">🎤</span>
              <span>Voice Assistant</span>
            </Link>
            <Link to="/ambulance" className="action-btn emergency">
              <span className="action-icon">🚑</span>
              <span>Call Ambulance</span>
            </Link>
            <Link to="/records" className="action-btn">
              <span className="action-icon">📋</span>
              <span>Health Records</span>
            </Link>
            <Link to="/files" className="action-btn">
              <span className="action-icon">📁</span>
              <span>Medical Files</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}