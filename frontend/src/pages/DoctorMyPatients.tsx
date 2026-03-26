import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { api, useAuth } from '../context/AuthContext';
import PatientContextModal from './doctorAppointments/PatientContextModal';
import PrescriptionView from '../components/PrescriptionView';
import type { DoctorPatientRow } from './doctorAppointments/types';
import { formatDate } from './doctorAppointments/utils';

interface DoctorPatientsResponse {
  patients: DoctorPatientRow[];
  total: number;
  page: number;
  limit: number;
}

function patientInitials(patient: DoctorPatientRow) {
  return `${patient.user.firstName?.[0] || ''}${patient.user.lastName?.[0] || ''}`.toUpperCase() || 'PT';
}

export default function DoctorMyPatients() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-my-patients', doctorId, search, page],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: '12',
      };
      if (search.trim()) params.search = search.trim();
      const { data: res } = await api.get<{ success: boolean; data: DoctorPatientsResponse }>(
        `/doctors/${doctorId}/patients`,
        { params }
      );
      return res.data;
    },
    enabled: !!doctorId,
  });

  const { data: continuityRecords = [] } = useQuery({
    queryKey: ['doctor-continuity-embedded', doctorId],
    queryFn: async () => {
      const { data: res } = await api.get<{
        success: boolean;
        data: {
          prescriptions: Array<{
            id: number;
            appointmentId: number;
            diagnosis?: string;
            medicines?: Array<{ name?: string }>;
            appointment?: {
              appointmentDate?: string;
              patient?: { id?: number; firstName?: string; lastName?: string } | null;
            } | null;
          }>;
        };
      }>('/prescriptions/history/doctor');
      return res.data?.prescriptions ?? [];
    },
    enabled: !!doctorId,
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 12;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const stats = useMemo(() => {
    const upcoming = patients.filter((p) => Boolean(p.nextVisitDate)).length;
    const allergyAlerts = patients.filter((p) => Boolean(p.profile?.allergies)).length;
    const avgVisits = patients.length
      ? (patients.reduce((sum, patient) => sum + patient.totalVisits, 0) / patients.length).toFixed(1)
      : '0.0';

    return {
      loaded: patients.length,
      upcoming,
      allergyAlerts,
      avgVisits,
    };
  }, [patients]);

  const continuityStats = useMemo(() => ({
    prescriptions: continuityRecords.length,
    diagnosedPatients: new Set(
      continuityRecords
        .map((record) => record.appointment?.patient?.id)
        .filter((value): value is number => typeof value === 'number')
    ).size,
    medicinesLogged: continuityRecords.reduce((sum, record) => sum + (record.medicines?.length ?? 0), 0),
  }), [continuityRecords]);

  const recentContinuity = useMemo(() => continuityRecords.slice(0, 6), [continuityRecords]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Patients</h2>
            <p className="text-sm text-slate-600">
              Review continuity-of-care details, recent visit history, and patient safety information.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="relative block">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by patient name, email, or phone"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-blue-700">
              <UserGroupIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Loaded Patients</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-900">{stats.loaded}</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CalendarDaysIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Upcoming Follow-ups</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.upcoming}</p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-700">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Allergy Alerts</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-900">{stats.allergyAlerts}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-slate-700">
              <ClockIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Avg Visits</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.avgVisits}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Prescription Continuity</h3>
            <p className="text-sm text-slate-500">Recent prescription-led activity is embedded here, so this remains the single doctor patient workspace.</p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Records</p>
              <p className="mt-1 font-semibold text-slate-900">{continuityStats.prescriptions}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patients</p>
              <p className="mt-1 font-semibold text-slate-900">{continuityStats.diagnosedPatients}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medicines</p>
              <p className="mt-1 font-semibold text-slate-900">{continuityStats.medicinesLogged}</p>
            </div>
          </div>
        </header>

        {recentContinuity.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">No prescription continuity records available yet.</div>
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {recentContinuity.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => setSelectedAppointmentId(record.appointmentId)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">
                        <DocumentTextIcon className="h-4 w-4 text-slate-600" />
                      </span>
                      <p className="text-sm font-semibold text-slate-900">
                        {record.diagnosis || 'Prescription record'}
                      </p>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {record.appointment?.patient
                        ? `${record.appointment.patient.firstName || ''} ${record.appointment.patient.lastName || ''}`.trim()
                        : 'Patient'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(record.appointment?.appointmentDate)}</p>
                  </div>
                  <span className="text-xs font-medium text-blue-700">Open</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Patient Roster</h3>
            <p className="text-sm text-slate-500">Patients you have already treated or are scheduled to see.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {total} total
          </span>
        </header>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">Loading patient roster...</div>
        ) : patients.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            {search.trim() ? 'No matching patients found.' : 'No patient records available yet.'}
          </div>
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {patients.map((patient) => (
              <article
                key={patient.patientId}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                      {patientInitials(patient)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {patient.user.firstName} {patient.user.lastName}
                      </p>
                      <p className="truncate text-sm text-slate-600">{patient.user.email || 'No email recorded'}</p>
                      <p className="text-xs text-slate-500">
                        {patient.user.phone || 'No phone'} • {patient.user.gender || 'Gender not recorded'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPatientId(patient.patientId)}
                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Open chart
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visit Summary</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{patient.totalVisits}</p>
                    <p className="text-xs text-slate-500">Total visits with you</p>
                  </div>

                  <div className="rounded-xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Visit</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {patient.lastVisitDate ? formatDate(patient.lastVisitDate) : 'No visit recorded'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {patient.nextVisitDate ? `Next: ${formatDate(patient.nextVisitDate)}` : 'No upcoming visit'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                    Blood: {patient.profile?.bloodType || 'Unknown'}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                    Emergency: {patient.profile?.emergencyContact || 'Not recorded'}
                  </span>
                  {patient.profile?.allergies ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      Allergies noted
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Related Workspaces</h3>
            <p className="text-sm text-slate-500">Jump back to active visits or manage your schedule.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/app/doctor-appointments"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Appointment Desk
            </Link>
            <Link
              to="/app/doctor-dashboard"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {doctorId && selectedPatientId ? (
        <PatientContextModal
          doctorId={doctorId}
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      ) : null}

      {selectedAppointmentId != null ? (
        <PrescriptionView
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      ) : null}
    </div>
  );
}
