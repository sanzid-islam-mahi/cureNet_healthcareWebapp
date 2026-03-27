import { Op } from 'sequelize';
import db from '../models/index.js';
import { createNotification } from './notifications.js';
import { sendMedicationReminderEmail } from './mail.js';
import { buildDoseReplenishmentWindow, buildDoseSchedule } from './reminders.js';

const {
  sequelize,
  MedicationReminderDose,
  MedicationReminderPlan,
  Patient,
  User,
} = db;

const REMINDER_WORKER_BATCH_SIZE = parseInt(process.env.REMINDER_WORKER_BATCH_SIZE || '25', 10);
const REMINDER_MISSED_GRACE_MINUTES = parseInt(process.env.REMINDER_MISSED_GRACE_MINUTES || '120', 10);
const REMINDER_REPLENISH_HORIZON_DAYS = parseInt(process.env.REMINDER_REPLENISH_HORIZON_DAYS || '7', 10);

function reminderLink() {
  return '/app/patient-reminders';
}

function buildReminderMessage(medicineName, scheduledAt) {
  const formatted = new Date(scheduledAt).toLocaleString();
  return `Time to take ${medicineName} scheduled for ${formatted}.`;
}

async function loadDueDoses(now) {
  return MedicationReminderDose.findAll({
    where: {
      status: 'scheduled',
      scheduledAt: { [Op.lte]: now },
    },
    include: [
      {
        model: MedicationReminderPlan,
        as: 'Plan',
        where: { status: 'active' },
        include: [
          {
            model: Patient,
            include: [{ model: User }],
          },
        ],
      },
    ],
    order: [['scheduledAt', 'ASC']],
    limit: REMINDER_WORKER_BATCH_SIZE,
  });
}

async function loadMissedDoses(cutoff) {
  return MedicationReminderDose.findAll({
    where: {
      status: 'sent',
      takenAt: null,
      sentAt: { [Op.lte]: cutoff },
    },
    include: [
      {
        model: MedicationReminderPlan,
        as: 'Plan',
        where: { status: 'active' },
        include: [
          {
            model: Patient,
            include: [{ model: User }],
          },
        ],
      },
    ],
    order: [['scheduledAt', 'ASC']],
    limit: REMINDER_WORKER_BATCH_SIZE,
  });
}

async function replenishActivePlans(now) {
  const plans = await MedicationReminderPlan.findAll({
    where: { status: 'active' },
    order: [['updatedAt', 'ASC']],
    limit: REMINDER_WORKER_BATCH_SIZE,
  });

  let generatedDoses = 0;

  for (const plan of plans) {
    const latestDose = await MedicationReminderDose.findOne({
      where: { reminderPlanId: plan.id },
      order: [['scheduledAt', 'DESC']],
    });

    const window = buildDoseReplenishmentWindow({
      startDate: plan.startDate,
      endDate: plan.endDate,
      lastScheduledAt: latestDose?.scheduledAt || null,
      horizonDays: REMINDER_REPLENISH_HORIZON_DAYS,
      referenceDate: now,
    });

    if (!window) continue;

    const schedule = buildDoseSchedule({
      scheduleTimes: plan.scheduleTimes,
      startDate: window.generationStartDate,
      endDate: window.generationEndDate,
    });

    if (schedule.doses.length === 0) continue;

    await MedicationReminderDose.bulkCreate(
      schedule.doses.map((dose) => ({
        reminderPlanId: plan.id,
        scheduledAt: dose.scheduledAt,
        status: 'scheduled',
        metadata: dose.metadata,
      }))
    );

    await plan.update({ lastGeneratedAt: new Date() });
    generatedDoses += schedule.doses.length;
  }

  return generatedDoses;
}

async function markDoseSent(doseId, transaction) {
  const [updated] = await MedicationReminderDose.update(
    {
      status: 'sent',
      sentAt: new Date(),
    },
    {
      where: {
        id: doseId,
        status: 'scheduled',
      },
      transaction,
    }
  );

  return updated === 1;
}

async function markDoseMissed(doseId, transaction) {
  const [updated] = await MedicationReminderDose.update(
    {
      status: 'missed',
    },
    {
      where: {
        id: doseId,
        status: 'sent',
        takenAt: null,
      },
      transaction,
    }
  );

  return updated === 1;
}

export async function processDueReminderDoses(now = new Date()) {
  const dueDoses = await loadDueDoses(now);
  let processed = 0;

  for (const dose of dueDoses) {
    const transaction = await sequelize.transaction();
    try {
      const claimed = await markDoseSent(dose.id, transaction);
      if (!claimed) {
        await transaction.rollback();
        continue;
      }
      await transaction.commit();

      const patientUser = dose.Plan?.Patient?.User;
      const medicineName = dose.Plan?.medicineName || 'your medicine';

      await createNotification({
        userId: patientUser?.id,
        type: 'medication_reminder_due',
        title: 'Medication reminder',
        message: buildReminderMessage(medicineName, dose.scheduledAt),
        link: reminderLink(),
        metadata: {
          reminderPlanId: dose.reminderPlanId,
          doseId: dose.id,
          scheduledAt: dose.scheduledAt,
          medicineName,
        },
      });

      try {
        if (patientUser?.email) {
          await sendMedicationReminderEmail({
            to: patientUser.email,
            firstName: patientUser.firstName,
            medicineName,
            scheduledAt: dose.scheduledAt,
          });
        }
      } catch (mailError) {
        console.error('Reminder email send error:', {
          doseId: dose.id,
          reminderPlanId: dose.reminderPlanId,
          error: mailError?.message || mailError,
        });
      }

      processed += 1;
    } catch (err) {
      await transaction.rollback();
      console.error('Process due reminder dose error:', { doseId: dose.id, error: err?.message || err });
    }
  }

  return processed;
}

export async function processMissedReminderDoses(now = new Date()) {
  const cutoff = new Date(now.getTime() - REMINDER_MISSED_GRACE_MINUTES * 60 * 1000);
  const doses = await loadMissedDoses(cutoff);
  let processed = 0;

  for (const dose of doses) {
    const transaction = await sequelize.transaction();
    try {
      const claimed = await markDoseMissed(dose.id, transaction);
      if (!claimed) {
        await transaction.rollback();
        continue;
      }
      await transaction.commit();

      const patientUser = dose.Plan?.Patient?.User;
      const medicineName = dose.Plan?.medicineName || 'your medicine';

      await createNotification({
        userId: patientUser?.id,
        type: 'medication_dose_missed',
        title: 'Medication dose missed',
        message: `A reminder dose for ${medicineName} was marked as missed.`,
        link: reminderLink(),
        metadata: {
          reminderPlanId: dose.reminderPlanId,
          doseId: dose.id,
          scheduledAt: dose.scheduledAt,
          medicineName,
        },
      });

      processed += 1;
    } catch (err) {
      await transaction.rollback();
      console.error('Process missed reminder dose error:', { doseId: dose.id, error: err?.message || err });
    }
  }

  return processed;
}

export async function runReminderWorkerOnce() {
  const now = new Date();
  const replenishedDoses = await replenishActivePlans(now);
  const [dueProcessed, missedProcessed] = await Promise.all([
    processDueReminderDoses(now),
    processMissedReminderDoses(now),
  ]);

  console.log('Reminder worker tick complete', {
    timestamp: now.toISOString(),
    replenishedDoses,
    dueProcessed,
    missedProcessed,
  });

  return { replenishedDoses, dueProcessed, missedProcessed };
}
