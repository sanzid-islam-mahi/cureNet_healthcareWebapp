import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import AppPageHeader from '../components/AppPageHeader';
import { api, useAuth } from '../context/AuthContext';

interface ClinicSummary {
  id: number;
  name?: string;
  type?: string | null;
  addressLine?: string | null;
  area?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  operatingHours?: string | null;
}

interface RosterDoctor {
  id: number;
  userId: number;
  department?: string | null;
  experience?: number | null;
  verified: boolean;
  consultationFee?: number | null;
  isAvailableToday: boolean;
  todayWindows: Array<{ key: string; label: string; maxPatients: number | null }>;
  queue: {
    totalToday: number;
    requested: number;
    approved: number;
    inProgress: number;
    completed: number;
  };
  user?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
  } | null;
}

function formatMoney(value?: number | string | null) {
  if (value == null || value === '') return 'Fee not set';
  return `৳${Number(value)}`;
}

function clinicAddress(clinic?: ClinicSummary | null) {
  return [clinic?.addressLine, clinic?.area, clinic?.city].filter(Boolean).join(', ');
}

export default function ReceptionistDoctors() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['receptionist', 'clinic-roster'],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: {
          clinic: ClinicSummary | null;
          date: string;
          doctors: RosterDoctor[];
        };
      }>('/doctors/clinic-roster');
      return data.data;
    },
    enabled: !!user?.clinicId,
  });

  const clinic = data?.clinic ?? user?.clinic ?? null;
  const doctors = data?.doctors ?? [];
  const totalRequested = doctors.reduce((sum, doctor) => sum + doctor.queue.requested, 0);
  const totalActive = doctors.reduce((sum, doctor) => sum + doctor.queue.approved + doctor.queue.inProgress, 0);
  const availableToday = doctors.filter((doctor) => doctor.isAvailableToday).length;

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Clinic Operations"
        title="Doctors and Daily Operations"
        description="Track which doctors are practicing today, how their clinic queues are loading, and what front-desk coordination needs attention."
        actions={
          <Link
            to="/app/receptionist-appointments"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open appointment board
          </Link>
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_#eff6ff_0%,_#ffffff_55%,_#f8fafc_100%)] px-6 py-6 xl:border-b-0 xl:border-r">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <BuildingOffice2Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Clinic</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {clinic?.name || (user?.clinicId ? `Clinic #${user.clinicId}` : 'Clinic assignment pending')}
                </h2>
                {clinicAddress(clinic) ? (
                  <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                    <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>{clinicAddress(clinic)}</span>
                  </p>
                ) : null}
                {clinic?.phone ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <PhoneIcon className="h-4 w-4 text-slate-400" />
                    <span>{clinic.phone}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <PanelStat label="Doctors today" value={`${availableToday}/${doctors.length}`} tone="sky" />
              <PanelStat label="Requests waiting" value={`${totalRequested}`} tone="amber" />
              <PanelStat label="Active clinic load" value={`${totalActive}`} tone="emerald" />
            </div>
          </div>

          <div className="bg-slate-950 px-6 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Desk guidance</p>
            <div className="mt-4 space-y-4">
              <FocusTile
                title="Verify doctor availability"
                description="Use today’s window blocks and current queue counts before approving or rerouting requests."
              />
              <FocusTile
                title="Watch clinic bottlenecks"
                description="Doctors with pending requests but limited active windows are the first ones to coordinate."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Doctor roster</h2>
          <p className="mt-1 text-sm text-slate-500">A clinic-scoped view of doctors, current queue load, and today’s published windows.</p>
        </div>

        {doctors.length === 0 ? (
          <div className="px-5 py-12 text-sm text-slate-500">No doctors are assigned to this clinic yet.</div>
        ) : (
          <div className="grid gap-4 p-5 xl:grid-cols-2">
            {doctors.map((doctor) => {
              const name = `${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`.trim() || `Doctor #${doctor.id}`;
              return (
                <article key={doctor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">Dr. {name}</h3>
                        {doctor.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            <CheckBadgeIcon className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            Approval pending
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{doctor.department || 'Department not set'}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${doctor.isAvailableToday ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'}`}>
                      {doctor.isAvailableToday ? 'Available today' : 'Unavailable today'}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoTile label="Clinic contact check" value={doctor.user?.phone || doctor.user?.email || 'No direct contact'} />
                    <InfoTile label="Consultation fee" value={formatMoney(doctor.consultationFee)} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <QueueTile label="Requests" value={doctor.queue.requested} tone="amber" />
                    <QueueTile label="Approved" value={doctor.queue.approved} tone="emerald" />
                    <QueueTile label="In progress" value={doctor.queue.inProgress} tone="sky" />
                    <QueueTile label="Total today" value={doctor.queue.totalToday} tone="slate" />
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Today&apos;s windows</p>
                    </div>
                    {doctor.todayWindows.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {doctor.todayWindows.map((window) => (
                          <span key={`${doctor.id}-${window.key}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                            {window.label}{window.maxPatients ? ` • Max ${window.maxPatients}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">No active clinic windows published for today.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function PanelStat({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'emerald' | 'sky' }) {
  const classes =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-800 ring-amber-100'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
        : 'bg-sky-50 text-sky-800 ring-sky-100';

  return (
    <div className={`rounded-2xl px-4 py-4 ring-1 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FocusTile({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function QueueTile({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'emerald' | 'sky' | 'slate' }) {
  const classes =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-800'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-800'
        : tone === 'sky'
          ? 'bg-sky-50 text-sky-800'
          : 'bg-slate-100 text-slate-700';
  return (
    <div className={`rounded-2xl px-3 py-3 ${classes}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
