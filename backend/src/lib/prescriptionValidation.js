const MAX_DIAGNOSIS_LEN = 3000;
const MAX_NOTES_LEN = 4000;

const FIELD_LIMITS = {
  name: 120,
  dosage: 60,
  frequency: 120,
  duration: 80,
  instructions: 400,
};

function cleanString(value, maxLen) {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text.slice(0, maxLen);
}

function normalizeMedicine(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const timesPerDayRaw = raw.timesPerDay == null ? '' : String(raw.timesPerDay).trim();
  const timesPerDayParsed = timesPerDayRaw ? parseInt(timesPerDayRaw, 10) : null;
  const timesPerDay = Number.isInteger(timesPerDayParsed) && timesPerDayParsed >= 1 && timesPerDayParsed <= 12
    ? timesPerDayParsed
    : null;
  const mealTiming = ['before_meal', 'after_meal', 'with_meal', 'any'].includes(String(raw.mealTiming || ''))
    ? String(raw.mealTiming)
    : '';
  const durationDaysRaw = raw.durationDays == null ? '' : String(raw.durationDays).trim();
  const durationDaysParsed = durationDaysRaw ? parseInt(durationDaysRaw, 10) : null;
  const durationDays = Number.isInteger(durationDaysParsed) && durationDaysParsed >= 1 && durationDaysParsed <= 365
    ? durationDaysParsed
    : null;
  const normalized = {
    name: cleanString(raw.name, FIELD_LIMITS.name),
    dosage: cleanString(raw.dosage, FIELD_LIMITS.dosage),
    frequency: cleanString(raw.frequency, FIELD_LIMITS.frequency) || (timesPerDay ? `${timesPerDay} times/day` : ''),
    duration: cleanString(raw.duration, FIELD_LIMITS.duration) || (durationDays ? `${durationDays} days` : ''),
    timesPerDay,
    mealTiming: mealTiming || null,
    durationDays,
    instructions: cleanString(raw.instructions, FIELD_LIMITS.instructions),
  };
  return normalized.name ? normalized : null;
}

function validateMedicines(medicines) {
  if (medicines == null) return { value: null, errors: [] };
  if (!Array.isArray(medicines)) {
    return { value: null, errors: ['medicines must be an array'] };
  }
  if (medicines.length > 30) {
    return { value: null, errors: ['Too many medicines (max 30)'] };
  }

  const normalized = medicines.map(normalizeMedicine).filter(Boolean);
  const errors = [];
  if (medicines.length > 0 && normalized.length === 0) {
    errors.push('At least one medicine with a valid name is required');
  }

  const dupSet = new Set();
  for (const m of normalized) {
    const key = `${m.name.toLowerCase()}::${(m.dosage || '').toLowerCase()}`;
    if (dupSet.has(key)) {
      errors.push(`Duplicate medicine entry: ${m.name}${m.dosage ? ` (${m.dosage})` : ''}`);
      break;
    }
    dupSet.add(key);
    if (!m.timesPerDay) {
      errors.push(`timesPerDay required for ${m.name}`);
      break;
    }
    if (!m.mealTiming) {
      errors.push(`mealTiming required for ${m.name}`);
      break;
    }
  }

  return { value: normalized.length ? normalized : null, errors };
}

export function validatePrescriptionPayload(payload) {
  const diagnosis = cleanString(payload?.diagnosis, MAX_DIAGNOSIS_LEN) || null;
  const notes = cleanString(payload?.notes, MAX_NOTES_LEN) || null;
  const medicinesResult = validateMedicines(payload?.medicines);
  const errors = [...medicinesResult.errors];

  if (!diagnosis && !notes && !medicinesResult.value) {
    errors.push('Provide at least one of diagnosis, medicines, or notes');
  }

  return {
    value: {
      diagnosis,
      notes,
      medicines: medicinesResult.value,
    },
    errors,
  };
}
