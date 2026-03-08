import db from '../models/index.js';
import { validatePrescriptionPayload } from '../lib/prescriptionValidation.js';

const { Prescription, Appointment } = db;

export async function getByAppointment(req, res) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    const user = req.user;
    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const isPatient = user.role === 'patient' && user.patientId === appointment.patientId;
    const isDoctor = user.role === 'doctor' && user.doctorId === appointment.doctorId;
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const prescription = await Prescription.findOne({
      where: { appointmentId },
      include: [
        {
          model: Appointment,
          as: 'Appointment',
          include: [
            {
              model: db.Doctor,
              as: 'Doctor',
              include: [{ model: db.User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
            },
            {
              model: db.Patient,
              as: 'Patient',
              include: [{ model: db.User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender'] }],
            },
          ],
        },
      ],
    });
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'No prescription for this appointment' });
    }
    const plain = prescription.get({ plain: true });
    const appointmentCtx = plain.Appointment || {};
    const doctorUser = appointmentCtx.Doctor?.User || null;
    const patientUser = appointmentCtx.Patient?.User || null;
    return res.json({
      success: true,
      data: {
        prescription: {
          id: plain.id,
          appointmentId: plain.appointmentId,
          diagnosis: plain.diagnosis,
          medicines: plain.medicines,
          notes: plain.notes,
          createdAt: plain.createdAt,
          updatedAt: plain.updatedAt,
          appointment: appointmentCtx.id ? {
            id: appointmentCtx.id,
            appointmentDate: appointmentCtx.appointmentDate,
            type: appointmentCtx.type,
            window: appointmentCtx.window,
            serial: appointmentCtx.serial,
            timeBlock: appointmentCtx.timeBlock,
            doctor: doctorUser ? {
              id: appointmentCtx.Doctor?.id,
              firstName: doctorUser.firstName,
              lastName: doctorUser.lastName,
            } : null,
            patient: patientUser ? {
              id: appointmentCtx.Patient?.id,
              firstName: patientUser.firstName,
              lastName: patientUser.lastName,
              dateOfBirth: patientUser.dateOfBirth,
              gender: patientUser.gender,
            } : null,
          } : null,
        },
      },
    });
  } catch (err) {
    console.error('Get prescription error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function create(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId required' });
    }
    const { value, errors } = validatePrescriptionPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    if (appointment.doctorId !== user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not your appointment' });
    }
    if (!['in_progress', 'completed'].includes(appointment.status)) {
      return res.status(400).json({ success: false, message: 'Can only add prescription for in-progress or completed appointment' });
    }
    const existing = await Prescription.findOne({ where: { appointmentId } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Prescription already exists for this appointment' });
    }
    const prescription = await Prescription.create({
      appointmentId,
      diagnosis: value.diagnosis,
      medicines: value.medicines,
      notes: value.notes,
    });
    return res.status(201).json({
      success: true,
      data: { prescription: prescription.get({ plain: true }) },
    });
  } catch (err) {
    console.error('Create prescription error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function editPrescription(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }
    const prescriptionId = parseInt(req.params.id, 10);
    const { value, errors } = validatePrescriptionPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    const prescription = await Prescription.findByPk(prescriptionId, {
      include: [{ model: Appointment, as: 'Appointment' }],
    });
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }
    if (prescription.Appointment.doctorId !== user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not your prescription' });
    }
    await prescription.update({
      diagnosis: value.diagnosis,
      medicines: value.medicines,
      notes: value.notes,
    });
    return res.json({
      success: true,
      data: { prescription: prescription.get({ plain: true }) },
    });
  } catch (err) {
    console.error('Edit prescription error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}
