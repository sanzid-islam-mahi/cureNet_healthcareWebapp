import { Link, Outlet, useMatch } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const patientNav = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/profile', label: 'Profile' },
  { to: '/app/appointments', label: 'Appointments' },
  { to: '/app/doctors', label: 'Find doctors' },
];

const doctorNav = [
  { to: '/app/doctor-dashboard', label: 'Dashboard' },
  { to: '/app/doctor-profile', label: 'Profile' },
  { to: '/app/doctor-appointments', label: 'Appointments' },
  { to: '/app/patients', label: 'Patients' },
];

const adminNav = [
  { to: '/app/admin-dashboard', label: 'Dashboard' },
  { to: '/app/users', label: 'Users' },
  { to: '/app/admin-doctors', label: 'Doctors' },
  { to: '/app/admin-patients', label: 'Patients' },
  { to: '/app/admin-analytics', label: 'Analytics' },
  { to: '/app/admin-logs', label: 'Logs' },
];

export default function Layout() {
  const { user } = useAuth();

  const nav =
    user?.role === 'doctor'
      ? doctorNav
      : user?.role === 'admin'
        ? adminNav
        : patientNav;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex gap-6 text-sm font-medium">
          {nav.map((item) => {
            const isActive = !!useMatch({ path: item.to, end: true });
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`py-2 border-b-2 transition-colors ${isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-gray-300'
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
