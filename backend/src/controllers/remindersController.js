import { Op } from 'sequelize';
import db from '../models/index.js';
import { buildDoseSchedule, extractMedicineSnapshot, resolveScheduleTimes } from '../lib/reminders.js';

const { MedicationReminderPlan, MedicationReminderDose, Prescription, Appointment, Patient, Doctor, User, sequelize } = db;

function parseInteger(value) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function serializeDose(dose) {
  const plain = dose.get ? dose.get({ plain: true }) : dose;
  return {
    id: plain.id,
    reminderPlanId: plain.reminderPlanId,
    scheduledAt: plain.scheduledAt,
    status: plain.status,
    sentAt: plain.sentAt,
    takenAt: plain.takenAt,
    skippedAt: plain.skippedAt,
    metadata: plain.metadata,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

function serializePlan(plan) {
  const plain = plan.get ? plan.get({ plain: true }) : plan;
  const doctorUser = plain.Prescription?.Appointment?.Doctor?.User || null;
  return {
    id: plain.id,
    patientId: plain.patientId,
    prescriptionId: plain.prescriptionId,
    appointmentId: plain.appointmentId,
    medicineIndex: plain.medicineIndex,
    medicineName: plain.medicineName,
    dosage: plain.dosage,
    frequencyLabel: plain.frequencyLabel,
    instructions: plain.instructions,
    status: plain.status,
    timezone: plain.timezone,
    startDate: plain.startDate,
    endDate: plain.endDate,
    scheduleTimes: plain.scheduleTimes,
    lastGeneratedAt: plain.lastGeneratedAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    prescription: plain.Prescription ? {
      id: plain.Prescription.id,
      diagnosis: plain.Prescription.diagnosis,
      appointmentId: plain.Prescription.appointmentId,
      medicines: plain.Prescription.medicines,
      appointment: plain.Prescription.Appointment ? {
        id: plain.Prescription.Appointment.id,
        appointmentDate: plain.Prescription.Appointment.appointmentDate,
        status: plain.Prescription.Appointment.status,
        doctor: doctorUser ? {
          id: plain.Prescription.Appointment.Doctor?.id,
          firstName: doctorUser.firstName,
          lastName: doctorUser.lastName,
        } : null,
      } : null,
    } : null,
    doses: Array.isArray(plain.Doses) ? plain.Doses.map(serializeDose) : undefined,
  };
}

async function getOwnedPrescriptionOrFail(patientId, prescriptionId) {
  const prescription = await Prescription.findByPk(prescriptionId, {
    include: [
      {
        model: Appointment,
        as: 'Appointment',
        include: [
          {
            model: Doctor,
            as: 'Doctor',
            include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
          },
          {
            model: Patient,
            as: 'Patient',
          },
        ],
      },
    ],
  });

  if (!prescription) {
    return { error: { status: 404, body: { success: false, message: 'Prescription not found' } } };
  }

  if (prescription.Appointment?.patientId !== patientId) {
    return { error: { status: 403, body: { success: false, message: 'Not authorized for this prescription' } } };
  }

  return { prescription };
}

function parseReminderPayload(body) {
  const prescriptionId = parseInteger(body.prescriptionId);
  const medicineIndex = body.medicineIndex == null ? null : parseInteger(body.medicineIndex);
  const startDate = typeof body.startDate === 'string' ? body.startDate : '';
  const endDate = typeof body.endDate === 'string' && body.endDate ? body.endDate : null;
  const timezone = typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : 'UTC';
  const scheduleTimes = body.scheduleTimes;

  return {
    prescriptionId,
    medicineIndex,
    startDate,
    endDate,
    timezone,
    scheduleTimes: Array.isArray(scheduleTimes) ? scheduleTimes : null,
  };
}

function validateCreatePayload(payload) {
  if (!payload.prescriptionId) throw new Error('prescriptionId is required');
  if (payload.medicineIndex === null) throw new Error('medicineIndex is required');
  if (!payload.startDate) throw new Error('startDate is required');
}

function validateUpdatePayload(payload) {
  if (!payload.startDate) throw new Error('startDate is required');
}

export async function preview(req, res) {
  try {
    const user = req.user;
    const payload = parseReminderPayload(req.body);
    validateCreatePayload(payload);
    const { prescription, error } = await getOwnedPrescriptionOrFail(user.patientId, payload.prescriptionId);
    if (error) return res.status(error.status).json(error.body);

    const snapshot = extractMedicineSnapshot(prescription, payload.medicineIndex);
    const scheduleTimes = resolveScheduleTimes(payload.scheduleTimes, snapshot.frequencyLabel);
    const schedule = buildDoseSchedule({ ...payload, scheduleTimes, frequencyLabel: snapshot.frequencyLabel });

    return res.json({
      success: true,
      data: {
        preview: {
          ...snapshot,
          timezone: payload.timezone,
          startDate: payload.startDate,
          endDate: payload.endDate || schedule.generatedUntil,
          scheduleTimes: schedule.scheduleTimes,
          suggestedTimes: resolveScheduleTimes(null, snapshot.frequencyLabel),
          usedFrequencyDefault: !Array.isArray(payload.scheduleTimes) || payload.scheduleTimes.length === 0,
          generatedUntil: schedule.generatedUntil,
          doseCount: schedule.doses.length,
          doses: schedule.doses.map((dose) => ({
            scheduledAt: dose.scheduledAt,
            metadata: dose.metadata,
          })),
        },
      },
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || 'Invalid reminder payload' });
  }
}

export async function create(req, res) {
  try {
    const user = req.user;
    const payload = parseReminderPayload(req.body);
    validateCreatePayload(payload);
    const { prescription, error } = await getOwnedPrescriptionOrFail(user.patientId, payload.prescriptionId);
    if (error) return res.status(error.status).json(error.body);

    const snapshot = extractMedicineSnapshot(prescription, payload.medicineIndex);
    const scheduleTimes = resolveScheduleTimes(payload.scheduleTimes, snapshot.frequencyLabel);
    const schedule = buildDoseSchedule({ ...payload, scheduleTimes, frequencyLabel: snapshot.frequencyLabel });

    const existingPlan = await MedicationReminderPlan.findOne({
      where: {
        patientId: user.patientId,
        prescriptionId: payload.prescriptionId,
        medicineIndex: payload.medicineIndex,
        status: { [Op.in]: ['active', 'paused'] },
      },
    });

    if (existingPlan) {
      return res.status(409).json({ success: false, message: 'An active reminder already exists for this medicine' });
    }

    const transaction = await sequelize.transaction();
    try {
      const plan = await MedicationReminderPlan.create({
        patientId: user.patientId,
        prescriptionId: payload.prescriptionId,
        appointmentId: prescription.appointmentId,
        medicineIndex: snapshot.medicineIndex,
        medicineName: snapshot.medicineName,
        dosage: snapshot.dosage,
        frequencyLabel: snapshot.frequencyLabel,
        instructions: snapshot.instructions,
        status: 'active',
        timezone: payload.timezone,
        startDate: payload.startDate,
        endDate: payload.endDate || schedule.generatedUntil,
        scheduleTimes: schedule.scheduleTimes,
        lastGeneratedAt: new Date(),
      }, { transaction });

      await MedicationReminderDose.bulkCreate(
        schedule.doses.map((dose) => ({
          reminderPlanId: plan.id,
          scheduledAt: dose.scheduledAt,
          status: 'scheduled',
          metadata: dose.metadata,
        })),
        { transaction }
      );

      await transaction.commit();

      const createdPlan = await MedicationReminderPlan.findByPk(plan.id, {
        include: [
          {
            model: Prescription,
            include: [
              {
                model: Appointment,
                as: 'Appointment',
                include: [{ model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }] }],
              },
            ],
          },
          { model: MedicationReminderDose, as: 'Doses' },
        ],
      });

      return res.status(201).json({
        success: true,
        data: {
          reminderPlan: serializePlan(createdPlan),
        },
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Create reminder error:', err);
    return res.status(400).json({ success: false, message: err.message || 'Failed to create reminder' });
  }
}

export async function update(req, res) {
  try {
    const user = req.user;
    const plan = await MedicationReminderPlan.findOne({
      where: { id: parseInteger(req.params.id), patientId: user.patientId },
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Reminder plan not found' });
    }

    const payload = parseReminderPayload({ ...req.body, prescriptionId: plan.prescriptionId });
    validateUpdatePayload(payload);

    const { prescription, error } = await getOwnedPrescriptionOrFail(user.patientId, plan.prescriptionId);
    if (error) return res.status(error.status).json(error.body);

    const nextMedicineIndex = payload.medicineIndex ?? plan.medicineIndex;
    const snapshot = extractMedicineSnapshot(prescription, nextMedicineIndex);
    const scheduleTimes = resolveScheduleTimes(payload.scheduleTimes, snapshot.frequencyLabel);
    const schedule = buildDoseSchedule({
      ...payload,
      scheduleTimes,
      frequencyLabel: snapshot.frequencyLabel,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });
    const now = new Date();

    const transaction = await sequelize.transaction();
    try {
      const preservedDoses = await MedicationReminderDose.findAll({
        where: {
          reminderPlanId: plan.id,
          [Op.or]: [
            { status: { [Op.in]: ['taken', 'missed', 'skipped', 'sent'] } },
            { scheduledAt: { [Op.lte]: now } },
          ],
        },
        transaction,
      });
      const preservedScheduledAt = new Set(preservedDoses.map((dose) => new Date(dose.scheduledAt).toISOString()));

      await MedicationReminderDose.destroy({
        where: {
          reminderPlanId: plan.id,
          status: 'scheduled',
          scheduledAt: { [Op.gt]: now },
        },
        transaction,
      });

      await plan.update({
        medicineIndex: snapshot.medicineIndex,
        medicineName: snapshot.medicineName,
        dosage: snapshot.dosage,
        frequencyLabel: snapshot.frequencyLabel,
        instructions: snapshot.instructions,
        timezone: payload.timezone,
        startDate: payload.startDate,
        endDate: payload.endDate || schedule.generatedUntil,
        scheduleTimes: schedule.scheduleTimes,
        lastGeneratedAt: new Date(),
      }, { transaction });

      const dosesToCreate = schedule.doses.filter(
        (dose) =>
          new Date(dose.scheduledAt) > now &&
          !preservedScheduledAt.has(new Date(dose.scheduledAt).toISOString()),
      );

      if (dosesToCreate.length > 0) {
        await MedicationReminderDose.bulkCreate(
          dosesToCreate.map((dose) => ({
            reminderPlanId: plan.id,
            scheduledAt: dose.scheduledAt,
            status: 'scheduled',
            metadata: dose.metadata,
          })),
          { transaction },
        );
      }

      await transaction.commit();

      const updatedPlan = await MedicationReminderPlan.findByPk(plan.id, {
        include: [
          {
            model: Prescription,
            include: [
              {
                model: Appointment,
                as: 'Appointment',
                include: [{ model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }] }],
              },
            ],
          },
          { model: MedicationReminderDose, as: 'Doses' },
        ],
      });

      return res.json({
        success: true,
        data: {
          reminderPlan: serializePlan(updatedPlan),
        },
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Update reminder error:', err);
    return res.status(400).json({ success: false, message: err.message || 'Failed to update reminder' });
  }
}

export async function listPlans(req, res) {
  try {
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null;
    const where = { patientId: req.user.patientId };
    if (status) where.status = status;

    const plans = await MedicationReminderPlan.findAll({
      where,
      include: [
        {
          model: Prescription,
          include: [
            {
              model: Appointment,
              as: 'Appointment',
              include: [{ model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }] }],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        reminderPlans: plans.map(serializePlan),
      },
    });
  } catch (err) {
    console.error('List reminder plans error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load reminders' });
  }
}

export async function listDoses(req, res) {
  try {
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null;
    const where = {};
    if (status) where.status = status;

    const doses = await MedicationReminderDose.findAll({
      where,
      include: [
        {
          model: MedicationReminderPlan,
          as: 'Plan',
          where: { patientId: req.user.patientId },
        },
      ],
      order: [['scheduledAt', 'ASC']],
      limit: 200,
    });

    return res.json({
      success: true,
      data: {
        doses: doses.map((dose) => ({
          ...serializeDose(dose),
          plan: dose.Plan ? serializePlan(dose.Plan) : null,
        })),
      },
    });
  } catch (err) {
    console.error('List reminder doses error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load reminder doses' });
  }
}

async function getOwnedPlan(req) {
  return MedicationReminderPlan.findOne({
    where: {
      id: parseInteger(req.params.id),
      patientId: req.user.patientId,
    },
  });
}

export async function pause(req, res) {
  try {
    const plan = await getOwnedPlan(req);
    if (!plan) return res.status(404).json({ success: false, message: 'Reminder plan not found' });
    await plan.update({ status: 'paused' });
    return res.json({ success: true, data: { reminderPlan: serializePlan(plan) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to pause reminder' });
  }
}

export async function resume(req, res) {
  try {
    const plan = await getOwnedPlan(req);
    if (!plan) return res.status(404).json({ success: false, message: 'Reminder plan not found' });
    await plan.update({ status: 'active' });
    return res.json({ success: true, data: { reminderPlan: serializePlan(plan) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to resume reminder' });
  }
}

export async function stop(req, res) {
  try {
    const plan = await getOwnedPlan(req);
    if (!plan) return res.status(404).json({ success: false, message: 'Reminder plan not found' });
    await plan.update({ status: 'stopped' });
    return res.json({ success: true, data: { reminderPlan: serializePlan(plan) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to stop reminder' });
  }
}

export async function markDoseTaken(req, res) {
  try {
    const doseId = parseInteger(req.params.id);
    const dose = await MedicationReminderDose.findOne({
      where: { id: doseId },
      include: [
        {
          model: MedicationReminderPlan,
          as: 'Plan',
          where: { patientId: req.user.patientId },
        },
      ],
    });

    if (!dose) {
      return res.status(404).json({ success: false, message: 'Reminder dose not found' });
    }

    if (dose.status === 'taken') {
      return res.json({ success: true, data: { dose: serializeDose(dose) } });
    }

    await dose.update({
      status: 'taken',
      takenAt: dose.takenAt || new Date(),
    });

    return res.json({
      success: true,
      data: {
        dose: serializeDose(dose),
      },
    });
  } catch (err) {
    console.error('Mark reminder dose taken error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update dose' });
  }
}
