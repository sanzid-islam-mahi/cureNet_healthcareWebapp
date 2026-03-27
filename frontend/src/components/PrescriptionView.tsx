import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth } from '../context/AuthContext';
import ReminderSetupModal, { type ExistingReminderPlan, type ReminderMedicineEntry } from './ReminderSetupModal';
import { formatMedicineForDisplay } from '../pages/doctorAppointments/utils';
import PrescriptionFormModal from '../pages/doctorAppointments/PrescriptionFormModal';
import { downloadPrescriptionPdf } from '../lib/prescriptionPdf';

interface PrescriptionViewProps {
  appointmentId: number;
  onClose: () => void;
}

interface PrescriptionDetail {
  id?: number;
  diagnosis?: string;
  medicines?: ReminderMedicineEntry[];
  notes?: string;
  createdAt?: string;
  appointment?: {
    id: number;
    appointmentDate?: string;
    type?: string;
    window?: string;
    serial?: number;
    timeBlock?: string;
    doctor?: {
      id: number;
      firstName?: string;
      lastName?: string;
    } | null;
    patient?: {
      id: number;
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: string;
    } | null;
  } | null;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export default function PrescriptionView({ appointmentId, onClose }: PrescriptionViewProps) {
  const { user } = useAuth();
  const [reminderTargetIndex, setReminderTargetIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['prescription', appointmentId],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { prescription: PrescriptionDetail } }>(
        `/prescriptions/appointment/${appointmentId}`
      );
      return res.data?.prescription;
    },
    enabled: !!appointmentId,
  });
  const prescription = data;
  const { data: reminderPlans = [] } = useQuery({
    queryKey: ['patient-reminders', 'prescription-view', prescription?.id],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { reminderPlans: Array<ExistingReminderPlan & { prescriptionId: number; status: string }> } }>('/reminders');
      return res.data?.reminderPlans ?? [];
    },
    enabled: !!prescription?.id && user?.role === 'patient',
  });

  const isPatient = user?.role === 'patient';
  const appointment = prescription?.appointment;
  const doctorName = appointment?.doctor
    ? `Dr. ${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim()
    : 'Attending doctor';
  const patientName = appointment?.patient
    ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim()
    : 'Patient';
  const reminderPlansByMedicine = useMemo(() => {
    const map = new Map<string, ExistingReminderPlan & { prescriptionId: number; status: string }>();
    reminderPlans
      .filter((plan) => plan.prescriptionId === prescription?.id && ['active', 'paused'].includes(plan.status))
      .forEach((plan) => {
        map.set(`${plan.prescriptionId}:${plan.medicineIndex}`, plan);
      });
    return map;
  }, [prescription?.id, reminderPlans]);

  const downloadPdf = () => {
    if (!prescription) return;
    downloadPrescriptionPdf({
      appointmentId,
      diagnosis: prescription.diagnosis,
      notes: prescription.notes,
      medicines: prescription.medicines,
      appointment: prescription.appointment,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <header className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Prescription Record</h3>
          <p className="text-sm text-gray-500">Clinical prescription details linked to this appointment.</p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? <p className="text-sm text-gray-500">Loading prescription...</p> : null}
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">No prescription found for this appointment.</p> : null}
          {prescription ? (
            <div className="space-y-4 text-sm">
              <section className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Visit Information</p>
                <p className="mt-1 text-gray-800">Patient: {patientName || 'Patient'}</p>
                <p className="text-gray-800">Doctor: {doctorName || 'Doctor'}</p>
                <p className="text-gray-700">
                  Date: {formatDate(appointment?.appointmentDate)} • Type: {(appointment?.type || '—').replace('_', ' ')}
                </p>
              </section>
              <section className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Diagnosis</p>
                <p className="mt-1 text-gray-800">{prescription.diagnosis || 'No diagnosis entered'}</p>
              </section>

              <section className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Medicines</p>
                {prescription.medicines?.length ? (
                  <div className="mt-2 space-y-2">
                    {prescription.medicines.map((m, i) => {
                      const existingPlan = prescription.id ? reminderPlansByMedicine.get(`${prescription.id}:${i}`) : null;
                      return (
                        <div key={`${m.name || 'medicine'}-${i}`} className="rounded-md bg-slate-50 px-3 py-3 text-gray-800">
                          <p>
                            {formatMedicineForDisplay({
                              name: m.name || '',
                              dosage: m.dosage || [m.strength, m.dose, m.unit].filter(Boolean).join(' '),
                              frequency: m.frequency || '',
                              duration: m.duration || '',
                              route: m.route || '',
                              instructions: m.instructions || '',
                            })}
                          </p>
                          {isPatient ? (
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <p className="text-xs text-slate-500">
                                {existingPlan ? `Reminder ${existingPlan.status} • Times: ${existingPlan.scheduleTimes.join(', ')}` : 'No reminder set for this medicine'}
                              </p>
                              <button
                                type="button"
                                onClick={() => setReminderTargetIndex(i)}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                              >
                                {existingPlan ? 'Edit reminder' : 'Set reminder'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-gray-500">No medicines recorded.</p>
                )}
              </section>

              <section className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Clinical Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-800">{prescription.notes || 'No notes entered'}</p>
              </section>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-gray-200 px-6 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!prescription}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Download PDF
            </button>
            {user?.role === 'doctor' ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={!prescription}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Edit Prescription
              </button>
            ) : null}
          </div>
        </footer>
      </div>

      {reminderTargetIndex != null && prescription?.id ? (
        <ReminderSetupModal
          prescriptionId={prescription.id}
          medicines={prescription.medicines ?? []}
          defaultStartDate={appointment?.appointmentDate}
          existingPlan={reminderPlansByMedicine.get(`${prescription.id}:${reminderTargetIndex}`) ?? null}
          initialMedicineIndex={reminderTargetIndex}
          onClose={() => setReminderTargetIndex(null)}
        />
      ) : null}

      {editing ? (
        <PrescriptionFormModal
          appointmentId={appointmentId}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}
