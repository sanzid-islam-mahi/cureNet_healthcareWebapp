import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../context/AuthContext';
import PrescriptionView from '../components/PrescriptionView';
import RatingModal from '../components/RatingModal';

interface AppointmentItem {
  id: number;
  doctorId: number;
  appointmentDate: string;
  timeBlock?: string;
  window?: string;
  serial?: number;
  type: string;
  status: string;
  reason?: string;
  symptoms?: string;
  doctor?: { id: number; user?: { firstName: string; lastName: string } };
}

interface PatientRatingItem {
  id: number;
  appointmentId: number;
  rating: number;
  review?: string | null;
}

const STATUS_OPTIONS = ['', 'requested', 'approved', 'in_progress', 'completed', 'cancelled'];
const RED_FLAG_TERMS = [
  'chest pain',
  'shortness of breath',
  'breathing problem',
  'stroke',
  'fainting',
  'unconscious',
  'severe bleeding',
  'suicidal',
  'seizure',
];

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

interface BookAppointmentModalProps {
  prefilledDoctorId?: number;
  onClose: () => void;
}

function BookAppointmentModal({ prefilledDoctorId, onClose }: BookAppointmentModalProps) {
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState<number | ''>(prefilledDoctorId ?? '');
  const [date, setDate] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('');
  const [type, setType] = useState('in_person');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [triageConfirmed, setTriageConfirmed] = useState(false);

  const combinedNotes = `${reason} ${symptoms}`.toLowerCase();
  const matchedRedFlags = RED_FLAG_TERMS.filter((term) => combinedNotes.includes(term));
  const hasRedFlags = matchedRedFlags.length > 0;

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data: res } = await api.get<{
        success: boolean;
        data: {
          doctors: { id: number; user?: { firstName: string; lastName: string }; department?: string }[];
        };
      }>('/doctors');
      return res.data?.doctors ?? [];
    },
  });

  const { data: windowData, isLoading: windowsLoading } = useQuery({
    queryKey: ['available-slots', doctorId, date],
    queryFn: async () => {
      const { data: res } = await api.get<{
        success: boolean;
        data: {
          windows: Array<{
            window: string;
            label: string;
            timeRange: string;
            enabled: boolean;
            maxPatients: number | null;
            booked: number;
            spotsLeft: number;
            available: boolean;
          }>;
          blackout?: boolean;
          message?: string;
        };
      }>(`/doctors/${doctorId}/available-slots`, { params: { date } });
      return res.data ?? { windows: [] };
    },
    enabled: !!doctorId && !!date,
  });

  const availableWindows = windowData?.windows ?? [];

  const createMutation = useMutation({
    mutationFn: (body: {
      doctorId: number;
      appointmentDate: string;
      window: string;
      type: string;
      reason?: string;
      symptoms?: string;
      triageConfirmed?: boolean;
    }) => api.post('/appointments', body),
    onSuccess: () => {
      toast.success('Appointment requested');
      onClose();
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const payload = err.response?.data as { message?: string; code?: string; data?: { missingFields?: string[] } } | undefined;
      if (payload?.code === 'PROFILE_INCOMPLETE') {
        const missing = payload.data?.missingFields?.join(', ') || 'required fields';
        toast.error(`Complete your profile first: ${missing}`);
        return;
      }
      toast.error(payload?.message ?? 'Failed to book');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId || !date || !selectedWindow) {
      toast.error('Please select doctor, date and window');
      return;
    }
    if (hasRedFlags && !triageConfirmed) {
      toast.error('Please acknowledge the red-flag warning before continuing');
      return;
    }

    createMutation.mutate({
      doctorId: Number(doctorId),
      appointmentDate: date,
      window: selectedWindow,
      type,
      reason: reason || undefined,
      symptoms: symptoms || undefined,
      triageConfirmed: hasRedFlags ? triageConfirmed : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-lg">
        <div className="p-6">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">Request Appointment</h3>
          <p className="mb-4 text-sm text-gray-500">Share enough detail so your doctor can triage your request safely.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Doctor</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value ? parseInt(e.target.value, 10) : '')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user ? `${d.user.firstName} ${d.user.lastName}` : ''} {d.department ? `(${d.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelectedWindow('');
                  }}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            {date ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Available Window</label>
                {windowsLoading ? (
                  <p className="text-sm text-gray-500">Loading windows...</p>
                ) : windowData?.blackout ? (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {windowData.message ?? 'Doctor is unavailable on this date. Please choose another date.'}
                  </p>
                ) : availableWindows.length === 0 || availableWindows.every((w) => !w.available) ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    No available windows for this date. Try another.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableWindows.map((w) => {
                      if (!w.available) return null;
                      return (
                        <button
                          key={w.window}
                          type="button"
                          onClick={() => setSelectedWindow(w.window)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${selectedWindow === w.window
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{w.label}</span>
                            <span className="text-xs opacity-75">{w.timeRange}</span>
                          </div>
                          {w.maxPatients != null && w.maxPatients > 0 ? (
                            <div className="mt-1 text-xs opacity-75">
                              {w.spotsLeft > 0 ? `${w.spotsLeft} spot${w.spotsLeft > 1 ? 's' : ''} left` : 'Full'}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Consultation Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="in_person">In person</option>
                  <option value="video">Video</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason (optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Symptoms (optional)</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {hasRedFlags ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-semibold">Possible urgent symptoms detected.</p>
                <p className="mt-1 text-xs">
                  If this is an emergency, contact emergency services immediately. Matched terms: {matchedRedFlags.join(', ')}.
                </p>
                <label className="mt-2 flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={triageConfirmed}
                    onChange={(e) => setTriageConfirmed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>I understand and still want to request a non-emergency consultation.</span>
                </label>
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !selectedWindow}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Booking...' : 'Request appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
