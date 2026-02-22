import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth, api } from '../context/AuthContext';
import {
  UserCircleIcon,
  CameraIcon,
  UserIcon,
  HeartIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

interface PatientData {
  bloodType?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  profileImage?: string;
}

interface PersonalForm {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

export default function PatientProfile() {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingMedical, setEditingMedical] = useState(false);

  // Image states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: profileData } = useQuery({
    queryKey: ['patients', 'profile'],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { patient: PatientData & { user?: PersonalForm } };
      }>('/patients/profile');
      return data.data?.patient;
    },
  });

  const patient = profileData;
  const personal = patient?.user ?? user;

  const personalForm = useForm<PersonalForm>({
    defaultValues: {
      firstName: personal?.firstName ?? '',
      lastName: personal?.lastName ?? '',
      phone: personal?.phone ?? '',
      dateOfBirth: personal?.dateOfBirth ?? '',
      gender: personal?.gender ?? '',
      address: personal?.address ?? '',
    },
  });

  const medicalForm = useForm<PatientData>({
    defaultValues: {
      bloodType: patient?.bloodType ?? '',
      allergies: patient?.allergies ?? '',
      emergencyContact: patient?.emergencyContact ?? '',
      emergencyPhone: patient?.emergencyPhone ?? '',
      insuranceProvider: patient?.insuranceProvider ?? '',
      insuranceNumber: patient?.insuranceNumber ?? '',
    },
  });

  useEffect(() => {
    if (personal) {
      personalForm.reset({
        firstName: personal.firstName ?? '',
        lastName: personal.lastName ?? '',
        phone: personal.phone ?? '',
        dateOfBirth: personal.dateOfBirth ?? '',
        gender: personal.gender ?? '',
        address: personal.address ?? '',
      });
    }
  }, [personal, personalForm]);

  useEffect(() => {
    if (patient) {
      medicalForm.reset({
        bloodType: patient.bloodType ?? '',
        allergies: patient.allergies ?? '',
        emergencyContact: patient.emergencyContact ?? '',
        emergencyPhone: patient.emergencyPhone ?? '',
        insuranceProvider: patient.insuranceProvider ?? '',
        insuranceNumber: patient.insuranceNumber ?? '',
      });
      if (patient.profileImage) {
        setPreviewUrl(patient.profileImage.startsWith('http') ? patient.profileImage : `${API_BASE}${patient.profileImage}`);
      }
    }
  }, [patient, medicalForm]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreviewUrl(URL.createObjectURL(file));
      // Automatically trigger upload when file is selected
      const formData = new FormData();
      formData.append('profileImage', file);
      updateMedicalMutation.mutate(formData as any); // Cast as any because type expects PatientData
    }
  };

  const updatePersonalMutation = useMutation({
    mutationFn: async (payload: PersonalForm) => {
      const { data } = await api.put<{ success: boolean; data: { user: unknown } }>('/auth/profile', payload);
      return data.data?.user;
    },
    onSuccess: (updatedUser) => {
      if (updatedUser) updateProfile(updatedUser as Parameters<typeof updateProfile>[0]);
      queryClient.invalidateQueries({ queryKey: ['patients', 'profile'] });
      setEditingPersonal(false);
      toast.success('Personal info updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  const updateMedicalMutation = useMutation({
    mutationFn: async (payload: PatientData | FormData) => {
      await api.put('/patients/profile', payload, {
        headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', 'profile'] });
      setEditingMedical(false);
      toast.success('Medical info updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  // Calculate profile completion
  const isProfileComplete = patient?.bloodType && patient?.emergencyContact && personal?.phone;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Layout Grid */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ================= LEFT SIDEBAR (IDENTITY) ================= */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transform transition-all hover:shadow-md">
            <div className="p-8 flex flex-col items-center border-b border-slate-100">
              {/* Profile Avatar with Upload */}
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-24 h-24 text-slate-300" />
                  )}
                </div>
                {/* Upload Overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                >
                  <CameraIcon className="w-8 h-8 text-white mb-1" />
                  <span className="text-white text-xs font-semibold">Change</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </div>

              {/* Patient Name & Status */}
              <h2 className="text-2xl font-bold text-slate-900 text-center mb-1">
                {personal?.firstName} {personal?.lastName}
              </h2>
              <p className="text-slate-500 text-sm mb-4">{user?.email}</p>

              <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${isProfileComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {isProfileComplete ? 'Profile Complete' : 'Action Needed'}
              </div>
            </div>

            <div className="bg-slate-50 p-6">
              <div className="flex items-center gap-3 text-slate-600 mb-4">
                <ShieldCheckIcon className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Data securely encrypted</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your medical information is kept strictly confidential and will only be shared with your authorized medical professionals during consultations.
              </p>
            </div>
          </div>
        </div>

        {/* ================= RIGHT MAIN CONTENT (FORMS) ================= */}
        <div className="lg:col-span-2 space-y-8">

          {/* PERSONAL INFO CARD */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <UserIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
              </div>

              {!editingPersonal ? (
                <button
                  type="button"
                  onClick={() => setEditingPersonal(true)}
                  className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                >
                  Edit Details
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPersonal(false);
                      personalForm.reset();
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={personalForm.handleSubmit((d) => updatePersonalMutation.mutate(d))}
                    disabled={updatePersonalMutation.isPending}
                    className="flex items-center justify-center min-w-[80px] px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-70"
                  >
                    {updatePersonalMutation.isPending ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className={`p-6 md:p-8 space-y-6 transition-opacity duration-300 ${updatePersonalMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name</label>
                  <input
                    {...personalForm.register('firstName', { required: true })}
                    readOnly={!editingPersonal}
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name</label>
                  <input
                    {...personalForm.register('lastName', { required: true })}
                    readOnly={!editingPersonal}
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    readOnly
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-slate-400">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    {...personalForm.register('phone')}
                    readOnly={!editingPersonal}
                    placeholder="+1 (555) 000-0000"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    {...personalForm.register('dateOfBirth')}
                    readOnly={!editingPersonal}
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                  <div className="relative">
                    <select
                      {...personalForm.register('gender')}
                      disabled={!editingPersonal}
                      className="block w-full rounded-xl border border-slate-300 pl-4 pr-10 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-600 appearance-none transition-all shadow-sm"
                    >
                      <option value="">Select gender...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 disabled:opacity-50">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Residential Address</label>
                <input
                  {...personalForm.register('address')}
                  readOnly={!editingPersonal}
                  placeholder="123 Health Ave, City, State, ZIP"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* MEDICAL INFO CARD */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <div className="px-6 py-5 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                  <HeartIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Medical Data & Emergency</h3>
              </div>

              {!editingMedical ? (
                <button
                  type="button"
                  onClick={() => setEditingMedical(true)}
                  className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors"
                >
                  Update Records
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMedical(false);
                      medicalForm.reset();
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={medicalForm.handleSubmit((d) => updateMedicalMutation.mutate(d))}
                    disabled={updateMedicalMutation.isPending}
                    className="flex items-center justify-center min-w-[80px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors disabled:opacity-70"
                  >
                    {updateMedicalMutation.isPending ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className={`p-6 md:p-8 space-y-8 transition-opacity duration-300 ${updateMedicalMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}>

              {/* Vital Health Info Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Blood Type</label>
                  <div className="relative">
                    <select
                      {...medicalForm.register('bloodType')}
                      disabled={!editingMedical}
                      className="block w-full rounded-xl border border-slate-300 pl-4 pr-10 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-600 appearance-none transition-all shadow-sm"
                    >
                      <option value="">Select blood type...</option>
                      {BLOOD_TYPES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 disabled:opacity-50">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Known Allergies</label>
                  <input
                    {...medicalForm.register('allergies')}
                    readOnly={!editingMedical}
                    placeholder="e.g. Penicillin, Pollen, Peanuts (comma-separated)"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Horizontal Divider */}
              <div className="border-t border-slate-100"></div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Emergency Contact</h4>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Name</label>
                    <input
                      {...medicalForm.register('emergencyContact')}
                      readOnly={!editingMedical}
                      placeholder="Full Name"
                      className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Phone</label>
                    <input
                      {...medicalForm.register('emergencyPhone')}
                      readOnly={!editingMedical}
                      placeholder="+1 (555) 000-0000"
                      className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Horizontal Divider */}
              <div className="border-t border-slate-100"></div>

              {/* Insurance */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Health Insurance</h4>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Insurance Provider</label>
                    <input
                      {...medicalForm.register('insuranceProvider')}
                      readOnly={!editingMedical}
                      placeholder="e.g. BlueCross, Medicare"
                      className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Policy / Member Number</label>
                    <input
                      {...medicalForm.register('insuranceNumber')}
                      readOnly={!editingMedical}
                      placeholder="XXX-XXXXX-XXXX"
                      className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-slate-50 read-only:border-slate-200 read-only:text-slate-600 read-only:shadow-none transition-all shadow-sm"
                    />
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
