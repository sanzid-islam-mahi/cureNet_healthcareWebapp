import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import AppPageHeader from '../components/AppPageHeader';
import { api, useAuth } from '../context/AuthContext';

type QueueStatus = 'all' | 'requested' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';

interface QueueAppointment {
  id: number;
  clinicId?: number | null;
  appointmentDate: string;
  status: string;
  type: string;
  reason?: string | null;
  symptoms?: string | null;
  window?: string | null;
  serial?: number | null;
  patient?: { user?: { firstName?: string; lastName?: string; phone?: string } } | null;
  doctor?: { user?: { firstName?: string; lastName?: string }; department?: string | null } | null;
  clinic?: { name?: string | null; addressLine?: string | null; area?: string | null; city?: string | null } | null;
}

const STATUS_OPTIONS: Array<{ value: QueueStatus; label: string }> = [
  { value: 'all', label: 'All appointments' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatDate(date: string) {
  if (!date) return 'No date';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function statusPillClasses(status: string) {
  if (status === 'requested') return 'bg-amber-100 text-amber-800';
  if (status === 'approved') return 'bg-emerald-100 text-emerald-800';
  if (status === 'in_progress') return 'bg-sky-100 text-sky-800';
  if (status === 'completed') return 'bg-slate-100 text-slate-700';
  if (status === 'rejected') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-600';
}

export default function ReceptionistAppointments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<QueueStatus>('all');
  const [date, setDate] = useState('');

  const { data } = useQuery({
    queryKey: ['receptionist', 'clinic-queue', { status, date }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status !== 'all') params.status = status;
      if (date) params.date = date;
      const response = await api.get<{
        success: boolean;
        data: { appointments: QueueAppointment[]; clinicId: number | null };
      }>('/appointments/clinic-queue', { params });
      return response.data.data;
    },
    enabled: !!user?.clinicId,
  });

  const appointments = data?.appointments ?? [];
  const stats = useMemo(() => {
    const requested = appointments.filter((item) => item.status === 'requested').length;
    const active = appointments.filter((item) => ['approved', 'in_progress'].includes(item.status)).length;
    const completed = appointments.filter((item) => item.status === 'completed').length;
    return { requested, active, completed };
  }, [appointments]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'approve' | 'reject' }) => {
      await api.put(`/appointments/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'clinic-queue'] });
      toast.success('Appointment updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to update appointment');
    },
  });

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Reception Operations"
        title="Clinic Appointment Queue"
        description="Review patient requests, route them into the approved queue, and keep the clinic schedule moving without giving reception broad admin access."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={BuildingOffice2Icon} label="Assigned clinic" value={appointments[0]?.clinic?.name || (user?.clinicId ? `Clinic #${user.clinicId}` : 'Not assigned')} />
        <MetricCard icon={ClockIcon} label="Requested" value={`${stats.requested}`} />
        <MetricCard icon={CalendarDaysIcon} label="Active queue" value={`${stats.active}`} />
        <MetricCard icon={CheckCircleIcon} label="Completed" value={`${stats.completed}`} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Front-desk queue</h2>
            <p className="mt-1 text-sm text-slate-500">Only appointments for the receptionist&apos;s assigned clinic are visible here.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="min-w-[180px]">
              <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <FunnelIcon className="h-4 w-4" />
                Status
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as QueueStatus)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </label>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="px-5 py-12 text-sm text-slate-500">No clinic appointments match the current filters.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((appointment) => {
              const patientName = `${appointment.patient?.user?.firstName || ''} ${appointment.patient?.user?.lastName || ''}`.trim() || 'Patient';
              const doctorName = `${appointment.doctor?.user?.firstName || ''} ${appointment.doctor?.user?.lastName || ''}`.trim() || 'Doctor';
              const clinicAddress = [appointment.clinic?.addressLine, appointment.clinic?.area, appointment.clinic?.city].filter(Boolean).join(', ');

              return (
                <article key={appointment.id} className="px-5 py-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{patientName}</h3>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClasses(appointment.status)}`}>
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                        <MetaBlock label="Doctor" value={`Dr. ${doctorName}`} />
                        <MetaBlock label="Date" value={formatDate(appointment.appointmentDate)} />
                        <MetaBlock
                          label="Session"
                          value={[
                            appointment.window || null,
                            appointment.serial ? `Serial ${appointment.serial}` : null,
                            appointment.type.replace('_', ' '),
                          ].filter(Boolean).join(' • ') || 'Unspecified'}
                        />
                        <MetaBlock label="Clinic" value={appointment.clinic?.name || `Clinic #${appointment.clinicId || '—'}`} />
                      </div>

                      {clinicAddress ? (
                        <p className="mt-3 text-sm text-slate-600">
                          <span className="font-medium text-slate-700">Location:</span> {clinicAddress}
                        </p>
                      ) : null}

                      {appointment.reason ? (
                        <p className="mt-3 text-sm text-slate-600">
                          <span className="font-medium text-slate-700">Reason:</span> {appointment.reason}
                        </p>
                      ) : null}

                      {appointment.symptoms ? (
                        <p className="mt-1 text-sm text-slate-600">
                          <span className="font-medium text-slate-700">Symptoms:</span> {appointment.symptoms}
                        </p>
                      ) : null}
                    </div>

                    {appointment.status === 'requested' ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate({ id: appointment.id, action: 'approve' })}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate({ id: appointment.id, action: 'reject' })}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2 text-slate-700">
                          <UserGroupIcon className="h-4 w-4" />
                          Front desk status
                        </div>
                        <p className="mt-2 text-sm">
                          {appointment.status === 'approved'
                            ? 'Approved and ready for doctor workflow.'
                            : appointment.status === 'in_progress'
                              ? 'Doctor has already started the consultation.'
                              : appointment.status === 'completed'
                                ? 'Visit completed.'
                                : appointment.status === 'rejected'
                                  ? 'Request was rejected.'
                                  : 'No front-desk action needed.'}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-5 w-5" />
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-3 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
