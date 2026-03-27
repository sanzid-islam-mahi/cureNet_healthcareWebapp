import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import AppPageHeader from '../components/AppPageHeader';
import { api, useAuth } from '../context/AuthContext';

interface QueueAppointment {
  id: number;
  clinicId?: number | null;
  appointmentDate: string;
  status: string;
  type: string;
  reason?: string | null;
  symptoms?: string | null;
  window?: string | null;
  serial?: number | null;
  patient?: { user?: { firstName?: string; lastName?: string; phone?: string } } | null;
  doctor?: { user?: { firstName?: string; lastName?: string }; department?: string | null } | null;
  clinic?: { name?: string | null; addressLine?: string | null; area?: string | null; city?: string | null; phone?: string | null } | null;
}

function formatDate(date: string) {
  if (!date) return 'No date';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function sortQueue(appointments: QueueAppointment[]) {
  const rank: Record<string, number> = {
    requested: 0,
    approved: 1,
    in_progress: 2,
    completed: 3,
    rejected: 4,
    cancelled: 5,
  };

  return [...appointments].sort((a, b) => {
    const byStatus = (rank[a.status] ?? 99) - (rank[b.status] ?? 99);
    if (byStatus !== 0) return byStatus;
    return `${a.appointmentDate} ${a.window || ''}`.localeCompare(`${b.appointmentDate} ${b.window || ''}`);
  });
}

export default function ReceptionistDashboard() {
  const { user } = useAuth();

  const { data: appointments = [] } = useQuery({
    queryKey: ['receptionist', 'clinic-queue', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { appointments: QueueAppointment[] } }>('/appointments/clinic-queue', {
        params: { limit: 50 },
      });
      return sortQueue(data.data?.appointments ?? []);
    },
    enabled: !!user?.clinicId,
  });

  const clinic = appointments[0]?.clinic ?? user?.clinic ?? null;
  const requested = appointments.filter((item) => item.status === 'requested');
  const approved = appointments.filter((item) => item.status === 'approved');
  const inProgress = appointments.filter((item) => item.status === 'in_progress');
  const previewItems = appointments.slice(0, 4);

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Reception Desk"
        title="Clinic Front Desk"
        description="Review new requests, confirm who is coming in, and keep the clinic queue clean before it reaches the doctors."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/app/receptionist-doctors"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Doctors and operations
            </Link>
            <Link
              to="/app/receptionist-appointments"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open full queue
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_#eff6ff_0%,_#ffffff_55%,_#f8fafc_100%)] px-6 py-6 xl:border-b-0 xl:border-r">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <BuildingOffice2Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Assigned Clinic</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {clinic?.name || (user?.clinicId ? `Clinic #${user.clinicId}` : 'Clinic assignment pending')}
                </h2>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {(clinic?.addressLine || clinic?.area || clinic?.city) ? (
                    <p className="flex items-start gap-2">
                      <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>{[clinic?.addressLine, clinic?.area, clinic?.city].filter(Boolean).join(', ')}</span>
                    </p>
                  ) : null}
                  {clinic?.phone ? (
                    <p className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-slate-400" />
                      <span>{clinic.phone}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricCard icon={ClockIcon} label="Needs review" value={`${requested.length}`} hint="Waiting for reception decision" tone="amber" />
              <MetricCard icon={CalendarDaysIcon} label="Ready today" value={`${approved.length}`} hint="Approved and lined up" tone="emerald" />
              <MetricCard icon={UserGroupIcon} label="In consultation" value={`${inProgress.length}`} hint="Already with doctors" tone="sky" />
            </div>
          </div>

          <div className="bg-slate-950 px-6 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Front-desk focus</p>
            <div className="mt-4 space-y-4">
              <FocusCard
                title="Next approvals"
                value={requested.length ? `${requested.length} waiting` : 'No pending requests'}
                description="Clear these first so doctors only see confirmed clinic workload."
              />
              <FocusCard
                title="Today&apos;s flow"
                value={`${approved.length + inProgress.length} active appointments`}
                description="Approved and in-progress visits are the live operational load."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Queue preview</h2>
            <p className="mt-1 text-sm text-slate-500">A quick view of the next patients and the doctors they are booked with.</p>
          </div>
          <Link to="/app/receptionist-appointments" className="text-sm font-medium text-sky-700 hover:text-sky-800">
            View all
          </Link>
        </div>

        {previewItems.length === 0 ? (
          <div className="px-5 py-12 text-sm text-slate-500">No clinic appointments have been scheduled yet.</div>
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {previewItems.map((appointment) => {
              const patientName = `${appointment.patient?.user?.firstName || ''} ${appointment.patient?.user?.lastName || ''}`.trim() || 'Patient';
              const doctorName = `${appointment.doctor?.user?.firstName || ''} ${appointment.doctor?.user?.lastName || ''}`.trim() || 'Doctor';

              return (
                <article key={appointment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{patientName}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatDate(appointment.appointmentDate)}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      appointment.status === 'requested'
                        ? 'bg-amber-100 text-amber-800'
                        : appointment.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : appointment.status === 'in_progress'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-200 text-slate-700'
                    }`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Patient</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{patientName}</p>
                      <p className="mt-1 text-xs text-slate-500">{appointment.patient?.user?.phone || 'Phone not added'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Doctor</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">Dr. {doctorName}</p>
                      <p className="mt-1 text-xs text-slate-500">{appointment.doctor?.department || 'Department not listed'}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {[appointment.window, appointment.serial ? `Serial ${appointment.serial}` : null, appointment.type.replace('_', ' ')].filter(Boolean).join(' • ')}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Clinic operations</h2>
            <p className="mt-1 text-sm text-slate-500">Doctor roster, today’s windows, and queue load in one operational view.</p>
          </div>
          <Link to="/app/receptionist-doctors" className="text-sm font-medium text-sky-700 hover:text-sky-800">
            Open doctors view
          </Link>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <OperationTile
            icon={UserGroupIcon}
            title="Doctor roster"
            description="See which doctors are assigned to this clinic and verify who is available today."
          />
          <OperationTile
            icon={CalendarDaysIcon}
            title="Published windows"
            description="Confirm which doctors have active morning, noon, or evening blocks before approving patients."
          />
          <OperationTile
            icon={ClockIcon}
            title="Queue balancing"
            description="Watch doctors with pending requests and move quickly before the clinic load gets lopsided."
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
  tone: 'amber' | 'emerald' | 'sky';
}) {
  const toneClasses =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-800 ring-amber-100'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
        : 'bg-sky-50 text-sky-800 ring-sky-100';

  return (
    <div className={`rounded-2xl px-4 py-4 ring-1 ${toneClasses}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{hint}</p>
    </div>
  );
}

function FocusCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}

function OperationTile({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Icon className="h-5 w-5" />
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
