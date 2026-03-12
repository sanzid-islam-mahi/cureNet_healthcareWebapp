import { Op } from 'sequelize';
import db from '../models/index.js';

const { MedicationDose, PatientMedicationTracker } = db;

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function parseTimeToUtc(date, hhmm) {
  const [hourStr, minuteStr] = hhmm.split(':');
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
}

function defaultReminderTimes(timesPerDay) {
  const count = Math.max(1, Math.min(timesPerDay || 1, 6));
  const startHour = 8;
  const endHour = 22;
  const span = endHour - startHour;
  if (count === 1) return ['08:00'];
  const step = Math.floor(span / (count - 1));
  const times = [];
  for (let i = 0; i < count; i += 1) {
    const hour = Math.min(startHour + step * i, 23);
    times.push(`${String(hour).padStart(2, '0')}:00`);
  }
  return times;
}

export async function regenerateFutureDosesForTracker(
  trackerId,
  { horizonDays = 30, includeToday = false } = {},
) {
  const tracker = await PatientMedicationTracker.findByPk(trackerId);
  if (!tracker) return;

  const plain = tracker.get({ plain: true });
  const {
    id, patientId, startedAt, durationDays, timesPerDay, reminderTimes, status,
  } = plain;

  if (!startedAt || !timesPerDay || status === 'completed' || status === 'paused') {
    await MedicationDose.destroy({
      where: {
        trackerId: id,
        scheduledAt: { [Op.gte]: new Date() },
      },
    });
    return;
  }

  const startDate = new Date(startedAt);
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const baseFromDate = includeToday ? todayUtc : addDays(todayUtc, 1);
  const fromDate = baseFromDate > startDate ? baseFromDate : startDate;
  const maxDuration = typeof durationDays === 'number' && durationDays > 0 ? durationDays : horizonDays;
  const endDate = addDays(startDate, maxDuration);

  const times = Array.isArray(reminderTimes) && reminderTimes.length
    ? reminderTimes
    : defaultReminderTimes(timesPerDay);

  await MedicationDose.destroy({
    where: {
      trackerId: id,
      status: {
        [Op.ne]: 'taken',
      },
      scheduledAt: { [Op.gte]: fromDate },
    },
  });

  const doses = [];
  for (let d = new Date(fromDate); d <= endDate; d = addDays(d, 1)) {
    times.forEach((t) => {
      if (!/^\d{2}:\d{2}$/.test(String(t))) return;
      const scheduledAt = parseTimeToUtc(d, t);
      doses.push({
        patientId,
        trackerId: id,
        scheduledAt,
        windowEndAt: null,
        status: 'scheduled',
        takenAt: null,
        source: 'system',
        metadata: null,
      });
    });
  }

  if (doses.length) {
    await MedicationDose.bulkCreate(doses);
  }
}

