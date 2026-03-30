import {
  BuildingOffice2Icon,
  BellAlertIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PhotoIcon,
  HomeIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Role = 'patient' | 'doctor' | 'admin' | 'receptionist';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const shellByRole: Record<Role, NavGroup[]> = {
  patient: [
    {
      label: 'Overview',
      items: [
        { to: '/app/patient-dashboard', label: 'Dashboard', icon: HomeIcon, description: 'Care summary and next steps' },
        { to: '/app/patient-appointments', label: 'Appointments', icon: CalendarDaysIcon, description: 'Bookings and visit status' },
      ],
    },
    {
      label: 'Records',
      items: [
        { to: '/app/patient-medical-history', label: 'Medical History', icon: ClipboardDocumentListIcon, description: 'Longitudinal clinical record' },
        { to: '/app/patient-imaging', label: 'Imaging', icon: PhotoIcon, description: 'Uploaded scans and study files' },
        { to: '/app/patient-prescriptions', label: 'Prescriptions', icon: DocumentTextIcon, description: 'Clinical medication records' },
        { to: '/app/patient-reminders', label: 'Reminders', icon: BellAlertIcon, description: 'Daily medicine tracking' },
        { to: '/app/patient-profile', label: 'Profile', icon: UserCircleIcon, description: 'Personal and medical details' },
      ],
    },
  ],
  doctor: [
    {
      label: 'Practice',
      items: [
        { to: '/app/doctor-dashboard', label: 'Dashboard', icon: HomeIcon, description: 'Daily practice overview' },
        { to: '/app/doctor-appointments', label: 'Appointments', icon: CalendarDaysIcon, description: 'Triage and consultations' },
        { to: '/app/doctor-my-patients', label: 'Patients', icon: UserGroupIcon, description: 'Roster and continuity' },
      ],
    },
    {
      label: 'Settings',
      items: [
        { to: '/app/doctor-profile', label: 'Profile', icon: UserCircleIcon, description: 'Credentials and availability' },
      ],
    },
  ],
  admin: [
    {
      label: 'Operations',
      items: [
        { to: '/app/admin-dashboard', label: 'Dashboard', icon: HomeIcon, description: 'System control center' },
        { to: '/app/users', label: 'Users', icon: UserGroupIcon, description: 'Access and verification' },
        { to: '/app/admin-clinics', label: 'Clinics', icon: BuildingOffice2Icon, description: 'Facilities and doctor rosters' },
      ],
    },
    {
      label: 'Monitoring',
      items: [
        { to: '/app/admin-analytics', label: 'Analytics', icon: ChartBarIcon, description: 'Platform metrics and usage' },
        { to: '/app/admin-logs', label: 'Logs', icon: ClipboardDocumentListIcon, description: 'Audit and system activity' },
      ],
    },
  ],
  receptionist: [
    {
      label: 'Clinic Desk',
      items: [
        { to: '/app/receptionist-dashboard', label: 'Dashboard', icon: HomeIcon, description: 'Clinic front-desk overview' },
        { to: '/app/receptionist-appointments', label: 'Appointments', icon: CalendarDaysIcon, description: 'Clinic request queue and approvals' },
        { to: '/app/receptionist-doctors', label: 'Doctors', icon: UserGroupIcon, description: 'Doctor roster and clinic operations' },
      ],
    },
  ],
};

function roleLabel(role?: string) {
  if (role === 'doctor') return 'Doctor Workspace';
  if (role === 'receptionist') return 'Receptionist Workspace';
  if (role === 'admin') return 'Admin Workspace';
  return 'Patient Workspace';
}

function flattenGroups(groups: NavGroup[]) {
  return groups.flatMap((group) => group.items);
}

export default function AppShell() {
  const { user } = useAuth();
  const location = useLocation();

  const role = (user?.role || 'patient') as Role;
  const groups = shellByRole[role];
  const flatItems = flattenGroups(groups);
  const activeItem = flatItems.find((item) => location.pathname === item.to) || flatItems[0];

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1600px] gap-5 px-3 py-6 sm:px-4 lg:px-6">
        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky top-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 px-5 py-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">{roleLabel(user?.role)}</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="mt-2 text-sm text-slate-300">{activeItem?.description}</p>
            </div>

            <div className="space-y-6 px-4 py-5">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {group.label}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-2xl px-3 py-3 transition-all ${
                              isActive
                                ? 'bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`
                          }
                        >
                          <span className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{item.label}</span>
                            <span className="block truncate text-xs text-slate-400">{item.description}</span>
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{roleLabel(user?.role)}</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{activeItem?.label || 'Workspace'}</h1>
                </div>

                <div className="flex gap-2 overflow-x-auto xl:hidden">
                  {flatItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-sky-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-6">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
