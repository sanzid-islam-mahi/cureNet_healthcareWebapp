import type { AppointmentItem, MedicineEntry } from './types';

export const FREQUENCY_OPTIONS = [
  'OD',
  'BD',
  'TDS',
  'QID',
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 8 hours',
  'Every 12 hours',
  'At bedtime',
  'As needed',
  'After meals',
  'Before meals',
];

export const DURATION_OPTIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  '3 months',
  'Until review',
  'Ongoing',
];

export const ROUTE_OPTIONS = [
  'Oral',
  'Topical',
  'Inhalation',
  'Eye drops',
  'Ear drops',
  'Nasal',
  'Injection',
];

export function prettyStatus(status: string): string {
  return status.replace('_', ' ');
}

export function statusBadgeClasses(status: string): string {
  const map: Record<string, string> = {
    requested: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    approved: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    cancelled: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700 ring-gray-500/20';
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function patientNameFromAppointment(apt: AppointmentItem): string {
  if (apt.patient?.user) {
    return `${apt.patient.user.firstName} ${apt.patient.user.lastName}`;
  }
  return `Patient #${apt.patient?.id ?? ''}`;
}

export function emptyMedicine(): MedicineEntry {
  return { name: '', dosage: '', frequency: '', duration: '', route: 'Oral', instructions: '' };
}

export function normalizeMedicine(m: MedicineEntry): MedicineEntry {
  const fallbackDosage = [m.strength, m.dose, m.unit].filter(Boolean).join(' ');
  return {
    name: m.name || '',
    dosage: m.dosage || fallbackDosage || '',
    strength: m.strength || '',
    dose: m.dose || '',
    unit: m.unit || '',
    frequency: m.frequency || '',
    duration: m.duration || '',
    route: m.route || '',
    instructions: m.instructions || '',
  };
}

export function formatMedicineForDisplay(m: MedicineEntry): string {
  const dosage = m.dosage || [m.strength, m.dose, m.unit].filter(Boolean).join(' ');
  const headline = [m.name, dosage].filter(Boolean).join(' ');
  const schedule = [m.frequency, m.duration].filter(Boolean).join(' for ');
  const route = m.route ? ` via ${m.route.toLowerCase()}` : '';
  const instruction = m.instructions ? ` ${m.instructions}` : '';
  const parts = [headline || 'Medicine', schedule ? `Take ${schedule}${route}.` : route ? `Use${route}.` : '', instruction].filter(Boolean);
  return parts.join(' ').trim();
}
