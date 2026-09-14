import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api';

const PatientAuthContext = createContext(null);

export function PatientAuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendOTP = useCallback(async ({ phone, email, purpose = 'login', language = 'en' }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.sendOTP(phone, email, purpose, language);
      return response;
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
      const response = await api.verifyOTP(tempToken, otp);
      if (response.success) {
        api.setTokens(response.accessToken, response.refreshToken);
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.registerPatient(data);
      if (response.success) {
        api.setTokens(response.accessToken, response.refreshToken);
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
    <PatientAuthContext.Provider value={{
      isLoading,
      error,
      sendOTP,
      verifyOTP,
      register,
      clearError,
    }}>
      {children}
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth() {
  const context = useContext(PatientAuthContext);
  if (!context) {
    throw new Error('usePatientAuth must be used within PatientAuthProvider');
  }
  return context;
}