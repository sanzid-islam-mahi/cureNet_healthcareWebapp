import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePrescriptionPayload } from '../src/lib/prescriptionValidation.js';

test('accepts structured medicine payload', () => {
  const { value, errors } = validatePrescriptionPayload({
    diagnosis: 'Hypertension',
    medicines: [
      {
        name: 'Amlodipine',
        dosage: '5mg tablet',
        timesPerDay: 1,
        mealTiming: 'after_meal',
        durationDays: 30,
        instructions: 'After breakfast',
      },
    ],
    notes: 'Review after 2 weeks',
  });
  assert.equal(errors.length, 0);
  assert.equal(value.medicines?.[0]?.name, 'Amlodipine');
  assert.equal(value.medicines?.[0]?.timesPerDay, 1);
});

test('accepts dosage while requiring times/day and meal timing', () => {
  const { value, errors } = validatePrescriptionPayload({
    medicines: [{ name: 'Paracetamol', dosage: '500mg', timesPerDay: 3, mealTiming: 'after_meal', durationDays: 5 }],
  });
  assert.equal(errors.length, 0);
  assert.equal(value.medicines?.[0]?.dosage, '500mg');
});

test('rejects duplicate medicines', () => {
  const { errors } = validatePrescriptionPayload({
    medicines: [
      { name: 'Paracetamol', dosage: '500mg', timesPerDay: 2, mealTiming: 'after_meal' },
      { name: 'paracetamol', dosage: '500mg', timesPerDay: 1, mealTiming: 'before_meal' },
    ],
  });
  assert.ok(errors.some((e) => e.includes('Duplicate medicine entry')));
});

test('requires times/day and meal timing for each medicine', () => {
  const { errors } = validatePrescriptionPayload({
    medicines: [{ name: 'Azithromycin' }],
  });
  assert.ok(errors.some((e) => e.includes('timesPerDay required')));
});

test('requires at least one content field', () => {
  const { errors } = validatePrescriptionPayload({});
  assert.ok(errors.includes('Provide at least one of diagnosis, medicines, or notes'));
});
