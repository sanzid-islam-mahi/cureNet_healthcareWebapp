import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellAlertIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../context/AuthContext';
import ReminderSetupModal, { type ExistingReminderPlan, type ReminderMedicineEntry } from '../components/ReminderSetupModal';

interface ReminderPlan {
  id: number;
  prescriptionId: number;
  medicineIndex: number;
  medicineName: string;
  dosage?: string | null;
  frequencyLabel?: string | null;
  status: 'active' | 'paused' | 'stopped';
  timezone: string;
  startDate: string;
  endDate?: string | null;
  scheduleTimes: string[];
  prescription?: {
    diagnosis?: string;
    appointment?: {
      appointmentDate?: string;
      doctor?: {
        firstName?: string;
        lastName?: string;
      } | null;
    } | null;
    medicines?: ReminderMedicineEntry[];
  } | null;
}

interface ReminderDose {
  id: number;
  scheduledAt: string;
  status: 'scheduled' | 'sent' | 'taken' | 'missed' | 'skipped';
  plan?: ReminderPlan | null;
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDoctor(plan: ReminderPlan) {
  const doctor = plan.prescription?.appointment?.doctor;
  return doctor ? `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Doctor';
}

export default function PatientReminders() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'paused' | 'stopped'>('all');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'taken' | 'missed' | 'sent' | 'scheduled'>('all');
  const [editingPlan, setEditingPlan] = useState<ReminderPlan | null>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['patient-reminders', activeFilter],
    queryFn: async () => {
      const params = activeFilter === 'all' ? undefined : { status: activeFilter };
      const { data } = await api.get<{ success: boolean; data: { reminderPlans: ReminderPlan[] } }>('/reminders', { params });
      return data.data.reminderPlans ?? [];
    },
  });

  const { data: doses = [], isLoading: dosesLoading } = useQuery({
    queryKey: ['patient-reminder-doses'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { doses: ReminderDose[] } }>('/reminders/doses');
      return data.data.doses ?? [];
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'pause' | 'resume' | 'stop' }) => {
      await api.put(`/reminders/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-reminders'] });
      toast.success('Reminder updated');
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to update reminder';
      toast.error(message || 'Failed to update reminder');
    },
  });

  const takeDoseMutation = useMutation({
    mutationFn: async (doseId: number) => {
      await api.post(`/reminders/doses/${doseId}/taken`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-reminder-doses'] });
      toast.success('Dose marked as taken');
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to update dose';
      toast.error(message || 'Failed to update dose');
    },
  });

  const todayString = new Date().toISOString().slice(0, 10);
  const todayDoses = useMemo(
    () => doses.filter((dose) => ['scheduled', 'sent'].includes(dose.status) && dose.scheduledAt.slice(0, 10) === todayString),
    [doses, todayString]
  );
  const historyDoses = useMemo(() => {
    const source = doses.filter((dose) => ['taken', 'missed', 'sent', 'scheduled'].includes(dose.status));
    const filtered = historyFilter === 'all' ? source : source.filter((dose) => dose.status === historyFilter);
    return filtered
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 12);
  }, [doses, historyFilter]);
  const takenCount = doses.filter((dose) => dose.status === 'taken').length;
  const missedCount = doses.filter((dose) => dose.status === 'missed').length;
  const dueCount = todayDoses.length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Medication Reminders</h2>
            <p className="text-sm text-slate-600">Monitor active reminder plans, upcoming doses, and treatment adherence in one workspace.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'active', 'paused', 'stopped'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeFilter === filter ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {filter === 'all' ? 'All plans' : filter[0].toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-blue-700">
              <BellAlertIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Active plans</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-900">{plans.filter((plan) => plan.status === 'active').length}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-700">
              <ClockIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Today&apos;s doses</p>
            </div>
              <p className="mt-2 text-2xl font-bold text-amber-900">{dueCount}</p>
            </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircleIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Taken doses</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{takenCount}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
            <div className="flex items-center gap-2 text-rose-700">
              <BellAlertIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Missed doses</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-900">{missedCount}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">Reminder Plans</h3>
            <p className="text-sm text-slate-500">Each plan is tied to one medicine from a prescription record.</p>
          </header>

          {plansLoading ? (
            <div className="px-5 py-10 text-sm text-slate-500">Loading reminder plans...</div>
          ) : plans.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">No reminder plans yet. Create one from your prescription history.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <article key={plan.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{plan.medicineName}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${plan.status === 'active' ? 'bg-emerald-100 text-emerald-700' : plan.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                          {plan.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{plan.dosage || 'Dosage not specified'} • {plan.frequencyLabel || 'Frequency not specified'}</p>
                      <p className="text-sm text-slate-600">{formatDoctor(plan)} • {plan.prescription?.appointment?.appointmentDate || '—'}</p>
                      <p className="text-sm text-slate-700">Times: {plan.scheduleTimes.join(', ')} • Timezone: {plan.timezone}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {plan.status !== 'stopped' ? (
                        <button
                          type="button"
                          onClick={() => setEditingPlan(plan)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                      ) : null}
                      {plan.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => updatePlanMutation.mutate({ id: plan.id, action: 'pause' })}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Pause
                        </button>
                      ) : null}
                      {plan.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => updatePlanMutation.mutate({ id: plan.id, action: 'resume' })}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Resume
                        </button>
                      ) : null}
                      {plan.status !== 'stopped' ? (
                        <button
                          type="button"
                          onClick={() => updatePlanMutation.mutate({ id: plan.id, action: 'stop' })}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
                        >
                          Stop
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">Today&apos;s Medicines</h3>
            <p className="text-sm text-slate-500">Only the doses due today are shown here.</p>
          </header>

          {dosesLoading ? (
            <div className="px-5 py-10 text-sm text-slate-500">Loading doses...</div>
          ) : todayDoses.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">No medicines are due today.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayDoses.map((dose) => (
                <article key={dose.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{dose.plan?.medicineName || 'Medicine reminder'}</p>
                      <p className="text-sm text-slate-600">{formatDateTime(dose.scheduledAt)}</p>
                      <p className="text-xs text-slate-500">{dose.plan?.frequencyLabel || 'Reminder dose'} • {dose.status}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => takeDoseMutation.mutate(dose.id)}
                      disabled={takeDoseMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Taken
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Dose History</h3>
            <p className="text-sm text-slate-500">Track what was sent, taken, and missed over time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'taken', 'missed', 'sent', 'scheduled'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setHistoryFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${historyFilter === filter ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {filter === 'all' ? 'All history' : filter[0].toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {dosesLoading ? (
          <div className="px-5 py-10 text-sm text-slate-500">Loading dose history...</div>
        ) : historyDoses.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">No matching reminder history yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyDoses.map((dose) => (
              <article key={dose.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{dose.plan?.medicineName || 'Medicine reminder'}</p>
                    <p className="text-sm text-slate-600">{formatDateTime(dose.scheduledAt)}</p>
                    <p className="text-xs text-slate-500">{dose.plan?.frequencyLabel || 'Reminder dose'}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    dose.status === 'taken'
                      ? 'bg-emerald-100 text-emerald-700'
                      : dose.status === 'missed'
                        ? 'bg-rose-100 text-rose-700'
                        : dose.status === 'sent'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                  }`}>
                    {dose.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editingPlan ? (
        <ReminderSetupModal
          prescriptionId={editingPlan.prescriptionId}
          medicines={editingPlan.prescription?.medicines ?? []}
          defaultStartDate={editingPlan.prescription?.appointment?.appointmentDate}
          existingPlan={{
            id: editingPlan.id,
            medicineIndex: editingPlan.medicineIndex,
            timezone: editingPlan.timezone,
            startDate: editingPlan.startDate,
            endDate: editingPlan.endDate,
            scheduleTimes: editingPlan.scheduleTimes,
          } satisfies ExistingReminderPlan}
          onClose={() => setEditingPlan(null)}
        />
      ) : null}
    </div>
  );
}
