import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../context/AuthContext';

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

const FIRST_BOOKING_REQUIRED_FIELDS = ['bloodType', 'emergencyContact', 'emergencyPhone', 'phone', 'dateOfBirth'] as const;

const PROFILE_FIELD_LABELS: Record<(typeof FIRST_BOOKING_REQUIRED_FIELDS)[number], string> = {
  bloodType: 'Blood type',
  emergencyContact: 'Emergency contact',
  emergencyPhone: 'Emergency contact phone',
  phone: 'Phone number',
  dateOfBirth: 'Date of birth',
};

interface BookAppointmentModalProps {
  prefilledDoctorId?: number;
  hasExistingAppointments?: boolean;
  lockDoctor?: boolean;
  onClose: () => void;
}

interface BookingDoctorOption {
  id: number;
  clinicId?: number | null;
  department?: string;
  consultationFee?: number | null;
  user?: { firstName: string; lastName: string };
  clinic?: {
    id: number;
    name?: string | null;
    addressLine?: string | null;
    area?: string | null;
    city?: string | null;
  } | null;
}

function profileFieldLabel(field: string): string {
  return PROFILE_FIELD_LABELS[field as keyof typeof PROFILE_FIELD_LABELS] ?? field;
}

function formatBookingDate(dateStr: string): string {
  if (!dateStr) return 'No date selected';
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BookAppointmentModal({
  prefilledDoctorId,
  hasExistingAppointments,
  lockDoctor = false,
  onClose,
}: BookAppointmentModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState<number | ''>(prefilledDoctorId ?? '');
  const [date, setDate] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('');
  const [type, setType] = useState('in_person');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [triageConfirmed, setTriageConfirmed] = useState(false);
  const [profileBlockingFields, setProfileBlockingFields] = useState<string[]>([]);

  const combinedNotes = `${reason} ${symptoms}`.toLowerCase();
  const matchedRedFlags = RED_FLAG_TERMS.filter((term) => combinedNotes.includes(term));
  const hasRedFlags = matchedRedFlags.length > 0;

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data: res } = await api.get<{
        success: boolean;
        data: {
          doctors: BookingDoctorOption[];
        };
      }>('/doctors');
      return res.data?.doctors ?? [];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', 'booking-readiness'],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { appointments: Array<{ id: number }> } }>(
        '/appointments'
      );
      return res.data?.appointments ?? [];
    },
    enabled: hasExistingAppointments == null,
  });

  const { data: patientProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['patients', 'profile', 'booking'],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: {
          patient: {
            bloodType?: string;
            emergencyContact?: string;
            emergencyPhone?: string;
            user?: {
              phone?: string;
              dateOfBirth?: string;
            };
          };
        };
      }>('/patients/profile');
      return data.data?.patient;
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
  const selectableWindows = availableWindows.filter((window) => window.available);
  const selectedDoctor = doctors.find((doctor) => doctor.id === doctorId);
  const selectedClinicName = selectedDoctor?.clinic?.name || (selectedDoctor?.clinicId ? `Clinic #${selectedDoctor.clinicId}` : 'Clinic not assigned yet');
  const selectedClinicAddress = [selectedDoctor?.clinic?.addressLine, selectedDoctor?.clinic?.area, selectedDoctor?.clinic?.city]
    .filter(Boolean)
    .join(', ');
  const resolvedHasExistingAppointments = hasExistingAppointments ?? appointments.length > 0;
  const profileMissingFields = useMemo(() => {
    if (resolvedHasExistingAppointments || !patientProfile) return [];
    return FIRST_BOOKING_REQUIRED_FIELDS.filter((field) => {
      if (field === 'phone' || field === 'dateOfBirth') {
        return !patientProfile.user?.[field];
      }
      return !patientProfile[field];
    });
  }, [resolvedHasExistingAppointments, patientProfile]);
  const effectiveProfileBlockingFields = profileBlockingFields.length > 0 ? profileBlockingFields : profileMissingFields;
  const needsProfileCompletion = !resolvedHasExistingAppointments && effectiveProfileBlockingFields.length > 0;
  const strongestWindow = selectableWindows.reduce<(typeof selectableWindows)[number] | null>((best, current) => {
    if (!best) return current;
    return current.spotsLeft > best.spotsLeft ? current : best;
  }, null);

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
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const payload = err.response?.data as {
        message?: string;
        code?: string;
        data?: { missingFields?: string[]; redFlags?: string[] };
      } | undefined;
      if (payload?.code === 'PROFILE_INCOMPLETE') {
        setProfileBlockingFields(payload.data?.missingFields ?? []);
        const missing = payload.data?.missingFields?.map(profileFieldLabel).join(', ') || 'required fields';
        toast.error(`Complete your profile first: ${missing}`);
        return;
      }
      if (payload?.code === 'TRIAGE_CONFIRMATION_REQUIRED') {
        toast.error(payload.message ?? 'Review the triage warning before continuing');
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
    if (needsProfileCompletion) {
      toast.error('Complete the required profile fields before booking your first appointment');
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

  const handleOpenProfile = () => {
    onClose();
    navigate('/app/patient-profile');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-lg">
        <div className="p-6">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">Request Appointment</h3>
          <p className="mb-4 text-sm text-gray-500">Share enough detail so your doctor can triage your request safely.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`rounded-2xl border px-4 py-3 ${needsProfileCompletion ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={`text-sm font-semibold ${needsProfileCompletion ? 'text-amber-900' : 'text-emerald-900'}`}>
                    {resolvedHasExistingAppointments
                      ? 'Booking profile ready'
                      : needsProfileCompletion
                        ? 'Complete your profile before your first appointment'
                        : 'First-booking profile check passed'}
                  </p>
                  <p className={`mt-1 text-sm ${needsProfileCompletion ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {resolvedHasExistingAppointments
                      ? 'You already have appointment history, so you can continue directly.'
                      : 'We verify core health and contact details before the first appointment request is accepted.'}
                  </p>
                  {!resolvedHasExistingAppointments && effectiveProfileBlockingFields.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {effectiveProfileBlockingFields.map((field) => (
                        <span
                          key={field}
                          className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900"
                        >
                          {profileFieldLabel(field)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {!resolvedHasExistingAppointments ? (
                  <button
                    type="button"
                    onClick={handleOpenProfile}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Update profile
                  </button>
                ) : null}
              </div>
              {!resolvedHasExistingAppointments && profileLoading ? (
                <p className="mt-3 text-xs text-gray-600">Checking profile readiness...</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Doctor</label>
                <select
                  value={doctorId}
                  onChange={(e) => {
                    setDoctorId(e.target.value ? parseInt(e.target.value, 10) : '');
                    setSelectedWindow('');
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={lockDoctor}
                  required
                >
                  <option value="">Select doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : ''} {doctor.department ? `(${doctor.department})` : ''}
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

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {selectedDoctor
                    ? `${selectedDoctor.user?.firstName ?? ''} ${selectedDoctor.user?.lastName ?? ''}`.trim() || `Doctor #${selectedDoctor.id}`
                    : 'Select a doctor'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatBookingDate(date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clinic</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{selectedDoctor ? selectedClinicName : 'Select a doctor'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected window</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {selectedWindow
                    ? selectableWindows.find((window) => window.window === selectedWindow)?.label ?? selectedWindow
                    : 'Choose a slot'}
                </p>
              </div>
            </div>

            {selectedDoctor ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${selectedDoctor.clinic ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                <p className="font-semibold">{selectedDoctor.clinic ? 'Booking location' : 'Clinic assignment required'}</p>
                <p className="mt-1">
                  {selectedDoctor.clinic || selectedDoctor.clinicId
                    ? `${selectedClinicName}${selectedClinicAddress ? ` • ${selectedClinicAddress}` : ''}`
                    : 'This doctor needs an active clinic assignment before new appointments can be requested.'}
                </p>
              </div>
            ) : null}

            {date ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Available Window</label>
                {windowsLoading ? (
                  <p className="text-sm text-gray-500">Loading windows...</p>
                ) : windowData?.blackout ? (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {windowData.message ?? 'Doctor is unavailable on this date. Please choose another date.'}
                  </p>
                ) : availableWindows.length === 0 || availableWindows.every((window) => !window.available) ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    No available windows for this date. Try another.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Choose the chamber window that fits best. Capacity updates with live bookings, and the highlighted option has the strongest remaining availability.
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableWindows.map((window) => {
                        if (!window.available) return null;
                        const isBestWindow = strongestWindow?.window === window.window;
                        return (
                          <button
                            key={window.window}
                            type="button"
                            onClick={() => setSelectedWindow(window.window)}
                            className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                              selectedWindow === window.window
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-600 hover:bg-indigo-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{window.label}</span>
                                  {isBestWindow ? (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        selectedWindow === window.window
                                          ? 'bg-white/20 text-white'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      Best availability
                                    </span>
                                  ) : null}
                                </div>
                                <p className={`mt-1 text-xs ${selectedWindow === window.window ? 'text-indigo-100' : 'text-gray-500'}`}>
                                  {window.timeRange}
                                </p>
                              </div>
                              <span className={`text-xs font-medium ${selectedWindow === window.window ? 'text-indigo-100' : 'text-gray-500'}`}>
                                {window.maxPatients != null && window.maxPatients > 0 ? `${window.booked}/${window.maxPatients} booked` : 'Open capacity'}
                              </span>
                            </div>
                            {window.maxPatients != null && window.maxPatients > 0 ? (
                              <div className={`mt-3 text-xs ${selectedWindow === window.window ? 'text-indigo-100' : 'text-gray-600'}`}>
                                {window.spotsLeft > 0 ? `${window.spotsLeft} spot${window.spotsLeft > 1 ? 's' : ''} left` : 'Full'}
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
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
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <p className="font-semibold">Urgent triage warning</p>
                <p className="mt-1 text-sm text-rose-800">
                  Your notes include symptoms that may need urgent care. If this is an emergency, contact emergency services immediately instead of waiting for a routine consultation.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {matchedRedFlags.map((term) => (
                    <span key={term} className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-900">
                      {term}
                    </span>
                  ))}
                </div>
                <label className="mt-3 flex items-start gap-2 text-xs">
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
                disabled={createMutation.isPending || !selectedWindow || needsProfileCompletion || (hasRedFlags && !triageConfirmed)}
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
