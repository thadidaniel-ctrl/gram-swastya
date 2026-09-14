import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children, userType, user }) {
  const location = useLocation();
  const auth = useAuth();

  const currentUser = userType === 'doctor' ? auth.doctor : auth.patient;
  const isLoading = userType === 'doctor' ? auth.isDoctorLoading : auth.isPatientLoading;

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to={userType === 'doctor' ? '/doctor/login' : '/login'} state={{ from: location }} replace />;
  }

  return children;
}