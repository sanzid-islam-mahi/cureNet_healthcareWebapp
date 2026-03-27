import { ArrowDownTrayIcon, CalendarDaysIcon, PhotoIcon } from '@heroicons/react/24/outline';
import type { MedicalImagingRecord } from '../types/medicalImaging';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatStudyType(value?: string) {
  if (!value) return 'Imaging';
  const label = value.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildFileHref(fileUrl: string) {
  if (!fileUrl) return '#';
  if (/^https?:\/\//.test(fileUrl)) return fileUrl;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${fileUrl}`;
}

function uploaderName(record: MedicalImagingRecord) {
  if (!record.uploader) return 'Care team upload';
  const name = `${record.uploader.firstName || ''} ${record.uploader.lastName || ''}`.trim();
  return name ? `Dr. ${name}` : record.uploader.email || 'Care team upload';
}

export default function MedicalImagingList({
  records,
  emptyMessage,
  compact = false,
  renderActions,
}: {
  records: MedicalImagingRecord[];
  emptyMessage: string;
  compact?: boolean;
  renderActions?: (record: MedicalImagingRecord) => React.ReactNode;
}) {
  if (!records.length) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <article
          key={record.id}
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                  {formatStudyType(record.studyType)}
                </span>
                {record.status ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {record.status}
                  </span>
                ) : null}
              </div>
              <h3 className="text-base font-semibold text-slate-950">{record.title}</h3>
              <p className="text-sm text-slate-600">
                {record.bodyPart ? `${record.bodyPart} • ` : ''}
                Study date {formatDate(record.studyDate || record.createdAt)}
              </p>
              <p className="text-sm text-slate-500">
                Uploaded by {uploaderName(record)}
                {record.appointment?.clinic?.name ? ` • ${record.appointment.clinic.name}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={buildFileHref(record.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Open file
              </a>
              {renderActions ? renderActions(record) : null}
            </div>
          </div>

          <div className={`mt-4 grid gap-3 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-[0.95fr,1.05fr]'}`}>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarDaysIcon className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Linked Visit</p>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                {record.appointment
                  ? `${formatDate(record.appointment.appointmentDate)}${record.appointment.type ? ` • ${record.appointment.type.replace('_', ' ')}` : ''}`
                  : 'Not linked to a specific appointment'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-700">
                <PhotoIcon className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Report Summary</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {record.reportText || record.notes || 'No report summary was added to this imaging record.'}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
