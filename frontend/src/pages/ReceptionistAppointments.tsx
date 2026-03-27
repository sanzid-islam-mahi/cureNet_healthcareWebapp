import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  IdentificationIcon,
  PhoneIcon,
  UserCircleIcon,
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
  { value: 'all', label: 'All statuses' },
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

function sortAppointments(appointments: QueueAppointment[]) {
  const rank: Record<string, number> = {
    requested: 0,
    approved: 1,
    in_progress: 2,
    completed: 3,
    rejected: 4,
    cancelled: 5,
  };

  return [...appointments].sort((a, b) => {
    const statusDiff = (rank[a.status] ?? 99) - (rank[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return `${a.appointmentDate} ${a.window || ''}`.localeCompare(`${b.appointmentDate} ${b.window || ''}`);
  });
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

  const appointments = useMemo(() => sortAppointments(data?.appointments ?? []), [data?.appointments]);
  const clinic = appointments[0]?.clinic ?? null;
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
        eyebrow="Reception Queue"
        title="Clinic Appointment Board"
        description="Work from the newest requests first, confirm patient identity and contact details, and verify the assigned doctor before approving."
      />

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-slate-200 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-slate-500">
              <BuildingOffice2Icon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Clinic</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {clinic?.name || (user?.clinicId ? `Clinic #${user.clinicId}` : 'Clinic assignment pending')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {[clinic?.addressLine, clinic?.area, clinic?.city].filter(Boolean).join(', ') || 'Clinic address not added yet'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="min-w-[190px]">
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

        <div className="grid gap-4 border-b border-slate-200 px-5 py-4 md:grid-cols-3">
          <SummaryCard icon={ClockIcon} label="Requested" value={`${stats.requested}`} tint="amber" />
          <SummaryCard icon={CalendarDaysIcon} label="Active" value={`${stats.active}`} tint="sky" />
          <SummaryCard icon={CheckCircleIcon} label="Completed" value={`${stats.completed}`} tint="emerald" />
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
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{patientName}</h3>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClasses(appointment.status)}`}>
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <ContextCard
                          icon={UserCircleIcon}
                          title="Patient"
                          primary={patientName}
                          secondary={appointment.patient?.user?.phone || 'Phone not recorded'}
                          detail={[formatDate(appointment.appointmentDate), appointment.type.replace('_', ' ')].join(' • ')}
                        />
                        <ContextCard
                          icon={IdentificationIcon}
                          title="Doctor"
                          primary={`Dr. ${doctorName}`}
                          secondary={appointment.doctor?.department || 'Department not listed'}
                          detail={[
                            appointment.window || 'Session not selected',
                            appointment.serial ? `Serial ${appointment.serial}` : null,
                          ].filter(Boolean).join(' • ')}
                        />
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Visit notes</p>
                          <div className="mt-2 space-y-2 text-sm text-slate-600">
                            <p><span className="font-medium text-slate-700">Reason:</span> {appointment.reason || 'Not added'}</p>
                            <p><span className="font-medium text-slate-700">Symptoms:</span> {appointment.symptoms || 'Not added'}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Clinic location</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{appointment.clinic?.name || `Clinic #${appointment.clinicId || '—'}`}</p>
                          <p className="mt-1 text-sm text-slate-600">{clinicAddress || 'Address not listed'}</p>
                        </div>
                      </div>
                    </div>

                    {appointment.status === 'requested' ? (
                      <div className="flex shrink-0 flex-col gap-2 xl:w-44">
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate({ id: appointment.id, action: 'approve' })}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate({ id: appointment.id, action: 'reject' })}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Reject
                        </button>
                        <p className="text-xs leading-5 text-slate-500">
                          Confirm the patient details and doctor assignment before clearing the request.
                        </p>
                      </div>
                    ) : (
                      <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 xl:w-52">
                        <div className="flex items-center gap-2 text-slate-700">
                          <PhoneIcon className="h-4 w-4" />
                          Queue status
                        </div>
                        <p className="mt-2 leading-6">
                          {appointment.status === 'approved'
                            ? 'Approved and ready for doctor workflow.'
                            : appointment.status === 'in_progress'
                              ? 'Doctor has already started the consultation.'
                              : appointment.status === 'completed'
                                ? 'Visit completed and cleared from the live queue.'
                                : appointment.status === 'rejected'
                                  ? 'Rejected at the front desk.'
                                  : 'No immediate desk action needed.'}
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tint: 'amber' | 'sky' | 'emerald';
}) {
  const classes =
    tint === 'amber'
      ? 'bg-amber-50 text-amber-800 ring-amber-100'
      : tint === 'sky'
        ? 'bg-sky-50 text-sky-800 ring-sky-100'
        : 'bg-emerald-50 text-emerald-800 ring-emerald-100';

  return (
    <div className={`rounded-2xl px-4 py-4 ring-1 ${classes}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ContextCard({
  icon: Icon,
  title,
  primary,
  secondary,
  detail,
}: {
  icon: React.ElementType;
  title: string;
  primary: string;
  secondary: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{title}</p>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{primary}</p>
      <p className="mt-1 text-sm text-slate-600">{secondary}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
