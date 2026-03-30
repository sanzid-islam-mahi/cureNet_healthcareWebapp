/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, useAuth } from '../context/AuthContext';
import { MEDICAL_DEPARTMENTS } from '../utils/departments';
import { WEEKDAYS } from '../utils/timeSlots';
import {
  UserCircleIcon,
  CameraIcon,
  BriefcaseIcon,
  ClockIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  AdjustmentsHorizontalIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { LanguageIcon, StarIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { getApiOrigin } from '../lib/runtimeConfig';

const API_ORIGIN = getApiOrigin();

interface ChamberWindowConfig {
  enabled: boolean;
  maxPatients?: number;
}

type ChamberWindows = Partial<Record<typeof WEEKDAYS[number], Partial<Record<'morning' | 'noon' | 'evening', ChamberWindowConfig>>>>;

interface DoctorForm {
  bmdcRegistrationNumber?: string;
  department?: string;
  experience?: number;
  education?: string;
  certifications?: string;
  hospital?: string;
  location?: string;
  personalAddress?: string;
  consultationFee?: number;
  bio?: string;
  profileImage?: string;
  chamberWindows?: ChamberWindows;
  degrees?: string[];
  awards?: string[];
  languages?: string[];
  services?: string[];
  unavailableDates?: string[];
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
}

const WINDOWS = [
  { key: 'morning' as const, label: 'Morning', timeRange: '09:00–13:00' },
  { key: 'noon' as const, label: 'Noon', timeRange: '13:00–17:00' },
  { key: 'evening' as const, label: 'Evening', timeRange: '17:00–18:00' },
] as const;

const SCHEDULE_PRESETS = [
  { key: 'clinic-weekdays', label: 'Weekday Clinic', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], windows: ['morning', 'noon'] },
  { key: 'after-hours', label: 'After Hours', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], windows: ['evening'] },
  { key: 'six-day-practice', label: 'Six-Day Practice', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], windows: ['morning', 'noon'] },
] as const;

function emptyChamberWindows(): ChamberWindows {
  const out: ChamberWindows = {};
  for (const day of WEEKDAYS) {
    out[day] = {
      morning: { enabled: false, maxPatients: 0 },
      noon: { enabled: false, maxPatients: 0 },
      evening: { enabled: false, maxPatients: 0 },
    };
  }
  return out;
}

function normalizeChamberWindows(raw: ChamberWindows | null | undefined): ChamberWindows {
  const out = emptyChamberWindows();
  if (!raw || typeof raw !== 'object') return out;
  for (const day of WEEKDAYS) {
    const dayData = raw[day];
    if (dayData && typeof dayData === 'object') {
      for (const win of WINDOWS) {
        const winData = dayData[win.key];
        if (winData && typeof winData === 'object') {
          out[day] = out[day] || {};
          out[day]![win.key] = {
            enabled: winData.enabled === true,
            maxPatients: typeof winData.maxPatients === 'number' ? winData.maxPatients : 0,
          };
        }
      }
    }
  }
  return out;
}

function formatDisplayDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getScheduleStats(windows: ChamberWindows, blockedDates: string[]) {
  let activeDays = 0;
  let activeWindows = 0;
  let capacity = 0;

  for (const day of WEEKDAYS) {
    const dayWindows = windows[day] || {};
    const enabledForDay = WINDOWS.filter((window) => dayWindows[window.key]?.enabled);
    if (enabledForDay.length > 0) activeDays += 1;
    activeWindows += enabledForDay.length;
    capacity += enabledForDay.reduce((sum, window) => sum + (dayWindows[window.key]?.maxPatients || 0), 0);
  }

  return {
    activeDays,
    activeWindows,
    blockedDates: blockedDates.length,
    finiteCapacity: capacity,
  };
}

function buildPresetWindows(days: readonly string[], windows: readonly string[]): ChamberWindows {
  const next = emptyChamberWindows();
  for (const day of days) {
    const weekday = day as typeof WEEKDAYS[number];
    for (const window of WINDOWS) {
      next[weekday]![window.key] = {
        enabled: windows.includes(window.key),
        maxPatients: windows.includes(window.key) ? 12 : 0,
      };
    }
  }
  return next;
}

export default function DoctorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Independent edit states
  const [editingProfessional, setEditingProfessional] = useState(false);
  const [editingChamber, setEditingChamber] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);

  // Local state for complex fields
  const [chamberWindows, setChamberWindows] = useState<ChamberWindows>(emptyChamberWindows());
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [newUnavailableDate, setNewUnavailableDate] = useState('');
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [selectedExceptionWeekdays, setSelectedExceptionWeekdays] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: profileData } = useQuery({
    queryKey: ['doctors', 'profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { doctor: DoctorForm & { profileImage?: string, verified?: boolean, averageRating?: number } } }>(
        '/doctors/profile'
      );
      return data.data?.doctor;
    },
  });

  const doctor = profileData;

  const form = useForm<DoctorForm>({
    defaultValues: {
      department: '',
      experience: undefined,
      education: '',
      certifications: '',
      hospital: '',
      location: '',
      personalAddress: '',
      consultationFee: undefined,
      bio: '',
      degrees: [],
      awards: [],
      languages: [],
      services: [],
    },
  });

  // Master reset function to push DB state into form
  const resetFormToDB = useCallback(() => {
    if (doctor) {
      form.reset({
        department: doctor.department ?? '',
        experience: doctor.experience ?? undefined,
        education: doctor.education ?? '',
        certifications: doctor.certifications ?? '',
        hospital: doctor.hospital ?? '',
        location: doctor.location ?? '',
        personalAddress: doctor.personalAddress ?? '',
        consultationFee: doctor.consultationFee != null ? Number(doctor.consultationFee) : undefined,
        bio: doctor.bio ?? '',
        degrees: Array.isArray(doctor.degrees) ? doctor.degrees : [],
        awards: Array.isArray(doctor.awards) ? doctor.awards : [],
        languages: Array.isArray(doctor.languages) ? doctor.languages : [],
        services: Array.isArray(doctor.services) ? doctor.services : [],
        unavailableDates: Array.isArray(doctor.unavailableDates) ? doctor.unavailableDates : [],
      });
      setChamberWindows(normalizeChamberWindows(doctor.chamberWindows));
      setUnavailableDates(Array.isArray(doctor.unavailableDates) ? doctor.unavailableDates : []);
      if (doctor.profileImage) {
        setPreviewUrl(doctor.profileImage.startsWith('http') ? doctor.profileImage : `${API_ORIGIN}${doctor.profileImage}`);
      } else {
        setPreviewUrl(null);
      }
    }
  }, [doctor, form]);

  useEffect(() => {
    resetFormToDB();
  }, [resetFormToDB]);

  const degreesItems = useWatch({ control: form.control, name: 'degrees' }) ?? [];
  const servicesItems = useWatch({ control: form.control, name: 'services' }) ?? [];
  const languagesItems = useWatch({ control: form.control, name: 'languages' }) ?? [];
  const awardsItems = useWatch({ control: form.control, name: 'awards' }) ?? [];
  const scheduleStats = getScheduleStats(chamberWindows, unavailableDates);
  const upcomingBlockedDates = [...unavailableDates]
    .filter((date) => date >= new Date().toISOString().slice(0, 10))
    .sort()
    .slice(0, 6);

  const updateMutation = useMutation({
    mutationFn: async (payload: DoctorForm | FormData) => {
      // If it's pure JSON, merge with chamber windows
      if (!(payload instanceof FormData)) {
        await api.put('/doctors/profile', { ...payload, chamberWindows, unavailableDates });
      } else {
        // We handle image upload via the dedicated route
        await api.post('/doctors/upload-image', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors', 'profile'] });
      if (variables instanceof FormData) {
        toast.success('Profile picture updated');
      } else {
        toast.success('Profile updated');
        // Determine which section triggered the save manually via state
        if (editingProfessional) setEditingProfessional(false);
        if (editingChamber) setEditingChamber(false);
        if (editingDetails) setEditingDetails(false);
      }
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreviewUrl(URL.createObjectURL(file));

      // Trigger automatic mutation
      const formData = new FormData();
      formData.append('profileImage', file);
      updateMutation.mutate(formData);
    }
  };

  // Helper for rendering array-based fields
  const renderListField = (fieldKey: 'degrees' | 'awards' | 'languages' | 'services', label: string, items: string[]) => {
    return (
      <div key={fieldKey} className="col-span-1">
        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          {fieldKey === 'languages' && <LanguageIcon className="w-4 h-4 text-slate-400" />}
          {fieldKey === 'degrees' && <AcademicCapIcon className="w-4 h-4 text-slate-400" />}
          {fieldKey === 'awards' && <StarIcon className="w-4 h-4 text-amber-400" />}
          {fieldKey === 'services' && <AdjustmentsHorizontalIcon className="w-4 h-4 text-slate-400" />}
          {label}
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {items.length === 0 && (
            <span className="text-xs text-slate-400 italic bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              No {label.toLowerCase()} added
            </span>
          )}
          {items.map((val, idx) => (
            <span
              key={`${val}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm"
            >
              {val}
              {editingDetails && (
                <button
                  type="button"
                  onClick={() => {
                    const next = items.filter((_, i) => i !== idx);
                    form.setValue(fieldKey, next, { shouldDirty: true });
                  }}
                  className="ml-1 text-indigo-400 hover:text-rose-500 hover:bg-rose-50 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                  aria-label={`Remove ${label} item`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {editingDetails && (
          <input
            type="text"
            placeholder={`Add ${label.toLowerCase().slice(0, -1)} and press Enter`}
            className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const value = (e.currentTarget.value || '').trim();
              if (!value) return;
              if (!items.includes(value)) {
                form.setValue(fieldKey, [...items, value], { shouldDirty: true });
              }
              e.currentTarget.value = '';
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">

      {/* ================= HERO BANNER ================= */}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ================= LEFT SIDEBAR (IDENTITY) ================= */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transform transition-all hover:shadow-md">
            <div className="p-8 flex flex-col items-center border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
              {/* Profile Avatar with Upload */}
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-[0_0_15px_rgba(0,0,0,0.1)] bg-slate-100 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                      decoding="async"
                    />
                  ) : (
                    <UserCircleIcon className="w-24 h-24 text-slate-300" />
                  )}
                </div>
                {/* Upload Overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer backdrop-blur-sm"
                >
                  <CameraIcon className="w-8 h-8 text-white mb-1 drop-shadow-md" />
                  <span className="text-white text-xs font-bold tracking-wide drop-shadow-md">Change</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </div>

              {/* Doctor Name & verification */}
              <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-1 drop-shadow-sm">
                Dr. {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-blue-600 font-bold text-sm mb-4 bg-blue-50 px-3 py-1 rounded-full">{doctor?.department || 'Department unset'}</p>

              <div className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border ${doctor?.verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {doctor?.verified ? (
                  <span className="flex items-center gap-1.5"><CheckBadgeIcon className="w-4 h-4" /> Verified Practitioner</span>
                ) : (
                  'Pending Verification'
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-6 flex flex-col gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">BMDC Reg No.</span>
                <span className="text-sm font-semibold text-slate-800 font-mono bg-white px-2 py-1 rounded border border-slate-200">{doctor?.bmdcRegistrationNumber || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Public Rating</span>
                <div className="flex items-center gap-1">
                  <StarIcon className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-slate-700">{doctor?.averageRating ? doctor.averageRating.toFixed(1) : 'No Ratings'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600 mt-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <ShieldCheckIcon className="w-6 h-6 text-indigo-500 shrink-0" />
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Only verified credentials appear in public patient searches.
                </p>
              </div>
            </div>
          </div>
          {/* ================= SPECIALIZED DETAILS CARD (in sidebar) ================= */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <div className="px-6 py-5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl shadow-inner">
                  <StarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Details &amp; Pricing</h3>
              </div>

              {!editingDetails ? (
                <button
                  type="button"
                  onClick={() => setEditingDetails(true)}
                  className="px-4 py-1.5 text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-full transition-colors shadow-sm"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDetails(false);
                      resetFormToDB();
                    }}
                    className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={form.handleSubmit((d) => updateMutation.mutate(d))}
                    disabled={updateMutation.isPending}
                    className="flex items-center justify-center min-w-[60px] px-4 py-1.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg rounded-full transition-all disabled:opacity-70"
                  >
                    {updateMutation.isPending && editingDetails ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className={`p-6 space-y-6 transition-opacity duration-300 ${updateMutation.isPending && editingDetails ? 'opacity-50 pointer-events-none' : ''}`}>

              {/* Consultation Fee */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Consultation Fee (Tokens)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-bold">$</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    {...form.register('consultationFee', { valueAsNumber: true })}
                    readOnly={!editingDetails}
                    placeholder="0.00"
                    className="block w-full rounded-xl border border-slate-300 pl-8 pr-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm font-bold tracking-wide"
                  />
                </div>
              </div>

              {/* Board Certification */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <CheckBadgeIcon className="w-4 h-4 text-emerald-500" />
                  Board Certification
                </label>
                <input
                  {...form.register('certifications')}
                  readOnly={!editingDetails}
                  placeholder="e.g. Board Certified in Cardiology"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm font-medium"
                />
              </div>

              <div className="border-t border-slate-100"></div>

              {/* List fields */}
              <div className="space-y-6">
                {renderListField('degrees', 'Academic Degrees', degreesItems)}
                {renderListField('services', 'Medical Services', servicesItems)}
                {renderListField('languages', 'Languages Spoken', languagesItems)}
                {renderListField('awards', 'Notable Awards', awardsItems)}
              </div>

            </div>
          </div>
        </div>

        {/* ================= RIGHT MAIN CONTENT (FORMS) ================= */}
        <div className="lg:col-span-2 space-y-8">

          {/* 1. PROFESSIONAL INFO CARD */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shadow-inner">
                  <BriefcaseIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Professional Information</h3>
              </div>

              {!editingProfessional ? (
                <button
                  type="button"
                  onClick={() => setEditingProfessional(true)}
                  className="px-5 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors shadow-sm"
                >
                  Edit Details
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfessional(false);
                      resetFormToDB();
                    }}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={form.handleSubmit((d) => updateMutation.mutate(d))}
                    disabled={updateMutation.isPending}
                    className="flex items-center justify-center min-w-[80px] px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg rounded-full transition-all disabled:opacity-70"
                  >
                    {updateMutation.isPending && editingProfessional ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className={`p-6 md:p-8 space-y-6 transition-opacity duration-300 ${updateMutation.isPending && editingProfessional ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    Department
                  </label>
                  <select
                    {...form.register('department')}
                    disabled={!editingProfessional}
                    className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-600 disabled:shadow-none appearance-none transition-all shadow-sm"
                  >
                    <option value="">Select Specialization...</option>
                    {MEDICAL_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    {...form.register('experience', { valueAsNumber: true })}
                    readOnly={!editingProfessional}
                    placeholder="e.g. 5"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-4 h-4" /> Hospital / Clinic
                  </label>
                  <input
                    {...form.register('hospital')}
                    readOnly={!editingProfessional}
                    placeholder="Primary Practice Location"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" /> City Location
                  </label>
                  <input
                    {...form.register('location')}
                    readOnly={!editingProfessional}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm font-medium"
                  />
                </div>
              </div>

              {doctor?.clinic ? (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Assigned Clinic</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{doctor.clinic.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {[doctor.clinic.addressLine, doctor.clinic.area, doctor.clinic.city].filter(Boolean).join(', ') || 'Clinic address not configured'}
                  </p>
                  <p className="mt-2 text-sm text-sky-800">
                    Patients will see this clinic address while booking. Your personal address stays private.
                  </p>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Personal Address (Private)</label>
                <textarea
                  {...form.register('personalAddress')}
                  readOnly={!editingProfessional}
                  rows={3}
                  placeholder="Private personal address for admin and your own records. Patients cannot see this."
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Professional Biography</label>
                <textarea
                  {...form.register('bio')}
                  readOnly={!editingProfessional}
                  rows={4}
                  placeholder="Describe your medical background, specialization, and treatment philosophy..."
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* 2. CHAMBER AVAILABILITY CARD */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <div className="px-6 py-5 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Chamber Availability</h3>
              </div>

              {!editingChamber ? (
                <button
                  type="button"
                  onClick={() => setEditingChamber(true)}
                  className="px-5 py-2 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full transition-colors shadow-sm"
                >
                  Edit Schedule
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingChamber(false);
                      resetFormToDB();
                      setNewUnavailableDate('');
                      setRangeStartDate('');
                      setRangeEndDate('');
                      setSelectedExceptionWeekdays([]);
                    }}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={form.handleSubmit((d) => updateMutation.mutate(d))}
                    disabled={updateMutation.isPending}
                    className="flex items-center justify-center min-w-[80px] px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg rounded-full transition-all disabled:opacity-70"
                  >
                    {updateMutation.isPending && editingChamber ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className={`p-6 md:p-8 space-y-6 transition-opacity duration-300 ${updateMutation.isPending && editingChamber ? 'opacity-50 pointer-events-none' : ''}`}>
              <p className="text-sm font-medium text-slate-500 mb-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                Configure your recurring weekly chamber schedule, then use blocked dates and bulk exceptions to handle leave, closures, or temporary schedule changes.
              </p>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Active Days</p>
                  <p className="mt-2 text-2xl font-extrabold text-indigo-900">{scheduleStats.activeDays}</p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Active Windows</p>
                  <p className="mt-2 text-2xl font-extrabold text-sky-900">{scheduleStats.activeWindows}</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Blocked Dates</p>
                  <p className="mt-2 text-2xl font-extrabold text-rose-900">{scheduleStats.blockedDates}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Known Weekly Capacity</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-900">
                    {scheduleStats.finiteCapacity > 0 ? scheduleStats.finiteCapacity : 'Open'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Schedule Presets</h4>
                    <p className="text-xs text-slate-500">
                      Use presets for a quick baseline, then fine-tune per day below.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SCHEDULE_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        disabled={!editingChamber}
                        onClick={() => setChamberWindows(buildPresetWindows(preset.days, preset.windows))}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={!editingChamber}
                      onClick={() => setChamberWindows(emptyChamberWindows())}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Day</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Morning <span className="text-[10px] lowercase font-normal block">09:00-13:00</span></th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Noon <span className="text-[10px] lowercase font-normal block">13:00-17:00</span></th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Evening <span className="text-[10px] lowercase font-normal block">17:00-18:00</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {WEEKDAYS.map((day) => {
                      const dayWindows = chamberWindows[day] || {};

                      return (
                        <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 capitalize">
                            {day}
                          </td>
                          {WINDOWS.map((w) => {
                            const config = dayWindows[w.key] || { enabled: false, maxPatients: 0 };
                            const enabled = config.enabled === true;
                            const maxPatients = config.maxPatients || 0;

                            return (
                              <td key={w.key} className="px-6 py-4">
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    disabled={!editingChamber}
                                    onChange={(e) => {
                                      if (!editingChamber) return;
                                      setChamberWindows((prev) => {
                                        const next = { ...prev };
                                        if (!next[day]) next[day] = {};
                                        next[day] = { ...next[day], [w.key]: { enabled: e.target.checked, maxPatients } };
                                        return next;
                                      });
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
                                  />
                                  <span className={`text-sm font-semibold transition-colors ${enabled ? 'text-indigo-700' : 'text-slate-400'}`}>
                                    {enabled ? 'Active' : 'Off'}
                                  </span>
                                </label>

                                <div className={`transition-all duration-300 overflow-hidden ${enabled ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                  {editingChamber ? (
                                    <div className="flex items-center gap-2 mt-2">
                                      <input
                                        type="number"
                                        min={0}
                                        value={maxPatients}
                                        onChange={(e) => {
                                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                          setChamberWindows((prev) => {
                                            const next = { ...prev };
                                            if (!next[day]) next[day] = {};
                                            next[day] = { ...next[day], [w.key]: { enabled: true, maxPatients: val } };
                                            return next;
                                          });
                                        }}
                                        className="w-[70px] rounded-lg border border-slate-300 px-2 py-1 text-xs text-center font-bold focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                        placeholder="0"
                                      />
                                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                                        {maxPatients === 0 ? 'No Limit' : 'Spots'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="mt-1 flex items-center gap-1.5">
                                      <UsersIcon maxPatients={maxPatients} />
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDaysIcon className="w-5 h-5 text-rose-500" />
                    <h4 className="text-sm font-bold text-slate-800">Blocked Dates And Exceptions</h4>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Add one-off closures, leave windows, or recurring weekday exceptions within a chosen date range.
                  </p>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Single Date</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          type="date"
                          value={newUnavailableDate}
                          onChange={(e) => setNewUnavailableDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 10)}
                          disabled={!editingChamber}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        />
                        <button
                          type="button"
                          disabled={!editingChamber || !newUnavailableDate}
                          onClick={() => {
                            if (!newUnavailableDate) return;
                            setUnavailableDates((prev) => Array.from(new Set([...prev, newUnavailableDate])).sort());
                            setNewUnavailableDate('');
                          }}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Add Date
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Date Range Exception</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="date"
                          value={rangeStartDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setRangeStartDate(e.target.value)}
                          disabled={!editingChamber}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        />
                        <input
                          type="date"
                          value={rangeEndDate}
                          min={rangeStartDate || new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setRangeEndDate(e.target.value)}
                          disabled={!editingChamber}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day) => {
                          const selected = selectedExceptionWeekdays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={!editingChamber}
                              onClick={() => {
                                setSelectedExceptionWeekdays((prev) =>
                                  prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
                                );
                              }}
                              className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors disabled:opacity-50 ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={!editingChamber || !rangeStartDate || !rangeEndDate || selectedExceptionWeekdays.length === 0}
                        onClick={() => {
                          const nextDates: string[] = [];
                          const cursor = new Date(`${rangeStartDate}T00:00:00`);
                          const end = new Date(`${rangeEndDate}T00:00:00`);
                          while (cursor <= end) {
                            const weekday = WEEKDAYS[(cursor.getDay() + 6) % 7];
                            if (selectedExceptionWeekdays.includes(weekday)) {
                              nextDates.push(cursor.toISOString().slice(0, 10));
                            }
                            cursor.setDate(cursor.getDate() + 1);
                          }
                          setUnavailableDates((prev) => Array.from(new Set([...prev, ...nextDates])).sort());
                          setRangeStartDate('');
                          setRangeEndDate('');
                          setSelectedExceptionWeekdays([]);
                        }}
                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        Apply Exception Range
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      disabled={!editingChamber}
                      onClick={() => {
                        const today = new Date();
                        const end = new Date();
                        end.setDate(today.getDate() + 13);
                        const weekendDates: string[] = [];
                        const cursor = new Date(today);
                        while (cursor <= end) {
                          const weekday = WEEKDAYS[(cursor.getDay() + 6) % 7];
                          if (weekday === 'friday' || weekday === 'saturday') {
                            weekendDates.push(cursor.toISOString().slice(0, 10));
                          }
                          cursor.setDate(cursor.getDate() + 1);
                        }
                        setUnavailableDates((prev) => Array.from(new Set([...prev, ...weekendDates])).sort());
                      }}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Block Next 2 Weekends
                    </button>
                    <button
                      type="button"
                      disabled={!editingChamber}
                      onClick={() => setUnavailableDates([])}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      Clear Blocked Dates
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Exception Summary</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Upcoming blocked dates help you confirm that temporary schedule changes are reflected before patients try to book.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                  {unavailableDates.length === 0 ? (
                    <span className="text-xs text-slate-400">No blackout dates added</span>
                  ) : (
                    unavailableDates.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                        {d}
                        {editingChamber && (
                          <button
                            type="button"
                            onClick={() => setUnavailableDates((prev) => prev.filter((x) => x !== d))}
                            className="text-rose-500 hover:text-rose-700"
                            aria-label={`Remove ${d}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Next Blocked Dates</p>
                    {upcomingBlockedDates.length === 0 ? (
                      <p className="text-sm text-slate-500">No future blocked dates scheduled.</p>
                    ) : (
                      <div className="space-y-2">
                        {upcomingBlockedDates.map((date) => (
                          <div key={date} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm border border-slate-200">
                            <span className="font-medium text-slate-800">{formatDisplayDate(date)}</span>
                            <span className="text-xs text-rose-600 font-semibold">Blocked</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function UsersIcon({ maxPatients }: { maxPatients: number }) {
  if (maxPatients === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
        No Limit
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
      Max: {maxPatients}
    </span>
  )
}
