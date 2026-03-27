import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuildingOffice2Icon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  PencilSquareIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import AppPageHeader from '../components/AppPageHeader';
import { api } from '../context/AuthContext';

interface ClinicDoctor {
  id: number;
  userId: number;
  department?: string | null;
  verified?: boolean;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface ClinicRow {
  id: number;
  name: string;
  type: 'hospital' | 'clinic' | 'diagnostic_center';
  code?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine?: string | null;
  city?: string | null;
  area?: string | null;
  status: 'active' | 'inactive';
  departments?: string[];
  services?: string[];
  operatingHours?: string | null;
  notes?: string | null;
  doctorCount?: number;
  doctors?: ClinicDoctor[];
}

interface DoctorUser {
  doctorId?: number | null;
  firstName: string;
  lastName: string;
  email: string;
  doctorProfile?: {
    department?: string | null;
    verified?: boolean;
    clinicId?: number | null;
    clinic?: { id: number; name: string } | null;
  } | null;
}

interface ClinicFormValues {
  name: string;
  type: ClinicRow['type'];
  code: string;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
  area: string;
  status: ClinicRow['status'];
  departments: string;
  services: string;
  operatingHours: string;
  notes: string;
  doctorIds: number[];
}

function emptyFormValues(): ClinicFormValues {
  return {
    name: '',
    type: 'clinic',
    code: '',
    phone: '',
    email: '',
    addressLine: '',
    city: '',
    area: '',
    status: 'active',
    departments: '',
    services: '',
    operatingHours: '',
    notes: '',
    doctorIds: [],
  };
}

function clinicToFormValues(clinic: ClinicRow): ClinicFormValues {
  return {
    name: clinic.name || '',
    type: clinic.type,
    code: clinic.code || '',
    phone: clinic.phone || '',
    email: clinic.email || '',
    addressLine: clinic.addressLine || '',
    city: clinic.city || '',
    area: clinic.area || '',
    status: clinic.status,
    departments: (clinic.departments || []).join(', '),
    services: (clinic.services || []).join(', '),
    operatingHours: clinic.operatingHours || '',
    notes: clinic.notes || '',
    doctorIds: (clinic.doctors || []).map((doctor) => doctor.id),
  };
}

function clinicTypeLabel(type: ClinicRow['type']) {
  if (type === 'diagnostic_center') return 'Diagnostic Center';
  return type[0].toUpperCase() + type.slice(1);
}

function doctorClinicLabel(doctor: DoctorUser) {
  if (doctor.doctorProfile?.clinic?.name) return doctor.doctorProfile.clinic.name;
  if (doctor.doctorProfile?.clinicId) return `Clinic #${doctor.doctorProfile.clinicId}`;
  return null;
}

function ClinicModal({
  values,
  onChange,
  doctors,
  onToggleDoctor,
  onClose,
  onSubmit,
  isSubmitting,
  editing,
}: {
  values: ClinicFormValues;
  onChange: (patch: Partial<ClinicFormValues>) => void;
  doctors: DoctorUser[];
  onToggleDoctor: (doctorId: number) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  editing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-slate-900">{editing ? 'Edit clinic' : 'Create clinic'}</h3>
        <p className="mt-1 text-sm text-slate-500">
          Manage the facility profile, operating details, and assigned doctors from one place.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,0.95fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={values.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Clinic name" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              <select value={values.type} onChange={(e) => onChange({ type: e.target.value as ClinicRow['type'] })} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
                <option value="diagnostic_center">Diagnostic center</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input value={values.code} onChange={(e) => onChange({ code: e.target.value })} placeholder="Facility code" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              <select value={values.status} onChange={(e) => onChange({ status: e.target.value as ClinicRow['status'] })} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input value={values.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              <input value={values.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="Email" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>

            <input value={values.addressLine} onChange={(e) => onChange({ addressLine: e.target.value })} placeholder="Address line" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />

            <div className="grid gap-3 sm:grid-cols-2">
              <input value={values.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="City" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              <input value={values.area} onChange={(e) => onChange({ area: e.target.value })} placeholder="Area" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>

            <input value={values.departments} onChange={(e) => onChange({ departments: e.target.value })} placeholder="Departments, comma separated" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <input value={values.services} onChange={(e) => onChange({ services: e.target.value })} placeholder="Services, comma separated" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <textarea value={values.operatingHours} onChange={(e) => onChange({ operatingHours: e.target.value })} placeholder="Operating hours" rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <textarea value={values.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Operational notes" rows={4} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Doctor roster</p>
              <p className="text-xs text-slate-500">Assign doctors to make this a real operational facility record.</p>
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto p-4">
              {doctors.map((doctor) => {
                const doctorId = doctor.doctorId || 0;
                const selected = values.doctorIds.includes(doctorId);
                return (
                  <label key={`${doctor.email}-${doctorId}`} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${selected ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                    <input type="checkbox" checked={selected} onChange={() => onToggleDoctor(doctorId)} className="mt-1" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">
                        Dr. {doctor.firstName} {doctor.lastName}
                      </span>
                      <span className="block text-xs text-slate-500">{doctor.email}</span>
                      <span className="mt-1 block text-xs text-slate-600">
                        {doctor.doctorProfile?.department || 'Department not set'}
                        {doctorClinicLabel(doctor) ? ` • Currently: ${doctorClinicLabel(doctor)}` : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={isSubmitting} onClick={onSubmit} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            {editing ? 'Save clinic' : 'Create clinic'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminClinics() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<ClinicRow | null>(null);
  const [formValues, setFormValues] = useState<ClinicFormValues>(emptyFormValues());

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ['admin', 'clinics', search],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { clinics: ClinicRow[] } }>('/admin/clinics', {
        params: { search: search || undefined, includeDoctors: true },
      });
      return data.data?.clinics ?? [];
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['admin', 'clinic-doctors'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { users: DoctorUser[] } }>('/admin/users', {
        params: { role: 'doctor', limit: 200 },
      });
      return data.data?.users ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formValues,
        departments: formValues.departments,
        services: formValues.services,
        doctorIds: formValues.doctorIds,
      };
      if (editingClinic) {
        await api.put(`/admin/clinics/${editingClinic.id}`, payload);
        return;
      }
      await api.post('/admin/clinics', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'clinics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success(editingClinic ? 'Clinic updated' : 'Clinic created');
      setModalOpen(false);
      setEditingClinic(null);
      setFormValues(emptyFormValues());
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to save clinic');
    },
  });

  const summary = useMemo(() => ({
    total: clinics.length,
    active: clinics.filter((clinic) => clinic.status === 'active').length,
    doctors: clinics.reduce((sum, clinic) => sum + (clinic.doctorCount || 0), 0),
  }), [clinics]);

  const openCreate = () => {
    setEditingClinic(null);
    setFormValues(emptyFormValues());
    setModalOpen(true);
  };

  const openEdit = (clinic: ClinicRow) => {
    setEditingClinic(clinic);
    setFormValues(clinicToFormValues(clinic));
    setModalOpen(true);
  };

  const toggleDoctor = (doctorId: number) => {
    setFormValues((current) => ({
      ...current,
      doctorIds: current.doctorIds.includes(doctorId)
        ? current.doctorIds.filter((id) => id !== doctorId)
        : [...current.doctorIds, doctorId],
    }));
  };

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Clinic Management"
        title="Facilities and Operational Footprint"
        description="Maintain real hospital and clinic records, assign doctors, and keep departments and service coverage visible from one admin module."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <PlusIcon className="h-5 w-5" />
            Add clinic
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Facilities" value={summary.total} icon={BuildingOffice2Icon} tone="slate" />
        <SummaryCard label="Active" value={summary.active} icon={MapPinIcon} tone="blue" />
        <SummaryCard label="Assigned Doctors" value={summary.doctors} icon={UserGroupIcon} tone="emerald" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Facility Directory</h2>
            <p className="text-sm text-slate-500">This is the real clinic module for operations, not scattered doctor fields.</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clinic, city, code"
            className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-sm text-slate-500 shadow-sm">Loading clinics...</div>
        ) : clinics.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-sm text-slate-500 shadow-sm">No clinic records yet.</div>
        ) : (
          clinics.map((clinic) => (
            <article key={clinic.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{clinic.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${clinic.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {clinic.status}
                    </span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                      {clinicTypeLabel(clinic.type)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {[clinic.addressLine, clinic.area, clinic.city].filter(Boolean).join(', ') || 'Address not configured'}
                  </p>
                </div>
                <button type="button" onClick={() => openEdit(clinic)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoTile icon={PhoneIcon} label="Contact" value={clinic.phone || clinic.email || 'Not set'} />
                <InfoTile icon={UserGroupIcon} label="Doctors" value={`${clinic.doctorCount || 0} assigned`} />
                <InfoTile icon={BuildingOffice2Icon} label="Code" value={clinic.code || 'Not set'} />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Departments</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(clinic.departments || []).length > 0 ? (clinic.departments || []).map((item) => (
                      <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{item}</span>
                    )) : <span className="text-sm text-slate-500">No departments listed</span>}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Services</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(clinic.services || []).length > 0 ? (clinic.services || []).map((item) => (
                      <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{item}</span>
                    )) : <span className="text-sm text-slate-500">No services listed</span>}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Doctors</p>
                <div className="mt-3 space-y-2">
                  {(clinic.doctors || []).length > 0 ? (clinic.doctors || []).map((doctor) => (
                    <div key={doctor.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-900">
                        Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                      </span>
                      <span className="text-slate-500">{doctor.department || 'Department not set'}</span>
                    </div>
                  )) : <p className="text-sm text-slate-500">No doctors assigned yet.</p>}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {modalOpen ? (
        <ClinicModal
          values={formValues}
          onChange={(patch) => setFormValues((current) => ({ ...current, ...patch }))}
          doctors={doctors.filter((doctor) => doctor.doctorId)}
          onToggleDoctor={toggleDoctor}
          onClose={() => {
            setModalOpen(false);
            setEditingClinic(null);
          }}
          onSubmit={() => saveMutation.mutate()}
          isSubmitting={saveMutation.isPending}
          editing={Boolean(editingClinic)}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ElementType; tone: 'slate' | 'blue' | 'emerald' }) {
  const toneClasses = tone === 'blue'
    ? 'border-blue-100 bg-blue-50 text-blue-700'
    : tone === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${toneClasses}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
