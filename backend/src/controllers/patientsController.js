import db from '../models/index.js';
import { Op } from 'sequelize';

const { User, Patient, Appointment, Doctor } = db;

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
    const [totalAppointments, todayAppointments, completedAppointments, pendingAppointments, requestedAppointments, scheduledAppointments] = await Promise.all([
      Appointment.count({ where: { patientId } }),
      Appointment.count({ where: { patientId, appointmentDate: today, status: { [Op.notIn]: ['cancelled', 'rejected'] } } }),
      Appointment.count({ where: { patientId, status: 'completed' } }),
      Appointment.count({ where: { patientId, status: 'approved' } }),
      Appointment.count({ where: { patientId, status: 'requested' } }),
      Appointment.count({ where: { patientId, status: ['approved', 'in_progress'] } }),
    ]);
    return res.json({
      success: true,
      data: {
        totalAppointments,
        todayAppointments,
        completedAppointments,
        pendingAppointments,
        requestedAppointments,
        scheduledAppointments,
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
