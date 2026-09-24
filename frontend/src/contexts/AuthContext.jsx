import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [isPatientLoading, setIsPatientLoading] = useState(true);
  const [isDoctorLoading, setIsDoctorLoading] = useState(true);
  const { showToast } = useToast();

  const checkPatientAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const response = await api.getProfile();
        if (response.success) {
          setPatient(response.patient);
        } else {
          api.clearTokens();
        }
      }
    } catch (error) {
      showToast('Authentication check failed. Please log in again.', 'error');
      api.clearTokens();
    } finally {
      setIsPatientLoading(false);
    }
  }, [showToast]);

  const checkDoctorAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('doctorAccessToken');
      if (token) {
        const response = await api.getDoctorDashboard();
        if (response.success && response.doctor) {
          setDoctor(response.doctor);
        } else {
          // Invalid/expired token - clear session
          localStorage.removeItem('doctorAccessToken');
          localStorage.removeItem('doctorRefreshToken');
        }
      }
    } catch (error) {
      showToast('Doctor session expired. Please log in again.', 'error');
      // On any error (network, 401, 500), clear invalid session
      localStorage.removeItem('doctorAccessToken');
      localStorage.removeItem('doctorRefreshToken');
    } finally {
      setIsDoctorLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    api.loadTokens();
    checkPatientAuth();
    checkDoctorAuth();
  }, [checkPatientAuth, checkDoctorAuth]);

  const loginPatient = (patientData, accessToken, refreshToken) => {
    api.setTokens(accessToken, refreshToken);
    setPatient(patientData);
  };

  const logoutPatient = () => {
    api.clearTokens();
    setPatient(null);
  };

  const loginDoctor = (doctorData, accessToken, refreshToken) => {
    localStorage.setItem('doctorAccessToken', accessToken);
    localStorage.setItem('doctorRefreshToken', refreshToken);
    setDoctor(doctorData);
  };

  const logoutDoctor = () => {
    localStorage.removeItem('doctorAccessToken');
    localStorage.removeItem('doctorRefreshToken');
    setDoctor(null);
  };

  return (
    <AuthContext.Provider value={{
      patient,
      doctor,
      isPatientLoading,
      isDoctorLoading,
      loginPatient,
      logoutPatient,
      loginDoctor,
      logoutDoctor,
      setPatient,
      setDoctor,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}