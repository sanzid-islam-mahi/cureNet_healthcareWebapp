import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, useAuth } from '../context/AuthContext';
import PatientContextModal from './doctorAppointments/PatientContextModal';
import PrescriptionFormModal from './doctorAppointments/PrescriptionFormModal';
import QueueCard from './doctorAppointments/QueueCard';
import { STATUS_FILTERS, type AppointmentAction, type AppointmentItem, type DoctorPatientRow } from './doctorAppointments/types';
import { formatDate } from './doctorAppointments/utils';

export default function DoctorAppointments() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;
  const queryClient = useQueryClient();

  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [prescriptionFor, setPrescriptionFor] = useState<number | null>(null);
  const [patientContextFor, setPatientContextFor] = useState<number | null>(null);

  const { data: patientsData } = useQuery({
    queryKey: ['doctor-patients', doctorId],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { patients: DoctorPatientRow[] } }>(
        `/doctors/${doctorId}/patients`,
        { params: { limit: 8 } }
      );
      return res.data?.patients ?? [];
    },
    enabled: !!doctorId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments', doctorId, dateFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateFilter) params.date = dateFilter;
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await api.get<{ success: boolean; data: { appointments: AppointmentItem[] } }>(
        `/doctors/${doctorId}/appointments`,
        { params }
      );
      return res.data?.appointments ?? [];
    },
    enabled: !!doctorId,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: AppointmentAction }) => api.put(`/appointments/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      toast.success('Appointment updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update appointment');
    },
  });

  const appointments = (data ?? []) as AppointmentItem[];
  const requested = appointments.filter((a) => a.status === 'requested');
  const approved = appointments.filter((a) => a.status === 'approved');
  const active = appointments.filter((a) => a.status === 'in_progress');
  const history = appointments.filter((a) => ['completed', 'rejected', 'cancelled'].includes(a.status));
  const queueCount = requested.length + approved.length;

  const filteredPatients = useMemo(() => {
    const list = patientsData ?? [];
    const search = patientSearch.trim().toLowerCase();
    if (!search) return list;
    return list.filter((p) => {
      const fullName = `${p.user.firstName} ${p.user.lastName}`.toLowerCase();
      return (
        fullName.includes(search)
        || (p.user.email || '').toLowerCase().includes(search)
        || (p.user.phone || '').toLowerCase().includes(search)
      );
    });
  }, [patientsData, patientSearch]);

  async function hasPrescription(appointmentId: number): Promise<boolean> {
    try {
      await api.get(`/prescriptions/appointment/${appointmentId}`);
      return true;
    } catch (error: unknown) {
      if (
        typeof error === 'object'
        && error !== null
        && 'response' in error
        && (error as { response?: { status?: number } }).response?.status === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  async function handleAppointmentAction(id: number, action: AppointmentAction) {
    if (action === 'complete') {
      try {
        const hasExistingPrescription = await hasPrescription(id);
        if (!hasExistingPrescription) {
          const shouldContinue = window.confirm('No prescription exists for this consultation. Complete appointment anyway?');
          if (!shouldContinue) return;
        }
      } catch {
        toast.error('Could not verify prescription status. Try again.');
        return;
      }
    }

    try {
      await actionMutation.mutateAsync({ id, action });
    } catch {
      // Error feedback is handled by mutation onError toast.
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Doctor Appointment Desk</h2>
            <p className="text-sm text-gray-600">
              Manage triage, consultation flow, patient context, and prescriptions from a single workspace.
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Triage Queue</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{queueCount}</p>
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">In Consultation</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">{active.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Completed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {appointments.filter((a) => a.status === 'completed').length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-700">Total Loaded</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{appointments.length}</p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading appointment data...
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          No appointments for the selected filters.
        </div>
      ) : (
        <div className="space-y-5">
          {queueCount > 0 ? (
            <QueueCard
              title="Triage Queue"
              subtitle="Requests awaiting action and approved patients waiting to start consultation"
              items={[...requested, ...approved]}
              emptyMessage="No patients currently waiting in triage."
              onOpenPatient={(patientId) => setPatientContextFor(patientId)}
              onOpenPrescription={(appointmentId) => setPrescriptionFor(appointmentId)}
              onAction={handleAppointmentAction}
              actionPending={actionMutation.isPending}
            />
          ) : null}

          {active.length > 0 ? (
            <QueueCard
              title="Active Consultations"
              subtitle="Patients currently in-progress; complete visit with prescription before closure"
              items={active}
              emptyMessage="No consultations are currently active."
              onOpenPatient={(patientId) => setPatientContextFor(patientId)}
              onOpenPrescription={(appointmentId) => setPrescriptionFor(appointmentId)}
              onAction={handleAppointmentAction}
              actionPending={actionMutation.isPending}
            />
          ) : null}

          <QueueCard
            title="Visit History"
            subtitle="Completed and closed visits for audit and follow-up"
            items={history}
            emptyMessage="No historical visits match your selected filters."
            onOpenPatient={(patientId) => setPatientContextFor(patientId)}
            onOpenPrescription={(appointmentId) => setPrescriptionFor(appointmentId)}
            onAction={handleAppointmentAction}
            actionPending={actionMutation.isPending}
          />
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <header className="border-b border-gray-200 px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Patient Panel</h3>
            <p className="text-sm text-gray-500">Recently seen patients and continuity-of-care quick access</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {(patientsData ?? []).length} records
          </span>
        </header>

        <div className="border-b border-gray-100 px-5 py-3">
          <input
            type="search"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder="Search patient by name, email, or phone"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="divide-y divide-gray-100">
          {(patientsData ?? []).length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">No patient history available yet.</p>
          ) : filteredPatients.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">No matching patients found.</p>
          ) : (
            filteredPatients.map((p) => (
              <article key={p.patientId} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {p.user.firstName} {p.user.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Visits: {p.totalVisits} • Last: {formatDate(p.lastVisitDate)}
                    {p.nextVisitDate ? ` • Next: ${formatDate(p.nextVisitDate)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPatientContextFor(p.patientId)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Open context
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      {prescriptionFor != null ? (
        <PrescriptionFormModal
          appointmentId={prescriptionFor}
          onClose={() => {
            setPrescriptionFor(null);
            queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
          }}
        />
      ) : null}

      {patientContextFor != null && doctorId != null ? (
        <PatientContextModal
          doctorId={doctorId}
          patientId={patientContextFor}
          onClose={() => setPatientContextFor(null)}
        />
      ) : null}
    </div>
  );
}
