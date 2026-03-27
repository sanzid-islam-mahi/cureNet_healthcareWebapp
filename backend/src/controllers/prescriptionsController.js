import db from '../models/index.js';
import { validatePrescriptionPayload } from '../lib/prescriptionValidation.js';

const { Prescription, Appointment } = db;

function buildPrescriptionRecord(prescription) {
  const plain = prescription.get ? prescription.get({ plain: true }) : prescription;
  const appointmentCtx = plain.Appointment || {};
  const doctorUser = appointmentCtx.Doctor?.User || null;
  const patientUser = appointmentCtx.Patient?.User || null;

  return {
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
      status: appointmentCtx.status,
      type: appointmentCtx.type,
      window: appointmentCtx.window,
      serial: appointmentCtx.serial,
      timeBlock: appointmentCtx.timeBlock,
      reason: appointmentCtx.reason,
      symptoms: appointmentCtx.symptoms,
      doctor: doctorUser ? {
        id: appointmentCtx.Doctor?.id,
        firstName: doctorUser.firstName,
        lastName: doctorUser.lastName,
      } : null,
      patient: patientUser ? {
        id: appointmentCtx.Patient?.id,
        firstName: patientUser.firstName,
        lastName: patientUser.lastName,
        email: patientUser.email,
        phone: patientUser.phone,
        dateOfBirth: patientUser.dateOfBirth,
        gender: patientUser.gender,
      } : null,
    } : null,
  };
}

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
    const isReceptionist = user.role === 'receptionist' && user.clinicId && appointment.clinicId === user.clinicId;
    const isAdmin = user.role === 'admin';
    if (!isPatient && !isDoctor && !isReceptionist && !isAdmin) {
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
    return res.json({
      success: true,
      data: {
        prescription: buildPrescriptionRecord(prescription),
      },
    });
  } catch (err) {
    console.error('Get prescription error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getPatientHistory(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }

    const prescriptions = await Prescription.findAll({
      include: [
        {
          model: Appointment,
          as: 'Appointment',
          where: { patientId: user.patientId },
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
      order: [
        [{ model: Appointment, as: 'Appointment' }, 'appointmentDate', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    return res.json({
      success: true,
      data: {
        prescriptions: prescriptions.map(buildPrescriptionRecord),
      },
    });
  } catch (err) {
    console.error('Get patient prescription history error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getDoctorContinuity(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }

    const prescriptions = await Prescription.findAll({
      include: [
        {
          model: Appointment,
          as: 'Appointment',
          where: { doctorId: user.doctorId },
          include: [
            {
              model: db.Doctor,
              as: 'Doctor',
              include: [{ model: db.User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
            },
            {
              model: db.Patient,
              as: 'Patient',
              include: [{ model: db.User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender'] }],
            },
          ],
        },
      ],
      order: [
        [{ model: Appointment, as: 'Appointment' }, 'appointmentDate', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    return res.json({
      success: true,
      data: {
        prescriptions: prescriptions.map(buildPrescriptionRecord),
      },
    });
  } catch (err) {
    console.error('Get doctor continuity prescriptions error:', err);
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
