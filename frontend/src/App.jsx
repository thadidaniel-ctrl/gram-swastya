import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientAuthProvider } from './contexts/PatientAuthContext';
import { DoctorAuthProvider } from './contexts/DoctorAuthContext';
import PatientLogin from './components/PatientAuth/PatientLogin';
import PatientSignup from './components/PatientAuth/PatientSignup';
import PatientDashboard from './components/PatientAuth/PatientDashboard';
import DoctorLogin from './components/DoctorAuth/DoctorLogin';
import DoctorDashboard from './components/DoctorAuth/DoctorDashboard';
import SymptomChecker from './components/SymptomChecker/SymptomChecker';
import VoiceAssistant from './components/VoiceAssistant/VoiceAssistant';
import AmbulanceBooking from './components/AmbulanceBooking/AmbulanceBooking';
import HealthRecords from './components/HealthRecords/HealthRecords';
import FileStorageHub from './components/MedicalFileStorage/FileStorageHub';
import Layout from './components/Common/Layout';
import ProtectedRoute from './components/Common/ProtectedRoute';
import './App.css';

function AppRoutes() {
  const { patient, doctor, isPatientLoading, isDoctorLoading } = useAuth();

  if (isPatientLoading || isDoctorLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={patient ? <Navigate to="/dashboard" replace /> : <PatientLogin />} />
      <Route path="/signup" element={patient ? <Navigate to="/dashboard" replace /> : <PatientSignup />} />
      <Route path="/doctor/login" element={doctor ? <Navigate to="/doctor/dashboard" replace /> : <DoctorLogin />} />
      
      <Route element={<ProtectedRoute userType="patient" user={patient}><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<PatientDashboard />} />
        <Route path="/symptom-checker" element={<SymptomChecker />} />
        <Route path="/voice-assistant" element={<VoiceAssistant />} />
        <Route path="/ambulance" element={<AmbulanceBooking />} />
        <Route path="/records" element={<HealthRecords />} />
        <Route path="/files" element={<FileStorageHub />} />
      </Route>

      <Route element={<ProtectedRoute userType="doctor" user={doctor}><Layout /></ProtectedRoute>}>
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <PatientAuthProvider>
      <DoctorAuthProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </DoctorAuthProvider>
    </PatientAuthProvider>
  );
}

export default App;