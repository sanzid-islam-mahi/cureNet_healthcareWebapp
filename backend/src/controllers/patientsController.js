import db from '../models/index.js';
import { Op } from 'sequelize';

const { User, Patient, Appointment, Doctor, Prescription, PatientMedicationTracker } = db;

function parseReminderTimes(reminderTimes) {
  if (!Array.isArray(reminderTimes)) return null;
  const valid = reminderTimes
    .map((v) => String(v).trim())
    .filter((v) => /^\d{2}:\d{2}$/.test(v));
  return Array.from(new Set(valid)).slice(0, 8);
}

function deriveDurationDays(value) {
  if (Number.isInteger(value) && value > 0) return value;
  const asText = String(value || '').toLowerCase();
  const m = asText.match(/(\d+)\s*day/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizePrescriptionMedicine(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim();
  if (!name) return null;
  const timesPerDayParsed = parseInt(String(raw.timesPerDay || ''), 10);
  const timesPerDay = Number.isInteger(timesPerDayParsed) && timesPerDayParsed > 0 ? timesPerDayParsed : 1;
  const mealTiming = ['before_meal', 'after_meal', 'with_meal', 'any'].includes(String(raw.mealTiming || ''))
    ? String(raw.mealTiming)
    : 'any';
  return {
    medicineKey: `${index}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    medicineName: name,
    timesPerDay,
    mealTiming,
    durationDays: deriveDurationDays(raw.durationDays) || deriveDurationDays(raw.duration),
  };
}

async function syncMedicationTrackers(patientId) {
  const prescriptions = await Prescription.findAll({
    include: [
      {
        model: Appointment,
        as: 'Appointment',
        where: { patientId },
        attributes: ['id', 'patientId'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  for (const prescription of prescriptions) {
    const meds = Array.isArray(prescription.medicines) ? prescription.medicines : [];
    for (let i = 0; i < meds.length; i += 1) {
      const normalized = normalizePrescriptionMedicine(meds[i], i);
      if (!normalized) continue;
      await PatientMedicationTracker.findOrCreate({
        where: {
          patientId,
          prescriptionId: prescription.id,
          medicineKey: normalized.medicineKey,
        },
        defaults: {
          patientId,
          prescriptionId: prescription.id,
          medicineKey: normalized.medicineKey,
          medicineName: normalized.medicineName,
          timesPerDay: normalized.timesPerDay,
          mealTiming: normalized.mealTiming,
          durationDays: normalized.durationDays,
          remindersEnabled: false,
          reminderTimes: [],
          status: 'active',
        },
      });
    }
  }
}

export async function getProfile(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }
    const patient = await Patient.findByPk(user.patientId, {
      include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }],
    });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    const u = patient.User ? patient.User.toJSON() : {};
    const { password: _, ...userSafe } = u;
    return res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          userId: patient.userId,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          emergencyContact: patient.emergencyContact,
          emergencyPhone: patient.emergencyPhone,
          insuranceProvider: patient.insuranceProvider,
          insuranceNumber: patient.insuranceNumber,
          profileImage: patient.profileImage,
          user: userSafe,
        },
      },
    });
  } catch (err) {
    console.error('Get patient profile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to get profile' });
  }
}

export async function updateProfile(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }

    // Combine form fields
    const { bloodType, allergies, emergencyContact, emergencyPhone, insuranceProvider, insuranceNumber } = req.body;

    // Check for uploaded file
    let profileImage;
    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }

    const patient = await Patient.findByPk(user.patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    await patient.update({
      ...(bloodType !== undefined && { bloodType }),
      ...(allergies !== undefined && { allergies }),
      ...(emergencyContact !== undefined && { emergencyContact }),
      ...(emergencyPhone !== undefined && { emergencyPhone }),
      ...(insuranceProvider !== undefined && { insuranceProvider }),
      ...(insuranceNumber !== undefined && { insuranceNumber }),
      ...(profileImage !== undefined && { profileImage }),
    });

    const updated = await Patient.findByPk(patient.id, {
      include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }],
    });

    const u = updated.User ? updated.User.toJSON() : {};
    const { password: __, ...userSafe } = u;

    return res.json({
      success: true,
      data: {
        patient: {
          id: updated.id,
          userId: updated.userId,
          bloodType: updated.bloodType,
          allergies: updated.allergies,
          emergencyContact: updated.emergencyContact,
          emergencyPhone: updated.emergencyPhone,
          insuranceProvider: updated.insuranceProvider,
          insuranceNumber: updated.insuranceNumber,
          profileImage: updated.profileImage,
          user: userSafe,
        },
      },
    });
  } catch (err) {
    console.error('Update patient profile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const user = req.user;
    if (user.role !== 'patient' || user.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const today = new Date().toISOString().slice(0, 10);
    const [totalAppointments, todayAppointments, completedAppointments, pendingAppointments, requestedAppointments, scheduledAppointments, patient] = await Promise.all([
      Appointment.count({ where: { patientId } }),
      Appointment.count({ where: { patientId, appointmentDate: today, status: { [Op.notIn]: ['cancelled', 'rejected'] } } }),
      Appointment.count({ where: { patientId, status: 'completed' } }),
      Appointment.count({ where: { patientId, status: 'approved' } }),
      Appointment.count({ where: { patientId, status: 'requested' } }),
      Appointment.count({ where: { patientId, status: ['approved', 'in_progress'] } }),
      Patient.findByPk(patientId, {
        include: [{ model: User, as: 'User', attributes: ['phone', 'dateOfBirth'] }],
      }),
    ]);
    const profileComplete = Boolean(
      patient?.bloodType
      && patient?.emergencyContact
      && patient?.emergencyPhone
      && patient?.User?.phone
      && patient?.User?.dateOfBirth
    );
    return res.json({
      success: true,
      data: {
        totalAppointments,
        todayAppointments,
        completedAppointments,
        pendingAppointments,
        requestedAppointments,
        scheduledAppointments,
        queue: {
          profileComplete,
          pendingActions: requestedAppointments + (profileComplete ? 0 : 1),
          needsProfileCompletion: !profileComplete,
        },
      },
    });
  } catch (err) {
    console.error('Get patient dashboard stats error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getAppointments(req, res) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const user = req.user;
    if (user.role !== 'patient' || user.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const { limit = 10, sortBy = 'appointmentDate', sortOrder = 'DESC' } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    const allowedSortFields = new Set(['appointmentDate', 'createdAt', 'status', 'type']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'appointmentDate';
    const safeSortOrder = String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { Doctor } = db;
    const { rows, count } = await Appointment.findAndCountAll({
      where: { patientId },
      limit: limitNum,
      order: [[safeSortBy, safeSortOrder]],
      include: [
        { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }] },
      ],
    });
    const list = rows.map((a) => {
      const d = a.get({ plain: true });
      return {
        id: d.id,
        patientId: d.patientId,
        doctorId: d.doctorId,
        appointmentDate: d.appointmentDate,
        timeBlock: d.timeBlock,
        window: d.window,
        serial: d.serial,
        type: d.type,
        reason: d.reason,
        symptoms: d.symptoms,
        status: d.status,
        createdAt: d.createdAt,
        doctor: d.Doctor ? { id: d.Doctor.id, user: d.Doctor.User } : null,
      };
    });
    return res.json({
      success: true,
      data: { appointments: list },
      pagination: { page: 1, limit: limitNum, total: count },
    });
  } catch (err) {
    console.error('Get patient appointments error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getMedicationTrackers(req, res) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const user = req.user;
    if (user.role !== 'patient' || user.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await syncMedicationTrackers(patientId);
    const { status = 'active' } = req.query;
    const where = { patientId };
    if (status && ['active', 'paused', 'completed'].includes(String(status))) {
      where.status = String(status);
    }

    const trackers = await PatientMedicationTracker.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    return res.json({
      success: true,
      data: {
        medications: trackers.map((t) => t.get({ plain: true })),
      },
    });
  } catch (err) {
    console.error('Get medication trackers error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function updateMedicationTracker(req, res) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const trackerId = parseInt(req.params.trackerId, 10);
    const user = req.user;
    if (user.role !== 'patient' || user.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const tracker = await PatientMedicationTracker.findOne({ where: { id: trackerId, patientId } });
    if (!tracker) {
      return res.status(404).json({ success: false, message: 'Medication tracker not found' });
    }

    const patch = {};
    if (req.body.remindersEnabled != null) {
      patch.remindersEnabled = Boolean(req.body.remindersEnabled);
    }
    if (req.body.reminderTimes != null) {
      const reminderTimes = parseReminderTimes(req.body.reminderTimes);
      if (!reminderTimes) {
        return res.status(400).json({ success: false, message: 'reminderTimes must be HH:mm array' });
      }
      patch.reminderTimes = reminderTimes;
    }
    if (req.body.status && ['active', 'paused', 'completed'].includes(String(req.body.status))) {
      patch.status = String(req.body.status);
      if (patch.status === 'completed') {
        patch.completedAt = new Date();
      } else if (tracker.completedAt) {
        patch.completedAt = null;
      }
    }

    await tracker.update(patch);
    return res.json({ success: true, data: { medication: tracker.get({ plain: true }) } });
  } catch (err) {
    console.error('Update medication tracker error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}
