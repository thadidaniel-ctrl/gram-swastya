import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export default function DoctorDashboard() {
  const { doctor, logoutDoctor } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <button onClick={logoutDoctor} className="btn btn-outline">Logout</button>
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
            <h3>📅 Today's Appointments</h3>
            <Link to="/doctor/appointments" className="btn-link">View All</Link>
          </div>
          {loading ? (
            <div className="loading-placeholder">Loading...</div>
          ) : todayAppointments.length === 0 ? (
            <div className="empty-state">
              <p>No appointments scheduled for today</p>
            </div>
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
            <h3>👥 Recent Patients</h3>
            <Link to="/doctor/patients" className="btn-link">View All</Link>
          </div>
          {patients.length === 0 ? (
            <div className="empty-state"><p>No patients yet</p></div>
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
            <h3>⚡ Quick Actions</h3>
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
      </div>
    </div>
  );
}