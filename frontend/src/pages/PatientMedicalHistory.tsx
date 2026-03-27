import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BellAlertIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { api } from '../context/AuthContext';
import AppPageHeader from '../components/AppPageHeader';
import MedicalImagingList from '../components/MedicalImagingList';
import PrescriptionView from '../components/PrescriptionView';
import { formatMedicineForDisplay } from './doctorAppointments/utils';
import type { MedicalImagingRecord } from '../types/medicalImaging';

interface MedicalHistoryRecord {
  chronicConditions: string[];
  pastProcedures: string[];
  familyHistory: string[];
  currentLongTermMedications: string[];
  immunizationNotes?: string;
  lifestyleRiskNotes?: string;
  generalMedicalNotes?: string;
  updatedAt?: string | null;
}

interface MedicalHistorySummary {
  bloodType?: string | null;
  allergies?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  emergencyReady: boolean;
  activeReminderCount: number;
  imagingCount: number;
  activeMedicationNames: string[];
}

interface TimelineEntry {
  appointmentId: number;
  appointmentDate?: string;
  appointmentType?: string;
  status?: string;
  doctor?: {
    firstName?: string;
    lastName?: string;
  } | null;
  diagnosis?: string | null;
  medicineCount: number;
  prescriptionId?: number | null;
}

interface PrescriptionEntry {
  id: number;
  appointmentId: number;
  diagnosis?: string | null;
  notes?: string | null;
  appointment?: {
    appointmentDate?: string;
    type?: string;
    doctor?: {
      firstName?: string;
      lastName?: string;
    } | null;
  } | null;
  medicines?: Array<{
    name?: string;
    dosage?: string;
    strength?: string;
    dose?: string;
    unit?: string;
    frequency?: string;
    duration?: string;
    route?: string;
    instructions?: string;
    activeReminder?: {
      id: number;
      status: string;
      scheduleTimes: string[];
    } | null;
  }>;
}

interface MedicalHistoryPayload {
  summary: MedicalHistorySummary;
  history: MedicalHistoryRecord;
  timeline: TimelineEntry[];
  prescriptions: PrescriptionEntry[];
  imaging: MedicalImagingRecord[];
}

interface HistoryFormValues {
  chronicConditions: string;
  pastProcedures: string;
  familyHistory: string;
  currentLongTermMedications: string;
  immunizationNotes: string;
  lifestyleRiskNotes: string;
  generalMedicalNotes: string;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function toMultiline(value?: string[]) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function toPayload(form: HistoryFormValues) {
  return {
    chronicConditions: form.chronicConditions,
    pastProcedures: form.pastProcedures,
    familyHistory: form.familyHistory,
    currentLongTermMedications: form.currentLongTermMedications,
    immunizationNotes: form.immunizationNotes,
    lifestyleRiskNotes: form.lifestyleRiskNotes,
    generalMedicalNotes: form.generalMedicalNotes,
  };
}

function doctorName(entry?: { firstName?: string; lastName?: string } | null) {
  if (!entry) return 'Doctor';
  return `Dr. ${entry.firstName || ''} ${entry.lastName || ''}`.trim();
}

export default function PatientMedicalHistory() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);

  const form = useForm<HistoryFormValues>({
    defaultValues: {
      chronicConditions: '',
      pastProcedures: '',
      familyHistory: '',
      currentLongTermMedications: '',
      immunizationNotes: '',
      lifestyleRiskNotes: '',
      generalMedicalNotes: '',
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['patient-medical-history'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: MedicalHistoryPayload }>('/patients/history');
      return data.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      chronicConditions: toMultiline(data.history.chronicConditions),
      pastProcedures: toMultiline(data.history.pastProcedures),
      familyHistory: toMultiline(data.history.familyHistory),
      currentLongTermMedications: toMultiline(data.history.currentLongTermMedications),
      immunizationNotes: data.history.immunizationNotes || '',
      lifestyleRiskNotes: data.history.lifestyleRiskNotes || '',
      generalMedicalNotes: data.history.generalMedicalNotes || '',
    });
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: HistoryFormValues) => {
      const { data } = await api.put<{ success: boolean; data: { history: MedicalHistoryRecord } }>(
        '/patients/history',
        toPayload(values)
      );
      return data.data.history;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-medical-history'] });
      setEditing(false);
      toast.success('Medical history updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to update medical history');
    },
  });

  const activeReminderMedicines = useMemo(
    () => data?.summary.activeMedicationNames?.join(', ') || 'No active reminder-linked medicines',
    [data]
  );

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm">Loading medical history...</div>;
  }

  if (!data) {
    return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm">Medical history is unavailable right now.</div>;
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Patient Record"
        title="Medical History"
        description="Longitudinal care record built from your profile, completed visits, prescriptions, and active medication reminders."
        actions={
          <>
            <Link
              to="/app/patient-profile"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit profile data
            </Link>
            <Link
              to="/app/patient-reminders"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open reminders
            </Link>
            <Link
              to="/app/patient-imaging"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View imaging
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SnapshotCard
          icon={<HeartIcon className="h-5 w-5 text-slate-700" />}
          label="Blood Type"
          value={data.summary.bloodType || 'Not recorded'}
        />
        <SnapshotCard
          icon={<ClipboardDocumentListIcon className="h-5 w-5 text-slate-700" />}
          label="Allergies"
          value={data.summary.allergies || 'No allergy details recorded'}
        />
        <SnapshotCard
          icon={data.summary.emergencyReady ? <CheckCircleIcon className="h-5 w-5 text-emerald-700" /> : <ExclamationTriangleIcon className="h-5 w-5 text-amber-700" />}
          label="Emergency Readiness"
          value={data.summary.emergencyReady ? 'Safety profile complete' : 'Needs profile update'}
        />
        <SnapshotCard
          icon={<BellAlertIcon className="h-5 w-5 text-slate-700" />}
          label="Active Reminders"
          value={`${data.summary.activeReminderCount} plan${data.summary.activeReminderCount === 1 ? '' : 's'}`}
        />
        <SnapshotCard
          icon={<ClipboardDocumentListIcon className="h-5 w-5 text-slate-700" />}
          label="Imaging Records"
          value={`${data.summary.imagingCount} record${data.summary.imagingCount === 1 ? '' : 's'}`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Structured Medical Background</h2>
              <p className="text-sm text-slate-500">Maintain chronic conditions, procedures, family history, and long-term medication notes.</p>
            </div>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit background
              </button>
            ) : null}
          </div>

          {!editing ? (
            <div className="space-y-5 px-5 py-5">
              <DetailList title="Chronic Conditions" items={data.history.chronicConditions} emptyLabel="No chronic conditions recorded." />
              <DetailList title="Past Procedures" items={data.history.pastProcedures} emptyLabel="No surgeries or procedures recorded." />
              <DetailList title="Family History" items={data.history.familyHistory} emptyLabel="No family history recorded." />
              <DetailList title="Current Long-Term Medications" items={data.history.currentLongTermMedications} emptyLabel="No long-term medications recorded." />
              <FreeText title="Immunization Notes" value={data.history.immunizationNotes} />
              <FreeText title="Lifestyle / Risk Notes" value={data.history.lifestyleRiskNotes} />
              <FreeText title="General Medical Notes" value={data.history.generalMedicalNotes} />
              <p className="text-xs text-slate-400">
                Last updated: {formatDate(data.history.updatedAt)}
              </p>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
              className="space-y-4 px-5 py-5"
            >
              <HistoryTextarea form={form} name="chronicConditions" label="Chronic Conditions" hint="One item per line. Example: Type 2 diabetes" />
              <HistoryTextarea form={form} name="pastProcedures" label="Past Procedures" hint="One item per line. Example: Appendectomy (2020)" />
              <HistoryTextarea form={form} name="familyHistory" label="Family History" hint="One item per line. Example: Family history of hypertension" />
              <HistoryTextarea form={form} name="currentLongTermMedications" label="Current Long-Term Medications" hint="One item per line. Example: Metformin 500 mg daily" />
              <HistoryTextarea form={form} name="immunizationNotes" label="Immunization Notes" rows={3} />
              <HistoryTextarea form={form} name="lifestyleRiskNotes" label="Lifestyle / Risk Notes" rows={3} />
              <HistoryTextarea form={form} name="generalMedicalNotes" label="General Medical Notes" rows={4} />

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    form.reset();
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Save medical background
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">Clinical Snapshot</h2>
              <p className="text-sm text-slate-500">High-signal health context and reminder-linked medication activity.</p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <SnapshotRow label="Emergency Contact" value={data.summary.emergencyContact || 'Not recorded'} />
              <SnapshotRow label="Emergency Phone" value={data.summary.emergencyPhone || 'Not recorded'} />
              <SnapshotRow label="Reminder-linked Medicines" value={activeReminderMedicines} />
              <SnapshotRow label="Imaging Records" value={`${data.summary.imagingCount} uploaded ${data.summary.imagingCount === 1 ? 'study' : 'studies'}`} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Imaging Records</h2>
                <p className="text-sm text-slate-500">Provider-uploaded imaging studies connected to your patient record.</p>
              </div>
              <Link to="/app/patient-imaging" className="text-sm font-medium text-slate-700 hover:text-slate-950">
                Open library
              </Link>
            </div>
            <div className="px-5 py-5">
              <MedicalImagingList records={data.imaging.slice(0, 3)} emptyMessage="No imaging records have been added yet." compact />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Care Timeline</h2>
                <p className="text-sm text-slate-500">Completed visits in reverse chronological order.</p>
              </div>
            </div>
            {data.timeline.length === 0 ? (
              <div className="px-5 py-10 text-sm text-slate-500">No completed visits yet. Timeline entries will appear after finished appointments.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.timeline.map((entry) => (
                  <article key={entry.appointmentId} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{entry.diagnosis || 'Completed consultation'}</p>
                        <p className="text-sm text-slate-600">
                          {formatDate(entry.appointmentDate)} • {doctorName(entry.doctor)} • {(entry.appointmentType || 'visit').replace('_', ' ')}
                        </p>
                        <p className="text-xs text-slate-500">{entry.medicineCount} medicine{entry.medicineCount === 1 ? '' : 's'} recorded</p>
                      </div>
                      {entry.prescriptionId ? (
                        <button
                          type="button"
                          onClick={() => setSelectedAppointmentId(entry.appointmentId)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Open record
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Prescription History</h2>
            <p className="text-sm text-slate-500">Recent prescriptions with reminder status attached to each medicine.</p>
          </div>
          <Link to="/app/patient-prescriptions" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Open full archive
          </Link>
        </div>

        {data.prescriptions.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">No prescriptions available yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.prescriptions.slice(0, 6).map((record) => (
              <article key={record.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{record.diagnosis || 'Prescription record'}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {doctorName(record.appointment?.doctor)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatDate(record.appointment?.appointmentDate)} • {(record.appointment?.type || '—').replace('_', ' ')}
                    </p>
                    <div className="space-y-2">
                      {(record.medicines ?? []).slice(0, 3).map((medicine, index) => (
                        <div key={`${record.id}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-sm text-slate-900">
                            {formatMedicineForDisplay({
                              name: medicine.name || '',
                              dosage: medicine.dosage || [medicine.strength, medicine.dose, medicine.unit].filter(Boolean).join(' '),
                              frequency: medicine.frequency || '',
                              duration: medicine.duration || '',
                              route: medicine.route || '',
                              instructions: medicine.instructions || '',
                            })}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {medicine.activeReminder
                              ? `Reminder ${medicine.activeReminder.status} • ${medicine.activeReminder.scheduleTimes.join(', ')}`
                              : 'No reminder linked'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAppointmentId(record.appointmentId)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open record
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedAppointmentId != null ? (
        <PrescriptionView appointmentId={selectedAppointmentId} onClose={() => setSelectedAppointmentId(null)} />
      ) : null}
    </div>
  );
}

function SnapshotCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">{icon}</div>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value}</p>
    </div>
  );
}

function DetailList({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FreeText({ title, value }: { title: string; value?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{value || 'No notes recorded.'}</p>
    </div>
  );
}

function HistoryTextarea({
  form,
  name,
  label,
  hint,
  rows = 4,
}: {
  form: ReturnType<typeof useForm<HistoryFormValues>>;
  name: keyof HistoryFormValues;
  label: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <textarea
        rows={rows}
        {...form.register(name)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
      />
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
