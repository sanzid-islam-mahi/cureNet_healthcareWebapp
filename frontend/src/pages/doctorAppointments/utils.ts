import type { AppointmentItem, MedicineEntry } from './types';

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
  return { name: '', dosage: '', frequency: '', duration: '', instructions: '' };
}

export function normalizeMedicine(m: MedicineEntry): MedicineEntry {
  return {
    name: m.name || '',
    dosage: m.dosage || '',
    frequency: m.frequency || '',
    duration: m.duration || '',
    instructions: m.instructions || '',
  };
}

export function formatMedicineForDisplay(m: MedicineEntry): string {
  const details = [m.dosage, m.frequency, m.duration].filter(Boolean).join(' | ');
  const extra = m.instructions ? ` (${m.instructions})` : '';
  return `${m.name}${details ? ` - ${details}` : ''}${extra}`;
}
