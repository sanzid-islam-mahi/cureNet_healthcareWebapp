import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth } from '../context/AuthContext';
import ReminderSetupModal, { type ExistingReminderPlan, type ReminderMedicineEntry } from './ReminderSetupModal';
import { formatMedicineForDisplay } from '../pages/doctorAppointments/utils';

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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function PrescriptionView({ appointmentId, onClose }: PrescriptionViewProps) {
  const { user } = useAuth();
  const [reminderTargetIndex, setReminderTargetIndex] = useState<number | null>(null);
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
    const medicineRows = (prescription.medicines ?? [])
      .map((m, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(m.name || 'Medicine')}</td>
        <td>${escapeHtml(m.dosage || [m.dose, m.unit].filter(Boolean).join(' ') || '—')}</td>
        <td>${escapeHtml(m.frequency || '—')}</td>
        <td>${escapeHtml(m.duration || '—')}</td>
        <td>${escapeHtml(m.instructions || '—')}</td>
      </tr>`)
      .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>CureNet Prescription #${appointmentId}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
    .page { max-width: 840px; margin: 24px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1d4ed8, #0f766e); color: white; padding: 24px; }
    .brand { font-size: 24px; font-weight: 700; letter-spacing: 0.3px; }
    .sub { margin-top: 4px; font-size: 13px; opacity: 0.95; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #475569; font-weight: 700; margin-bottom: 6px; }
    .value { font-size: 14px; color: #0f172a; }
    .section { padding: 18px 24px; }
    .title { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #475569; font-weight: 700; margin-bottom: 10px; }
    .text { font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #eff6ff; color: #1e3a8a; }
    .footer { padding: 14px 24px 24px; color: #475569; font-size: 12px; border-top: 1px solid #e2e8f0; }
    @media print { body { background: #fff; } .page { margin: 0; border: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">CureNet HealthCare</div>
      <div class="sub">Prescription Document</div>
    </div>

    <div class="meta">
      <div class="card">
        <div class="label">Patient</div>
        <div class="value">${escapeHtml(patientName || 'Patient')}</div>
        <div class="value">DOB: ${escapeHtml(formatDate(appointment?.patient?.dateOfBirth))}</div>
        <div class="value">Gender: ${escapeHtml(appointment?.patient?.gender || '—')}</div>
      </div>
      <div class="card">
        <div class="label">Doctor</div>
        <div class="value">${escapeHtml(doctorName || 'Doctor')}</div>
        <div class="value">Visit Date: ${escapeHtml(formatDate(appointment?.appointmentDate))}</div>
        <div class="value">Type: ${escapeHtml((appointment?.type || '—').replace('_', ' '))}</div>
      </div>
    </div>

    <div class="section">
      <div class="title">Diagnosis</div>
      <div class="text">${escapeHtml(prescription.diagnosis || 'No diagnosis entered')}</div>
    </div>

    <div class="section">
      <div class="title">Medicines</div>
      ${prescription.medicines?.length ? `<table>
        <thead>
          <tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
        </thead>
        <tbody>${medicineRows}</tbody>
      </table>` : '<div class="text">No medicines recorded.</div>'}
    </div>

    <div class="section">
      <div class="title">Clinical Notes</div>
      <div class="text">${escapeHtml(prescription.notes || 'No notes entered')}</div>
    </div>

    <div class="footer">
      Generated by CureNet on ${escapeHtml(formatDate(new Date().toISOString()))}.<br/>
      Prescription ID: ${escapeHtml(String(appointmentId))}
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!prescription}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Download PDF
            </button>
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
    </div>
  );
}
