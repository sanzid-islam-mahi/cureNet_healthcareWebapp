import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { api, useAuth } from '../context/AuthContext';
import PatientContextModal from './doctorAppointments/PatientContextModal';
import PrescriptionView from '../components/PrescriptionView';

interface PrescriptionRecord {
  id: number;
  appointmentId: number;
  diagnosis?: string;
  medicines?: Array<{ name?: string }>;
  notes?: string;
  appointment?: {
    id: number;
    appointmentDate?: string;
    type?: string;
    patient?: {
      id: number;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    } | null;
  } | null;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function DoctorContinuity() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['doctor-continuity', doctorId],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { prescriptions: PrescriptionRecord[] } }>(
        '/prescriptions/history/doctor'
      );
      return res.data?.prescriptions ?? [];
    },
    enabled: !!doctorId,
  });

  const groupedPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    const grouped = new Map<number, {
      patientId: number;
      patientName: string;
      email?: string;
      phone?: string;
      lastPrescriptionDate?: string;
      totalPrescriptions: number;
      totalMedicines: number;
      diagnoses: string[];
      records: PrescriptionRecord[];
    }>();

    for (const record of data) {
      const patient = record.appointment?.patient;
      if (!patient?.id) continue;
      const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || `Patient #${patient.id}`;
      const haystack = [
        patientName,
        patient.email || '',
        patient.phone || '',
        record.diagnosis || '',
        record.notes || '',
        ...(record.medicines ?? []).map((medicine) => medicine.name || ''),
      ].join(' ').toLowerCase();
      if (query && !haystack.includes(query)) continue;

      if (!grouped.has(patient.id)) {
        grouped.set(patient.id, {
          patientId: patient.id,
          patientName,
          email: patient.email,
          phone: patient.phone,
          lastPrescriptionDate: undefined,
          totalPrescriptions: 0,
          totalMedicines: 0,
          diagnoses: [],
          records: [],
        });
      }

      const bucket = grouped.get(patient.id)!;
      bucket.records.push(record);
      bucket.totalPrescriptions += 1;
      bucket.totalMedicines += record.medicines?.length ?? 0;
      if (record.diagnosis && !bucket.diagnoses.includes(record.diagnosis)) {
        bucket.diagnoses.push(record.diagnosis);
      }
      if (!bucket.lastPrescriptionDate || (record.appointment?.appointmentDate || '') > bucket.lastPrescriptionDate) {
        bucket.lastPrescriptionDate = record.appointment?.appointmentDate;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => (b.lastPrescriptionDate || '').localeCompare(a.lastPrescriptionDate || ''));
  }, [data, search]);

  const stats = useMemo(() => ({
    patients: groupedPatients.length,
    prescriptions: groupedPatients.reduce((sum, patient) => sum + patient.totalPrescriptions, 0),
    medicines: groupedPatients.reduce((sum, patient) => sum + patient.totalMedicines, 0),
  }), [groupedPatients]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Continuity of Care</h2>
            <p className="text-sm text-slate-600">
              Review prescription history by patient and reopen clinical context without leaving the workflow.
            </p>
          </div>

          <label className="relative block w-full max-w-sm">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient, diagnosis, medicine"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-blue-700">
              <UserGroupIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Patients</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-900">{stats.patients}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <DocumentTextIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Prescription Records</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.prescriptions}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-slate-700">
              <BeakerIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Medicines Logged</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.medicines}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Patient Continuity Roster</h3>
          <p className="text-sm text-slate-500">Prescription-led longitudinal view of patients you have treated.</p>
        </header>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">Loading continuity records...</div>
        ) : groupedPatients.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            {search.trim() ? 'No continuity records match your search.' : 'No prescription continuity records available yet.'}
          </div>
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {groupedPatients.map((patient) => (
              <article key={patient.patientId} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{patient.patientName}</p>
                    <p className="truncate text-sm text-slate-600">{patient.email || 'No email recorded'}</p>
                    <p className="text-xs text-slate-500">{patient.phone || 'No phone recorded'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatientId(patient.patientId)}
                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open chart
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Records</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{patient.totalPrescriptions}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medicines</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{patient.totalMedicines}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(patient.lastPrescriptionDate)}</p>
                  </div>
                </div>

                {patient.diagnoses.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {patient.diagnoses.slice(0, 4).map((diagnosis) => (
                      <span key={diagnosis} className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {diagnosis}
                      </span>
                    ))}
                    {patient.diagnoses.length > 4 ? (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                        +{patient.diagnoses.length - 4} more
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 space-y-2">
                  {patient.records.slice(0, 3).map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelectedAppointmentId(record.appointmentId)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{record.diagnosis || 'Prescription record'}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(record.appointment?.appointmentDate)} • {(record.appointment?.type || '—').replace('_', ' ')}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-blue-700">Open</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedPatientId != null && doctorId != null ? (
        <PatientContextModal
          doctorId={doctorId}
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      ) : null}

      {selectedAppointmentId != null ? (
        <PrescriptionView
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      ) : null}
    </div>
  );
}
