import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import AppPageHeader from '../components/AppPageHeader';

const statCards = [
  { key: 'totalAppointments', label: 'Total Appointments', icon: CalendarDaysIcon },
  { key: 'todayAppointments', label: "Today's", icon: ClockIcon },
  { key: 'completedAppointments', label: 'Completed', icon: CheckCircleIcon },
  { key: 'pendingAppointments', label: 'Pending', icon: ClockIcon },
];

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function prettyStatus(status?: string): string {
  if (!status) return 'Unknown';
  return status.replace('_', ' ');
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const patientId = user?.patientId;

  const { data: statsData } = useQuery({
    queryKey: ['patients', patientId, 'dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: Record<string, number> & {
          queue?: { profileComplete?: boolean; pendingActions?: number; needsProfileCompletion?: boolean };
        };
      }>(`/patients/${patientId}/dashboard/stats`);
      return data.data;
    },
    enabled: !!patientId,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['patients', patientId, 'appointments'],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: {
          appointments: Array<{
            id: number;
            appointmentDate?: string;
            status?: string;
            type?: string;
            window?: string;
            serial?: number;
            doctor?: { user?: { firstName: string; lastName: string } };
          }>;
        };
      }>(`/patients/${patientId}/appointments?limit=8&sortBy=appointmentDate&sortOrder=DESC`);
      return data.data?.appointments ?? [];
    },
    enabled: !!patientId,
  });

  const stats = statsData ?? {};
  const queue = statsData?.queue ?? {};
  const appointments = useMemo(() => appointmentsData ?? [], [appointmentsData]);

  const nextActiveAppointment = useMemo(() => {
    return appointments.find((apt) => ['requested', 'approved', 'in_progress'].includes(apt.status || ''));
  }, [appointments]);

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Patient Dashboard"
        title={`${user?.firstName ?? 'Patient'} ${user?.lastName ?? ''}`.trim()}
        description="Review current care activity, profile readiness, and recent appointment history from one place."
        actions={
          <>
            <Link
              to="/app/patient-appointments"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Manage appointments
            </Link>
            <Link
              to="/app/patient-reminders"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open reminders
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  {stats[key as keyof typeof stats] ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {nextActiveAppointment ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Next Care Event</p>
          <p className="mt-1 text-lg font-semibold text-blue-900">
            {nextActiveAppointment.doctor?.user
              ? `Dr. ${nextActiveAppointment.doctor.user.firstName} ${nextActiveAppointment.doctor.user.lastName}`
              : 'Assigned doctor'}
          </p>
          <p className="text-sm text-blue-800">
            {formatDate(nextActiveAppointment.appointmentDate)} • {prettyStatus(nextActiveAppointment.status)}
          </p>
          <Link
            to="/app/patient-appointments"
            className="mt-3 inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            Open appointments
          </Link>
        </section>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold text-gray-900">Recent Appointments</h3>
          <Link to="/app/patient-appointments" className="text-sm text-indigo-600 hover:text-indigo-500">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {appointments.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-500">No appointments yet.</p>
          ) : (
            appointments.slice(0, 5).map((apt) => (
              <div key={apt.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {apt.doctor?.user
                      ? `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`
                      : 'Assigned doctor'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatDate(apt.appointmentDate)}
                    {apt.window ? ` • ${apt.window}` : ''}
                    {apt.serial != null ? ` (Serial ${apt.serial})` : ''}
                    {apt.type ? ` • ${apt.type.replace('_', ' ')}` : ''}
                  </p>
                </div>
                <span className="text-sm capitalize text-gray-500">{prettyStatus(apt.status)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {queue.needsProfileCompletion ? 'Complete Your Profile Before First Booking' : 'Care Action Queue'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {queue.needsProfileCompletion
                ? 'Add required health and emergency details to safely start booking appointments.'
                : `${queue.pendingActions ?? 0} pending action${(queue.pendingActions ?? 0) === 1 ? '' : 's'} in your care workflow.`}
            </p>
          </div>
          <div className="flex gap-2">
            {queue.needsProfileCompletion ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Safety profile required
              </div>
            ) : null}
            {queue.needsProfileCompletion ? (
              <Link
                to="/app/patient-profile"
                className="whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Complete profile
              </Link>
            ) : null}
            <Link
              to="/app/patient-appointments"
              className="whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage appointments
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
