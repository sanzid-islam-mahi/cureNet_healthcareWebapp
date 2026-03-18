import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePrescriptionPayload } from '../src/lib/prescriptionValidation.js';

test('accepts structured medicine payload', () => {
  const { value, errors } = validatePrescriptionPayload({
    diagnosis: 'Hypertension',
    medicines: [
      {
        name: 'Amlodipine',
        strength: '5mg',
        dose: '1',
        unit: 'tablet',
        frequency: 'OD',
        duration: '30 days',
        route: 'oral',
        instructions: 'After breakfast',
      },
    ],
    notes: 'Review after 2 weeks',
  });
  assert.equal(errors.length, 0);
  assert.equal(value.medicines?.[0]?.name, 'Amlodipine');
  assert.equal(value.medicines?.[0]?.dose, '1');
});

test('accepts legacy dosage field and normalizes to dose', () => {
  const { value, errors } = validatePrescriptionPayload({
    medicines: [{ name: 'Paracetamol', dosage: '500mg', duration: '5 days' }],
  });
  assert.equal(errors.length, 0);
  assert.equal(value.medicines?.[0]?.dose, '500mg');
});

test('rejects duplicate medicines', () => {
  const { errors } = validatePrescriptionPayload({
    medicines: [
      { name: 'Paracetamol', strength: '500mg' },
      { name: 'paracetamol', strength: '500mg' },
    ],
  });
  assert.ok(errors.some((e) => e.includes('Duplicate medicine entry')));
});

test('requires at least one content field', () => {
  const { errors } = validatePrescriptionPayload({});
  assert.ok(errors.includes('Provide at least one of diagnosis, medicines, or notes'));
});

