import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

const navItems = [
  { path: '/dashboard', labelKey: 'dashboard', icon: '🏠' },
  { path: '/symptom-checker', labelKey: 'symptomChecker', icon: '🔍' },
  { path: '/voice-assistant', labelKey: 'voiceAssistant', icon: '🎤' },
  { path: '/ambulance', labelKey: 'ambulance', icon: '🚑' },
  { path: '/records', labelKey: 'records', icon: '📋' },
  { path: '/health-tracker', labelKey: 'healthTracker', icon: '📊' },
  { path: '/appointments', labelKey: 'appointments', icon: '📅' },
  { path: '/files', labelKey: 'files', icon: '🗂️' },
  { path: '/tablets', labelKey: 'tablets', icon: '💊' },
  { path: '/medicines', labelKey: 'medicines', icon: '💊' },
];

const doctorNavItems = [
  { path: '/doctor/dashboard', labelKey: 'dashboard', icon: '🏠' },
  { path: '/doctor/patients', labelKey: 'patients', icon: '👥' },
  { path: '/doctor/appointments', labelKey: 'appointments', icon: '📅' },
];

export default function Layout() {
  const { t } = useTranslation();
  const { patient, doctor, logoutPatient, logoutDoctor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDoctor = !!doctor;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const userName = isDoctor
    ? `${doctor?.profile?.firstName || t('nav.doctorLabel')}${
        doctor?.profile?.lastName ? ` ${doctor.profile.lastName}` : ''
      }`
    : patient?.name || t('nav.patientDashboard');

  return (
    <div className="layout min-h-screen flex flex-col">
      {/* Skip Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        {t('nav.skipToContent')}
      </a>

      <header className="header bg-white border-b border-light sticky top-0 z-sticky shadow-sm">
        <div className="container flex items-center justify-between h-[var(--header-height)]">
          <div className="header-left flex items-center gap-4">
            <Link
              to={isDoctor ? '/doctor/dashboard' : '/dashboard'}
              className="logo flex items-center gap-2 text-brand-800 font-bold text-xl text-decoration-none"
              aria-label={isDoctor ? t('nav.doctorDashboard') : t('nav.patientDashboard')}
            >
              <span className="logo-icon text-2xl" aria-hidden="true">🏥</span>
              <span className="logo-text hidden sm:block">Gram Swasthya</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="nav hidden md:flex items-center gap-1" role="navigation" aria-label={t('nav.mainNavigation')}>
            {currentNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
                  location.pathname === item.path
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-secondary hover:bg-brand-50 hover:text-brand-800'
                }`}
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{t(`nav.${item.labelKey}`)}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden btn-icon p-2 rounded-md text-secondary hover:bg-neutral-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <div className="header-right flex items-center gap-4">
            <LanguageSwitcher />
            <div className="user-menu flex items-center gap-3">
              <span className="user-name font-medium text-sm hidden sm:block">{userName}</span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
              >
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-light bg-white shadow-lg animate-slideDown"
            role="navigation"
            aria-label={t('nav.mobileNavigation')}
          >
            <nav className="p-4 space-y-1">
              {currentNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium ${
                    location.pathname === item.path
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-secondary'
                  }`}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{t(`nav.${item.labelKey}`)}</span>
                </Link>
              ))}
              <div className="pt-2 border-t border-light">
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg font-medium text-secondary hover:bg-neutral-100"
                >
                  <span aria-hidden="true">🚪</span>
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main
        id="main-content"
        className="main-content flex-1"
        role="main"
        tabIndex={-1}
      >
        <div className="container py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}