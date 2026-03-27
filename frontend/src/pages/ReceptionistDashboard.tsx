import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, BuildingOffice2Icon, CalendarDaysIcon, CheckCircleIcon, UserGroupIcon, XCircleIcon } from '@heroicons/react/24/outline';
import AppPageHeader from '../components/AppPageHeader';
import { api, useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface QueueAppointment {
  id: number;
  clinicId?: number | null;
  appointmentDate: string;
  status: string;
  type: string;
  window?: string | null;
  serial?: number | null;
  patient?: { user?: { firstName?: string; lastName?: string } } | null;
  doctor?: { user?: { firstName?: string; lastName?: string } } | null;
  clinic?: { name?: string | null } | null;
}

export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ['receptionist', 'clinic-queue'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { appointments: QueueAppointment[] } }>('/appointments/clinic-queue');
      return data.data?.appointments ?? [];
    },
    enabled: !!user?.clinicId,
  });

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

  const requested = appointments.filter((item) => item.status === 'requested');
  const active = appointments.filter((item) => ['approved', 'in_progress'].includes(item.status));

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Reception Desk"
        title="Clinic Operations"
        description="Monitor the clinic queue, clear requested appointments, and keep front-desk operations coordinated around one assigned facility."
        actions={
          <Link
            to="/app/receptionist-appointments"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open queue
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={BuildingOffice2Icon}
          label="Assigned Clinic"
          value={user?.clinicId ? `Clinic #${user.clinicId}` : 'Clinic not assigned yet'}
        />
        <InfoCard
          icon={CalendarDaysIcon}
          label="Pending Requests"
          value={`${requested.length} awaiting front-desk review`}
        />
        <InfoCard
          icon={UserGroupIcon}
          label="Active Queue"
          value={`${active.length} approved or in progress`}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Clinic Appointment Requests</h2>
          <p className="text-sm text-slate-500">Reception handles requested appointments for doctors in the assigned clinic.</p>
        </div>
        {appointments.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">No clinic appointments found yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((appointment) => (
              <article key={appointment.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {appointment.patient?.user?.firstName} {appointment.patient?.user?.lastName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
                      {' • '}
                      {appointment.appointmentDate}
                      {appointment.window ? ` • ${appointment.window}` : ''}
                      {appointment.serial ? ` • Serial ${appointment.serial}` : ''}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                      {appointment.clinic?.name || `Clinic #${appointment.clinicId || '—'}`} • {appointment.type.replace('_', ' ')} • {appointment.status}
                    </p>
                  </div>
                  {appointment.status === 'requested' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: appointment.id, action: 'approve' })}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: appointment.id, action: 'reject' })}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
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
