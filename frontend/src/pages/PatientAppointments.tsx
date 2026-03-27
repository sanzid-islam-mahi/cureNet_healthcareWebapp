import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../context/AuthContext';
import BookAppointmentModal from '../components/BookAppointmentModal';
import PrescriptionView from '../components/PrescriptionView';
import RatingModal from '../components/RatingModal';

interface AppointmentItem {
  id: number;
  doctorId: number;
  clinicId?: number | null;
  appointmentDate: string;
  timeBlock?: string;
  window?: string;
  serial?: number;
  type: string;
  status: string;
  reason?: string;
  symptoms?: string;
  doctor?: { id: number; user?: { firstName: string; lastName: string } };
  clinic?: { id: number; name?: string; addressLine?: string; area?: string; city?: string } | null;
}

interface PatientRatingItem {
  id: number;
  appointmentId: number;
  rating: number;
  review?: string | null;
}

const STATUS_OPTIONS = ['', 'requested', 'approved', 'in_progress', 'completed', 'cancelled'];
function prettyStatus(status: string): string {
  return status.replace('_', ' ');
}

function statusBadgeClasses(status: string): string {
  const map: Record<string, string> = {
    requested: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    approved: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    cancelled: 'bg-gray-100 text-gray-700 ring-gray-500/20',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700 ring-gray-500/20';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString();
}

function doctorNameFor(apt: AppointmentItem): string {
  return apt.doctor?.user
    ? `${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`
    : `Doctor #${apt.doctor?.id ?? ''}`;
}

interface AppointmentsSectionProps {
  title: string;
  subtitle: string;
  items: AppointmentItem[];
  emptyMessage: string;
  onOpenPrescription: (appointmentId: number) => void;
  onOpenRating: (appointmentId: number, doctorId: number) => void;
  ratingsByAppointmentId: Record<number, PatientRatingItem>;
  showPrescription: boolean;
  onCancel: (appointmentId: number) => void;
  cancelPending: boolean;
}

function AppointmentsSection({
  title,
  subtitle,
  items,
  emptyMessage,
  onOpenPrescription,
  onOpenRating,
  ratingsByAppointmentId,
  showPrescription,
  onCancel,
  cancelPending,
}: AppointmentsSectionProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((apt) => {
            const canCancel = ['requested', 'approved'].includes(apt.status);
            const canRate = apt.status === 'completed';
            const existingRating = ratingsByAppointmentId[apt.id];

            return (
              <article key={apt.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{doctorNameFor(apt)}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusBadgeClasses(apt.status)}`}
                      >
                        {prettyStatus(apt.status)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      {formatDate(apt.appointmentDate)}
                      {apt.window ? (
                        <>
                          {' '}• {apt.window.charAt(0).toUpperCase() + apt.window.slice(1)}
                          {apt.serial != null ? ` (Serial ${apt.serial})` : ''}
                        </>
                      ) : apt.timeBlock ? (
                        <> • {apt.timeBlock}</>
                      ) : null}
                      {' '}• {apt.type?.replace('_', ' ')}
                    </p>

                    {apt.clinic ? (
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-900">Clinic:</span> {apt.clinic.name}
                        {([apt.clinic.addressLine, apt.clinic.area, apt.clinic.city].filter(Boolean).join(', ')) ? ` • ${[apt.clinic.addressLine, apt.clinic.area, apt.clinic.city].filter(Boolean).join(', ')}` : ''}
                      </p>
                    ) : null}

                    {apt.reason ? (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Reason:</span> {apt.reason}
                      </p>
                    ) : null}
                    {apt.symptoms ? (
                      <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
                        <span className="font-medium text-red-900">Symptoms:</span> {apt.symptoms}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {showPrescription ? (
                      <button
                        type="button"
                        onClick={() => onOpenPrescription(apt.id)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View prescription
                      </button>
                    ) : null}

                    {canRate && existingRating ? (
                      <span className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
                        Rated: {existingRating.rating}/5
                      </span>
                    ) : null}

                    {canRate && !existingRating ? (
                      <button
                        type="button"
                        onClick={() => apt.doctorId && onOpenRating(apt.id, apt.doctorId)}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
                      >
                        Rate doctor
                      </button>
                    ) : null}

                    {canCancel ? (
                      <button
                        type="button"
                        onClick={() => onCancel(apt.id)}
                        disabled={cancelPending}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function PatientAppointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bookDoctorId = searchParams.get('book');
  const [statusFilter, setStatusFilter] = useState('');
  const [showBookModal, setShowBookModal] = useState(Boolean(bookDoctorId));
  const [prescriptionAppointmentId, setPrescriptionAppointmentId] = useState<number | null>(null);
  const [ratingFor, setRatingFor] = useState<{ appointmentId: number; doctorId: number } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await api.get<{ success: boolean; data: { appointments: AppointmentItem[] } }>(
        '/appointments',
        { params }
      );
      return res.data?.appointments ?? [];
    },
  });
  const { data: myRatingsData } = useQuery({
    queryKey: ['my-ratings'],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { ratings: PatientRatingItem[] } }>(
        '/ratings/my-ratings'
      );
      return res.data?.ratings ?? [];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.put(`/appointments/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Appointment cancelled');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to cancel');
    },
  });

  const appointments = useMemo(() => (data ?? []) as AppointmentItem[], [data]);
  const ratingsByAppointmentId = useMemo(() => {
    const map: Record<number, PatientRatingItem> = {};
    for (const rating of myRatingsData ?? []) {
      if (rating.appointmentId) {
        map[rating.appointmentId] = rating;
      }
    }
    return map;
  }, [myRatingsData]);
  const activeAppointments = useMemo(
    () => appointments.filter((a) => ['requested', 'approved', 'in_progress'].includes(a.status)),
    [appointments]
  );
  const completedAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'completed'),
    [appointments]
  );
  const closedAppointments = useMemo(
    () => appointments.filter((a) => ['cancelled', 'rejected'].includes(a.status)),
    [appointments]
  );

  const closeBookModal = () => {
    setShowBookModal(false);
    if (bookDoctorId) setSearchParams({});
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['patients'] });
  };

  const onCancelAppointment = (id: number) => {
    const confirmed = window.confirm('Cancel this appointment request?');
    if (!confirmed) return;
    cancelMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
            <p className="text-sm text-gray-600">Track requests, consultations, and completed visits in one place.</p>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {prettyStatus(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowBookModal(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Book appointment
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Active</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{activeAppointments.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Completed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{completedAppointments.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-700">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{appointments.length}</p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading appointments...
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
          No appointments yet.
        </div>
      ) : (
        <div className="space-y-5">
          <AppointmentsSection
            title="Active Requests & Visits"
            subtitle="Requests awaiting approval and appointments currently in progress"
            items={activeAppointments}
            emptyMessage="No active appointments."
            onOpenPrescription={(id) => setPrescriptionAppointmentId(id)}
            onOpenRating={(appointmentId, doctorId) => setRatingFor({ appointmentId, doctorId })}
            ratingsByAppointmentId={ratingsByAppointmentId}
            showPrescription={false}
            onCancel={onCancelAppointment}
            cancelPending={cancelMutation.isPending}
          />

          <AppointmentsSection
            title="Completed Visits"
            subtitle="Past visits and prescriptions ready for review"
            items={completedAppointments}
            emptyMessage="No completed visits yet."
            onOpenPrescription={(id) => setPrescriptionAppointmentId(id)}
            onOpenRating={(appointmentId, doctorId) => setRatingFor({ appointmentId, doctorId })}
            ratingsByAppointmentId={ratingsByAppointmentId}
            showPrescription
            onCancel={onCancelAppointment}
            cancelPending={cancelMutation.isPending}
          />

          {closedAppointments.length > 0 ? (
            <AppointmentsSection
              title="Closed"
              subtitle="Cancelled or rejected requests"
              items={closedAppointments}
              emptyMessage="No closed appointments."
              onOpenPrescription={(id) => setPrescriptionAppointmentId(id)}
              onOpenRating={(appointmentId, doctorId) => setRatingFor({ appointmentId, doctorId })}
              ratingsByAppointmentId={ratingsByAppointmentId}
              showPrescription
              onCancel={onCancelAppointment}
              cancelPending={cancelMutation.isPending}
            />
          ) : null}
        </div>
      )}

      {showBookModal ? (
        <BookAppointmentModal
          prefilledDoctorId={bookDoctorId ? parseInt(bookDoctorId, 10) : undefined}
          hasExistingAppointments={appointments.length > 0}
          onClose={closeBookModal}
        />
      ) : null}

      {prescriptionAppointmentId != null ? (
        <PrescriptionView
          appointmentId={prescriptionAppointmentId}
          onClose={() => setPrescriptionAppointmentId(null)}
        />
      ) : null}

      {ratingFor != null ? (
        <RatingModal
          appointmentId={ratingFor.appointmentId}
          doctorId={ratingFor.doctorId}
          onClose={() => {
            setRatingFor(null);
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['my-ratings'] });
          }}
        />
      ) : null}
    </div>
  );
}
