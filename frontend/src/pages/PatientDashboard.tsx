import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';

const statCards = [
  { key: 'totalAppointments', label: 'Total Appointments', icon: CalendarDaysIcon },
  { key: 'todayAppointments', label: "Today's", icon: ClockIcon },
  { key: 'completedAppointments', label: 'Completed', icon: CheckCircleIcon },
  { key: 'pendingAppointments', label: 'Pending', icon: ClockIcon },
];

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function prettyStatus(status?: string): string {
  if (!status) return 'Unknown';
  return status.replace('_', ' ');
}

interface MedicationTracker {
  id: number;
  medicineName: string;
  timesPerDay: number;
  mealTiming: 'before_meal' | 'after_meal' | 'with_meal' | 'any';
  durationDays?: number | null;
  remindersEnabled: boolean;
  reminderTimes?: string[] | null;
  status: 'active' | 'paused' | 'completed';
}

type DoseStatus = 'scheduled' | 'notified' | 'taken' | 'missed' | 'skipped';

interface MedicationDose {
  id: number;
  trackerId: number;
  patientId: number;
  scheduledAt: string;
  windowEndAt?: string | null;
  status: DoseStatus;
  takenAt?: string | null;
  source: 'system' | 'manual';
  metadata?: unknown;
  tracker?: {
    id: number;
    medicineName: string;
    timesPerDay: number;
    mealTiming: 'before_meal' | 'after_meal' | 'with_meal' | 'any';
    status: 'active' | 'paused' | 'completed';
  } | null;
}

interface ReminderAlarmRow {
  enabled: boolean;
  time: string;
}

function defaultAlarmTime(index: number): string {
  const hour = Math.min(8 + (index * 4), 23);
  return `${String(hour).padStart(2, '0')}:00`;
}

function initialAlarmRows(med: MedicationTracker): ReminderAlarmRow[] {
  const existing = Array.isArray(med.reminderTimes) ? med.reminderTimes : [];
  return Array.from({ length: Math.max(1, med.timesPerDay) }).map((_, i) => ({
    enabled: Boolean(existing[i]),
    time: existing[i] || defaultAlarmTime(i),
  }));
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const patientId = user?.patientId;
  const queryClient = useQueryClient();
  const [reminderModalFor, setReminderModalFor] = useState<MedicationTracker | null>(null);
  const [alarmRows, setAlarmRows] = useState<ReminderAlarmRow[]>([]);
  const [todayRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  });

  const { data: statsData } = useQuery({
    queryKey: ['patients', patientId, 'dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: Record<string, number> & {
          queue?: { profileComplete?: boolean; pendingActions?: number; needsProfileCompletion?: boolean };
        };
      }>(`/patients/${patientId}/dashboard/stats`);
      return data.data;
    },
    enabled: !!patientId,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['patients', patientId, 'appointments'],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: {
          appointments: Array<{
            id: number;
            appointmentDate?: string;
            status?: string;
            type?: string;
            window?: string;
            serial?: number;
            doctor?: { user?: { firstName: string; lastName: string } };
          }>;
        };
      }>(`/patients/${patientId}/appointments?limit=8&sortBy=appointmentDate&sortOrder=DESC`);
      return data.data?.appointments ?? [];
    },
    enabled: !!patientId,
  });
  const { data: medicationData } = useQuery({
    queryKey: ['patients', patientId, 'medication-trackers', 'active'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { medications: MedicationTracker[] } }>(
        `/patients/${patientId}/medication-trackers`,
        { params: { status: 'active' } }
      );
      return data.data?.medications ?? [];
    },
    enabled: !!patientId,
  });

  const { data: dosesData } = useQuery({
    queryKey: ['patients', patientId, 'doses', todayRange.from, todayRange.to],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { doses: MedicationDose[] } }>(
        `/patients/${patientId}/doses`,
        { params: { from: todayRange.from, to: todayRange.to } }
      );
      return data.data?.doses ?? [];
    },
    enabled: !!patientId,
  });

  const trackerMutation = useMutation({
    mutationFn: async ({ trackerId, patch }: { trackerId: number; patch: Record<string, unknown> }) =>
      api.patch(`/patients/${patientId}/medication-trackers/${trackerId}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', patientId, 'medication-trackers', 'active'] });
      toast.success('Medication tracker updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update tracker');
    },
  });

  const stats = statsData ?? {};
  const queue = statsData?.queue ?? {};
  const appointments = useMemo(() => appointmentsData ?? [], [appointmentsData]);
  const activeMedications = medicationData ?? [];
  const todayDoses = dosesData ?? [];

  const markDoseMutation = useMutation({
    mutationFn: async ({ doseId, status }: { doseId: number; status: 'taken' | 'skipped' }) => {
      const { data } = await api.post<{ success: boolean }>(`/patients/${patientId}/doses/${doseId}/mark`, {
        status,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['patients', patientId, 'doses', todayRange.from, todayRange.to],
      });
      toast.success('Medication dose updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update dose');
    },
  });

  const groupedDoses = useMemo(() => {
    const byTracker = new Map<number, { tracker: MedicationDose['tracker']; doses: MedicationDose[] }>();
    todayDoses.forEach((dose) => {
      const key = dose.trackerId;
      const existing = byTracker.get(key);
      if (existing) {
        existing.doses.push(dose);
      } else {
        byTracker.set(key, { tracker: dose.tracker ?? null, doses: [dose] });
      }
    });
    return Array.from(byTracker.values());
  }, [todayDoses]);

  const perTrackerTodayStats = useMemo(() => {
    const map = new Map<number, { total: number; taken: number; skipped: number }>();
    todayDoses.forEach((dose) => {
      const current = map.get(dose.trackerId) ?? { total: 0, taken: 0, skipped: 0 };
      if (dose.status !== 'skipped') current.total += 1;
      if (dose.status === 'taken') current.taken += 1;
      if (dose.status === 'skipped') current.skipped += 1;
      map.set(dose.trackerId, current);
    });
    return map;
  }, [todayDoses]);

  const adherenceSummary = useMemo(() => {
    if (!todayDoses.length) return null;
    const totals = todayDoses.reduce(
      (acc, dose) => {
        if (dose.status === 'taken') acc.taken += 1;
        if (dose.status !== 'skipped') acc.expected += 1;
        return acc;
      },
      { taken: 0, expected: 0 }
    );
    if (!totals.expected) return null;
    const percent = Math.min(100, Math.round((totals.taken / totals.expected) * 100));
    return { percent, ...totals };
  }, [todayDoses]);

  const nextActiveAppointment = useMemo(() => {
    return appointments.find((apt) => ['requested', 'approved', 'in_progress'].includes(apt.status || ''));
  }, [appointments]);

  const openReminderModal = (med: MedicationTracker) => {
    setReminderModalFor(med);
    setAlarmRows(initialAlarmRows(med));
  };

  const saveReminders = async () => {
    if (!reminderModalFor) return;
    const enabledTimes = alarmRows
      .filter((row) => row.enabled)
      .map((row) => row.time.trim())
      .filter((value) => /^\d{2}:\d{2}$/.test(value));
    if (alarmRows.some((row) => row.enabled && !/^\d{2}:\d{2}$/.test(row.time.trim()))) {
      toast.error('Please select valid times for enabled alarms.');
      return;
    }
    try {
      await trackerMutation.mutateAsync({
        trackerId: reminderModalFor.id,
        patch: {
          reminderTimes: enabledTimes,
          remindersEnabled: enabledTimes.length > 0,
        },
      });
      setReminderModalFor(null);
    } catch {
      // handled by mutation onError
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.firstName} {user?.lastName}
        </h2>
        <p className="text-gray-600">Track your appointments and care actions in one place.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-2">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-xl font-semibold text-gray-900">{stats[key as keyof typeof stats] ?? 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {nextActiveAppointment ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Next Care Event</p>
          <p className="mt-1 text-lg font-semibold text-blue-900">
            {nextActiveAppointment.doctor?.user
              ? `Dr. ${nextActiveAppointment.doctor.user.firstName} ${nextActiveAppointment.doctor.user.lastName}`
              : 'Assigned doctor'}
          </p>
          <p className="text-sm text-blue-800">
            {formatDate(nextActiveAppointment.appointmentDate)} • {prettyStatus(nextActiveAppointment.status)}
          </p>
          <Link
            to="/app/patient-appointments"
            className="mt-3 inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            Open appointments
          </Link>
        </section>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold text-gray-900">Recent Appointments</h3>
          <Link to="/app/patient-appointments" className="text-sm text-indigo-600 hover:text-indigo-500">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {appointments.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-500">No appointments yet.</p>
          ) : (
            appointments.slice(0, 5).map((apt) => (
              <div key={apt.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {apt.doctor?.user
                      ? `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`
                      : 'Assigned doctor'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatDate(apt.appointmentDate)}
                    {apt.window ? ` • ${apt.window}` : ''}
                    {apt.serial != null ? ` (Serial ${apt.serial})` : ''}
                    {apt.type ? ` • ${apt.type.replace('_', ' ')}` : ''}
                  </p>
                </div>
                <span className="text-sm capitalize text-gray-500">{prettyStatus(apt.status)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold text-gray-900">Today&apos;s Medication Doses</h3>
          {adherenceSummary ? (
            <span className="text-xs text-gray-500">
              Adherence today: {adherenceSummary.percent}% ({adherenceSummary.taken}/
              {adherenceSummary.expected} taken)
            </span>
          ) : (
            <span className="text-xs text-gray-500">No doses scheduled for today</span>
          )}
        </div>
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {groupedDoses.length === 0 ? (
            <p className="col-span-full text-center text-sm text-gray-500">
              No scheduled doses found for today based on your current prescriptions and reminders.
            </p>
          ) : (
            groupedDoses.map(({ tracker, doses }) => (
              <div
                key={tracker?.id ?? doses[0]?.id}
                className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {tracker?.medicineName ?? 'Medication'}
                  </p>
                  <p className="text-[11px] text-gray-600">
                    {tracker?.timesPerDay ? `${tracker.timesPerDay} times/day` : null}
                    {tracker?.mealTiming ? ` • ${tracker.mealTiming.replace('_', ' ')}` : ''}
                  </p>
                </div>

                {(() => {
                  const trackerId = tracker?.id ?? doses[0]?.trackerId;
                  const stats = trackerId != null ? perTrackerTodayStats.get(trackerId) : undefined;
                  const totalPlanned = tracker?.timesPerDay ?? stats?.total ?? 0;
                  const taken = stats?.taken ?? 0;
                  const remaining = Math.max(0, totalPlanned - taken);
                  const nextPendingDose = doses.find(
                    (d) => d.status !== 'taken' && d.status !== 'skipped',
                  );

                  return (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-700">
                        <p>
                          Taken today:{' '}
                          <span className="font-semibold">
                            {taken}/{totalPlanned || tracker?.timesPerDay || 0}
                          </span>
                        </p>
                        {remaining > 0 ? (
                          <p className="text-[11px] text-gray-500">Remaining today: {remaining}</p>
                        ) : (
                          <p className="text-[11px] text-emerald-600">All doses taken today</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!nextPendingDose || remaining <= 0 || markDoseMutation.isPending}
                        onClick={() => {
                          if (!nextPendingDose) return;
                          markDoseMutation.mutate({
                            doseId: nextPendingDose.id,
                            status: 'taken',
                          });
                        }}
                        className="whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {remaining > 0 ? 'Add taken' : 'Done'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold text-gray-900">Active Medications</h3>
          <span className="text-xs text-gray-500">{activeMedications.length} active</span>
        </div>
        <div className="divide-y divide-gray-200">
          {activeMedications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">No active medications. Start once doctor prescribes.</p>
          ) : (
            activeMedications.map((med) => {
              const stats = perTrackerTodayStats.get(med.id);
              return (
                <div key={med.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{med.medicineName}</p>
                      <p className="text-sm text-gray-600">
                        {med.timesPerDay} times/day • {med.mealTiming.replace('_', ' ')}
                        {med.durationDays ? ` • ${med.durationDays} day plan` : ''}
                      </p>
                      {stats ? (
                        <p className="text-xs text-gray-500">
                          Taken today: {stats.taken}/{stats.total || med.timesPerDay}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => trackerMutation.mutate({ trackerId: med.id, patch: { status: 'completed' } })}
                        disabled={trackerMutation.isPending}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Complete
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {med.remindersEnabled && (med.reminderTimes || []).length
                        ? `Alarms: ${(med.reminderTimes || []).join(', ')}`
                        : 'No active reminders'}
                    </p>
                    <button
                      type="button"
                      onClick={() => openReminderModal(med)}
                      disabled={trackerMutation.isPending || med.status === 'completed'}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {med.remindersEnabled ? 'Edit reminders' : 'Add reminders'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-indigo-900">
              {queue.needsProfileCompletion ? 'Complete Your Profile Before First Booking' : 'Care Action Queue'}
            </h2>
            <p className="mt-1 text-sm text-indigo-700">
              {queue.needsProfileCompletion
                ? 'Add required health and emergency details to safely start booking appointments.'
                : `${queue.pendingActions ?? 0} pending action${(queue.pendingActions ?? 0) === 1 ? '' : 's'} in your care workflow.`}
            </p>
          </div>
          <div className="flex gap-2">
            {queue.needsProfileCompletion ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Safety profile required
              </div>
            ) : null}
            {queue.needsProfileCompletion ? (
              <Link
                to="/app/patient-profile"
                className="whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Complete profile
              </Link>
            ) : null}
            <Link
              to="/app/patient-appointments"
              className="whitespace-nowrap rounded-xl border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Manage appointments
            </Link>
          </div>
        </div>
      </section>

      {reminderModalFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Medication Alarms</h3>
              <p className="text-sm text-gray-500">
                {reminderModalFor.medicineName} • {reminderModalFor.timesPerDay} alarms/day
              </p>
            </div>

            <div className="space-y-3 px-6 py-5">
              {alarmRows.map((row, index) => (
                <div key={`alarm-row-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">Alarm {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => setAlarmRows((prev) => prev.map((item, i) => (
                        i === index ? { ...item, enabled: !item.enabled } : item
                      )))}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${row.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {row.enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="mt-2">
                    <input
                      type="time"
                      value={row.time}
                      disabled={!row.enabled}
                      onChange={(e) => setAlarmRows((prev) => prev.map((item, i) => (
                        i === index ? { ...item, time: e.target.value } : item
                      )))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setReminderModalFor(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveReminders}
                disabled={trackerMutation.isPending}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {trackerMutation.isPending ? 'Saving...' : 'Save alarms'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
