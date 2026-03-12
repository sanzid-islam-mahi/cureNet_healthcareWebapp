import { Op } from 'sequelize';
import db from '../models/index.js';

const { MedicationDose, PatientMedicationTracker } = db;

export async function getDoses(req, res) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const user = req.user;
    if (user.role !== 'patient' || user.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { from, to } = req.query;
    const now = new Date();
    let fromDate;
    let toDate;

    if (from) {
      const d = new Date(from);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid from date' });
      }
      fromDate = d;
    } else {
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    }

    if (to) {
      const d = new Date(to);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid to date' });
      }
      toDate = d;
    } else {
      toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    }

    const doses = await MedicationDose.findAll({
      where: {
        patientId,
        scheduledAt: {
          [Op.between]: [fromDate, toDate],
        },
      },
      order: [['scheduledAt', 'ASC']],
    });

    const trackerIds = Array.from(new Set(doses.map((d) => d.trackerId)));
    const trackers = trackerIds.length
      ? await PatientMedicationTracker.findAll({
        where: { id: trackerIds },
      })
      : [];
    const trackerById = new Map(trackers.map((t) => [t.id, t]));

    const payload = doses.map((dose) => {
      const plainDose = dose.get({ plain: true });
      const tracker = trackerById.get(plainDose.trackerId);
      return {
        ...plainDose,
        tracker: tracker
          ? {
            id: tracker.id,
            medicineName: tracker.medicineName,
            timesPerDay: tracker.timesPerDay,
            mealTiming: tracker.mealTiming,
            status: tracker.status,
          }
          : null,
      };
    });

    return res.json({
      success: true,
      data: { doses: payload },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get doses error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to get doses' });
  }
}

export async function markDose(req, res) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const doseId = parseInt(req.params.doseId, 10);
    const user = req.user;
    if (user.role !== 'patient' || user.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { status, takenAt } = req.body || {};
    if (!['taken', 'skipped'].includes(String(status))) {
      return res.status(400).json({ success: false, message: 'status must be taken or skipped' });
    }

    const dose = await MedicationDose.findOne({
      where: { id: doseId, patientId },
    });
    if (!dose) {
      return res.status(404).json({ success: false, message: 'Dose not found' });
    }

    const currentStatus = dose.status;
    if (['taken', 'skipped'].includes(currentStatus)) {
      return res.status(400).json({ success: false, message: 'Dose already finalized' });
    }

    let takenAtDate = null;
    if (status === 'taken') {
      if (takenAt) {
        const d = new Date(takenAt);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid takenAt' });
        }
        takenAtDate = d;
      } else {
        takenAtDate = new Date();
      }
    }

    await dose.update({
      status,
      takenAt: takenAtDate,
    });

    return res.json({
      success: true,
      data: { dose: dose.get({ plain: true }) },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Mark dose error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update dose' });
  }
}

