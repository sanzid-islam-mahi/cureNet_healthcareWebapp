import { useQuery } from '@tanstack/react-query';
import { api } from '../../context/AuthContext';
import { useModalAccessibility } from './useModalAccessibility';
import type { PatientContextData } from './types';
import { formatDate, prettyStatus, statusBadgeClasses } from './utils';

interface PatientContextModalProps {
  doctorId: number;
  patientId: number;
  onClose: () => void;
}

export default function PatientContextModal({
  doctorId,
  patientId,
  onClose,
}: PatientContextModalProps) {
  const modalRef = useModalAccessibility(onClose);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-patient-context', doctorId, patientId],
    queryFn: async () => {
      const { data: res } = await api.get<{
        success: boolean;
        data: { patient: PatientContextData };
      }>(`/doctors/${doctorId}/patients/${patientId}/context`);
      return res.data?.patient ?? null;
    },
    enabled: !!doctorId && !!patientId,
  });

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
        aria-label="Patient Clinical Context"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <header className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Patient Clinical Context</h3>
          <p className="text-sm text-gray-500">Snapshot of demographics, safety information, and recent encounters.</p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? <p className="text-sm text-gray-500">Loading patient information...</p> : null}

          {!isLoading && data ? (
            <div className="space-y-5 text-sm">
              <section className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-gray-900">
                    {data.user.firstName} {data.user.lastName}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {data.summary.totalVisitsWithDoctor} visits with you
                  </span>
                </div>
                <p className="mt-2 text-gray-600">
                  {data.user.email || 'No email'} • {data.user.phone || 'No phone'}
                </p>
                <p className="text-gray-600">
                  DOB: {formatDate(data.user.dateOfBirth)} • Gender: {data.user.gender || '—'}
                </p>
                <p className="text-gray-600">Address: {data.user.address || '—'}</p>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Blood Group</p>
                  <p className="mt-1 text-base font-semibold text-blue-900">{data.medical.bloodType || 'Not recorded'}</p>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Allergies</p>
                  <p className="mt-1 text-sm font-medium text-red-900">{data.medical.allergies || 'No allergy record'}</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Emergency Contact</p>
                  <p className="mt-1 text-sm text-amber-900">
                    {data.medical.emergencyContact || '—'} {data.medical.emergencyPhone ? `(${data.medical.emergencyPhone})` : ''}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">Insurance: {data.medical.insuranceProvider || 'Not recorded'}</p>
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Recent Encounters</p>
                <div className="mt-3 space-y-3">
                  {data.summary.recentAppointments.length === 0 ? (
                    <p className="text-sm text-gray-500">No prior encounters available.</p>
                  ) : (
                    data.summary.recentAppointments.map((a) => (
                      <article key={a.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900">{formatDate(a.appointmentDate)}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusBadgeClasses(a.status)}`}
                          >
                            {prettyStatus(a.status)}
                          </span>
                        </div>
                        {a.reason ? <p className="mt-1 text-gray-700"><span className="font-medium">Reason:</span> {a.reason}</p> : null}
                        {a.symptoms ? <p className="text-gray-700"><span className="font-medium">Symptoms:</span> {a.symptoms}</p> : null}
                        {a.hasPrescription ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            Prescription documented{a.diagnosis ? ` • ${a.diagnosis}` : ''}
                          </p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
