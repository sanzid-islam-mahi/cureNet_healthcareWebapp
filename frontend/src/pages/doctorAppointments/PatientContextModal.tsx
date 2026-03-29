import { useQuery } from '@tanstack/react-query';
import { api } from '../../context/AuthContext';
import { useModalAccessibility } from './useModalAccessibility';
import type { PatientContextData } from './types';
import { formatDate, formatMedicineForDisplay, prettyStatus, statusBadgeClasses } from './utils';
import {
  BellAlertIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PhotoIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import PrescriptionView from '../../components/PrescriptionView';
import MedicalImagingList from '../../components/MedicalImagingList';
import { getAssetUrl } from '../../lib/runtimeConfig';

interface PatientContextModalProps {
  doctorId: number;
  patientId: number;
  onClose: () => void;
}

export default function PatientContextModal({
  doctorId,
  patientId,
  onClose,
}: PatientContextModalProps) {
  const modalRef = useModalAccessibility(onClose);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-patient-context', doctorId, patientId],
    queryFn: async () => {
      const { data: res } = await api.get<{
        success: boolean;
        data: { patient: PatientContextData };
      }>(`/doctors/${doctorId}/patients/${patientId}/context`);
      return res.data?.patient ?? null;
    },
    enabled: !!doctorId && !!patientId,
  });

  const prescriptionsByAppointment = new Map(
    (data?.prescriptions ?? []).map((record) => [record.appointmentId, record])
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Patient Clinical Context"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <header className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-xl font-semibold text-slate-950">Patient Context</h3>
          <p className="text-sm text-slate-500">Demographics, safety data, structured history, and continuity records with you.</p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? <p className="text-sm text-slate-500">Loading patient information...</p> : null}

          {!isLoading && data ? (
            <div className="space-y-6 text-sm">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                      {data.medical.profileImage ? (
                        <img
                          src={getAssetUrl(data.medical.profileImage) || undefined}
                          alt={`${data.user.firstName} ${data.user.lastName}`}
                          className="h-full w-full rounded-2xl object-cover"
                          decoding="async"
                        />
                      ) : (
                        <UserIcon className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-semibold text-slate-950">
                          {data.user.firstName} {data.user.lastName}
                        </p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {data.summary.totalVisitsWithDoctor} visits with you
                        </span>
                      </div>
                      <p className="mt-2 text-slate-600">
                        {data.user.email || 'No email'} • {data.user.phone || 'No phone'}
                      </p>
                      <p className="text-slate-600">
                        DOB: {formatDate(data.user.dateOfBirth)} • Gender: {data.user.gender || '—'}
                      </p>
                      <p className="text-slate-600">Address: {data.user.address || '—'}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <MetricCard icon={<CalendarDaysIcon className="h-4 w-4 text-slate-700" />} label="Visits" value={String(data.summary.totalVisitsWithDoctor)} />
                    <MetricCard icon={<ClipboardDocumentListIcon className="h-4 w-4 text-slate-700" />} label="Prescriptions" value={String(data.summary.prescriptionCount || 0)} />
                    <MetricCard icon={<BellAlertIcon className="h-4 w-4 text-slate-700" />} label="Active Reminders" value={String(data.summary.activeReminderCount || 0)} />
                    <MetricCard icon={<PhotoIcon className="h-4 w-4 text-slate-700" />} label="Imaging" value={String(data.summary.imagingCount || 0)} />
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
                <div className="space-y-6">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-950">Safety and Demographics</h4>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoBlock label="Blood Group" value={data.medical.bloodType || 'Not recorded'} tone="blue" />
                      <InfoBlock label="Allergies" value={data.medical.allergies || 'No allergy record'} tone="amber" />
                      <InfoBlock
                        label="Emergency Contact"
                        value={`${data.medical.emergencyContact || '—'}${data.medical.emergencyPhone ? ` (${data.medical.emergencyPhone})` : ''}`}
                        tone="rose"
                      />
                      <InfoBlock
                        label="Insurance"
                        value={data.medical.insuranceProvider ? `${data.medical.insuranceProvider}${data.medical.insuranceNumber ? ` • ${data.medical.insuranceNumber}` : ''}` : 'Not recorded'}
                        tone="slate"
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-950">Structured Medical Background</h4>
                    <div className="mt-4 space-y-4">
                      <TagList title="Chronic Conditions" items={data.history.chronicConditions || []} emptyLabel="No chronic conditions recorded." />
                      <TagList title="Past Procedures" items={data.history.pastProcedures || []} emptyLabel="No procedures recorded." />
                      <TagList title="Family History" items={data.history.familyHistory || []} emptyLabel="No family history recorded." />
                      <TagList title="Current Long-Term Medications" items={data.history.currentLongTermMedications || []} emptyLabel="No long-term medication notes." />
                      <TextBlock title="Immunization Notes" value={data.history.immunizationNotes} />
                      <TextBlock title="Lifestyle / Risk Notes" value={data.history.lifestyleRiskNotes} />
                      <TextBlock title="General Medical Notes" value={data.history.generalMedicalNotes} />
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-950">Continuity With You</h4>
                        <p className="text-xs text-slate-500">Visits, diagnoses, and prescriptions in one timeline.</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {data.summary.recentAppointments.length === 0 ? (
                        <p className="text-sm text-slate-500">No prior encounters available.</p>
                      ) : (
                        data.summary.recentAppointments.map((a) => {
                          const record = prescriptionsByAppointment.get(a.id);
                          return (
                            <article key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-slate-900">{formatDate(a.appointmentDate)}</p>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusBadgeClasses(a.status)}`}>
                                      {prettyStatus(a.status)}
                                    </span>
                                    {a.type ? (
                                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                                        {a.type.replace('_', ' ')}
                                      </span>
                                    ) : null}
                                  </div>
                                  {a.reason ? <p className="text-slate-700"><span className="font-medium">Reason:</span> {a.reason}</p> : null}
                                  {a.symptoms ? <p className="text-slate-700"><span className="font-medium">Symptoms:</span> {a.symptoms}</p> : null}
                                  {a.hasPrescription ? (
                                    <p className="text-xs font-medium text-emerald-700">
                                      Prescription documented{a.diagnosis ? ` • ${a.diagnosis}` : ''}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-500">No prescription recorded for this visit.</p>
                                  )}
                                </div>
                                {a.hasPrescription ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAppointmentId(a.id)}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                  >
                                    Open prescription
                                  </button>
                                ) : null}
                              </div>

                              {record && (record.medicines?.length ?? 0) > 0 ? (
                                <div className="mt-3 space-y-2">
                                  {record.medicines?.slice(0, 3).map((medicine, index) => (
                                    <div key={`${record.id}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                      <p className="text-sm text-slate-900">
                                        <span className="mr-2 inline-flex items-center gap-1 text-slate-500">
                                          <DocumentTextIcon className="h-4 w-4" />
                                        </span>
                                        {formatMedicineForDisplay({
                                          name: medicine.name || '',
                                          dosage: medicine.dosage || [medicine.strength, medicine.dose, medicine.unit].filter(Boolean).join(' '),
                                          frequency: medicine.frequency || '',
                                          duration: medicine.duration || '',
                                          route: medicine.route || '',
                                          instructions: medicine.instructions || '',
                                        })}
                                      </p>
                                      {medicine.activeReminder ? (
                                        <p className="mt-1 text-xs text-slate-500">
                                          Reminder {medicine.activeReminder.status} • {medicine.activeReminder.scheduleTimes.join(', ')}
                                        </p>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </article>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-950">Imaging Records</h4>
                        <p className="text-xs text-slate-500">Only visit-linked imaging shared between you and this patient appears here. Manage uploads from the appointment or prescription record.</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <MedicalImagingList
                        records={data.imaging || []}
                        emptyMessage="No imaging records are attached to this patient yet."
                        compact
                      />
                    </div>
                  </section>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </footer>

        {selectedAppointmentId != null ? (
          <PrescriptionView
            appointmentId={selectedAppointmentId}
            onClose={() => setSelectedAppointmentId(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'amber' | 'rose' | 'slate' }) {
  const toneMap = {
    blue: 'border-blue-100 bg-blue-50 text-blue-900',
    amber: 'border-amber-100 bg-amber-50 text-amber-900',
    rose: 'border-rose-100 bg-rose-50 text-rose-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
  };
  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function TagList({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <div>
      <h5 className="text-sm font-medium text-slate-900">{title}</h5>
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

function TextBlock({ title, value }: { title: string; value?: string }) {
  return (
    <div>
      <h5 className="text-sm font-medium text-slate-900">{title}</h5>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{value || 'No notes recorded.'}</p>
    </div>
  );
}
