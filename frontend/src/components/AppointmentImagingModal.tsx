import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, useAuth } from '../context/AuthContext';
import type { MedicalImagingRecord } from '../types/medicalImaging';
import MedicalImagingList from './MedicalImagingList';

type Scope = 'appointment' | 'external';

interface AppointmentSummary {
  id: number;
  patientId: number;
  appointmentDate?: string;
  type?: string;
  status?: string;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function AppointmentImagingModal({
  scope,
  appointmentId,
  onClose,
}: {
  scope: Scope;
  appointmentId?: number | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingRecord, setEditingRecord] = useState<MedicalImagingRecord | null>(null);
  const [form, setForm] = useState({
    title: '',
    studyType: 'xray',
    bodyPart: '',
    studyDate: '',
    reportText: '',
    notes: '',
    file: null as File | null,
  });

  const { data: appointment } = useQuery({
    queryKey: ['appointment', appointmentId, 'imaging-context'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: { appointment: AppointmentSummary } }>(`/appointments/${appointmentId}`);
      return response.data.data.appointment;
    },
    enabled: scope === 'appointment' && !!appointmentId,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['imaging', scope, appointmentId || 'external'],
    queryFn: async () => {
      if (scope === 'appointment' && appointmentId) {
        const response = await api.get<{ success: boolean; data: { records: MedicalImagingRecord[] } }>(`/imaging/appointment/${appointmentId}`);
        return response.data.data.records;
      }
      const response = await api.get<{ success: boolean; data: { records: MedicalImagingRecord[] } }>('/imaging/my');
      return (response.data.data.records || []).filter((record) => record.sourceType === 'external');
    },
  });

  useEffect(() => {
    if (!editingRecord) {
      setForm({
        title: '',
        studyType: scope === 'external' ? 'other' : 'xray',
        bodyPart: '',
        studyDate: '',
        reportText: '',
        notes: '',
        file: null,
      });
      return;
    }
    setForm({
      title: editingRecord.title || '',
      studyType: editingRecord.studyType || 'other',
      bodyPart: editingRecord.bodyPart || '',
      studyDate: editingRecord.studyDate || '',
      reportText: editingRecord.reportText || '',
      notes: editingRecord.notes || '',
      file: null,
    });
  }, [editingRecord, scope]);

  const canUpload = useMemo(() => {
    if (scope === 'external') return user?.role === 'patient';
    return user?.role === 'doctor' || user?.role === 'receptionist';
  }, [scope, user?.role]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('studyType', form.studyType);
      if (form.bodyPart) payload.append('bodyPart', form.bodyPart);
      if (form.studyDate) payload.append('studyDate', form.studyDate);
      if (form.reportText) payload.append('reportText', form.reportText);
      if (form.notes) payload.append('notes', form.notes);
      if (form.file) payload.append('file', form.file);

      if (scope === 'appointment') {
        if (!appointment?.patientId || !appointmentId) {
          throw new Error('Appointment context is not ready yet');
        }
        payload.append('patientId', String(appointment?.patientId));
        payload.append('appointmentId', String(appointmentId));
      }

      if (editingRecord) {
        await api.put(`/imaging/${editingRecord.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        if (!form.file) throw new Error('Select a file to upload');
        await api.post('/imaging', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['imaging', scope, appointmentId || 'external'] });
      await queryClient.invalidateQueries({ queryKey: ['patient-medical-history'] });
      await queryClient.invalidateQueries({ queryKey: ['patient-imaging'] });
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (scope === 'appointment' && appointmentId) {
        await queryClient.invalidateQueries({ queryKey: ['doctor-patient-context'] });
        await queryClient.invalidateQueries({ queryKey: ['prescription', appointmentId] });
      }
      setEditingRecord(null);
      toast.success(editingRecord ? 'Imaging updated' : 'Imaging uploaded');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to save imaging');
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">
            {scope === 'appointment' ? 'Appointment Imaging' : 'External Imaging Uploads'}
          </h3>
          <p className="text-sm text-slate-500">
            {scope === 'appointment'
              ? `Manage imaging linked to ${formatDate(appointment?.appointmentDate)}${appointment?.type ? ` • ${appointment.type.replace('_', ' ')}` : ''}.`
              : 'Upload personal imaging files that are not bound to a CureNet appointment.'}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h4 className="text-sm font-semibold text-slate-950">
                  {scope === 'appointment' ? 'Linked Imaging Records' : 'External Imaging Records'}
                </h4>
              </div>
              <div className="px-5 py-5">
                {isLoading ? (
                  <p className="text-sm text-slate-500">Loading imaging records...</p>
                ) : (
                  <MedicalImagingList
                    records={records}
                    emptyMessage={scope === 'appointment' ? 'No imaging has been linked to this appointment yet.' : 'No external imaging uploads yet.'}
                    compact
                    renderActions={
                      canUpload
                        ? (record) => (
                            <button
                              type="button"
                              onClick={() => setEditingRecord(record)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Edit imaging
                            </button>
                          )
                        : undefined
                    }
                  />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h4 className="text-sm font-semibold text-slate-950">
                  {editingRecord ? 'Edit Imaging' : scope === 'appointment' ? 'Add Medical Imaging' : 'Add External Imaging'}
                </h4>
              </div>
              <div className="px-5 py-5">
                {!canUpload ? (
                  <p className="text-sm text-slate-500">
                    {scope === 'appointment'
                      ? 'You can review linked appointment imaging here. Only doctors and receptionists can add or edit appointment-linked records.'
                      : 'Patients can upload external imaging from this screen.'}
                  </p>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveMutation.mutate();
                    }}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Title</span>
                        <input
                          value={form.title}
                          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                          required
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Study Type</span>
                        <select
                          value={form.studyType}
                          onChange={(event) => setForm((current) => ({ ...current, studyType: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="xray">X-ray</option>
                          <option value="mri">MRI</option>
                          <option value="ct">CT</option>
                          <option value="ultrasound">Ultrasound</option>
                          <option value="echo">Echo</option>
                          <option value="mammography">Mammography</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Body Part</span>
                        <input
                          value={form.bodyPart}
                          onChange={(event) => setForm((current) => ({ ...current, bodyPart: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Study Date</span>
                        <input
                          type="date"
                          value={form.studyDate}
                          onChange={(event) => setForm((current) => ({ ...current, studyDate: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                        />
                      </label>
                    </div>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Report Summary</span>
                      <textarea
                        rows={3}
                        value={form.reportText}
                        onChange={(event) => setForm((current) => ({ ...current, reportText: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</span>
                      <textarea
                        rows={2}
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {editingRecord ? 'Replace File (Optional)' : 'File'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                        className="block text-sm text-slate-700"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      {editingRecord ? (
                        <button
                          type="button"
                          onClick={() => setEditingRecord(null)}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel edit
                        </button>
                      ) : null}
                      <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {saveMutation.isPending ? 'Saving...' : editingRecord ? 'Save imaging' : scope === 'appointment' ? 'Upload imaging' : 'Upload external imaging'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          </div>
        </div>

        <footer className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
