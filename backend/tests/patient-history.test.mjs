import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEmergencyReadiness,
  buildTimelineEntries,
  normalizeTextArrayInput,
} from '../src/lib/patientHistory.js';

test('normalizeTextArrayInput accepts comma and newline separated text', () => {
  assert.deepEqual(
    normalizeTextArrayInput('Diabetes, Hypertension\nAsthma'),
    ['Diabetes', 'Hypertension', 'Asthma']
  );
});

test('buildEmergencyReadiness requires core safety data', () => {
  assert.equal(
    buildEmergencyReadiness(
      { bloodType: 'O+', emergencyContact: 'Mother', emergencyPhone: '12345' },
      { phone: '555', dateOfBirth: '2000-01-01' }
    ),
    true
  );

  assert.equal(
    buildEmergencyReadiness(
      { bloodType: 'O+', emergencyContact: 'Mother', emergencyPhone: null },
      { phone: '555', dateOfBirth: '2000-01-01' }
    ),
    false
  );
});

test('buildTimelineEntries sorts visits in descending appointment date order', () => {
  const appointments = [
    {
      get: () => ({
        id: 2,
        appointmentDate: '2026-04-05',
        type: 'in_person',
        status: 'completed',
        Doctor: { User: { firstName: 'Older', lastName: 'Doctor' } },
        Prescription: { id: 9, diagnosis: 'Migraine', medicines: [{ name: 'A' }] },
      }),
    },
    {
      get: () => ({
        id: 3,
        appointmentDate: '2026-04-08',
        type: 'video',
        status: 'completed',
        Doctor: { User: { firstName: 'Newer', lastName: 'Doctor' } },
        Prescription: { id: 10, diagnosis: 'Flu', medicines: [{ name: 'B' }, { name: 'C' }] },
      }),
    },
  ];

  const timeline = buildTimelineEntries(appointments);
  assert.equal(timeline[0].appointmentId, 3);
  assert.equal(timeline[0].diagnosis, 'Flu');
  assert.equal(timeline[1].appointmentId, 2);
});
