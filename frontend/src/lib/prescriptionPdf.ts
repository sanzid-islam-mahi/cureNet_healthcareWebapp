type PersonRef = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
};

type MedicinePdfEntry = {
  name?: string;
  dosage?: string;
  dose?: string;
  unit?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

type PrescriptionPdfPayload = {
  appointmentId: number;
  diagnosis?: string;
  notes?: string;
  medicines?: MedicinePdfEntry[];
  appointment?: {
    appointmentDate?: string;
    type?: string;
    patient?: PersonRef | null;
    doctor?: PersonRef | null;
  } | null;
};

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

export function downloadPrescriptionPdf(payload: PrescriptionPdfPayload) {
  const patientName = payload.appointment?.patient
    ? `${payload.appointment.patient.firstName || ''} ${payload.appointment.patient.lastName || ''}`.trim()
    : 'Patient';
  const doctorName = payload.appointment?.doctor
    ? `Dr. ${payload.appointment.doctor.firstName || ''} ${payload.appointment.doctor.lastName || ''}`.trim()
    : 'Doctor';

  const medicineRows = (payload.medicines ?? [])
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
  <title>CureNet Prescription #${payload.appointmentId}</title>
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
        <div class="value">DOB: ${escapeHtml(formatDate(payload.appointment?.patient?.dateOfBirth))}</div>
        <div class="value">Gender: ${escapeHtml(payload.appointment?.patient?.gender || '—')}</div>
      </div>
      <div class="card">
        <div class="label">Doctor</div>
        <div class="value">${escapeHtml(doctorName || 'Doctor')}</div>
        <div class="value">Visit Date: ${escapeHtml(formatDate(payload.appointment?.appointmentDate))}</div>
        <div class="value">Type: ${escapeHtml((payload.appointment?.type || '—').replace('_', ' '))}</div>
      </div>
    </div>
    <div class="section">
      <div class="title">Diagnosis</div>
      <div class="text">${escapeHtml(payload.diagnosis || 'No diagnosis entered')}</div>
    </div>
    <div class="section">
      <div class="title">Medicines</div>
      ${payload.medicines?.length ? `<table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>${medicineRows}</tbody></table>` : '<div class="text">No medicines recorded.</div>'}
    </div>
    <div class="section">
      <div class="title">Clinical Notes</div>
      <div class="text">${escapeHtml(payload.notes || 'No notes entered')}</div>
    </div>
    <div class="footer">
      Generated by CureNet on ${escapeHtml(formatDate(new Date().toISOString()))}.<br/>
      Prescription ID: ${escapeHtml(String(payload.appointmentId))}
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
}
