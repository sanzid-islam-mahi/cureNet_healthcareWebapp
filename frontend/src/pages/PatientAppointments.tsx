import { useState } from 'react';
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
  doctor?: { id: number; user?: { firstName: string; lastName: string } };
}

const STATUS_OPTIONS = ['', 'requested', 'approved', 'in_progress', 'completed', 'cancelled'];

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

  const appointments = (data ?? []) as AppointmentItem[];

  const closeBookModal = () => {
    setShowBookModal(false);
    if (bookDoctorId) setSearchParams({});
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['patients'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
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

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-200 text-center text-gray-500">
          No appointments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const doctorName = apt.doctor?.user
              ? `${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`
              : `Doctor #${apt.doctor?.id ?? ''}`;
            const canCancel = !['cancelled', 'rejected', 'completed'].includes(apt.status);
            const canRate = apt.status === 'completed';
            return (
              <div
                key={apt.id}
                className="rounded-lg bg-white shadow-sm border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{doctorName}</p>
                  <p className="text-sm text-gray-500">
                    {apt.appointmentDate}
                    {apt.window ? (
                      <>
                        {' '}· {apt.window.charAt(0).toUpperCase() + apt.window.slice(1)}
                        {apt.serial != null && ` (Serial ${apt.serial})`}
                      </>
                    ) : apt.timeBlock ? (
                      <> at {apt.timeBlock}</>
                    ) : null}
                    {' '}· {apt.type?.replace('_', ' ')} ·{' '}
                    <span className="capitalize">{apt.status?.replace('_', ' ')}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrescriptionAppointmentId(apt.id)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    View prescription
                  </button>
                  {canRate && (
                    <button
                      type="button"
                      onClick={() => apt.doctorId && setRatingFor({ appointmentId: apt.id, doctorId: apt.doctorId })}
                      className="text-sm text-amber-600 hover:text-amber-500"
                    >
                      Rate
                    </button>
                  )}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate(apt.id)}
                      disabled={cancelMutation.isPending}
                      className="text-sm text-red-600 hover:text-red-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showBookModal && (
        <BookAppointmentModal
          prefilledDoctorId={bookDoctorId ? parseInt(bookDoctorId, 10) : undefined}
          onClose={closeBookModal}
        />
      )}
      {prescriptionAppointmentId != null && (
        <PrescriptionView
          appointmentId={prescriptionAppointmentId}
          onClose={() => setPrescriptionAppointmentId(null)}
        />
      )}
      {ratingFor != null && (
        <RatingModal
          appointmentId={ratingFor.appointmentId}
          doctorId={ratingFor.doctorId}
          onClose={() => {
            setRatingFor(null);
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          }}
        />
      )}
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

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { doctors: { id: number; user?: { firstName: string; lastName: string }; department?: string }[] } }>('/doctors');
      return res.data?.doctors ?? [];
    },
  });

  const { data: availableWindows = [], isLoading: windowsLoading } = useQuery({
    queryKey: ['available-slots', doctorId, date],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { windows: Array<{ window: string; label: string; timeRange: string; enabled: boolean; maxPatients: number | null; booked: number; spotsLeft: number; available: boolean }> } }>(
        `/doctors/${doctorId}/available-slots`,
        { params: { date } }
      );
      return res.data?.windows ?? [];
    },
    enabled: !!doctorId && !!date,
  });

  const createMutation = useMutation({
    mutationFn: (body: { doctorId: number; appointmentDate: string; window: string; type: string; reason?: string; symptoms?: string }) =>
      api.post('/appointments', body),
    onSuccess: () => {
      toast.success('Appointment requested');
      onClose();
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to book');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId || !date || !selectedWindow) {
      toast.error('Please select doctor, date and window');
      return;
    }
    createMutation.mutate({
      doctorId: Number(doctorId),
      appointmentDate: date,
      window: selectedWindow,
      type,
      reason: reason || undefined,
      symptoms: symptoms || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Book appointment</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSelectedWindow('');
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            {date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Window</label>
                {windowsLoading ? (
                  <p className="text-sm text-gray-500">Loading windows...</p>
                ) : availableWindows.length === 0 || availableWindows.every((w) => !w.available) ? (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    No available window for this date. Try another.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableWindows.map((w) => {
                      if (!w.available) return null;
                      return (
                        <button
                          key={w.window}
                          type="button"
                          onClick={() => setSelectedWindow(w.window)}
                          className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${selectedWindow === w.window
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{w.label}</span>
                            <span className="text-xs opacity-75">{w.timeRange}</span>
                          </div>
                          {w.maxPatients != null && w.maxPatients > 0 && (
                            <div className="text-xs mt-1 opacity-75">
                              {w.spotsLeft > 0 ? `${w.spotsLeft} spot${w.spotsLeft > 1 ? 's' : ''} left` : 'Full'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms (optional)</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
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
                {createMutation.isPending ? 'Booking...' : 'Book'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
