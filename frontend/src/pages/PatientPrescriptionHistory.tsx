import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, DocumentTextIcon, BeakerIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { api } from '../context/AuthContext';
import PrescriptionView from '../components/PrescriptionView';
import ReminderSetupModal, { type ReminderMedicineEntry } from '../components/ReminderSetupModal';

interface PrescriptionRecord {
  id: number;
  appointmentId: number;
  diagnosis?: string;
  medicines?: ReminderMedicineEntry[];
  notes?: string;
  createdAt?: string;
  appointment?: {
    appointmentDate?: string;
    type?: string;
    doctor?: {
      firstName?: string;
      lastName?: string;
    } | null;
  } | null;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function doctorName(record: PrescriptionRecord) {
  const doctor = record.appointment?.doctor;
  return doctor ? `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Doctor';
}

export default function PatientPrescriptionHistory() {
  const [search, setSearch] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [reminderRecordId, setReminderRecordId] = useState<number | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['patient-prescription-history'],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { prescriptions: PrescriptionRecord[] } }>(
        '/prescriptions/history/patient'
      );
      return res.data?.prescriptions ?? [];
    },
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;
    return data.filter((record) => {
      const haystack = [
        doctorName(record),
        record.diagnosis || '',
        record.notes || '',
        ...(record.medicines ?? []).map((medicine) => medicine.name || ''),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data, search]);

  const stats = useMemo(() => {
    const medicineCount = filtered.reduce((sum, record) => sum + (record.medicines?.length ?? 0), 0);
    return {
      total: filtered.length,
      medicines: medicineCount,
      latestDate: filtered[0]?.appointment?.appointmentDate,
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Prescription History</h2>
            <p className="text-sm text-slate-600">
              Review previous diagnoses, medications, and visit prescriptions in one place.
            </p>
          </div>

          <label className="relative block w-full max-w-sm">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by doctor, diagnosis, medicine"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-blue-700">
              <DocumentTextIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Prescriptions</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <BeakerIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Medicines Logged</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.medicines}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-slate-700">
              <CalendarDaysIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Latest Prescription</p>
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900">{formatDate(stats.latestDate)}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Prescription Archive</h3>
          <p className="text-sm text-slate-500">Each record is linked to its original appointment.</p>
        </header>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">Loading prescription archive...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            {search.trim() ? 'No prescription records match your search.' : 'No prescription records available yet.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((record) => (
              <article key={record.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{record.diagnosis || 'Prescription record'}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {doctorName(record)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatDate(record.appointment?.appointmentDate)} • {(record.appointment?.type || '—').replace('_', ' ')}
                    </p>
                    <p className="text-sm text-slate-700">
                      {(record.medicines?.length ?? 0)} medicine{(record.medicines?.length ?? 0) === 1 ? '' : 's'} recorded
                    </p>
                    {record.notes ? (
                      <p className="max-w-3xl rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {record.notes.length > 180 ? `${record.notes.slice(0, 180)}...` : record.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setReminderRecordId(record.id)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Set reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAppointmentId(record.appointmentId)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open record
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedAppointmentId != null ? (
        <PrescriptionView
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      ) : null}

      {reminderRecordId != null ? (
        <ReminderSetupModal
          prescriptionId={reminderRecordId}
          medicines={data.find((record) => record.id === reminderRecordId)?.medicines ?? []}
          defaultStartDate={data.find((record) => record.id === reminderRecordId)?.appointment?.appointmentDate}
          onClose={() => setReminderRecordId(null)}
        />
      ) : null}
    </div>
  );
}
