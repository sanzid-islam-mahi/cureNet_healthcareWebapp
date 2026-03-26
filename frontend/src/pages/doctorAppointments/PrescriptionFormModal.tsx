/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../context/AuthContext';
import { useModalAccessibility } from './useModalAccessibility';
import type { MedicineEntry, PrescriptionApiResponse, PrescriptionData } from './types';
import {
  DURATION_OPTIONS,
  emptyMedicine,
  formatMedicineForDisplay,
  FREQUENCY_OPTIONS,
  normalizeMedicine,
  ROUTE_OPTIONS,
} from './utils';

interface PrescriptionFormModalProps {
  appointmentId: number;
  onClose: () => void;
}

export default function PrescriptionFormModal({ appointmentId, onClose }: PrescriptionFormModalProps) {
  const modalRef = useModalAccessibility(onClose);
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<MedicineEntry[]>([emptyMedicine()]);
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create');

  const { data: existing, isLoading: loadingExisting } = useQuery<PrescriptionData | null>({
    queryKey: ['prescription', appointmentId],
    queryFn: async () => {
      try {
        const { data: res } = await api.get<{ success: boolean; data: { prescription: PrescriptionData } }>(
          `/prescriptions/appointment/${appointmentId}`
        );
        return res.data?.prescription;
      } catch (error: unknown) {
        if (
          typeof error === 'object'
          && error !== null
          && 'response' in error
          && (error as { response?: { status?: number } }).response?.status === 404
        ) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!appointmentId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (loadingExisting) return;
    if (existing) {
      setDiagnosis(existing.diagnosis || '');
      setNotes(existing.notes || '');
      setMedicines(existing.medicines?.length ? existing.medicines.map(normalizeMedicine) : [emptyMedicine()]);
      setMode('view');
    } else {
      setDiagnosis('');
      setNotes('');
      setMedicines([emptyMedicine()]);
      setMode('create');
    }
  }, [existing, loadingExisting]);

  const createMutation = useMutation({
    mutationFn: async (body: { appointmentId: number; diagnosis?: string; medicines?: MedicineEntry[]; notes?: string }) => {
      const { data: res } = await api.post<PrescriptionApiResponse>('/prescriptions', body);
      return res.data?.prescription;
    },
    onSuccess: (prescription) => {
      toast.success('Prescription saved');
      queryClient.setQueryData(['prescription', appointmentId], prescription);
      queryClient.invalidateQueries({ queryKey: ['prescription', appointmentId] });
      setMode('view');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to save prescription');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: { id: number; diagnosis?: string; medicines?: MedicineEntry[]; notes?: string }) => {
      const { data: res } = await api.put<PrescriptionApiResponse>(`/prescriptions/${body.id}`, body);
      return res.data?.prescription;
    },
    onSuccess: (prescription) => {
      toast.success('Prescription updated');
      queryClient.setQueryData(['prescription', appointmentId], prescription);
      queryClient.invalidateQueries({ queryKey: ['prescription', appointmentId] });
      setMode('view');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update prescription');
    },
  });

  const addRow = () => setMedicines((m) => [...m, emptyMedicine()]);
  const removeRow = (indexToRemove: number) => {
    setMedicines((m) => m.filter((_, i) => i !== indexToRemove));
  };
  const updateRow = (i: number, field: keyof MedicineEntry, value: string) => {
    setMedicines((m) => m.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };

  const hasExisting = existing != null;
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const canSubmit = isEditing || isCreating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const meds = medicines.map(normalizeMedicine).filter((m) => m.name.trim());
    const payload = {
      diagnosis: diagnosis || undefined,
      medicines: meds.length ? meds : undefined,
      notes: notes || undefined,
    };

    if (existing && existing.id && isEditing) {
      updateMutation.mutate({ id: existing.id, ...payload });
    } else if (isCreating) {
      createMutation.mutate({ appointmentId, ...payload });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const applyFrequencyTemplate = (index: number, value: string) => {
    updateRow(index, 'frequency', value);
    if (!medicines[index]?.duration && value) {
      updateRow(index, 'duration', '5 days');
    }
  };

  const applyDurationTemplate = (index: number, value: string) => {
    updateRow(index, 'duration', value);
  };

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
        aria-label="Prescription Modal"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <header className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {hasExisting ? (isEditing ? 'Edit Prescription' : 'Prescription Record') : 'Create Prescription'}
          </h3>
          <p className="text-sm text-gray-500">
            Keep orders concise and clinically clear. Medicine name is required for each row.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loadingExisting ? <p className="text-sm text-gray-500">Loading prescription...</p> : null}

          {!loadingExisting && hasExisting && !isEditing ? (
            <div className="space-y-4 text-sm">
              <section className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Diagnosis</p>
                <p className="mt-1 text-gray-800">{existing.diagnosis || 'No diagnosis entered'}</p>
              </section>

              <section className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Medicines</p>
                {existing.medicines?.length ? (
                  <div className="mt-2 space-y-2">
                    {existing.medicines.map((m, i) => (
                      <p key={`${m.name}-${i}`} className="rounded-md bg-slate-50 px-3 py-2 text-gray-800">
                        {formatMedicineForDisplay(m)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-gray-500">No medicines recorded.</p>
                )}
              </section>

              <section className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Clinical Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-800">{existing.notes || 'No notes entered'}</p>
              </section>
            </div>
          ) : null}

          {!loadingExisting && canSubmit ? (
            <form id="prescription-form" onSubmit={handleSubmit} className="space-y-5">
              <section className="rounded-lg border border-gray-200 p-4">
                <label className="block text-sm font-semibold text-gray-800">Working Diagnosis</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={3}
                  placeholder="Primary diagnosis or impression"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </section>

              <section className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Medication Orders</p>
                    <p className="text-xs text-gray-500">Use one row per medicine.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    Add medicine
                  </button>
                </div>

                <div className="space-y-3">
                  {medicines.map((m, i) => (
                    <div key={`medicine-${i}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Medicine {i + 1}</p>
                        {medicines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="text-xs font-medium text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          placeholder="Medicine name *"
                          value={m.name}
                          onChange={(e) => updateRow(i, 'name', e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          placeholder="Dosage (e.g. 500 mg, 1 tablet)"
                          value={m.dosage || ''}
                          onChange={(e) => updateRow(i, 'dosage', e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        />
                        <div className="space-y-2">
                          <select
                            value={FREQUENCY_OPTIONS.includes(m.frequency || '') ? (m.frequency || '') : ''}
                            onChange={(e) => applyFrequencyTemplate(i, e.target.value)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">Choose common frequency</option>
                            {FREQUENCY_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <input
                            placeholder="Or custom frequency (e.g. Every other day)"
                            value={m.frequency || ''}
                            onChange={(e) => updateRow(i, 'frequency', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <select
                            value={DURATION_OPTIONS.includes(m.duration || '') ? (m.duration || '') : ''}
                            onChange={(e) => applyDurationTemplate(i, e.target.value)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">Choose common duration</option>
                            {DURATION_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <input
                            placeholder='Or custom duration (e.g. 2 weeks)'
                            value={m.duration || ''}
                            onChange={(e) => updateRow(i, 'duration', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <select
                          value={ROUTE_OPTIONS.includes(m.route || '') ? (m.route || '') : ''}
                          onChange={(e) => updateRow(i, 'route', e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Route</option>
                          {ROUTE_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Instructions (optional, e.g. After food)"
                          value={m.instructions || ''}
                          onChange={(e) => updateRow(i, 'instructions', e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                        <p className="mt-1">{formatMedicineForDisplay(normalizeMedicine(m))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 p-4">
                <label className="block text-sm font-semibold text-gray-800">Clinical Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Follow-up, cautions, or additional instructions"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </section>
            </form>
          ) : null}
        </div>

        <footer className="border-t border-gray-200 px-6 py-4">
          {hasExisting && mode === 'view' ? (
            <div key="view-mode-actions" className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setMode('edit')}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Edit prescription
              </button>
            </div>
          ) : (
            <div key="edit-create-actions" className="flex gap-2">
              {mode === 'edit' ? (
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                form="prescription-form"
                disabled={isSubmitting || !canSubmit}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save prescription'}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
