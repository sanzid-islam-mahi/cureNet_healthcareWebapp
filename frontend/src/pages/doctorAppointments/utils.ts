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
  return {
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    timesPerDay: 1,
    mealTiming: 'any',
    durationDays: 5,
    instructions: '',
  };
}

export function normalizeMedicine(m: MedicineEntry): MedicineEntry {
  const timesPerDay = Number.isFinite(Number(m.timesPerDay)) ? Number(m.timesPerDay) : undefined;
  const durationDays = Number.isFinite(Number(m.durationDays)) ? Number(m.durationDays) : undefined;
  const mealTiming = ['before_meal', 'after_meal', 'with_meal', 'any'].includes(String(m.mealTiming))
    ? m.mealTiming
    : undefined;
  return {
    name: m.name || '',
    dosage: m.dosage || '',
    frequency: m.frequency || (timesPerDay ? `${timesPerDay} times/day` : ''),
    duration: m.duration || (durationDays ? `${durationDays} days` : ''),
    timesPerDay,
    mealTiming,
    durationDays,
    instructions: m.instructions || '',
  };
}

export function formatMedicineForDisplay(m: MedicineEntry): string {
  const frequency = m.frequency || (m.timesPerDay ? `${m.timesPerDay} times/day` : '');
  const duration = m.duration || (m.durationDays ? `${m.durationDays} days` : '');
  const meal = m.mealTiming ? m.mealTiming.replace('_', ' ') : '';
  const details = [m.dosage, frequency, duration, meal].filter(Boolean).join(' | ');
  const extra = m.instructions ? ` (${m.instructions})` : '';
  return `${m.name}${details ? ` - ${details}` : ''}${extra}`;
}
