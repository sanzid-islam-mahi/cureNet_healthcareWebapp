import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserGroupIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentChartBarIcon,
  PlusIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api } from '../context/AuthContext';
import toast from 'react-hot-toast';
import AppPageHeader from '../components/AppPageHeader';

interface Stats {
  totalDoctors?: number;
  totalPatients?: number;
  totalAppointments?: number;
  totalUsers?: number;
  totalClinics?: number;
  pendingDoctorCount?: number;
  todayAppointments?: number;
  completedToday?: number;
  pendingToday?: number;
  reportsGenerated?: number;
  queue?: {
    pendingDoctorVerifications?: number;
    pendingAppointmentApprovals?: number;
    todaysOperationalLoad?: number;
  };
}

interface DoctorRow {
  id: number;
  userId: number;
  bmdcRegistrationNumber?: string;
  department?: string;
  experience?: number;
  verified: boolean;
  clinicId?: number | null;
  clinic?: { id: number; name: string; status: 'active' | 'inactive' } | null;
  user?: { id: number; firstName: string; lastName: string; email: string };
}

interface ClinicOption {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

interface PatientRow {
  id: number;
  patientId: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

interface AppointmentRow {
  id: number;
  appointmentDate: string;
  timeBlock: string;
  type: string;
  status: string;
  patient?: { id: number; name: string; email: string };
  doctor?: { id: number; name: string };
}

interface LogRow {
  id: number;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ip?: string;
  createdAt: string;
  user?: { id: number; email: string; name: string };
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [appointmentTab, setAppointmentTab] = useState<'completed' | 'pending'>('completed');
  const [approvalTarget, setApprovalTarget] = useState<DoctorRow | null>(null);
  const [approvalClinicId, setApprovalClinicId] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { stats: Stats } }>('/admin/stats');
      return data.data?.stats ?? {};
    },
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['admin', 'doctor-verifications', doctorSearch],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { doctors: DoctorRow[] } }>(
        '/admin/doctor-verifications',
        { params: { search: doctorSearch || undefined, limit: 50 } }
      );
      return data.data?.doctors ?? [];
    },
  });

  const { data: clinicsData = [] } = useQuery({
    queryKey: ['admin', 'clinics', 'approval-options'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { clinics: ClinicOption[] } }>('/admin/clinics');
      return data.data?.clinics ?? [];
    },
  });

  const { data: patientsData } = useQuery({
    queryKey: ['admin', 'patients', patientSearch],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { patients: PatientRow[] } }>(
        '/admin/patients',
        { params: { search: patientSearch || undefined, limit: 12 } }
      );
      return data.data?.patients ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: appointmentsData } = useQuery({
    queryKey: ['admin', 'appointments', today],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { appointments: AppointmentRow[] } }>(
        '/admin/appointments',
        { params: { date: today } }
      );
      return data.data?.appointments ?? [];
    },
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { logs: LogRow[] } }>('/admin/logs', {
        params: { limit: 15 },
      });
      return data.data?.logs ?? [];
    },
  });

  const verifyDoctor = useMutation({
    mutationFn: ({ id, clinicId }: { id: number; clinicId: number }) => api.put(`/admin/doctors/${id}/verify`, { clinicId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctor-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setApprovalTarget(null);
      setApprovalClinicId('');
      toast.success('Doctor verified');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Failed to verify');
    },
  });

  const unverifyDoctor = useMutation({
    mutationFn: (id: number) => api.put(`/admin/doctors/${id}/unverify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctor-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('Doctor unverified');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Failed to unverify');
    },
  });

  const stats = (statsData ?? {}) as Stats;
  const doctors = (doctorsData ?? []) as DoctorRow[];
  const clinics = (clinicsData ?? []) as ClinicOption[];
  const patients = (patientsData ?? []) as PatientRow[];
  const appointments = (appointmentsData ?? []) as AppointmentRow[];
  const logs = (logsData ?? []) as LogRow[];

  const completedToday = appointments.filter((a) => a.status === 'completed');
  const pendingToday = appointments.filter((a) =>
    ['requested', 'approved', 'in_progress'].includes(a.status)
  );
  const completionRate =
    completedToday.length + pendingToday.length > 0
      ? Math.round((completedToday.length / (completedToday.length + pendingToday.length)) * 100)
      : 0;

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      user_login: 'User Login',
      user_created: 'User Created',
      user_updated: 'User Updated',
      doctor_verified: 'Doctor Verified',
      doctor_unverified: 'Doctor Unverified',
      appointment_created: 'Appointment Created',
      appointment_status_updated: 'Appointment Status Updated',
    };
    return map[action] || action;
  };

  const logCategory = (action: string) => {
    if (action.includes('login')) return 'authentication';
    if (action.includes('user') && !action.includes('appointment')) return 'user-management';
    if (action.includes('doctor')) return 'user-management';
    if (action.includes('appointment')) return 'appointment';
    return 'system';
  };

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Admin Dashboard"
        title="System Operations"
        description="Oversee user governance, verification load, today's operational activity, and recent audit events."
        actions={
          <>
            <Link
              to="/app/users?add=1"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <PlusIcon className="h-5 w-5" />
              Add user
            </Link>
            <Link
              to="/app/admin-clinics"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              Clinics
            </Link>
            <Link
              to="/app/admin-analytics"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ChartBarIcon className="h-5 w-5" />
              Analytics
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Doctors"
          value={stats.totalDoctors ?? 0}
          sub={`${stats.pendingDoctorCount ?? 0} pending verification`}
          icon={UserCircleIcon}
        />
        <StatCard
          label="Total Patients"
          value={stats.totalPatients ?? 0}
          sub="Active users"
          icon={UserGroupIcon}
        />
        <StatCard
          label="Today's Appointments"
          value={stats.todayAppointments ?? 0}
          sub={`${stats.pendingToday ?? 0} in progress`}
          icon={CalendarDaysIcon}
        />
        <StatCard
          label="Completed Today"
          value={stats.completedToday ?? 0}
          sub={`${completionRate}% completion rate`}
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Pending Appointments"
          value={stats.pendingToday ?? 0}
          sub="scheduled for today"
          icon={ClockIcon}
        />
        <StatCard
          label="Clinics"
          value={stats.totalClinics ?? 0}
          sub="managed facilities"
          icon={DocumentChartBarIcon}
        />
      </div>

      {stats.queue && (
        <div className="grid gap-3 sm:grid-cols-3">
          <QueueCard
            title="Pending Doctor Verifications"
            value={stats.queue.pendingDoctorVerifications ?? 0}
            actionLabel="Review doctors"
            actionTo="/app/users?role=doctor&verified=false"
          />
          <QueueCard
            title="Pending Appointment Approvals"
            value={stats.queue.pendingAppointmentApprovals ?? 0}
            actionLabel="Open appointments"
            actionTo="/app/admin-analytics"
          />
          <QueueCard
            title="Today's Operational Load"
            value={stats.queue.todaysOperationalLoad ?? 0}
            actionLabel="View dashboard"
            actionTo="/app/admin-dashboard"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/app/users?role=doctor&verified=false"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <CheckIcon className="h-5 w-5" />
          Verify Doctors
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <DocumentChartBarIcon className="h-5 w-5" />
          Generate Report
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Cog6ToothIcon className="h-5 w-5" />
          Hospital Settings
        </button>
        <Link
          to="/app/admin-analytics"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ChartBarIcon className="h-5 w-5" />
          System Analytics
        </Link>
      </div>

      {/* Doctor management */}
      <section className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-900">Doctor management</h2>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search doctors..."
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-sm w-56 focus:ring-2 focus:ring-[#3990D7] focus:border-[#3990D7]"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {doctors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No doctors found.
                  </td>
                </tr>
              ) : (
                doctors.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          Dr. {d.user?.firstName} {d.user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{d.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">DR-{d.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.department ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.bmdcRegistrationNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.experience ?? '—'} yrs</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          d.verified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {d.verified ? (
                          <button
                            type="button"
                            onClick={() => unverifyDoctor.mutate(d.id)}
                            disabled={unverifyDoctor.isPending}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                            title="Unverify"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalTarget(d);
                              setApprovalClinicId(d.clinicId ? String(d.clinicId) : '');
                            }}
                            disabled={verifyDoctor.isPending}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Approve doctor"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                        <Link to={`/app/users?role=doctor&search=${encodeURIComponent(d.user?.email || '')}`} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                          <PencilSquareIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {approvalTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Approve doctor and assign clinic</h3>
            <p className="mt-1 text-sm text-slate-500">
              Verified doctors must be attached to an active clinic before they become operationally bookable.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">
                Dr. {approvalTarget.user?.firstName} {approvalTarget.user?.lastName}
              </p>
              <p className="mt-1 text-slate-600">{approvalTarget.department || 'Department not set'}</p>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Clinic assignment</label>
              <select
                value={approvalClinicId}
                onChange={(e) => setApprovalClinicId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">Select active clinic</option>
                {clinics.filter((clinic) => clinic.status === 'active').map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setApprovalTarget(null);
                  setApprovalClinicId('');
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!approvalClinicId || verifyDoctor.isPending}
                onClick={() => verifyDoctor.mutate({ id: approvalTarget.id, clinicId: Number(approvalClinicId) })}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Approve doctor
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Patient overview */}
      <section className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-900">Patient overview</h2>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-sm w-56 focus:ring-2 focus:ring-[#3990D7] focus:border-[#3990D7]"
            />
          </div>
        </div>
        <div className="p-4">
          {patients.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No patients found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {patients.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-gray-200 p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold shrink-0">
                      {(p.firstName?.[0] || '') + (p.lastName?.[0] || '')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-sm text-gray-500">PT-{p.patientId}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Link
                    to={`/app/users?role=patient&search=${encodeURIComponent(p.email || '')}`}
                    className="shrink-0 text-sm text-[#3990D7] hover:underline"
                  >
                    Open in Users
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Appointments */}
      <section className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 flex">
          <button
            type="button"
            onClick={() => setAppointmentTab('completed')}
            className={`px-4 py-3 text-sm font-medium ${
              appointmentTab === 'completed'
                ? 'border-b-2 border-[#3990D7] text-[#3990D7]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed Today
          </button>
          <button
            type="button"
            onClick={() => setAppointmentTab('pending')}
            className={`px-4 py-3 text-sm font-medium ${
              appointmentTab === 'pending'
                ? 'border-b-2 border-[#3990D7] text-[#3990D7]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending
          </button>
        </div>
        <div className="p-4 max-h-64 overflow-auto">
          {(appointmentTab === 'completed' ? completedToday : pendingToday).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No appointments.</p>
          ) : (
            <ul className="space-y-2">
              {(appointmentTab === 'completed' ? completedToday : pendingToday).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">{a.patient?.name ?? '—'}</p>
                    <p className="text-sm text-gray-500">Appointment #{a.id} · {a.doctor?.name ?? '—'}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{a.timeBlock}</p>
                    <p>{a.type}</p>
                    {a.status === 'completed' && (
                      <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Report Uploaded
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* System audit logs */}
      <section className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">System audit logs</h2>
          <Link to="/app/admin-logs" className="text-sm text-[#3990D7] hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User / Entity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{actionLabel(log.action)}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{log.user?.email ?? log.entityId ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">{log.details ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {logCategory(log.action)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function QueueCard({ title, value, actionLabel, actionTo }: { title: string; value: number; actionLabel: string; actionTo: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      <Link to={actionTo} className="mt-2 inline-block text-sm font-medium text-slate-700 hover:text-slate-950">
        {actionLabel}
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}
