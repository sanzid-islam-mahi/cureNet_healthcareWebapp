import db from '../models/index.js';
import { Op } from 'sequelize';
import { serializeMedicalImagingRecord } from '../lib/medicalImaging.js';
import {
  buildEmergencyReadiness,
  buildMedicalHistorySummary,
  buildPrescriptionHistoryEntries,
  buildTimelineEntries,
  normalizeTextArrayInput,
} from '../lib/patientHistory.js';

const { User, Patient, PatientMedicalHistory, Appointment, Doctor, Prescription, MedicationReminderPlan, MedicalImagingRecord, Clinic } = db;

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
    const profileComplete = buildEmergencyReadiness(patient, patient?.User);
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

export async function getMedicalHistory(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }

    const [patient, history, completedAppointments, prescriptions, activeReminderPlans, imagingRecords] = await Promise.all([
      Patient.findByPk(user.patientId, {
        include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }],
      }),
      PatientMedicalHistory.findOne({ where: { patientId: user.patientId } }),
      Appointment.findAll({
        where: {
          patientId: user.patientId,
          status: 'completed',
        },
        include: [
          { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: ['firstName', 'lastName'] }] },
          { model: Prescription, as: 'Prescription', attributes: ['id', 'diagnosis', 'medicines'] },
        ],
        order: [['appointmentDate', 'DESC'], ['createdAt', 'DESC']],
      }),
      Prescription.findAll({
        include: [
          {
            model: Appointment,
            as: 'Appointment',
            where: { patientId: user.patientId },
            attributes: ['id', 'appointmentDate', 'type'],
            include: [
              { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: ['firstName', 'lastName'] }] },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      }),
      MedicationReminderPlan.findAll({
        where: {
          patientId: user.patientId,
          status: { [Op.in]: ['active', 'paused'] },
        },
        attributes: ['id', 'prescriptionId', 'medicineIndex', 'status', 'scheduleTimes', 'medicineName'],
        order: [['createdAt', 'DESC']],
      }),
      MedicalImagingRecord.findAll({
        where: { patientId: user.patientId },
        include: [
          { model: User, as: 'Uploader', attributes: ['id', 'firstName', 'lastName', 'email'] },
          {
            model: Appointment,
            as: 'Appointment',
            attributes: ['id', 'appointmentDate', 'type', 'status', 'clinicId'],
            required: false,
            include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'addressLine', 'area', 'city', 'phone', 'status'], required: false }],
          },
        ],
        order: [['studyDate', 'DESC'], ['createdAt', 'DESC']],
      }),
    ]);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const patientUser = patient.User ? patient.User.get({ plain: true }) : null;
    const activePlansByPrescriptionMedicine = new Map(
      activeReminderPlans.map((plan) => [`${plan.prescriptionId}:${plan.medicineIndex}`, plan.get({ plain: true })])
    );
    const activeMedicationNames = [...new Set(activeReminderPlans.map((plan) => plan.medicineName).filter(Boolean))];

    return res.json({
      success: true,
      data: {
        summary: buildMedicalHistorySummary({
          patient,
          user: patientUser,
          activeReminderCount: activeReminderPlans.length,
          activeMedicationNames,
          imagingCount: imagingRecords.length,
        }),
        history: history
          ? {
              chronicConditions: history.chronicConditions ?? [],
              pastProcedures: history.pastProcedures ?? [],
              familyHistory: history.familyHistory ?? [],
              currentLongTermMedications: history.currentLongTermMedications ?? [],
              immunizationNotes: history.immunizationNotes ?? '',
              lifestyleRiskNotes: history.lifestyleRiskNotes ?? '',
              generalMedicalNotes: history.generalMedicalNotes ?? '',
              updatedAt: history.updatedAt,
            }
          : {
              chronicConditions: [],
              pastProcedures: [],
              familyHistory: [],
              currentLongTermMedications: [],
              immunizationNotes: '',
              lifestyleRiskNotes: '',
              generalMedicalNotes: '',
              updatedAt: null,
            },
        timeline: buildTimelineEntries(completedAppointments),
        prescriptions: buildPrescriptionHistoryEntries(prescriptions, activePlansByPrescriptionMedicine),
        imaging: imagingRecords.map(serializeMedicalImagingRecord),
      },
    });
  } catch (err) {
    console.error('Get patient medical history error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to get medical history' });
  }
}

export async function updateMedicalHistory(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }

    const payload = {
      chronicConditions: normalizeTextArrayInput(req.body.chronicConditions),
      pastProcedures: normalizeTextArrayInput(req.body.pastProcedures),
      familyHistory: normalizeTextArrayInput(req.body.familyHistory),
      currentLongTermMedications: normalizeTextArrayInput(req.body.currentLongTermMedications),
      immunizationNotes: req.body.immunizationNotes?.trim?.() ?? '',
      lifestyleRiskNotes: req.body.lifestyleRiskNotes?.trim?.() ?? '',
      generalMedicalNotes: req.body.generalMedicalNotes?.trim?.() ?? '',
    };

    const [history] = await PatientMedicalHistory.findOrCreate({
      where: { patientId: user.patientId },
      defaults: { patientId: user.patientId, ...payload },
    });

    await history.update(payload);

    return res.json({
      success: true,
      data: {
        history: {
          chronicConditions: history.chronicConditions ?? [],
          pastProcedures: history.pastProcedures ?? [],
          familyHistory: history.familyHistory ?? [],
          currentLongTermMedications: history.currentLongTermMedications ?? [],
          immunizationNotes: history.immunizationNotes ?? '',
          lifestyleRiskNotes: history.lifestyleRiskNotes ?? '',
          generalMedicalNotes: history.generalMedicalNotes ?? '',
          updatedAt: history.updatedAt,
        },
      },
    });
  } catch (err) {
    console.error('Update patient medical history error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update medical history' });
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
