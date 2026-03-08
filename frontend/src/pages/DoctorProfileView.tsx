import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  CheckBadgeIcon,
  AcademicCapIcon,
  LanguageIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { api, useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DoctorProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const { data: profileRes, isLoading: loadingProfile, error: profileError } = useQuery({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { doctor: DoctorProfileData } }>(`/doctors/${id}`);
      return data.data?.doctor ?? null;
    },
    enabled: !!id,
  });

  const { data: availableWindows = [], isLoading: windowsLoading } = useQuery({
    queryKey: ['available-slots', id, selectedDate],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { windows: Array<{ window: string; label: string; timeRange: string; enabled: boolean; maxPatients: number | null; booked: number; spotsLeft: number; available: boolean }> } }>(
        `/doctors/${id}/available-slots`,
        { params: { date: selectedDate } }
      );
      return data.data?.windows ?? [];
    },
    enabled: !!id && !!selectedDate,
  });

  const bookMutation = useMutation({
    mutationFn: (body: { doctorId: number; appointmentDate: string; window: string; type: string; reason?: string; symptoms?: string }) =>
      api.post('/appointments', body),
    onSuccess: () => {
      toast.success('Appointment requested');
      setSelectedDate('');
      setSelectedWindow('');
      setReason('');
      setSymptoms('');
      queryClient.invalidateQueries({ queryKey: ['available-slots', id] });
      queryClient.invalidateQueries({ queryKey: ['doctor', id, 'upcoming-slots'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to book');
    },
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

  const doctor = profileRes ?? null;
  const rating = ratingsRes ?? { averageRating: 0, totalRatings: 0 };
  const name = doctor?.user ? `Dr. ${doctor.user.firstName} ${doctor.user.lastName}` : 'Doctor';
  const imgSrc = doctor?.profileImage
    ? (doctor.profileImage.startsWith('http') ? doctor.profileImage : `${API_BASE}${doctor.profileImage}`)
    : null;
  const languages = Array.isArray(doctor?.languages) ? doctor.languages : [];
  const expertise = Array.isArray(doctor?.services) ? doctor.services : [];

  if (loadingProfile || (id && !doctor && !profileError)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading doctor profile...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-gray-600">Doctor not found.</p>
        <Link to="/doctors" className="text-[#3990D7] hover:underline mt-2 inline-block">Back to doctors</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-6 w-6" />
          <span>Back</span>
        </button>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Profile details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm">
              <div className="relative">
                <div className="aspect-[3/2] bg-sky-50 flex items-center justify-center overflow-hidden">
                  {imgSrc ? (
                    <img src={imgSrc} alt={name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <UserCircleIcon className="w-32 h-32 text-sky-300" />
                  )}
                  {doctor.verified && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-white text-sm font-medium">
                      <CheckBadgeIcon className="h-4 w-4" />
                      Verified
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                  <p className="text-lg text-gray-600 mt-0.5">{doctor.department || 'General physician'}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <span className="flex items-center gap-1 text-amber-500">
                      {'★'.repeat(Math.round(rating.averageRating))}
                      <span className="text-gray-700 font-medium">{rating.averageRating.toFixed(1)}</span>
                      <span className="text-gray-500 text-sm">({rating.totalRatings} reviews)</span>
                    </span>
                    {doctor.experience != null && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-700">
                        {doctor.experience} years experience
                      </span>
                    )}
                    {(doctor.patientCount ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-700">
                        {doctor.patientCount} patients
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {doctor.education && (
              <div className="rounded-xl bg-white border border-gray-200 p-6">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                  <AcademicCapIcon className="h-5 w-5 text-[#3990D7]" />
                  Education & Qualifications
                </h2>
                <p className="text-gray-600 whitespace-pre-wrap">{doctor.education}</p>
              </div>
            )}

            <div className="rounded-xl bg-white border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Professional Information</h2>
              <ul className="space-y-1.5 text-gray-600">
                <li><span className="text-gray-500">Doctor ID:</span> DR-{doctor.id}</li>
                {doctor.bmdcRegistrationNumber && (
                  <li><span className="text-gray-500">License:</span> {doctor.bmdcRegistrationNumber}</li>
                )}
                <li><span className="text-gray-500">Specialization:</span> {doctor.department || '—'}</li>
                <li><span className="text-gray-500">Department:</span> {doctor.department || '—'}</li>
              </ul>
            </div>

            {languages.length > 0 && (
              <div className="rounded-xl bg-white border border-gray-200 p-6">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                  <LanguageIcon className="h-5 w-5 text-[#3990D7]" />
                  Languages Spoken
                </h2>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <span key={lang} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-white border border-gray-200 p-6">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">Contact Information</h2>
              <ul className="space-y-2 text-gray-600">
                {doctor.user?.email && (
                  <li className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                    {doctor.user.email}
                  </li>
                )}
                {doctor.user?.phone && (
                  <li className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                    {doctor.user.phone}
                  </li>
                )}
                {doctor.location && (
                  <li className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                    {doctor.hospital ? `${doctor.hospital}, ` : ''}{doctor.location}
                  </li>
                )}
              </ul>
            </div>

            {doctor.bio && (
              <div className="rounded-xl bg-white border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">About {name.split(' ')[1] || 'the doctor'}</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{doctor.bio}</p>
              </div>
            )}

            {expertise.length > 0 && (
              <div className="rounded-xl bg-white border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Areas of Expertise</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {expertise.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-600">
                      <span className="text-green-500">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: Booking card */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm sticky top-6">
              <div className="mb-6">
                <p className="text-gray-600">Consultation Fee</p>
                <p className="text-2xl font-bold text-[#3990D7]">
                  ৳{doctor.consultationFee != null ? Number(doctor.consultationFee) : '—'}
                </p>
                <p className="text-sm text-gray-500">Per consultation session</p>
              </div>

              {isPatient ? (
                <>
                  <h2 className="font-semibold text-gray-900 mb-3">Book appointment</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Choose date</label>
                      <input
                        type="date"
                        min={todayStr()}
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setSelectedWindow('');
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#3990D7] focus:border-[#3990D7]"
                      />
                    </div>

                    {selectedDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Available windows</label>
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
                                  className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                                    selectedWindow === w.window
                                      ? 'border-[#3990D7] bg-[#3990D7] text-white'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-[#3990D7] hover:bg-sky-50'
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for visit (optional)</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Regular check-up, follow-up..."
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#3990D7] focus:border-[#3990D7]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Symptoms / notes (optional)</label>
                      <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="Any symptoms or details to share..."
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#3990D7] focus:border-[#3990D7]"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!selectedDate || !selectedWindow || bookMutation.isPending}
                      onClick={() => {
                        if (!id || !selectedDate || !selectedWindow) return;
                        bookMutation.mutate({
                          doctorId: parseInt(id, 10),
                          appointmentDate: selectedDate,
                          window: selectedWindow,
                          type: 'in_person',
                          reason: reason || undefined,
                          symptoms: symptoms || undefined,
                        });
                      }}
                      className="w-full rounded-xl bg-gradient-to-r from-[#3990D7] to-[#2d7ab8] py-3.5 px-4 text-base font-semibold text-white hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookMutation.isPending ? 'Booking...' : 'Book appointment'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="pt-2">
                  <Link
                    to={`/login?redirect=/doctors/${id}`}
                    className="block w-full text-center rounded-xl border-2 border-[#3990D7] py-3.5 px-4 text-base font-semibold text-[#3990D7] hover:bg-[#EAEFFF] transition-colors"
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
