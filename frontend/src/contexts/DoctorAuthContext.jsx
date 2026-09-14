import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api';

const DoctorAuthContext = createContext(null);

export function DoctorAuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendOTP = useCallback(async ({ phone, email, purpose = 'login' }) => {
    setIsLoading(true);
    setError(null);
    try {
      return await api.sendDoctorOTP(phone, email, purpose);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async ({ tempToken, otp }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.verifyDoctorOTP(tempToken, otp);
      if (response.success) {
        localStorage.setItem('doctorAccessToken', response.accessToken);
        localStorage.setItem('doctorRefreshToken', response.refreshToken);
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <DoctorAuthContext.Provider value={{
      isLoading,
      error,
      sendOTP,
      verifyOTP,
      clearError,
    }}>
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth() {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error('useDoctorAuth must be used within DoctorAuthProvider');
  }
  return context;
}