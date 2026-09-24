import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children, userType }) {
  const { t } = useTranslation();
  const location = useLocation();
  const auth = useAuth();

  const currentUser = userType === 'doctor' ? auth.doctor : auth.patient;
  const isLoading = userType === 'doctor' ? auth.isDoctorLoading : auth.isPatientLoading;

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to={userType === 'doctor' ? '/doctor/login' : '/login'} state={{ from: location }} replace />;
  }

  return children;
}