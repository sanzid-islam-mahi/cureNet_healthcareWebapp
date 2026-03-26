const MAX_DIAGNOSIS_LEN = 3000;
const MAX_NOTES_LEN = 4000;
const MAX_MEDICINES = 30;

const FIELD_LIMITS = {
  name: 120,
  strength: 50,
  dose: 40,
  unit: 30,
  frequency: 120,
  duration: 80,
  route: 60,
  instructions: 400,
};

const FREQUENCY_PATTERNS = [
  /^(od|bd|tid|tds|qid|hs|sos|prn)$/i,
  /^(daily|nightly|weekly|once weekly|twice weekly|three times weekly)$/i,
  /^(once daily|twice daily|three times daily|four times daily)$/i,
  /^(every morning|every evening|every night|morning and evening)$/i,
  /^(as needed|when needed)$/i,
  /^every \d{1,2} (hour|hours|day|days|week|weeks)$/i,
];

const DURATION_PATTERNS = [
  /^\d{1,3} (day|days|week|weeks|month|months)$/i,
  /^(until review|ongoing|continue)$/i,
];

function cleanString(value, maxLen) {
  if (value == null) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.slice(0, maxLen);
}

function isRecognizedFrequency(value) {
  return FREQUENCY_PATTERNS.some((pattern) => pattern.test(value));
}

function isRecognizedDuration(value) {
  return DURATION_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeMedicine(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const legacyDosage = cleanString(raw.dosage, FIELD_LIMITS.dose);
  const normalized = {
    name: cleanString(raw.name, FIELD_LIMITS.name),
    strength: cleanString(raw.strength, FIELD_LIMITS.strength),
    dose: cleanString(raw.dose, FIELD_LIMITS.dose) || legacyDosage,
    unit: cleanString(raw.unit, FIELD_LIMITS.unit),
    frequency: cleanString(raw.frequency, FIELD_LIMITS.frequency),
    duration: cleanString(raw.duration, FIELD_LIMITS.duration),
    route: cleanString(raw.route, FIELD_LIMITS.route),
    instructions: cleanString(raw.instructions, FIELD_LIMITS.instructions),
  };
  return normalized.name ? normalized : null;
}

function validateMedicines(medicines) {
  if (medicines == null) return { value: null, errors: [] };
  if (!Array.isArray(medicines)) {
    return { value: null, errors: ['medicines must be an array'] };
  }
  if (medicines.length > MAX_MEDICINES) {
    return { value: null, errors: [`Too many medicines (max ${MAX_MEDICINES})`] };
  }

  const normalized = medicines.map(normalizeMedicine).filter(Boolean);
  const errors = [];
  if (medicines.length > 0 && normalized.length === 0) {
    errors.push('At least one medicine with a valid name is required');
  }

  const dupSet = new Set();
  for (const m of normalized) {
    const key = `${m.name.toLowerCase()}::${(m.strength || '').toLowerCase()}`;
    if (dupSet.has(key)) {
      errors.push(`Duplicate medicine entry: ${m.name}${m.strength ? ` (${m.strength})` : ''}`);
      break;
    }
    dupSet.add(key);
  }

  normalized.forEach((medicine, index) => {
    if (medicine.frequency && !isRecognizedFrequency(medicine.frequency)) {
      errors.push(
        `Medicine ${index + 1} frequency must use a standard clinical pattern such as "Once daily", "Twice daily", "Every 8 hours", or common abbreviations like "OD" / "BD"`,
      );
    }

    if (medicine.duration && !isRecognizedDuration(medicine.duration)) {
      errors.push(
        `Medicine ${index + 1} duration must use a format like "5 days", "2 weeks", "3 months", "Until review", or "Ongoing"`,
      );
    }
  });

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
