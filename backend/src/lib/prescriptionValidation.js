const MAX_DIAGNOSIS_LEN = 3000;
const MAX_NOTES_LEN = 4000;

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

function cleanString(value, maxLen) {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text.slice(0, maxLen);
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
    const key = `${m.name.toLowerCase()}::${(m.strength || '').toLowerCase()}`;
    if (dupSet.has(key)) {
      errors.push(`Duplicate medicine entry: ${m.name}${m.strength ? ` (${m.strength})` : ''}`);
      break;
    }
    dupSet.add(key);
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

