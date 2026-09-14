import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'diagnoses', label: 'Diagnoses', icon: '🔍' },
  { id: 'medicines', label: 'Medicines', icon: '💊' },
  { id: 'appointments', label: 'Appointments', icon: '📅' },
  { id: 'prescriptions', label: 'Prescriptions', icon: '📋' },
  { id: 'vaccinations', label: 'Vaccinations', icon: '💉' },
  { id: 'allergies', label: 'Allergies', icon: '⚠️' },
];

export default function HealthRecords() {
  const { patient } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await api.getHealthRecords(patient?.id);
      setHealthData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    if (!healthData) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="records-overview">
            <div className="patient-info">
              <h3>{patient?.name}</h3>
              <div className="info-grid">
                <div><strong>Age:</strong> {patient?.age}</div>
                <div><strong>Gender:</strong> {patient?.gender}</div>
                <div><strong>Blood Type:</strong> {patient?.bloodType || 'Not specified'}</div>
                <div><strong>Phone:</strong> {patient?.phone}</div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">🔍</span>
                <div><span className="stat-count">{healthData.diagnoses?.length || 0}</span><span className="stat-label">Diagnoses</span></div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">💊</span>
                <div><span className="stat-count">{healthData.medicines?.filter(m => m.isActive).length || 0}</span><span className="stat-label">Active Medicines</span></div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📅</span>
                <div><span className="stat-count">{healthData.appointments?.length || 0}</span><span className="stat-label">Appointments</span></div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📋</span>
                <div><span className="stat-count">{healthData.prescriptions?.length || 0}</span><span className="stat-label">Prescriptions</span></div>
              </div>
            </div>

            <div className="section">
              <h4>🚨 Allergies</h4>
              {patient?.allergies?.length ? (
                <div className="chip-list">
                  {patient.allergies.map(a => <span key={a} className="chip alert">{a}</span>)}
                </div>
              ) : <p className="empty">No known allergies</p>}
            </div>

            <div className="section">
              <h4>💊 Current Medications</h4>
              {patient?.currentMedications?.length ? (
                <ul>{patient.currentMedications.map(m => <li key={m}>{m}</li>)}</ul>
              ) : <p className="empty">No current medications</p>}
            </div>
          </div>
        );

      case 'diagnoses':
        return (
          <div className="records-list">
            {healthData.diagnoses?.length ? (
              healthData.diagnoses.map(d => (
                <div key={d.id || d._id} className="record-card">
                  <div className="record-header">
                    <span className={`badge badge-${d.risk_level}`}>{d.risk_level}</span>
                    <span className="date">{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4>{d.conditions?.[0]?.condition_name || 'Diagnosis'}</h4>
                  <p>{d.ai_explanation}</p>
                  <div className="record-meta">
                    <span>Recommendation: {d.recommendation}</span>
                    <span>Confidence: {Math.round((d.confidence_score || 0) * 100)}%</span>
                  </div>
                  {d.red_flags?.length && (
                    <div className="red-flags">
                      <strong>Red Flags:</strong> {d.red_flags.join(', ')}
                    </div>
                  )}
                </div>
              ))
            ) : <p className="empty">No diagnoses yet</p>}
          </div>
        );

      case 'medicines':
        return (
          <div className="records-list">
            {healthData.medicines?.length ? (
              healthData.medicines.map(m => (
                <div key={m.id || m._id} className="record-card medicine-card">
                  <div className="medicine-header">
                    <h4>{m.name}</h4>
                    <span className={`badge ${m.isLowStock ? 'warning' : m.isOutOfStock ? 'danger' : 'success'}`}>
                      {m.isOutOfStock ? 'Out of Stock' : m.isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                  <div className="medicine-details">
                    <span>{m.dosage} • {m.frequency}</span>
                    <span>{m.remainingQuantity !== undefined ? `${m.remainingQuantity}/${m.totalQuantity} left` : ''}</span>
                    <span>Adherence: {m.adherenceRate || 0}%</span>
                  </div>
                  {m.instructions && <p className="instructions">{m.instructions}</p>}
                </div>
              ))
            ) : <p className="empty">No medicines recorded</p>}
          </div>
        );

      case 'appointments':
        return (
          <div className="records-list">
            {healthData.appointments?.length ? (
              healthData.appointments.map(a => (
                <div key={a.id || a._id} className="record-card appointment-card">
                  <div className="appointment-header">
                    <span className={`status-${a.status}`}>{a.status}</span>
                    <span className="date">{new Date(a.scheduledAt).toLocaleString()}</span>
                  </div>
                  <h4>{a.doctor?.profile?.fullName || 'Doctor'}</h4>
                  <p>{a.doctor?.profile?.specialization}</p>
                  <div className="appointment-meta">
                    <span>{a.type}</span>
                    <span>{a.payment?.status || 'pending'}</span>
                  </div>
                </div>
              ))
            ) : <p className="empty">No appointments</p>}
          </div>
        );

      case 'prescriptions':
        return (
          <div className="records-list">
            {healthData.prescriptions?.length ? (
              healthData.prescriptions.map(p => (
                <div key={p.id || p._id} className="record-card">
                  <div className="prescription-header">
                    <span className="date">{new Date(p.createdAt).toLocaleDateString()}</span>
                    <span className="doctor">{p.doctor?.profile?.fullName || 'Doctor'}</span>
                  </div>
                  <ul>
                    {p.medications?.map((m, i) => (
                      <li key={i}>{m.name} {m.dosage} - {m.frequency} x {m.duration}</li>
                    ))}
                  </ul>
                  {p.instructions?.length && <p><strong>Instructions:</strong> {p.instructions.join(', ')}</p>}
                </div>
              ))
            ) : <p className="empty">No prescriptions</p>}
          </div>
        );

      case 'vaccinations':
        return (
          <div className="records-list">
            {healthData.vaccinations?.length ? (
              healthData.vaccinations.map(v => (
                <div key={v.id || v._id} className="record-card vaccination-card">
                  <h4>{v.vaccine_name}</h4>
                  <div className="vaccination-details">
                    <span>Dose {v.dose_number}</span>
                    <span>{new Date(v.administered_date).toLocaleDateString()}</span>
                    <span>{v.facility_name}</span>
                  </div>
                  {v.qr_code_data && (
                    <button className="btn btn-sm" onClick={() => showQR(v.qr_code_data)}>Show QR</button>
                  )}
                </div>
              ))
            ) : <p className="empty">No vaccination records</p>}
          </div>
        );

      case 'allergies':
        return (
          <div className="records-list">
            {patient?.allergies?.length ? (
              patient.allergies.map(a => (
                <div key={a} className="record-card alert">
                  <span className="allergen">{a}</span>
                  <button className="btn btn-sm btn-danger">Remove</button>
                </div>
              ))
            ) : <p className="empty">No allergies recorded</p>}
          </div>
        );

      default:
        return null;
    }
  };

  const showQR = (data) => {
    alert(`QR Code Data: ${data}`);
  };

  return (
    <div className="health-records">
      <div className="records-header">
        <h2>📋 Health Records</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchRecords}>🔄 Refresh</button>
          <button className="btn btn-primary">📥 Export PDF</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="records-content">
        {loading ? (
          <div className="loading">Loading health records...</div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
}