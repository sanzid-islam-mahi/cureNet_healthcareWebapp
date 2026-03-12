import { Op } from 'sequelize';
import db from '../models/index.js';
import { dispatchMedicationReminder } from '../services/notificationDispatcher.js';

const { MedicationDose, PatientMedicationTracker } = db;

export async function runMedicationReminderTick() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000);

  const doses = await MedicationDose.findAll({
    where: {
      status: 'scheduled',
      scheduledAt: {
        [Op.between]: [windowStart, windowEnd],
      },
    },
    include: [
      {
        model: PatientMedicationTracker,
        as: 'tracker',
        required: true,
        where: {
          remindersEnabled: true,
          status: 'active',
        },
      },
    ],
  });

  // eslint-disable-next-line no-console
  if (doses.length) console.log(`Medication reminder tick: found ${doses.length} due doses`);

  // eslint-disable-next-line no-restricted-syntax
  for (const dose of doses) {
    // eslint-disable-next-line no-await-in-loop
    await dispatchMedicationReminder({
      patientId: dose.patientId,
      doseId: dose.id,
      trackerId: dose.trackerId,
      scheduledAt: dose.scheduledAt,
    });
    // eslint-disable-next-line no-await-in-loop
    await dose.update({ status: 'notified' });
  }
}

