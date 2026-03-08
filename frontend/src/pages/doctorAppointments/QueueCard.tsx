import type { AppointmentAction, AppointmentItem } from './types';
import {
  formatDate,
  patientNameFromAppointment,
  prettyStatus,
  statusBadgeClasses,
} from './utils';

interface QueueCardProps {
  title: string;
  subtitle: string;
  items: AppointmentItem[];
  emptyMessage: string;
  onOpenPatient: (patientId: number) => void;
  onOpenPrescription: (appointmentId: number) => void;
  onAction: (id: number, action: AppointmentAction) => Promise<void> | void;
  actionPending: boolean;
}

export default function QueueCard({
  title,
  subtitle,
  items,
  emptyMessage,
  onOpenPatient,
  onOpenPrescription,
  onAction,
  actionPending,
}: QueueCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((apt) => {
            const isRequested = apt.status === 'requested';
            const isApproved = apt.status === 'approved';
            const isInProgress = apt.status === 'in_progress';

            return (
              <article key={apt.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{patientNameFromAppointment(apt)}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusBadgeClasses(apt.status)}`}
                      >
                        {prettyStatus(apt.status)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      {formatDate(apt.appointmentDate)}
                      {apt.window ? ` • ${apt.window}` : ''}
                      {typeof apt.serial === 'number' ? ` • Token ${apt.serial}` : ''}
                      {apt.type ? ` • ${apt.type.replace('_', ' ')}` : ''}
                    </p>

                    {apt.reason ? (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Reason:</span> {apt.reason}
                      </p>
                    ) : null}

                    {apt.symptoms ? (
                      <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
                        <span className="font-medium text-red-900">Symptoms:</span> {apt.symptoms}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {apt.patient?.id ? (
                      <button
                        type="button"
                        onClick={() => onOpenPatient(apt.patient!.id)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Patient context
                      </button>
                    ) : null}

                    {isRequested ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onAction(apt.id, 'approve')}
                          disabled={actionPending}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(apt.id, 'reject')}
                          disabled={actionPending}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}

                    {isApproved ? (
                      <button
                        type="button"
                        onClick={() => onAction(apt.id, 'start')}
                        disabled={actionPending}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        Start consult
                      </button>
                    ) : null}

                    {isInProgress ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenPrescription(apt.id)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Prescription
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(apt.id, 'complete')}
                          disabled={actionPending}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Complete
                        </button>
                      </>
                    ) : null}

                    {apt.status === 'completed' ? (
                      <button
                        type="button"
                        onClick={() => onOpenPrescription(apt.id)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View prescription
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
