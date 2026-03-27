import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleBasedRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'patient':
      return <Navigate to="/app/patient-dashboard" replace />;
    case 'doctor':
      return <Navigate to="/app/doctor-dashboard" replace />;
    case 'admin':
      return <Navigate to="/app/admin-dashboard" replace />;
    case 'receptionist':
      return <Navigate to="/app/receptionist-dashboard" replace />;
    default:
      return <Navigate to="/app/patient-dashboard" replace />;
  }
}
