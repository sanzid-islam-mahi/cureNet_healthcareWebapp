import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProfileLayout from './components/ProfileLayout';
import RoleBasedRedirect from './components/RoleBasedRedirect';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminLogs = lazy(() => import('./pages/AdminLogs'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PatientProfile = lazy(() => import('./pages/PatientProfile'));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'));
const PatientAppointments = lazy(() => import('./pages/PatientAppointments'));
const PatientPrescriptionHistory = lazy(() => import('./pages/PatientPrescriptionHistory'));
const PatientReminders = lazy(() => import('./pages/PatientReminders'));
const DoctorAppointments = lazy(() => import('./pages/DoctorAppointments'));
const DoctorMyPatients = lazy(() => import('./pages/DoctorMyPatients'));
const DoctorContinuity = lazy(() => import('./pages/DoctorContinuity'));
const Doctors = lazy(() => import('./pages/Doctors'));
const PatientDoctorProfile = lazy(() => import('./pages/PatientDoctorProfile'));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-gray-50 text-sm text-gray-500">
      Loading page...
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <main className="min-h-screen flex flex-col">
            <div className="flex-1">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/doctors" element={<Doctors />} />
                  <Route path="/doctors/:id" element={<PatientDoctorProfile />} />
                  <Route
                    path="/app"
                    element={
                      <ProtectedRoute>
                        <ProfileLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<RoleBasedRedirect />} />
                    <Route path="patient-dashboard" element={<PatientDashboard />} />
                    <Route path="doctor-dashboard" element={<DoctorDashboard />} />
                    <Route path="admin-dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                    <Route path="patient-profile" element={<ProtectedRoute requiredRole="patient"><PatientProfile /></ProtectedRoute>} />
                    <Route path="doctor-profile" element={<ProtectedRoute requiredRole="doctor"><DoctorProfile /></ProtectedRoute>} />
                    <Route path="patient-appointments" element={<ProtectedRoute requiredRole="patient"><PatientAppointments /></ProtectedRoute>} />
                    <Route path="patient-prescriptions" element={<ProtectedRoute requiredRole="patient"><PatientPrescriptionHistory /></ProtectedRoute>} />
                    <Route path="patient-reminders" element={<ProtectedRoute requiredRole="patient"><PatientReminders /></ProtectedRoute>} />
                    <Route path="doctor-appointments" element={<ProtectedRoute requiredRole="doctor"><DoctorAppointments /></ProtectedRoute>} />
                    <Route path="doctors" element={<Doctors />} />
                    <Route path="doctor-my-patients" element={<ProtectedRoute requiredRole="doctor"><DoctorMyPatients /></ProtectedRoute>} />
                    <Route path="doctor-continuity" element={<ProtectedRoute requiredRole="doctor"><DoctorContinuity /></ProtectedRoute>} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
                    <Route path="admin-analytics" element={<ProtectedRoute requiredRole="admin"><AdminAnalytics /></ProtectedRoute>} />
                    <Route path="admin-logs" element={<ProtectedRoute requiredRole="admin"><AdminLogs /></ProtectedRoute>} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </div>
            <Footer />
          </main>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
