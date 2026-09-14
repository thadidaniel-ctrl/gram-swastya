import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/symptom-checker', label: 'Symptom Checker', icon: '🔍' },
  { path: '/voice-assistant', label: 'Voice Assistant', icon: '🎤' },
  { path: '/ambulance', label: 'Ambulance', icon: '🚑' },
  { path: '/records', label: 'Health Records', icon: '📋' },
];

const doctorNavItems = [
  { path: '/doctor/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/doctor/patients', label: 'Patients', icon: '👥' },
  { path: '/doctor/appointments', label: 'Appointments', icon: '📅' },
];

export default function Layout() {
  const { patient, doctor, logoutPatient, logoutDoctor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDoctor = !!doctor;

  const handleLogout = () => {
    if (isDoctor) {
      logoutDoctor();
      navigate('/doctor/login');
    } else {
      logoutPatient();
      navigate('/login');
    }
  };

  const currentNavItems = isDoctor ? doctorNavItems : navItems;
  const userName = isDoctor ? `Dr. ${doctor?.profile?.firstName} ${doctor?.profile?.lastName}` : patient?.name;

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <Link to={isDoctor ? '/doctor/dashboard' : '/dashboard'} className="logo">
            <span className="logo-icon">🏥</span>
            <span className="logo-text">Gram Swasthya</span>
          </Link>
        </div>
        <nav className="nav">
          {currentNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="header-right">
          <div className="user-menu">
            <span className="user-name">{userName}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
          </div>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}