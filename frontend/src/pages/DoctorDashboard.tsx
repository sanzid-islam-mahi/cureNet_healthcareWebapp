import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import AppPageHeader from '../components/AppPageHeader';

interface StatCard {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  gradient: string;
  textColor: string;
}

const statCards: StatCard[] = [
  {
    key: 'todayAppointments',
    label: "Today's Appointments",
    icon: CalendarDaysIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-100',
    gradient: 'from-blue-50 to-white',
    textColor: 'text-blue-700',
  },
  {
    key: 'pendingAppointments',
    label: 'Pending Review',
    icon: ClockIcon,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    border: 'border-amber-100',
    gradient: 'from-amber-50 to-white',
    textColor: 'text-amber-700',
  },
  {
    key: 'inProgressAppointments',
    label: 'In Progress',
    icon: CheckCircleIcon,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    border: 'border-indigo-100',
    gradient: 'from-indigo-50 to-white',
    textColor: 'text-indigo-700',
  },
  {
    key: 'completedAppointments',
    label: 'Completed Today',
    icon: CheckCircleIcon,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    border: 'border-emerald-100',
    gradient: 'from-emerald-50 to-white',
    textColor: 'text-emerald-700',
  },
  {
    key: 'totalPatients',
    label: 'Total Patients',
    icon: UserGroupIcon,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    border: 'border-purple-100',
    gradient: 'from-purple-50 to-white',
    textColor: 'text-purple-700',
  },
  {
    key: 'totalAppointments',
    label: 'All-time Appointments',
    icon: ChartBarIcon,
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    border: 'border-rose-100',
    gradient: 'from-rose-50 to-white',
    textColor: 'text-rose-700',
  },
];

const STATUS_STYLES: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border border-blue-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
  rejected: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

type Appointment = {
  id: number;
  appointmentDate?: string;
  window?: string;
  serial?: number;
  status?: string;
  patient?: { user?: { firstName?: string; lastName?: string } };
};

type Review = {
  id: number;
  rating: number;
  review?: string;
  createdAt?: string;
};

type QueueSummary = {
  pendingApprovals?: number;
  todaysCareTasks?: number;
  outstandingFollowUps?: number;
};

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon
          key={s}
          className={`w-4 h-4 ${s <= score ? 'text-amber-400' : 'text-slate-200'}`}
        />
      ))}
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return iso; }
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function patientName(apt: Appointment) {
  const f = apt.patient?.user?.firstName;
  const l = apt.patient?.user?.lastName;
  if (f || l) return `${f ?? ''} ${l ?? ''}`.trim();
  return `Patient #${apt.id}`;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;

  const { data: statsData } = useQuery({
    queryKey: ['doctors', doctorId, 'dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { stats: Record<string, number> & { queue?: QueueSummary } } }>(
        `/doctors/${doctorId}/dashboard/stats`
      );
      return data.data?.stats ?? {};
    },
    enabled: !!doctorId,
  });

  const { data: ratingsData } = useQuery({
    queryKey: ['ratings', doctorId, 'full'],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { summary: { averageRating: number; totalRatings: number }; ratings: Review[] };
      }>(`/ratings/doctor/${doctorId}`);
      return data.data ?? { summary: { averageRating: 0, totalRatings: 0 }, ratings: [] };
    },
    enabled: !!doctorId,
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ['doctors', doctorId, 'appointments', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await api.get<{ success: boolean; data: { appointments: Appointment[] } }>(
        `/doctors/${doctorId}/appointments?date=${today}`
      );
      return data.data?.appointments ?? [];
    },
    enabled: !!doctorId,
  });

  // Upcoming: next 5 appointments after today
  const { data: upcomingAppointments } = useQuery({
    queryKey: ['doctors', doctorId, 'appointments', 'upcoming'],
    queryFn: async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fromDate = tomorrow.toISOString().slice(0, 10);
      const { data } = await api.get<{ success: boolean; data: { appointments: Appointment[] } }>(
        `/doctors/${doctorId}/appointments?limit=5&sortBy=appointmentDate&sortOrder=ASC`
      );
      // Filter to only future dates client-side (API may not support fromDate filter)
      const all = data.data?.appointments ?? [];
      return all.filter((a) => (a.appointmentDate ?? '') >= fromDate).slice(0, 5);
    },
    enabled: !!doctorId,
  });

  const stats = statsData ?? {};
  const queue = (stats as Record<string, unknown>).queue as QueueSummary | undefined;
  const summary = ratingsData?.summary ?? { averageRating: 0, totalRatings: 0 };
  const recentReviews = (ratingsData?.ratings ?? []).slice(0, 5);
  const pendingCount = stats.requestedAppointments ?? 0;
  const appointments = todayAppointments ?? [];
  const upcoming = upcomingAppointments ?? [];

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AppPageHeader
        eyebrow="Doctor Dashboard"
        title={`Dr. ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
        description={`Operational view for ${todayStr}. Review appointment load, follow-ups, patient continuity, and recent feedback.`}
        actions={
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <span className="font-semibold text-amber-900">
                {summary.totalRatings > 0 ? summary.averageRating.toFixed(1) : '—'}
              </span>{' '}
              rating
              <span className="ml-2 text-amber-700">{summary.totalRatings} reviews</span>
            </div>
            <Link
              to="/app/doctor-appointments"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open appointment desk
            </Link>
          </>
        }
      />

      {/* ===== PENDING ALERT ===== */}
      {pendingCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-xl shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-800">
              {pendingCount} appointment request{pendingCount > 1 ? 's' : ''} awaiting approval
            </p>
            <p className="text-sm text-amber-700 mt-0.5">Review and accept or decline to keep your schedule up to date.</p>
          </div>
          <Link
            to="/app/doctor-appointments"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Review <ArrowRightIcon className="w-4 h-4" />
          </Link>
          </div>
        </div>
      )}

      {queue && (
        <div className="grid gap-3 sm:grid-cols-3">
          <QueuePill
            title="Pending Approvals"
            value={queue.pendingApprovals ?? 0}
            subtitle="Needs review"
          />
          <QueuePill
            title="Today's Care Tasks"
            value={queue.todaysCareTasks ?? 0}
            subtitle="Actionable visits"
          />
          <QueuePill
            title="Outstanding Follow-ups"
            value={queue.outstandingFollowUps ?? 0}
            subtitle="Recent completed without Rx"
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(({ key, label, icon: Icon, color, bg, border, gradient, textColor }) => (
          <div
            key={key}
            className={`relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-5 shadow-sm`}
          >
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${bg} opacity-60`} />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">{label}</p>
                <p className={`text-4xl font-extrabold ${textColor} tabular-nums`}>
                  {stats[key as keyof typeof stats] ?? 0}
                </p>
              </div>
              <div className={`p-3 ${bg} rounded-2xl shadow-inner`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner">
                <CalendarDaysIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Today's Schedule</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
            </div>
            <Link to="/app/doctor-appointments" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              View all <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <CalendarDaysIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold">No appointments today</p>
              <p className="text-xs text-slate-400">Enjoy the free time or update your availability.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(appointments as Appointment[]).map((apt, idx) => (
                <div key={apt.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-600 font-bold text-xs">{String(idx + 1).padStart(2, '0')}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{patientName(apt)}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {apt.window ? <span className="capitalize">{apt.window} session</span> : formatDate(apt.appointmentDate)}
                        {apt.serial != null && <span>· #{apt.serial}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[apt.status ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[apt.status ?? ''] ?? apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 text-violet-600 rounded-xl shadow-inner">
                <CalendarDaysIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Upcoming</h3>
                <p className="text-xs text-slate-500 font-medium">Next scheduled visits</p>
              </div>
            </div>
            <Link to="/app/doctor-appointments" className="text-xs font-bold text-violet-600 hover:text-violet-500 transition-colors">
              See all
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <CalendarDaysIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold text-sm">No upcoming appointments</p>
              <p className="text-xs text-slate-400">Your schedule beyond today is clear.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {upcoming.map((apt) => (
                <div key={apt.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex flex-col items-center justify-center shrink-0 shadow-inner">
                    <span className="text-[10px] font-black text-violet-500 uppercase leading-none">
                      {new Date(apt.appointmentDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-extrabold text-violet-700 leading-none">
                      {new Date(apt.appointmentDate + 'T12:00:00').getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{patientName(apt)}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      {apt.window ? <span className="capitalize">{apt.window}</span> : '—'}
                      {apt.serial != null && <span>· Serial #{apt.serial}</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[apt.status ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[apt.status ?? ''] ?? apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shadow-inner">
              <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Patient Reviews</h3>
              <p className="text-xs text-slate-500 font-medium">
                {summary.totalRatings} total · {summary.averageRating.toFixed(1)} avg rating
              </p>
            </div>
          </div>
          {/* Overall star display */}
          <div className="flex items-center gap-2">
            <StarRating score={Math.round(summary.averageRating)} />
            <span className="text-sm font-bold text-amber-600">
              {summary.totalRatings > 0 ? summary.averageRating.toFixed(1) : '—'}
            </span>
          </div>
        </div>

        {recentReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-semibold">No reviews yet</p>
            <p className="text-xs text-slate-400">Completed appointments can be rated by patients.</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentReviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3 hover:border-amber-200 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <StarRating score={r.rating} />
                  <span className="text-xs text-slate-400 font-medium">{timeAgo(r.createdAt)}</span>
                </div>
                {r.review ? (
                  <p className="text-sm text-slate-700 leading-relaxed line-clamp-3 font-medium italic">
                    "{r.review}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No written review</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${r.rating >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : r.rating === 3 ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                    <StarIcon className="w-3 h-3" /> {r.rating}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/app/doctor-appointments"
          className="group flex items-center gap-4 rounded-2xl border border-slate-900 bg-slate-900 px-5 py-4 shadow-sm transition-all hover:bg-slate-800"
        >
          <div className="p-2.5 bg-white/10 rounded-xl">
            <CalendarDaysIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm">Manage Appointments</p>
            <p className="text-indigo-200 text-xs">Accept, reschedule, complete</p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/app/doctor-my-patients"
          className="group flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="p-2.5 bg-purple-100 rounded-xl">
            <UserGroupIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">My Patients</p>
            <p className="text-slate-500 text-xs">View patient records</p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/app/doctor-profile"
          className="group flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="p-2.5 bg-emerald-100 rounded-xl">
            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">Update Profile</p>
            <p className="text-slate-500 text-xs">Credentials, schedule, bio</p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

    </div>
  );
}

function QueuePill({ title, value, subtitle }: { title: string; value: number; subtitle: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
