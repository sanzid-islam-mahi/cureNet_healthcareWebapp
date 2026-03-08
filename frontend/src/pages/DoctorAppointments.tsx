/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, useAuth } from '../context/AuthContext';

interface AppointmentItem {
  id: number;
  appointmentDate: string;
  timeBlock: string;
  type: string;
  status: string;
  reason?: string;
  window?: string;
  serial?: number;
  patient?: { id: number; user?: { firstName: string; lastName: string } };
}

export default function DoctorAppointments() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prescriptionFor, setPrescriptionFor] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments', doctorId, dateFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateFilter) params.date = dateFilter;
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await api.get<{ success: boolean; data: { appointments: AppointmentItem[] } }>(
        `/doctors/${doctorId}/appointments`,
        { params }
      );
      return res.data?.appointments ?? [];
    },
    enabled: !!doctorId,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' | 'start' | 'complete' }) =>
      api.put(`/appointments/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      toast.success('Updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed');
    },
  });

  const appointments = (data ?? []) as AppointmentItem[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-200 text-center text-gray-500">
          No appointments.
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const patientName = apt.patient?.user
              ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}`
              : `Patient #${apt.patient?.id ?? ''}`;
            const isRequested = apt.status === 'requested';
            const isApproved = apt.status === 'approved';
            const isInProgress = apt.status === 'in_progress';
            return (
              <div
                key={apt.id}
                className="rounded-lg bg-white shadow-sm border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{patientName}</p>
                  <p className="text-sm text-gray-500">
                    {apt.appointmentDate} at {apt.window} serial: {apt.serial} · {apt.type?.replace('_', ' ')} ·{' '}
                    <span className="capitalize">{apt.status?.replace('_', ' ')}</span>
                  </p>
                  {apt.reason && <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {isRequested && (
                    <>
                      <button
                        type="button"
                        onClick={() => actionMutation.mutate({ id: apt.id, action: 'approve' })}
                        disabled={actionMutation.isPending}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => actionMutation.mutate({ id: apt.id, action: 'reject' })}
                        disabled={actionMutation.isPending}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => actionMutation.mutate({ id: apt.id, action: 'start' })}
                      disabled={actionMutation.isPending}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      Start
                    </button>
                  )}
                  {isInProgress && (
                    <>
                      <button
                        type="button"
                        onClick={() => actionMutation.mutate({ id: apt.id, action: 'complete' })}
                        disabled={actionMutation.isPending}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrescriptionFor(apt.id)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Add prescription
                      </button>
                    </>
                  )}
                  {apt.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => setPrescriptionFor(apt.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View / Edit prescription
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {prescriptionFor != null && (
        <PrescriptionFormModal
          appointmentId={prescriptionFor}
          onClose={() => {
            setPrescriptionFor(null);
            queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
          }}
        />
      )}
    </div>
  );
}

interface PrescriptionFormModalProps {
  appointmentId: number;
  onClose: () => void;
}

interface PrescriptionData {
  id: number;
  diagnosis?: string;
  medicines?: { name: string; dosage: string; duration: string }[];
  notes?: string;
}

function PrescriptionFormModal({ appointmentId, onClose }: PrescriptionFormModalProps) {
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<{ name: string; dosage: string; duration: string }[]>([{ name: '', dosage: '', duration: '' }]);
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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
          return null; // No existing prescription
        }
        throw error; // Re-throw other errors
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
      setMedicines(existing.medicines?.length ? existing.medicines : [{ name: '', dosage: '', duration: '' }]);
      setIsEditing(false);
    } else {
      setDiagnosis('');
      setNotes('');
      setMedicines([{ name: '', dosage: '', duration: '' }]);
      setIsEditing(true);
    }
  }, [existing, loadingExisting]);

  const createMutation = useMutation({
    mutationFn: (body: { appointmentId: number; diagnosis?: string; medicines?: { name: string; dosage: string; duration: string }[]; notes?: string }) =>
      api.post('/prescriptions', body),
    onSuccess: () => {
      toast.success('Prescription saved');
      queryClient.invalidateQueries({ queryKey: ['prescription', appointmentId] });
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to save');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: { id: number; diagnosis?: string; medicines?: { name: string; dosage: string; duration: string }[]; notes?: string }) =>
      api.put(`/prescriptions/${body.id}`, body),
    onSuccess: () => {
      toast.success('Prescription updated');
      queryClient.invalidateQueries({ queryKey: ['prescription', appointmentId] });
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update');
    },
  });

  const addRow = () => setMedicines((m) => [...m, { name: '', dosage: '', duration: '' }]);
  const removeRow = (indexToRemove: number) => {
    setMedicines((m) => m.filter((_, i) => i !== indexToRemove));
  };
  const updateRow = (i: number, field: 'name' | 'dosage' | 'duration', value: string) => {
    setMedicines((m) => m.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const meds = medicines.filter((m) => m.name.trim());
    const payload = {
      diagnosis: diagnosis || undefined,
      medicines: meds.length ? meds : undefined,
      notes: notes || undefined,
    };

    if (existing && existing.id && isEditing) {
      updateMutation.mutate({ id: existing.id, ...payload });
    } else {
      createMutation.mutate({ appointmentId, ...payload });
    }
  };

  const hasExisting = existing != null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {hasExisting ? (isEditing ? 'Edit Prescription' : 'Prescription Details') : 'Add Prescription'}
          </h3>
          {loadingExisting && <p className="text-gray-500">Loading...</p>}

          {!loadingExisting && hasExisting && !isEditing && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm space-y-2">
              {existing.diagnosis && <p><span className="font-medium">Diagnosis:</span> {existing.diagnosis}</p>}
              {existing.medicines?.length ? (
                <div>
                  <p className="font-medium">Medicines:</p>
                  <ul className="list-disc list-inside ml-4">
                    {existing.medicines.map((m, i) => (
                      <li key={i}>{m.name} {m.dosage && `— ${m.dosage}`} {m.duration && `(${m.duration})`}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {existing.notes && <p><span className="font-medium">Notes:</span> {existing.notes}</p>}
            </div>
          )}

          {!loadingExisting && (isEditing || !hasExisting) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Medicines</label>
                  <button type="button" onClick={addRow} className="text-sm text-indigo-600 hover:text-indigo-500">
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {medicines.map((m, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <input
                        placeholder="Name"
                        value={m.name}
                        onChange={(e) => updateRow(i, 'name', e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder="Dosage"
                        value={m.dosage}
                        onChange={(e) => updateRow(i, 'dosage', e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder="Duration"
                        value={m.duration}
                        onChange={(e) => updateRow(i, 'duration', e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-red-600 hover:text-red-800 text-sm p-1"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                {hasExisting && isEditing && (
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}

          {!loadingExisting && hasExisting && !isEditing && (
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Close
              </button>
              <button type="button" onClick={() => setIsEditing(true)} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                Edit
              </button>
            </div>
          )}
          {!loadingExisting && !hasExisting && !isEditing && ( // This case should not happen if !hasExisting implies isEditing=true
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
