import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { api, useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
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

interface DoctorProfileData {
  id: number;
  department?: string;
  experience?: number;
  education?: string;
  bmdcRegistrationNumber?: string;
  location?: string;
  hospital?: string;
  consultationFee?: number;
  bio?: string;
  profileImage?: string;
  verified: boolean;
  chamberTimes?: Record<string, string[]>;
  degrees?: unknown;
  languages?: string[] | null;
  services?: string[] | null;
  patientCount?: number;
  user?: { firstName: string; lastName: string; email?: string; phone?: string };
}

interface AppointmentItem {
  id: number;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatBookingDate(dateStr: string) {
  if (!dateStr) return 'Choose a date';
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function profileFieldLabel(field: string) {
  return PROFILE_FIELD_LABELS[field as keyof typeof PROFILE_FIELD_LABELS] ?? field;
}

export default function PatientDoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('');
  const [consultationType, setConsultationType] = useState<'in_person' | 'video' | 'phone'>('in_person');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [triageConfirmed, setTriageConfirmed] = useState(false);
  const [profileBlockingFields, setProfileBlockingFields] = useState<string[]>([]);

  const combinedNotes = `${reason} ${symptoms}`.toLowerCase();
  const matchedRedFlags = RED_FLAG_TERMS.filter((term) => combinedNotes.includes(term));
  const hasRedFlags = matchedRedFlags.length > 0;

  const { data: doctor, isLoading: loadingProfile, error: profileError } = useQuery({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { doctor: DoctorProfileData } }>(`/doctors/${id}`);
      return data.data?.doctor ?? null;
    },
    enabled: !!id,
  });

  const { data: windowData, isLoading: windowsLoading } = useQuery({
    queryKey: ['available-slots', id, selectedDate],
    queryFn: async () => {
      const { data } = await api.get<{
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
      }>(`/doctors/${id}/available-slots`, { params: { date: selectedDate } });
      return data.data ?? { windows: [] };
    },
    enabled: !!id && !!selectedDate,
  });

  const { data: patientProfile, isLoading: profileReadinessLoading } = useQuery({
    queryKey: ['patients', 'profile', 'doctor-booking', id],
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
    enabled: isPatient,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', 'doctor-booking-readiness'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { appointments: AppointmentItem[] } }>('/appointments');
      return data.data?.appointments ?? [];
    },
    enabled: isPatient,
  });

  const { data: ratingsRes } = useQuery({
    queryKey: ['ratings', 'doctor', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { summary: { averageRating: number; totalRatings: number } } }>(
        `/ratings/doctor/${id}`
      );
      return data.data?.summary ?? { averageRating: 0, totalRatings: 0 };
    },
    enabled: !!id,
  });

  const availableWindows = windowData?.windows ?? [];
  const selectableWindows = availableWindows.filter((window) => window.available);
  const selectedSlot = selectableWindows.find((window) => window.window === selectedWindow);
  const strongestWindow = selectableWindows.reduce<(typeof selectableWindows)[number] | null>((best, current) => {
    if (!best) return current;
    return current.spotsLeft > best.spotsLeft ? current : best;
  }, null);
  const hasExistingAppointments = appointments.length > 0;
  const profileMissingFields = useMemo(() => {
    if (!isPatient || hasExistingAppointments || !patientProfile) return [];
    return FIRST_BOOKING_REQUIRED_FIELDS.filter((field) => {
      if (field === 'phone' || field === 'dateOfBirth') {
        return !patientProfile.user?.[field];
      }
      return !patientProfile[field];
    });
  }, [hasExistingAppointments, isPatient, patientProfile]);
  const effectiveProfileBlockingFields = profileBlockingFields.length > 0 ? profileBlockingFields : profileMissingFields;
  const needsProfileCompletion = isPatient && !hasExistingAppointments && effectiveProfileBlockingFields.length > 0;

  const bookMutation = useMutation({
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
      setSelectedDate('');
      setSelectedWindow('');
      setReason('');
      setSymptoms('');
      setConsultationType('in_person');
      setTriageConfirmed(false);
      setProfileBlockingFields([]);
      queryClient.invalidateQueries({ queryKey: ['available-slots', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err: {
      response?: {
        data?: {
          message?: string;
          code?: string;
          data?: { missingFields?: string[]; redFlags?: string[] };
        };
      };
    }) => {
      const payload = err.response?.data;
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

  const rating = ratingsRes ?? { averageRating: 0, totalRatings: 0 };
  const name = doctor?.user ? `Dr. ${doctor.user.firstName} ${doctor.user.lastName}` : 'Doctor';
  const imgSrc = doctor?.profileImage
    ? (doctor.profileImage.startsWith('http') ? doctor.profileImage : `${API_BASE}${doctor.profileImage}`)
    : null;
  const languages = Array.isArray(doctor?.languages) ? doctor.languages : [];
  const expertise = Array.isArray(doctor?.services) ? doctor.services : [];

  const handleOpenProfile = () => {
    navigate('/app/patient-profile');
  };

  const handleBook = () => {
    if (!id || !selectedDate || !selectedWindow) return;
    if (needsProfileCompletion) {
      toast.error('Complete the required profile fields before booking your first appointment');
      return;
    }
    if (hasRedFlags && !triageConfirmed) {
      toast.error('Please acknowledge the red-flag warning before continuing');
      return;
    }
    bookMutation.mutate({
      doctorId: parseInt(id, 10),
      appointmentDate: selectedDate,
      window: selectedWindow,
      type: consultationType,
      reason: reason || undefined,
      symptoms: symptoms || undefined,
      triageConfirmed: hasRedFlags ? triageConfirmed : undefined,
    });
  };

  if (loadingProfile || (id && !doctor && !profileError)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-gray-500">Loading doctor profile...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-gray-600">Doctor not found.</p>
        <Link to="/doctors" className="mt-2 inline-block text-[#3990D7] hover:underline">Back to doctors</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-600 shadow-sm backdrop-blur hover:text-slate-900"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back</span>
        </button>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 xl:grid-cols-[1.6fr_0.95fr]">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_#eff8ff_0%,_#ffffff_55%,_#f8fafc_100%)] p-5 xl:border-b-0 xl:border-r">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/70 bg-sky-100 shadow-sm">
                  {imgSrc ? (
                    <img src={imgSrc} alt={name} className="h-full w-full object-cover object-top" />
                  ) : (
                    <UserCircleIcon className="h-full w-full text-sky-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950">{name}</h1>
                    {doctor.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckBadgeIcon className="h-4 w-4" />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-sky-700">{doctor.department || 'General physician'}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <span className="text-amber-500">{'★'.repeat(Math.max(1, Math.round(rating.averageRating)))}</span>
                      {rating.averageRating.toFixed(1)} ({rating.totalRatings})
                    </span>
                    {doctor.experience != null ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {doctor.experience} years experience
                      </span>
                    ) : null}
                    {(doctor.patientCount ?? 0) > 0 ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {doctor.patientCount} patients
                      </span>
                    ) : null}
                    {doctor.bmdcRegistrationNumber ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        BMDC {doctor.bmdcRegistrationNumber}
                      </span>
                    ) : null}
                  </div>

                  {doctor.bio ? (
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{doctor.bio}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Specialty</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{doctor.department || 'General physician'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Hospital</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{doctor.hospital || 'Private practice'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Location</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{doctor.location || 'Location not listed'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Consultation fee</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">৳{doctor.consultationFee != null ? Number(doctor.consultationFee) : '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 px-5 py-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Booking preview</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold">৳{doctor.consultationFee != null ? Number(doctor.consultationFee) : '—'}</p>
                  <p className="text-sm text-slate-300">Per consultation session</p>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <p>{doctor.verified ? 'Verified clinician' : 'Profile available'}</p>
                  <p>{rating.totalRatings} reviews</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Mode</p>
                  <p className="mt-1 text-sm font-semibold text-white capitalize">{consultationType.replace('_', ' ')}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Date</p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatBookingDate(selectedDate)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Window</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedSlot?.label ?? 'Choose a slot'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <AcademicCapIcon className="h-5 w-5 text-sky-600" />
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900">Credentials</h2>
                </div>
                {doctor.education ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{doctor.education}</p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Education details not listed.</p>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold tracking-wide text-slate-900">Professional details</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Doctor ID</dt>
                    <dd className="font-medium text-slate-900">DR-{doctor.id}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">License</dt>
                    <dd className="font-medium text-slate-900">{doctor.bmdcRegistrationNumber || 'Not listed'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Department</dt>
                    <dd className="font-medium text-slate-900">{doctor.department || 'General physician'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Experience</dt>
                    <dd className="font-medium text-slate-900">{doctor.experience != null ? `${doctor.experience} years` : 'Not listed'}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold tracking-wide text-slate-900">Areas of expertise</h2>
                {expertise.length > 0 ? (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {expertise.map((item) => (
                      <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No expertise tags listed.</p>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold tracking-wide text-slate-900">Reach & languages</h2>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <div className="space-y-2">
                    {doctor.user?.email ? (
                      <p className="flex items-center gap-2">
                        <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                        {doctor.user.email}
                      </p>
                    ) : null}
                    {doctor.user?.phone ? (
                      <p className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-slate-400" />
                        {doctor.user.phone}
                      </p>
                    ) : null}
                    {doctor.location ? (
                      <p className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-slate-400" />
                        {doctor.hospital ? `${doctor.hospital}, ` : ''}{doctor.location}
                      </p>
                    ) : null}
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Languages</p>
                    {languages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {languages.map((lang) => (
                          <span key={lang} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {lang}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Languages not listed.</p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="xl:pl-1">
            <div className="sticky top-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Appointment workspace</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">Request consultation</h2>
                <p className="mt-1 text-sm text-slate-500">Compact booking controls with live capacity and safety checks.</p>
              </div>

              {isPatient ? (
                <div className="space-y-4">
                  <div className={`rounded-2xl border px-4 py-3 ${needsProfileCompletion ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${needsProfileCompletion ? 'text-amber-900' : 'text-emerald-900'}`}>
                          {hasExistingAppointments
                            ? 'Booking profile ready'
                            : needsProfileCompletion
                              ? 'Complete your profile before first booking'
                              : 'First-booking profile check passed'}
                        </p>
                        <p className={`mt-1 text-sm ${needsProfileCompletion ? 'text-amber-800' : 'text-emerald-800'}`}>
                          {hasExistingAppointments
                            ? 'You already have appointment history, so you can request another visit directly.'
                            : 'We verify essential health and contact details before the first appointment request is accepted.'}
                        </p>
                      </div>
                      {!hasExistingAppointments ? (
                        <button
                          type="button"
                          onClick={handleOpenProfile}
                          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Update profile
                        </button>
                      ) : null}
                    </div>
                    {!hasExistingAppointments && effectiveProfileBlockingFields.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {effectiveProfileBlockingFields.map((field) => (
                          <span key={field} className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900">
                            {profileFieldLabel(field)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {!hasExistingAppointments && profileReadinessLoading ? (
                      <p className="mt-3 text-xs text-gray-600">Checking profile readiness...</p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Date</label>
                        <input
                          type="date"
                          min={todayStr()}
                          value={selectedDate}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedWindow('');
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#3990D7] focus:ring-2 focus:ring-[#3990D7]"
                        />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Mode</label>
                        <select
                          value={consultationType}
                          onChange={(e) => setConsultationType(e.target.value as 'in_person' | 'video' | 'phone')}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#3990D7] focus:ring-2 focus:ring-[#3990D7]"
                        >
                          <option value="in_person">In person</option>
                          <option value="video">Video</option>
                          <option value="phone">Phone</option>
                        </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Selected booking</p>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {selectedWindow ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                      <div className="rounded-xl bg-white px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Date</p>
                        <p className="mt-1 font-medium text-slate-900">{formatBookingDate(selectedDate)}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Window</p>
                        <p className="mt-1 font-medium text-slate-900">{selectedSlot?.label ?? 'Choose a slot'}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Mode</p>
                        <p className="mt-1 font-medium capitalize text-slate-900">{consultationType.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>

                  {selectedDate ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Available windows</label>
                          {windowsLoading ? (
                            <p className="text-sm text-gray-500">Loading windows...</p>
                          ) : windowData?.blackout ? (
                            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                              {windowData.message ?? 'Doctor is unavailable on this date. Please choose another date.'}
                            </p>
                          ) : availableWindows.length === 0 || availableWindows.every((window) => !window.available) ? (
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                              No available window for this date. Try another.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                Choose the chamber window that fits best. Capacity reflects current bookings and the highlighted option has the strongest remaining availability.
                              </div>
                              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                {availableWindows.map((window) => {
                                  if (!window.available) return null;
                                  const isBestWindow = strongestWindow?.window === window.window;
                                  return (
                                    <button
                                      key={window.window}
                                      type="button"
                                      onClick={() => setSelectedWindow(window.window)}
                                      className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                                        selectedWindow === window.window
                                          ? 'border-[#3990D7] bg-[#3990D7] text-white'
                                          : 'border-gray-300 bg-white text-gray-700 hover:border-[#3990D7] hover:bg-sky-50'
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
                                          <p className={`mt-1 text-xs ${selectedWindow === window.window ? 'text-sky-100' : 'text-gray-500'}`}>
                                            {window.timeRange}
                                          </p>
                                        </div>
                                        <span className={`text-xs font-medium ${selectedWindow === window.window ? 'text-sky-100' : 'text-gray-500'}`}>
                                          {window.maxPatients != null && window.maxPatients > 0 ? `${window.booked}/${window.maxPatients} booked` : 'Open capacity'}
                                        </span>
                                      </div>
                                      {window.maxPatients != null && window.maxPatients > 0 ? (
                                        <div className={`mt-3 text-xs ${selectedWindow === window.window ? 'text-sky-100' : 'text-gray-600'}`}>
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

                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason for visit</label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="What do you need help with?"
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3990D7] focus:ring-2 focus:ring-[#3990D7]"
                        />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Symptoms or notes</label>
                        <textarea
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          placeholder="Share symptoms, duration, or other clinical context."
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3990D7] focus:ring-2 focus:ring-[#3990D7]"
                        />
                    </div>
                  </div>

                  {hasRedFlags ? (
                    <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                          <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                              <p className="font-semibold">Urgent triage warning</p>
                              <p className="mt-1 text-sm text-rose-800">
                                Your notes include symptoms that may require urgent care. If this is an emergency, contact emergency services immediately instead of waiting for a routine appointment.
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
                                <span>I understand this may be urgent and still want to request a non-emergency consultation.</span>
                              </label>
                            </div>
                          </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Readiness checklist</p>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-600">Profile ready</span>
                            <span className={`font-medium ${needsProfileCompletion ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {needsProfileCompletion ? 'Action needed' : 'Ready'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-600">Date selected</span>
                            <span className={`font-medium ${selectedDate ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {selectedDate ? 'Ready' : 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-600">Window selected</span>
                            <span className={`font-medium ${selectedWindow ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {selectedWindow ? 'Ready' : 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-600">Triage acknowledgement</span>
                            <span className={`font-medium ${!hasRedFlags || triageConfirmed ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {!hasRedFlags ? 'Not needed' : triageConfirmed ? 'Confirmed' : 'Required'}
                            </span>
                          </div>
                        </div>
                  </div>

                  <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={!selectedDate || !selectedWindow || needsProfileCompletion || (hasRedFlags && !triageConfirmed) || bookMutation.isPending}
                          onClick={handleBook}
                          className="w-full rounded-xl bg-gradient-to-r from-[#3990D7] to-[#2d7ab8] px-4 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {bookMutation.isPending ? 'Booking...' : 'Request appointment'}
                        </button>
                        <Link
                          to={id ? `/app/patient-appointments?book=${id}` : '/app/patient-appointments'}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Open full booking workspace
                        </Link>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <p className="mb-4 text-sm text-gray-600">
                    Sign in as a patient to view slot availability and request an appointment from this profile.
                  </p>
                  <Link
                    to={`/login?redirect=/doctors/${id}`}
                    className="block w-full rounded-xl border-2 border-[#3990D7] px-4 py-3.5 text-center text-base font-semibold text-[#3990D7] transition-colors hover:bg-[#EAEFFF]"
                  >
                    Sign in to book
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
