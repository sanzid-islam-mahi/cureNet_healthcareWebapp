import db from '../models/index.js';

const { Notification } = db;

export async function dispatchMedicationReminder({ patientId, doseId, trackerId, scheduledAt }) {
  const payload = {
    doseId,
    trackerId,
    scheduledAt,
  };

  await Notification.create({
    patientId,
    type: 'medication_reminder',
    payload,
  });
}

