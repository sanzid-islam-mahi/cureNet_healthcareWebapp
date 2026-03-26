const DEFAULT_GENERATION_DAYS = 14;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function addDays(dateString, daysToAdd) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

export function toDateString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function compareDateStrings(a, b) {
  return a.localeCompare(b);
}

function buildDosageLabel(medicine) {
  if (!medicine || typeof medicine !== 'object') return null;
  const parts = [medicine.strength, medicine.dose, medicine.unit].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

export function inferScheduleTimesFromFrequency(frequencyLabel) {
  const value = String(frequencyLabel || '').trim().toLowerCase();
  if (!value) return ['08:00'];

  if (['od', 'daily', 'once daily'].includes(value)) return ['08:00'];
  if (['bd', 'twice daily'].includes(value)) return ['08:00', '20:00'];
  if (['tds', 'tid', 'three times daily'].includes(value)) return ['08:00', '14:00', '20:00'];
  if (['qid', 'four times daily'].includes(value)) return ['06:00', '12:00', '18:00', '22:00'];
  if (['hs', 'at bedtime', 'every night', 'nightly'].includes(value)) return ['22:00'];
  if (['every morning'].includes(value)) return ['08:00'];
  if (['every evening'].includes(value)) return ['19:00'];
  if (['morning and evening'].includes(value)) return ['08:00', '19:00'];
  if (['prn', 'sos', 'as needed', 'when needed'].includes(value)) return ['08:00'];

  const everyHoursMatch = value.match(/^every (\d{1,2}) hours?$/i);
  if (everyHoursMatch) {
    const hours = parseInt(everyHoursMatch[1], 10);
    if ([6, 8, 12].includes(hours)) {
      const dosesPerDay = 24 / hours;
      const startHour = hours === 6 ? 6 : 8;
      return Array.from({ length: dosesPerDay }, (_, index) => {
        const hour = (startHour + (index * hours)) % 24;
        return `${String(hour).padStart(2, '0')}:00`;
      });
    }
  }

  return ['08:00'];
}

export function extractMedicineSnapshot(prescription, medicineIndex) {
  const medicines = Array.isArray(prescription?.medicines) ? prescription.medicines : [];
  if (!Number.isInteger(medicineIndex) || medicineIndex < 0 || medicineIndex >= medicines.length) {
    throw new Error('Invalid medicine index');
  }

  const medicine = medicines[medicineIndex] || {};
  return {
    medicineIndex,
    medicineName: medicine.name || `Medicine ${medicineIndex + 1}`,
    dosage: buildDosageLabel(medicine),
    frequencyLabel: medicine.frequency || null,
    instructions: medicine.instructions || medicine.duration || null,
    medicine,
  };
}

export function normalizeScheduleTimes(scheduleTimes) {
  if (!Array.isArray(scheduleTimes) || scheduleTimes.length === 0) {
    throw new Error('At least one reminder time is required');
  }

  const unique = [...new Set(scheduleTimes.map((entry) => String(entry).trim()))].sort();
  if (unique.some((entry) => !TIME_PATTERN.test(entry))) {
    throw new Error('Reminder times must use HH:MM format');
  }
  return unique;
}

export function resolveScheduleTimes(scheduleTimes, frequencyLabel) {
  if (Array.isArray(scheduleTimes) && scheduleTimes.length > 0) {
    return normalizeScheduleTimes(scheduleTimes);
  }
  return inferScheduleTimesFromFrequency(frequencyLabel);
}

export function buildDoseSchedule({
  scheduleTimes,
  frequencyLabel = null,
  startDate,
  endDate = null,
  generationDays = DEFAULT_GENERATION_DAYS,
}) {
  const normalizedTimes = resolveScheduleTimes(scheduleTimes, frequencyLabel);
  if (!startDate) throw new Error('startDate is required');

  const effectiveEndDate = endDate || addDays(startDate, generationDays - 1);
  if (compareDateStrings(effectiveEndDate, startDate) < 0) {
    throw new Error('endDate cannot be before startDate');
  }

  const doses = [];
  for (
    let dateCursor = startDate;
    compareDateStrings(dateCursor, effectiveEndDate) <= 0;
    dateCursor = addDays(dateCursor, 1)
  ) {
    for (const time of normalizedTimes) {
      doses.push({
        scheduledAt: new Date(`${dateCursor}T${time}:00`),
        metadata: {
          scheduledDate: dateCursor,
          scheduledTime: time,
        },
      });
    }
  }

  return {
    scheduleTimes: normalizedTimes,
    generatedUntil: effectiveEndDate,
    doses,
  };
}

export function buildDoseReplenishmentWindow({
  startDate,
  endDate = null,
  lastScheduledAt = null,
  horizonDays = DEFAULT_GENERATION_DAYS,
  referenceDate = new Date(),
}) {
  const today = toDateString(referenceDate);
  const targetEndDate = endDate && compareDateStrings(endDate, addDays(today, horizonDays - 1)) < 0
    ? endDate
    : addDays(today, horizonDays - 1);

  const lastScheduledDate = lastScheduledAt ? toDateString(lastScheduledAt) : null;
  const generationStartDate = lastScheduledDate ? addDays(lastScheduledDate, 1) : startDate;

  if (compareDateStrings(targetEndDate, generationStartDate) < 0) {
    return null;
  }

  return {
    generationStartDate,
    generationEndDate: targetEndDate,
  };
}
