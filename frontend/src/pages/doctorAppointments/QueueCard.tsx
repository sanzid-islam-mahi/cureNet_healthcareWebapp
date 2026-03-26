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
  const tone = title.toLowerCase().includes('triage')
    ? 'amber'
    : title.toLowerCase().includes('active')
      ? 'indigo'
      : 'slate';

  const headerToneClasses = tone === 'amber'
    ? 'border-amber-200 bg-amber-50'
    : tone === 'indigo'
      ? 'border-indigo-200 bg-indigo-50'
      : 'border-slate-200 bg-slate-50';

  const badgeToneClasses = tone === 'amber'
    ? 'bg-amber-100 text-amber-800'
    : tone === 'indigo'
      ? 'bg-indigo-100 text-indigo-800'
      : 'bg-slate-200 text-slate-700';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className={`border-b px-5 py-4 ${headerToneClasses}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeToneClasses}`}>
            {items.length} case{items.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4 p-4 xl:grid-cols-2">
          {items.map((apt) => {
            const isRequested = apt.status === 'requested';
            const isApproved = apt.status === 'approved';
            const isInProgress = apt.status === 'in_progress';

            return (
              <article key={apt.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-full flex-col gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{patientNameFromAppointment(apt)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Appointment #{apt.id}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusBadgeClasses(apt.status)}`}
                      >
                        {prettyStatus(apt.status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                        {formatDate(apt.appointmentDate)}
                      </span>
                      {apt.window ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                          {apt.window}
                        </span>
                      ) : null}
                      {typeof apt.serial === 'number' ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                          Token {apt.serial}
                        </span>
                      ) : null}
                      {apt.type ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 capitalize text-slate-700">
                          {apt.type.replace('_', ' ')}
                        </span>
                      ) : null}
                    </div>

                    {apt.reason ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Reason:</span> {apt.reason}
                      </div>
                    ) : null}

                    {apt.symptoms ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                        <span className="font-medium text-rose-900">Symptoms:</span> {apt.symptoms}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2">
                    {apt.patient?.id ? (
                      <button
                        type="button"
                        onClick={() => onOpenPatient(apt.patient!.id)}
                        className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
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
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
