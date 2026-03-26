import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../context/AuthContext';

export interface ReminderMedicineEntry {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
  strength?: string;
  dose?: string;
  unit?: string;
}

interface ReminderPreviewDose {
  scheduledAt: string;
  metadata?: {
    scheduledDate?: string;
    scheduledTime?: string;
  };
}

interface ReminderPreview {
  medicineName: string;
  dosage?: string | null;
  frequencyLabel?: string | null;
  instructions?: string | null;
  timezone: string;
  startDate: string;
  endDate?: string | null;
  generatedUntil: string;
  scheduleTimes: string[];
  doseCount: number;
  doses: ReminderPreviewDose[];
}

interface ReminderSetupModalProps {
  prescriptionId: number;
  medicines: ReminderMedicineEntry[];
  defaultStartDate?: string;
  onClose: () => void;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function suggestTimes(frequency?: string) {
  const value = (frequency || '').toLowerCase();
  if (!value) return ['08:00'];

  if (['od', 'daily', 'once daily'].includes(value)) return ['08:00'];
  if (['bd', 'twice daily'].includes(value)) return ['08:00', '20:00'];
  if (['tds', 'tid', 'three times daily'].includes(value)) return ['08:00', '14:00', '20:00'];
  if (['qid', 'four times daily'].includes(value)) return ['06:00', '12:00', '18:00', '22:00'];
  if (value === 'at bedtime' || value === 'hs' || value === 'every night' || value === 'nightly') return ['22:00'];
  if (value === 'every morning') return ['08:00'];
  if (value === 'every evening') return ['19:00'];
  if (value === 'morning and evening') return ['08:00', '19:00'];
  if (value.includes('every 8 hour')) return ['06:00', '14:00', '22:00'];
  if (value.includes('every 12 hour')) return ['08:00', '20:00'];
  if (value.includes('three')) return ['08:00', '14:00', '20:00'];
  if (value.includes('twice')) return ['08:00', '20:00'];
  if (value.includes('four')) return ['06:00', '12:00', '18:00', '22:00'];
  if (value.includes('as needed') || value === 'prn' || value === 'sos') return ['08:00'];
  return ['08:00'];
}

function formatMedicineLabel(medicine: ReminderMedicineEntry) {
  const dosage = medicine.dosage || [medicine.strength, medicine.dose, medicine.unit].filter(Boolean).join(' ');
  const detail = [dosage, medicine.frequency].filter(Boolean).join(' • ');
  return detail ? `${medicine.name || 'Medicine'} (${detail})` : medicine.name || 'Medicine';
}

function formatSuggestionCopy(frequency?: string) {
  if (!frequency) return 'Suggested from your prescription details. Adjust the exact reminder times if needed.';
  return `Suggested from the doctor instruction: ${frequency}. Adjust the exact reminder times if needed.`;
}

function frequencySummary(frequency?: string) {
  const value = (frequency || '').trim();
  if (!value) return 'No standard frequency was entered. Choose the times that match the doctor instruction.';
  if (/^(od|once daily|daily)$/i.test(value)) return 'This usually means one reminder each day.';
  if (/^(bd|twice daily)$/i.test(value)) return 'This usually means two reminders spaced across the day.';
  if (/^(tds|tid|three times daily)$/i.test(value)) return 'This usually means morning, afternoon, and night reminders.';
  if (/^(qid|four times daily)$/i.test(value)) return 'This usually means four evenly spaced reminders.';
  if (/every 8 hours/i.test(value)) return 'This usually means three reminders spaced every 8 hours.';
  if (/every 12 hours/i.test(value)) return 'This usually means two reminders spaced every 12 hours.';
  if (/at bedtime|hs|nightly|every night/i.test(value)) return 'This usually means one reminder late at night.';
  if (/as needed|prn|sos/i.test(value)) return 'Use reminders only if you want timed prompts for an as-needed medicine.';
  return 'Review the suggested times and adjust them if the doctor gave a more specific instruction.';
}

export default function ReminderSetupModal({
  prescriptionId,
  medicines,
  defaultStartDate,
  onClose,
}: ReminderSetupModalProps) {
  const queryClient = useQueryClient();
  const initialTimes = useMemo(() => suggestTimes(medicines[0]?.frequency), [medicines]);
  const [medicineIndex, setMedicineIndex] = useState(0);
  const [startDate, setStartDate] = useState(defaultStartDate || todayDateString());
  const [endDate, setEndDate] = useState(addDays(defaultStartDate || todayDateString(), 6));
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [scheduleTimes, setScheduleTimes] = useState(initialTimes);
  const [preview, setPreview] = useState<ReminderPreview | null>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean; data: { preview: ReminderPreview } }>('/reminders/preview', {
        prescriptionId,
        medicineIndex,
        startDate,
        endDate,
        timezone,
        scheduleTimes,
      });
      return data.data.preview;
    },
    onSuccess: (data) => setPreview(data),
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to preview reminder schedule';
      toast.error(message || 'Failed to preview reminder schedule');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/reminders', {
        prescriptionId,
        medicineIndex,
        startDate,
        endDate,
        timezone,
        scheduleTimes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['patient-reminder-doses'] });
      toast.success('Medication reminder created');
      onClose();
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to create reminder';
      toast.error(message || 'Failed to create reminder');
    },
  });

  const updateSuggestedTimes = (index: number) => {
    setScheduleTimes(suggestTimes(medicines[index]?.frequency));
    setPreview(null);
  };

  const updateTime = (index: number, value: string) => {
    setScheduleTimes((current) => current.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
    setPreview(null);
  };

  const addTime = () => {
    setScheduleTimes((current) => [...current, '12:00']);
    setPreview(null);
  };

  const removeTime = (index: number) => {
    setScheduleTimes((current) => current.filter((_, entryIndex) => entryIndex !== index));
    setPreview(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">Set medication reminder</h3>
          <p className="text-sm text-slate-500">Choose a medicine, confirm exact reminder times, and preview the generated doses.</p>
        </header>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1.05fr,0.95fr]">
          <div className="overflow-y-auto border-r border-slate-200 p-6">
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">How this works</p>
                <p className="mt-1">
                  The doctor writes the medication frequency as a clinical instruction. You confirm the exact reminder times that fit your day.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Medicine</label>
                <select
                  value={medicineIndex}
                  onChange={(event) => {
                    const nextIndex = parseInt(event.target.value, 10);
                    setMedicineIndex(nextIndex);
                    updateSuggestedTimes(nextIndex);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {medicines.map((medicine, index) => (
                    <option key={`${medicine.name || 'medicine'}-${index}`} value={index}>
                      {formatMedicineLabel(medicine)}
                    </option>
                  ))}
                </select>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{medicines[medicineIndex]?.name || 'Medicine'}</p>
                  <p className="mt-1">{medicines[medicineIndex]?.dosage || [medicines[medicineIndex]?.strength, medicines[medicineIndex]?.dose, medicines[medicineIndex]?.unit].filter(Boolean).join(' ') || 'Dosage not specified'}</p>
                  <p className="mt-1">{formatSuggestionCopy(medicines[medicineIndex]?.frequency)}</p>
                  <p className="mt-1 text-slate-600">{frequencySummary(medicines[medicineIndex]?.frequency)}</p>
                  {medicines[medicineIndex]?.route ? (
                    <p className="mt-1 text-slate-600">Route: {medicines[medicineIndex]?.route}</p>
                  ) : null}
                  {medicines[medicineIndex]?.instructions ? (
                    <p className="mt-1 text-slate-600">Instruction: {medicines[medicineIndex]?.instructions}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setPreview(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setPreview(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(event) => {
                    setTimezone(event.target.value);
                    setPreview(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Reminder times</p>
                    <p className="text-xs text-slate-500">Exact times used to generate dose rows.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addTime}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Add time
                  </button>
                </div>

                <div className="space-y-3">
                  {scheduleTimes.map((time, index) => (
                    <div key={`${time}-${index}`} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(event) => updateTime(index, event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeTime(index)}
                        disabled={scheduleTimes.length === 1}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => previewMutation.mutate()}
                  disabled={previewMutation.isPending}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {previewMutation.isPending ? 'Generating preview…' : 'Preview schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create reminder'}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto bg-slate-50 p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Schedule preview</p>
              {!preview ? (
                <p className="mt-3 text-sm text-slate-500">Generate a preview to inspect the first wave of upcoming doses before saving.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Medicine</p>
                      <p className="mt-1 text-sm font-medium text-blue-900">{preview.medicineName}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Doses generated</p>
                      <p className="mt-1 text-sm font-medium text-emerald-900">{preview.doseCount}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p><span className="font-medium text-slate-900">Doctor instruction:</span> {preview.frequencyLabel || 'Not specified'}</p>
                    <p><span className="font-medium text-slate-900">Your reminder times:</span> {preview.scheduleTimes.join(', ')}</p>
                    <p><span className="font-medium text-slate-900">Schedule range:</span> {preview.startDate} to {preview.endDate || preview.generatedUntil}</p>
                    <p><span className="font-medium text-slate-900">Timezone:</span> {preview.timezone}</p>
                  </div>

                  <div className="space-y-2">
                    {preview.doses.slice(0, 12).map((dose, index) => (
                      <div key={`${dose.scheduledAt}-${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        <p className="font-medium text-slate-900">{dose.metadata?.scheduledDate || new Date(dose.scheduledAt).toLocaleDateString()}</p>
                        <p className="text-slate-600">{dose.metadata?.scheduledTime || new Date(dose.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    ))}
                    {preview.doseCount > 12 ? (
                      <p className="pt-1 text-xs text-slate-500">Showing the first 12 doses. The saved plan will include the full generated range.</p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
