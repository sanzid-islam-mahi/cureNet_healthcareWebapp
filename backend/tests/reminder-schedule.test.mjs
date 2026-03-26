import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDoseReplenishmentWindow,
  buildDoseSchedule,
  extractMedicineSnapshot,
  inferScheduleTimesFromFrequency,
  normalizeScheduleTimes,
  resolveScheduleTimes,
} from '../src/lib/reminders.js';

test('normalizeScheduleTimes sorts and deduplicates valid times', () => {
  const result = normalizeScheduleTimes(['21:15', '08:00', '08:00']);
  assert.deepEqual(result, ['08:00', '21:15']);
});

test('buildDoseSchedule generates doses across date range', () => {
  const result = buildDoseSchedule({
    scheduleTimes: ['08:00', '20:00'],
    startDate: '2026-04-01',
    endDate: '2026-04-03',
  });

  assert.equal(result.generatedUntil, '2026-04-03');
  assert.equal(result.doses.length, 6);
  assert.equal(result.doses[0].metadata.scheduledDate, '2026-04-01');
  assert.equal(result.doses[0].metadata.scheduledTime, '08:00');
  assert.equal(result.doses[5].metadata.scheduledDate, '2026-04-03');
  assert.equal(result.doses[5].metadata.scheduledTime, '20:00');
});

test('inferScheduleTimesFromFrequency understands standard clinical abbreviations', () => {
  assert.deepEqual(inferScheduleTimesFromFrequency('BD'), ['08:00', '20:00']);
  assert.deepEqual(inferScheduleTimesFromFrequency('TDS'), ['08:00', '14:00', '20:00']);
  assert.deepEqual(inferScheduleTimesFromFrequency('At bedtime'), ['22:00']);
});

test('resolveScheduleTimes falls back to frequency defaults when explicit times are missing', () => {
  assert.deepEqual(resolveScheduleTimes(null, 'Every 12 hours'), ['08:00', '20:00']);
});

test('buildDoseSchedule can generate from frequency defaults without explicit times', () => {
  const result = buildDoseSchedule({
    frequencyLabel: 'OD',
    startDate: '2026-04-01',
    endDate: '2026-04-02',
  });

  assert.equal(result.doses.length, 2);
  assert.equal(result.doses[0].metadata.scheduledTime, '08:00');
  assert.equal(result.doses[1].metadata.scheduledTime, '08:00');
});

test('extractMedicineSnapshot returns medicine data for valid index', () => {
  const snapshot = extractMedicineSnapshot(
    {
      medicines: [
        { name: 'Amoxicillin', strength: '500', unit: 'mg', frequency: 'Twice daily', instructions: 'After food' },
      ],
    },
    0
  );

  assert.equal(snapshot.medicineName, 'Amoxicillin');
  assert.equal(snapshot.dosage, '500 mg');
  assert.equal(snapshot.frequencyLabel, 'Twice daily');
  assert.equal(snapshot.instructions, 'After food');
});

test('buildDoseReplenishmentWindow extends schedule from latest existing dose', () => {
  const result = buildDoseReplenishmentWindow({
    startDate: '2026-04-01',
    endDate: null,
    lastScheduledAt: new Date('2026-04-03T08:00:00Z'),
    horizonDays: 5,
    referenceDate: new Date('2026-04-02T10:00:00Z'),
  });

  assert.deepEqual(result, {
    generationStartDate: '2026-04-04',
    generationEndDate: '2026-04-06',
  });
});
