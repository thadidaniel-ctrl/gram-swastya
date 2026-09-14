import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [isPatientLoading, setIsPatientLoading] = useState(true);
  const [isDoctorLoading, setIsDoctorLoading] = useState(true);

  useEffect(() => {
    api.loadTokens();
    checkPatientAuth();
    checkDoctorAuth();
  }, []);

  const checkPatientAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const response = await api.getProfile();
        if (response.success) {
          setPatient(response.patient);
        }
      }
    } catch (error) {
      console.error('Patient auth check failed:', error);
      api.clearTokens();
    } finally {
      setIsPatientLoading(false);
    }
  }, []);

  const checkDoctorAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('doctorAccessToken');
      if (token) {
        const response = await api.getDoctorDashboard();
        if (response.success) {
          setDoctor(response.doctor);
        }
      }
    } catch (error) {
      console.error('Doctor auth check failed:', error);
    } finally {
      setIsDoctorLoading(false);
    }
  }, []);

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