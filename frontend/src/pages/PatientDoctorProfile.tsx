import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { api, useAuth } from '../context/AuthContext';
import BookAppointmentModal from '../components/BookAppointmentModal';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

interface DoctorProfileData {
  id: number;
  clinicId?: number | null;
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
  clinic?: {
    id: number;
    name: string;
    type?: string;
    addressLine?: string;
    area?: string;
    city?: string;
    phone?: string;
    email?: string;
    operatingHours?: string;
  } | null;
  user?: { firstName: string; lastName: string; email?: string; phone?: string };
}

interface UpcomingSlot {
  date: string;
  dayName: string;
  windows: Array<{
    window: string;
    label: string;
    timeRange: string;
    maxPatients: number | null;
    booked: number;
    spotsLeft: number | null;
    available: boolean;
  }>;
}

export default function PatientDoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';
  const [showBookModal, setShowBookModal] = useState(false);

  const { data: doctor, isLoading: loadingProfile, error: profileError } = useQuery({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { doctor: DoctorProfileData } }>(`/doctors/${id}`);
      return data.data?.doctor ?? null;
    },
    enabled: !!id,
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

  const { data: upcomingSlots = [] } = useQuery({
    queryKey: ['doctor-upcoming-slots', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { slots: UpcomingSlot[] } }>(`/doctors/${id}/upcoming-slots`, {
        params: { days: 10 },
      });
      return data.data?.slots ?? [];
    },
    enabled: !!id,
  });

  const rating = ratingsRes ?? { averageRating: 0, totalRatings: 0 };
  const name = doctor?.user ? `Dr. ${doctor.user.firstName} ${doctor.user.lastName}` : 'Doctor';
  const imgSrc = doctor?.profileImage
    ? (doctor.profileImage.startsWith('http') ? doctor.profileImage : `${API_BASE}${doctor.profileImage}`)
    : null;
  const languages = Array.isArray(doctor?.languages) ? doctor.languages : [];
  const expertise = Array.isArray(doctor?.services) ? doctor.services : [];
  const availabilityPreview = upcomingSlots.slice(0, 3);
  const publicAddress = doctor?.clinic
    ? [doctor.clinic.addressLine, doctor.clinic.area, doctor.clinic.city].filter(Boolean).join(', ')
    : doctor?.location;
  const publicFacilityName = doctor?.clinic?.name || (doctor?.clinicId ? `Clinic #${doctor.clinicId}` : doctor?.hospital);

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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Clinic</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{publicFacilityName || 'Practice location not listed'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Location</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{publicAddress || 'Location not listed'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Consultation fee</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">৳{doctor.consultationFee != null ? Number(doctor.consultationFee) : '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 px-5 py-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Availability snapshot</p>
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
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-semibold text-white">{isPatient ? 'Bookable online' : 'Sign in required'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Reviews</p>
                  <p className="mt-1 text-sm font-semibold text-white">{rating.totalRatings} total ratings</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Next opening</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {availabilityPreview[0] ? `${availabilityPreview[0].dayName}, ${availabilityPreview[0].date}` : 'No slots published'}
                  </p>
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
                    {publicAddress ? (
                      <p className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-slate-400" />
                        {publicFacilityName ? `${publicFacilityName}, ` : ''}{publicAddress}
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
                <h2 className="text-lg font-semibold text-slate-950">Available times</h2>
              </div>

              {isPatient ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="h-5 w-5 text-sky-600" />
                      <p className="text-sm font-semibold text-slate-900">Upcoming schedule</p>
                    </div>
                    {availabilityPreview.length > 0 ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {availabilityPreview.map((slot) => (
                          <div key={slot.date} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {slot.dayName}, {slot.date}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {slot.windows.map((window) => (
                                <span key={`${slot.date}-${window.window}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                  {window.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Schedule updates soon.</p>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setShowBookModal(true)}
                      className="w-full rounded-xl bg-gradient-to-r from-[#3990D7] to-[#2d7ab8] px-4 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-95"
                    >
                      Book appointment
                    </button>
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

        {showBookModal && id ? (
          <BookAppointmentModal
            prefilledDoctorId={parseInt(id, 10)}
            lockDoctor
            onClose={() => setShowBookModal(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
