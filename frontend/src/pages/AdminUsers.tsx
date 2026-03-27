import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api, useAuth } from '../context/AuthContext';
import { MEDICAL_DEPARTMENTS } from '../utils/departments';

type UserRole = 'admin' | 'patient' | 'doctor' | 'receptionist';

interface DoctorProfileSummary {
  department?: string | null;
  verified?: boolean;
  bmdcRegistrationNumber?: string | null;
  experience?: number | null;
  clinicId?: number | null;
  clinic?: { id: number; name: string } | null;
}

interface ReceptionistProfileSummary {
  clinicId?: number | null;
  employeeCode?: string | null;
  isActive?: boolean;
  clinic?: { id: number; name: string } | null;
}

interface UserRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  doctorId?: number | null;
  patientId?: number | null;
  doctorProfile?: DoctorProfileSummary | null;
  receptionistProfile?: ReceptionistProfileSummary | null;
}

interface UserListResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
}

interface UserFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  role: UserRole;
  isActive: boolean;
  password: string;
  department: string;
  bmdcRegistrationNumber: string;
  experience: string;
  clinicId: string;
  employeeCode: string;
  verified: boolean;
}

interface ClinicOption {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

function getRoleBadgeClasses(role: UserRole) {
  if (role === 'admin') return 'bg-violet-100 text-violet-800';
  if (role === 'doctor') return 'bg-blue-100 text-blue-800';
  if (role === 'receptionist') return 'bg-sky-100 text-sky-800';
  return 'bg-emerald-100 text-emerald-800';
}

function emptyFormValues(role: UserRole = 'patient'): UserFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    role,
    isActive: true,
    password: '',
    department: '',
    bmdcRegistrationNumber: '',
    experience: '',
    clinicId: '',
    employeeCode: '',
    verified: false,
  };
}

function formValuesFromUser(user: UserRow): UserFormValues {
  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    dateOfBirth: user.dateOfBirth ?? '',
    gender: user.gender ?? '',
    address: user.address ?? '',
    role: user.role,
    isActive: user.isActive,
    password: '',
    department: user.doctorProfile?.department ?? '',
    bmdcRegistrationNumber: user.doctorProfile?.bmdcRegistrationNumber ?? '',
    experience: user.doctorProfile?.experience != null ? String(user.doctorProfile.experience) : '',
    clinicId: user.role === 'receptionist'
      ? (user.receptionistProfile?.clinicId != null ? String(user.receptionistProfile.clinicId) : '')
      : (user.doctorProfile?.clinicId != null ? String(user.doctorProfile.clinicId) : ''),
    employeeCode: user.receptionistProfile?.employeeCode ?? '',
    verified: Boolean(user.doctorProfile?.verified),
  };
}

function clinicDisplayName(profile?: { clinicId?: number | null; clinic?: { id: number; name: string } | null } | null) {
  if (profile?.clinic?.name) return profile.clinic.name;
  if (profile?.clinicId) return `Clinic #${profile.clinicId}`;
  return 'Not assigned';
}

function buildUserPayload(values: UserFormValues, includePassword: boolean) {
  const payload: Record<string, unknown> = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim() || null,
    dateOfBirth: values.dateOfBirth || null,
    gender: values.gender || null,
    address: values.address.trim() || null,
    role: values.role,
    isActive: values.isActive,
  };

  if (includePassword && values.password.trim()) {
    payload.password = values.password;
  }

  if (values.role === 'doctor') {
    payload.department = values.department || null;
    payload.bmdcRegistrationNumber = values.bmdcRegistrationNumber.trim() || null;
    payload.experience = values.experience.trim() ? parseInt(values.experience, 10) : null;
    payload.clinicId = values.clinicId || null;
    payload.verified = values.verified;
  }
  if (values.role === 'receptionist') {
    payload.clinicId = values.clinicId || null;
    payload.employeeCode = values.employeeCode.trim() || null;
  }

  return payload;
}

function UserFormFields({
  values,
  onChange,
  includePassword,
  currentRole,
  isSelf,
  clinics = [],
}: {
  values: UserFormValues;
  onChange: (patch: Partial<UserFormValues>) => void;
  includePassword: boolean;
  currentRole?: UserRole;
  isSelf?: boolean;
  clinics?: ClinicOption[];
}) {
  const roleChanging = currentRole && currentRole !== values.role;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          placeholder="First name"
          value={values.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          required
          placeholder="Last name"
          value={values.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <input
        type="email"
        required
        placeholder="Email"
        value={values.email}
        onChange={(e) => onChange({ email: e.target.value })}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      {includePassword ? (
        <input
          type="password"
          required
          placeholder="Temporary password"
          value={values.password}
          onChange={(e) => onChange({ password: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      ) : (
        <input
          type="password"
          placeholder="Set new password (optional)"
          value={values.password}
          onChange={(e) => onChange({ password: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="tel"
          placeholder="Phone"
          value={values.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={values.dateOfBirth}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={values.gender}
          onChange={(e) => onChange({ gender: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <select
          value={values.role}
          onChange={(e) => onChange({ role: e.target.value as UserRole })}
          disabled={isSelf}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        >
          <option value="admin">Admin</option>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="receptionist">Receptionist</option>
        </select>
      </div>

      <textarea
        placeholder="Address"
        value={values.address}
        onChange={(e) => onChange({ address: e.target.value })}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <label className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
        <input
          type="checkbox"
          checked={values.isActive}
          disabled={isSelf}
          onChange={(e) => onChange({ isActive: e.target.checked })}
        />
        <span className="text-sm text-gray-700">Active account</span>
      </label>

      {roleChanging ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Changing role will update the linked role-specific profile for this user.
        </div>
      ) : null}

      {values.role === 'doctor' ? (
        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Doctor Oversight</p>
          <input
            type="text"
            placeholder="BMDC registration number"
            value={values.bmdcRegistrationNumber}
            onChange={(e) => onChange({ bmdcRegistrationNumber: e.target.value })}
            className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
          />
          <select
            value={values.department}
            onChange={(e) => onChange({ department: e.target.value })}
            className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
          >
            <option value="">Department</option>
            {MEDICAL_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="Years of experience"
            value={values.experience}
            onChange={(e) => onChange({ experience: e.target.value })}
            className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
          />
          <select
            value={values.clinicId}
            onChange={(e) => onChange({ clinicId: e.target.value })}
            className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
          >
            <option value="">Assign clinic</option>
            {clinics
              .filter((clinic) => clinic.status === 'active')
              .map((clinic) => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
            <input
              type="checkbox"
              checked={values.verified}
              onChange={(e) => onChange({ verified: e.target.checked })}
            />
            <span className="text-sm text-gray-700">Doctor verified for public listing</span>
          </label>
        </div>
      ) : null}

      {values.role === 'receptionist' ? (
        <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-900">Reception Desk Assignment</p>
          <select
            value={values.clinicId}
            onChange={(e) => onChange({ clinicId: e.target.value })}
            className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm"
          >
            <option value="">Assign clinic</option>
            {clinics
              .filter((clinic) => clinic.status === 'active')
              .map((clinic) => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
          </select>
          <input
            type="text"
            placeholder="Employee code"
            value={values.employeeCode}
            onChange={(e) => onChange({ employeeCode: e.target.value })}
            className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm"
          />
          <p className="text-xs text-sky-700">
            Receptionists should be clinic-scoped staff, not platform-wide operators.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function UserModal({
  title,
  description,
  values,
  onChange,
  onClose,
  onSubmit,
  isSubmitting,
  submitLabel,
  includePassword,
  currentRole,
  isSelf,
  clinics = [],
}: {
  title: string;
  description: string;
  values: UserFormValues;
  onChange: (patch: Partial<UserFormValues>) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  includePassword: boolean;
  currentRole?: UserRole;
  isSelf?: boolean;
  clinics?: ClinicOption[];
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="mt-5 space-y-4"
        >
          <UserFormFields
            values={values}
            onChange={onChange}
            includePassword={includePassword}
            currentRole={currentRole}
            isSelf={isSelf}
            clinics={clinics}
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#3990D7] py-2 text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const addMode = searchParams.get('add') === '1';
  const initialRoleFilter = searchParams.get('role') || '';
  const initialActiveFilter = searchParams.get('isActive') || '';
  const initialVerifiedFilter = searchParams.get('verified') || '';
  const initialSearch = searchParams.get('search') || '';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
  const [activeFilter, setActiveFilter] = useState(initialActiveFilter);
  const [verifiedFilter, setVerifiedFilter] = useState(initialVerifiedFilter);
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(addMode);
  const [addForm, setAddForm] = useState<UserFormValues>(emptyFormValues());
  const [editForm, setEditForm] = useState<UserFormValues>(emptyFormValues());

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter, activeFilter, verifiedFilter],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (activeFilter) params.isActive = activeFilter;
      if (verifiedFilter && roleFilter === 'doctor') params.verified = verifiedFilter;
      const { data: res } = await api.get<{ success: boolean; data: UserListResponse }>('/admin/users', { params });
      return res.data;
    },
  });

  const { data: clinics = [] } = useQuery({
    queryKey: ['admin', 'clinics', 'options'],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { clinics: ClinicOption[] } }>('/admin/clinics');
      return res.data?.clinics ?? [];
    },
  });

  const createUser = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/admin/users', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setShowAddModal(false);
      setAddForm(emptyFormValues());
      setSearchParams({});
      toast.success('User created');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => api.put(`/admin/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setEditingUser(null);
      toast.success('User updated');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.put(`/admin/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('User status updated');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const overview = useMemo(() => {
    const activeUsers = users.filter((entry) => entry.isActive).length;
    const doctorUsers = users.filter((entry) => entry.role === 'doctor').length;
    const verifiedDoctors = users.filter((entry) => entry.role === 'doctor' && entry.doctorProfile?.verified).length;
    const admins = users.filter((entry) => entry.role === 'admin').length;

    return { activeUsers, doctorUsers, verifiedDoctors, admins };
  }, [users]);

  function updateQueryParams(next: {
    add?: boolean;
    search?: string;
    role?: string;
    isActive?: string;
    verified?: string;
  }) {
    const params = new URLSearchParams();
    if (next.add) params.set('add', '1');
    if (next.search) params.set('search', next.search);
    if (next.role) params.set('role', next.role);
    if (next.isActive) params.set('isActive', next.isActive);
    if (next.verified && next.role === 'doctor') params.set('verified', next.verified);
    setSearchParams(params);
  }

  function applyFocusFilter(role: '' | UserRole, verified: '' | 'true' | 'false' = '', active: '' | 'true' | 'false' = '') {
    setRoleFilter(role);
    setVerifiedFilter(role === 'doctor' ? verified : '');
    setActiveFilter(active);
    setPage(1);
    updateQueryParams({
      search: search.trim(),
      role,
      isActive: active,
      verified: role === 'doctor' ? verified : '',
    });
  }

  function openEditModal(targetUser: UserRow) {
    setEditingUser(targetUser);
    setEditForm(formValuesFromUser(targetUser));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
            <p className="text-sm text-slate-600">
              Manage account lifecycle, activation status, role transitions, and doctor verification from one workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              updateQueryParams({
                add: true,
                search: search.trim(),
                role: roleFilter,
                isActive: activeFilter,
                verified: verifiedFilter,
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3990D7] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d7ab8]"
          >
            <PlusIcon className="h-5 w-5" />
            Add User
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-blue-700">
              <UserGroupIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Loaded Users</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-900">{users.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircleIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Active</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{overview.activeUsers}</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
            <div className="flex items-center gap-2 text-violet-700">
              <ShieldCheckIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Admins</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-violet-900">{overview.admins}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-700">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Verified Doctors</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-900">
              {overview.verifiedDoctors}/{overview.doctorUsers}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyFocusFilter('')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${roleFilter === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            All Users
          </button>
          <button
            type="button"
            onClick={() => applyFocusFilter('doctor', 'false')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${roleFilter === 'doctor' && verifiedFilter === 'false' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
          >
            Pending Doctor Review
          </button>
          <button
            type="button"
            onClick={() => applyFocusFilter('doctor', 'true')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${roleFilter === 'doctor' && verifiedFilter === 'true' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
          >
            Verified Doctors
          </button>
          <button
            type="button"
            onClick={() => applyFocusFilter('patient')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${roleFilter === 'patient' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
          >
            Patients
          </button>
          <button
            type="button"
            onClick={() => applyFocusFilter('admin')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${roleFilter === 'admin' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-800 hover:bg-violet-100'}`}
          >
            Admins
          </button>
          <button
            type="button"
            onClick={() => applyFocusFilter(roleFilter as '' | UserRole, roleFilter === 'doctor' ? verifiedFilter as '' | 'true' | 'false' : '', 'false')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeFilter === 'false' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'}`}
          >
            Inactive Accounts
          </button>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                const next = e.target.value;
                setSearch(next);
                setPage(1);
                updateQueryParams({
                  add: showAddModal,
                  search: next.trim(),
                  role: roleFilter,
                  isActive: activeFilter,
                  verified: verifiedFilter,
                });
              }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-[#3990D7]"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              const nextRole = e.target.value;
              setRoleFilter(nextRole);
              if (nextRole !== 'doctor') setVerifiedFilter('');
              setPage(1);
              updateQueryParams({
                add: showAddModal,
                search: search.trim(),
                role: nextRole,
                isActive: activeFilter,
                verified: nextRole === 'doctor' ? verifiedFilter : '',
              });
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="receptionist">Receptionist</option>
            <option value="patient">Patient</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              const next = e.target.value;
              setActiveFilter(next);
              setPage(1);
              updateQueryParams({
                add: showAddModal,
                search: search.trim(),
                role: roleFilter,
                isActive: next,
                verified: verifiedFilter,
              });
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {roleFilter === 'doctor' ? (
            <select
              value={verifiedFilter}
              onChange={(e) => {
                const next = e.target.value;
                setVerifiedFilter(next);
                setPage(1);
                updateQueryParams({
                  add: showAddModal,
                  search: search.trim(),
                  role: roleFilter,
                  isActive: activeFilter,
                  verified: next,
                });
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All doctor verification</option>
              <option value="true">Verified doctors</option>
              <option value="false">Pending doctors</option>
            </select>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-8 text-center text-gray-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No users found.</p>
        ) : (
          <>
            <div className="grid gap-4 p-5 xl:grid-cols-2">
              {users.map((entry) => {
                const isSelf = currentUser?.id === entry.id;
                return (
                  <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-slate-900">
                            {entry.firstName} {entry.lastName}
                          </p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeClasses(entry.role)}`}>
                            {entry.role}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                            {entry.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {isSelf ? (
                            <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                              You
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{entry.email}</p>
                        <p className="text-xs text-slate-500">
                          {entry.phone || 'No phone'} {entry.dateOfBirth ? `• DOB ${entry.dateOfBirth}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditModal(entry)}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked Profile</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {entry.role === 'doctor'
                            ? (entry.doctorId ? `Doctor #${entry.doctorId}` : 'Doctor profile pending')
                            : entry.role === 'receptionist'
                              ? (entry.receptionistProfile?.clinicId ? `Receptionist • Clinic #${entry.receptionistProfile.clinicId}` : 'Reception desk assignment pending')
                            : entry.role === 'patient'
                              ? (entry.patientId ? `Patient #${entry.patientId}` : 'Patient profile pending')
                              : 'Admin account'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oversight</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {entry.role === 'doctor'
                            ? (entry.doctorProfile?.verified ? 'Verified doctor' : 'Pending verification')
                            : entry.role === 'receptionist'
                              ? clinicDisplayName(entry.receptionistProfile)
                            : entry.isActive ? 'Can sign in' : 'Blocked from sign-in'}
                        </p>
                      </div>
                    </div>

                    {entry.role === 'doctor' ? (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-900">
                        <p className="font-medium">
                          {entry.doctorProfile?.department || 'Department not set'}
                          {entry.doctorProfile?.experience != null ? ` • ${entry.doctorProfile.experience} years` : ''}
                        </p>
                        <p className="mt-1 text-blue-800">
                          BMDC: {entry.doctorProfile?.bmdcRegistrationNumber || 'Not recorded'}
                        </p>
                        <p className="mt-1 text-blue-800">
                          Clinic: {clinicDisplayName(entry.doctorProfile)}
                        </p>
                      </div>
                    ) : null}

                    {entry.role === 'receptionist' ? (
                      <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-3 text-sm text-sky-900">
                        <p className="font-medium">
                          Clinic: {clinicDisplayName(entry.receptionistProfile)}
                        </p>
                        <p className="mt-1 text-sky-800">
                          Employee code: {entry.receptionistProfile?.employeeCode || 'Not recorded'}
                        </p>
                      </div>
                    ) : null}

                    {entry.address ? (
                      <p className="mt-3 text-sm text-slate-500">{entry.address}</p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive.mutate({ id: entry.id, isActive: !entry.isActive })}
                        disabled={toggleActive.isPending || isSelf}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {entry.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(entry)}
                        className="rounded-lg bg-[#3990D7] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2d7ab8]"
                      >
                        Manage Role & Access
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {showAddModal ? (
        <UserModal
          title="Add User"
          description="Create a new account and assign its initial role and access state."
          values={addForm}
          onChange={(patch) => setAddForm((current) => ({ ...current, ...patch }))}
          onClose={() => {
            setShowAddModal(false);
            updateQueryParams({
              search: search.trim(),
              role: roleFilter,
              isActive: activeFilter,
              verified: verifiedFilter,
            });
            setAddForm(emptyFormValues());
          }}
          onSubmit={() => createUser.mutate(buildUserPayload(addForm, true))}
          isSubmitting={createUser.isPending}
          submitLabel="Create User"
          includePassword
          clinics={clinics}
        />
      ) : null}

      {editingUser ? (
        <UserModal
          title="Manage User"
          description="Adjust role oversight, profile details, password, and account activation state."
          values={editForm}
          onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
          onClose={() => setEditingUser(null)}
          onSubmit={() => updateUser.mutate({ id: editingUser.id, body: buildUserPayload(editForm, false) })}
          isSubmitting={updateUser.isPending}
          submitLabel="Save Changes"
          includePassword={false}
          currentRole={editingUser.role}
          isSelf={currentUser?.id === editingUser.id}
          clinics={clinics}
        />
      ) : null}
    </div>
  );
}
