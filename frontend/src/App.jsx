import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientAuthProvider } from './contexts/PatientAuthContext';
import { DoctorAuthProvider } from './contexts/DoctorAuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { withErrorBoundary } from './components/Common/AsyncErrorBoundary';
import PatientLogin from './components/PatientAuth/PatientLogin';
import PatientSignup from './components/PatientAuth/PatientSignup';
import PatientDashboard from './components/PatientAuth/PatientDashboard';
import DoctorLogin from './components/DoctorAuth/DoctorLogin';
import DoctorDashboard from './components/DoctorAuth/DoctorDashboard';

const withFallback = component => withErrorBoundary(component);

const DoctorPatients = withFallback(lazy(() => import('./components/DoctorAuth/DoctorPatients')));
const DoctorAppointments = withFallback(lazy(() => import('./components/DoctorAuth/DoctorAppointments')));

const SymptomChecker = withFallback(lazy(() => import('./components/SymptomChecker/SymptomChecker')));
const VoiceAssistant = withFallback(lazy(() => import('./components/VoiceAssistant/VoiceAssistant')));
const AmbulanceBooking = withFallback(lazy(() => import('./components/AmbulanceBooking/AmbulanceBooking')));
const HealthRecords = withFallback(lazy(() => import('./components/HealthRecords/HealthRecords')));
const FileStorageHub = withFallback(lazy(() => import('./components/MedicalFileStorage/FileStorageHub')));
const Tablets = withFallback(lazy(() => import('./components/Tablets/Tablets')));
const HealthTracker = withFallback(lazy(() => import('./components/HealthTracker/HealthTracker')));
const Medicines = withFallback(lazy(() => import('./components/Medicines/Medicines')));
const Appointments = withFallback(lazy(() => import('./components/Appointments/Appointments')));
import Layout from './components/Common/Layout';
import ProtectedRoute from './components/Common/ProtectedRoute';
import NotFound from './components/Common/NotFound';

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="loading-screen" role="status" aria-label="Loading page">
      <div className="spinner" aria-hidden="true"></div>
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}

function AppRoutes() {
  const { patient, doctor, isPatientLoading, isDoctorLoading } = useAuth();

  if (isPatientLoading || isDoctorLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={patient ? <Navigate to="/dashboard" replace /> : <PatientLogin />} />
      <Route path="/signup" element={patient ? <Navigate to="/dashboard" replace /> : <PatientSignup />} />
      <Route path="/doctor/login" element={doctor ? <Navigate to="/doctor/dashboard" replace /> : <DoctorLogin />} />
      
      <Route element={<ProtectedRoute userType="patient" user={patient}><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<PatientDashboard />} />
        <Route path="/symptom-checker" element={
          <Suspense fallback={<LoadingScreen />}>
            <SymptomChecker />
          </Suspense>
        } />
        <Route path="/voice-assistant" element={
          <Suspense fallback={<LoadingScreen />}>
            <VoiceAssistant />
          </Suspense>
        } />
        <Route path="/ambulance" element={
          <Suspense fallback={<LoadingScreen />}>
            <AmbulanceBooking />
          </Suspense>
        } />
        <Route path="/records" element={
          <Suspense fallback={<LoadingScreen />}>
            <HealthRecords />
          </Suspense>
        } />
        <Route path="/files" element={
          <Suspense fallback={<LoadingScreen />}>
            <FileStorageHub />
          </Suspense>
        } />
        <Route path="/tablets" element={
          <Suspense fallback={<LoadingScreen />}>
            <Tablets />
          </Suspense>
        } />
        <Route path="/health-tracker" element={
          <Suspense fallback={<LoadingScreen />}>
            <HealthTracker />
          </Suspense>
        } />
        <Route path="/medicines" element={
          <Suspense fallback={<LoadingScreen />}>
            <Medicines />
          </Suspense>
        } />
        <Route path="/appointments" element={
          <Suspense fallback={<LoadingScreen />}>
            <Appointments />
          </Suspense>
        } />
      </Route>

      <Route element={<ProtectedRoute userType="doctor" user={doctor}><Layout /></ProtectedRoute>}>
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/patients" element={
          <Suspense fallback={<LoadingScreen />}>
            <DoctorPatients />
          </Suspense>
        } />
        <Route path="/doctor/appointments" element={
          <Suspense fallback={<LoadingScreen />}>
            <DoctorAppointments />
          </Suspense>
        } />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <PatientAuthProvider>
          <DoctorAuthProvider>
            <AuthProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </DoctorAuthProvider>
        </PatientAuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;