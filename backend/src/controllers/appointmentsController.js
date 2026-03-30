import db from '../models/index.js';
import { Op } from 'sequelize';
import { logAudit } from '../lib/auditLog.js';
import sequelize from '../config/database.js';
import { createNotification } from '../lib/notifications.js';
import {
  getAppointmentScheduleConflictReason,
  isValidDateString,
  resolveAppointmentSlot,
} from '../lib/appointmentScheduling.js';

const { Appointment, Doctor, Patient, User, Clinic, Receptionist } = db;
const RED_FLAG_TERMS = [
  'chest pain',
  'shortness of breath',
  'breathing problem',
  'stroke',
  'fainting',
  'unconscious',
  'severe bleeding',
  'suicidal',
  'seizure',
];

function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;
}

function formatAppointmentSlot(appointment) {
  if (appointment.window) {
    const label = appointment.window.charAt(0).toUpperCase() + appointment.window.slice(1);
    return appointment.serial ? `${label} (Serial ${appointment.serial})` : label;
  }
  return appointment.timeBlock || 'unspecified slot';
}

function formatConflictReason(reason) {
  const labels = {
    doctor_unavailable_on_date: 'Doctor unavailable on that date',
    window_removed: 'Doctor no longer accepts appointments in that window',
    window_capacity_reduced: 'Doctor reduced the slot capacity for that window',
  };
  return labels[reason] || 'Doctor schedule changed';
}

async function getClinicReceptionistUserIds(clinicId) {
  if (!clinicId) return [];
  const rows = await Receptionist.findAll({
    where: { clinicId, isActive: true },
    attributes: ['userId'],
  });
  return rows.map((row) => row.userId).filter(Boolean);
}

async function notifyAppointmentRescheduled(appointmentId, actorRole, previousSnapshot) {
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [
      {
        model: Doctor,
        as: 'Doctor',
        include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
      },
      {
        model: Patient,
        as: 'Patient',
        include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
      },
    ],
  });
  if (!appointment) return;

  const plain = appointment.get({ plain: true });
  const doctorName = plain.Doctor?.User
    ? `Dr. ${plain.Doctor.User.firstName} ${plain.Doctor.User.lastName}`.trim()
    : 'The doctor';
  const previousSlot = formatAppointmentSlot(previousSnapshot);
  const nextSlot = formatAppointmentSlot(plain);
  const patientTarget = plain.Patient?.User?.id;
  const receptionistTargets = await getClinicReceptionistUserIds(plain.clinicId);

  if (actorRole === 'receptionist' && patientTarget) {
    await createNotification({
      userId: patientTarget,
      type: 'appointment_rescheduled',
      title: 'Appointment rescheduled',
      message: `${doctorName} appointment moved from ${previousSnapshot.appointmentDate} (${previousSlot}) to ${plain.appointmentDate} (${nextSlot}).`,
      link: '/app/patient-appointments',
      metadata: {
        appointmentId: plain.id,
        doctorId: plain.doctorId,
        patientId: plain.patientId,
        oldDate: previousSnapshot.appointmentDate,
        oldWindow: previousSnapshot.window,
        oldSerial: previousSnapshot.serial,
        newDate: plain.appointmentDate,
        newWindow: plain.window,
        newSerial: plain.serial,
      },
    });
    return;
  }

  const targets = [...new Set([plain.Doctor?.User?.id, ...receptionistTargets].filter(Boolean))];
  await Promise.all(
    targets.map((userId) =>
      createNotification({
        userId,
        type: 'appointment_rescheduled',
        title: 'Appointment rescheduled',
        message: `A patient moved ${doctorName} appointment from ${previousSnapshot.appointmentDate} (${previousSlot}) to ${plain.appointmentDate} (${nextSlot}).`,
        link: plain.Doctor?.User?.id === userId ? '/app/doctor-appointments' : '/app/receptionist-appointments',
        metadata: {
          appointmentId: plain.id,
          doctorId: plain.doctorId,
          patientId: plain.patientId,
          oldDate: previousSnapshot.appointmentDate,
          oldWindow: previousSnapshot.window,
          oldSerial: previousSnapshot.serial,
          newDate: plain.appointmentDate,
          newWindow: plain.window,
          newSerial: plain.serial,
        },
      })
    )
  );
}

export async function flagDoctorScheduleConflicts(doctor) {
  if (!doctor?.id) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const appointments = await Appointment.findAll({
    where: {
      doctorId: doctor.id,
      appointmentDate: { [Op.gte]: today },
      status: { [Op.in]: ['requested', 'approved'] },
    },
  });
  if (appointments.length === 0) return 0;

  const receptionistTargets = await getClinicReceptionistUserIds(doctor.clinicId);
  let flaggedCount = 0;

  for (const appointment of appointments) {
    const reason = getAppointmentScheduleConflictReason(appointment, doctor);
    if (!reason) continue;

    const shouldNotify =
      appointment.requiresReschedule !== true || appointment.rescheduleReason !== reason;

    await appointment.update({
      requiresReschedule: true,
      rescheduleReason: reason,
    });
    flaggedCount += 1;

    if (!shouldNotify) continue;

    const patient = await Patient.findByPk(appointment.patientId, {
      include: [{ model: User, as: 'User', attributes: ['id'] }],
    });
    const patientUserId = patient?.User?.id;
    const targets = [...new Set([patientUserId, ...receptionistTargets].filter(Boolean))];
    await Promise.all(
      targets.map((userId) =>
        createNotification({
          userId,
          type: 'appointment_requires_reschedule',
          title: 'Appointment needs rescheduling',
          message: `The appointment on ${appointment.appointmentDate} (${formatAppointmentSlot(appointment)}) now needs rescheduling. ${formatConflictReason(reason)}.`,
          link: userId === patientUserId ? '/app/patient-appointments' : '/app/receptionist-appointments',
          metadata: {
            appointmentId: appointment.id,
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            clinicId: appointment.clinicId,
            appointmentDate: appointment.appointmentDate,
            window: appointment.window,
            serial: appointment.serial,
            rescheduleReason: reason,
          },
        })
      )
    );
  }

  return flaggedCount;
}

async function notifyAppointmentTransition(appointmentId, nextStatus, actorRole) {
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [
      {
        model: Doctor,
        as: 'Doctor',
        include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
      },
      {
        model: Patient,
        as: 'Patient',
        include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
      },
    ],
  });
  if (!appointment) return;

  const plain = appointment.get({ plain: true });
  const doctorName = plain.Doctor?.User
    ? `Dr. ${plain.Doctor.User.firstName} ${plain.Doctor.User.lastName}`.trim()
    : 'Your doctor';
  const patientName = plain.Patient?.User
    ? `${plain.Patient.User.firstName} ${plain.Patient.User.lastName}`.trim()
    : 'Your patient';
  const date = plain.appointmentDate;
  const link = actorRole === 'patient' ? '/app/doctor-appointments' : '/app/patient-appointments';

  const configs = {
    approved: {
      targetUserId: plain.Patient?.User?.id,
      title: 'Appointment approved',
      message: `${doctorName} approved your appointment for ${date}.`,
      link: '/app/patient-appointments',
    },
    rejected: {
      targetUserId: plain.Patient?.User?.id,
      title: 'Appointment rejected',
      message: `${doctorName} rejected your appointment request for ${date}.`,
      link: '/app/patient-appointments',
    },
    completed: {
      targetUserId: plain.Patient?.User?.id,
      title: 'Appointment completed',
      message: `${doctorName} marked your appointment on ${date} as completed.`,
      link: '/app/patient-appointments',
    },
    cancelled: actorRole === 'patient'
      ? {
          targetUserId: plain.Doctor?.User?.id,
          title: 'Appointment cancelled',
          message: `${patientName} cancelled the appointment scheduled for ${date}.`,
          link: '/app/doctor-appointments',
        }
      : {
          targetUserId: plain.Patient?.User?.id,
          title: 'Appointment cancelled',
          message: `${doctorName} cancelled your appointment scheduled for ${date}.`,
          link: '/app/patient-appointments',
        },
  };

  const config = configs[nextStatus];
  if (!config?.targetUserId) return;

  await createNotification({
    userId: config.targetUserId,
    type: `appointment_${nextStatus}`,
    title: config.title,
    message: config.message,
    link: config.link || link,
    metadata: {
      appointmentId: plain.id,
      appointmentDate: date,
      status: nextStatus,
      doctorId: plain.doctorId,
      patientId: plain.patientId,
    },
  });
}

export async function create(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }
    const { doctorId, appointmentDate, window, type, reason, symptoms, timeBlock, triageConfirmed } = req.body;
    
    // Support both old (timeBlock) and new (window) booking styles
    if (!doctorId || !appointmentDate) {
      return res.status(400).json({ success: false, message: 'doctorId and appointmentDate required' });
    }
    
    const docId = parseInt(doctorId, 10);
    if (!Number.isInteger(docId) || docId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid doctorId required' });
    }
    if (!isValidDateString(appointmentDate)) {
      return res.status(400).json({ success: false, message: 'Valid appointmentDate (YYYY-MM-DD) required' });
    }

    const combinedNotes = `${reason || ''} ${symptoms || ''}`.toLowerCase();
    const redFlags = RED_FLAG_TERMS.filter((term) => combinedNotes.includes(term));
    if (redFlags.length > 0 && triageConfirmed !== true) {
      return res.status(400).json({
        success: false,
        code: 'TRIAGE_CONFIRMATION_REQUIRED',
        message: 'Red-flag symptoms detected. Please seek emergency care if needed and confirm to continue.',
        data: { redFlags },
      });
    }

    const appointment = await sequelize.transaction(async (transaction) => {
      // Lock the doctor row to serialize booking operations per doctor.
      const doctor = await Doctor.findByPk(docId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      // Require patient safety profile before first booking.
      const totalAppointments = await Appointment.count({
        where: { patientId: user.patientId },
        transaction,
      });
      if (totalAppointments === 0) {
        const patient = await Patient.findByPk(user.patientId, {
          include: [{ model: User, as: 'User', attributes: ['phone', 'dateOfBirth'] }],
          transaction,
        });
        const missingFields = [];
        if (!patient?.bloodType) missingFields.push('bloodType');
        if (!patient?.emergencyContact) missingFields.push('emergencyContact');
        if (!patient?.emergencyPhone) missingFields.push('emergencyPhone');
        if (!patient?.User?.phone) missingFields.push('phone');
        if (!patient?.User?.dateOfBirth) missingFields.push('dateOfBirth');
        if (missingFields.length > 0) {
          return {
            error: {
              status: 400,
              code: 'PROFILE_INCOMPLETE',
              message: 'Complete your health profile before booking your first appointment',
              data: { missingFields },
            },
          };
        }
      }

      const slot = await resolveAppointmentSlot({
        Appointment,
        doctor,
        doctorId: docId,
        appointmentDate,
        window,
        timeBlock,
        transaction,
      });
      if (slot.error) return slot;

      const created = await Appointment.create({
        patientId: user.patientId,
        doctorId: docId,
        clinicId: slot.clinicId,
        appointmentDate,
        window: slot.windowName,
        serial: slot.serialNum,
        timeBlock: slot.legacyTimeBlock,
        type: type || 'in_person',
        reason: reason || null,
        symptoms: symptoms || null,
        status: 'requested',
      }, { transaction });

      return { created, windowName: slot.windowName, serialNum: slot.serialNum };
    });
    if (appointment.error) {
      return res.status(appointment.error.status).json({
        success: false,
        ...(appointment.error.code ? { code: appointment.error.code } : {}),
        message: appointment.error.message,
        ...(appointment.error.data ? { data: appointment.error.data } : {}),
      });
    }
    logAudit({
      action: 'appointment_created',
      userId: user.id,
      entityType: 'appointment',
      entityId: String(appointment.created.id),
      details: { appointmentId: appointment.created.id, doctorId: docId, appointmentDate, window: appointment.windowName, serial: appointment.serialNum, timeBlock, status: 'requested' },
      ip: getClientIp(req),
    }).catch(() => {});
    const withAssocs = await Appointment.findByPk(appointment.created.id, {
      include: [
        { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }] },
        { model: Clinic, as: 'Clinic' },
        { model: Patient, as: 'Patient', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }] },
      ],
    });
    return res.status(201).json({
      success: true,
      data: {
        appointment: formatAppointment(withAssocs),
        triage: {
          redFlagDetected: redFlags.length > 0,
          matchedTerms: redFlags,
        },
      },
    });
  } catch (err) {
    console.error('Create appointment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

function formatAppointment(a) {
  const d = a.get ? a.get({ plain: true }) : a;
  const doctor = d.Doctor || {};
  const patient = d.Patient || {};
  return {
    id: d.id,
    patientId: d.patientId,
    doctorId: d.doctorId,
    clinicId: d.clinicId,
    appointmentDate: d.appointmentDate,
    timeBlock: d.timeBlock,
    window: d.window,
    serial: d.serial,
    type: d.type,
    reason: d.reason,
    symptoms: d.symptoms,
    status: d.status,
    requiresReschedule: Boolean(d.requiresReschedule),
    rescheduleReason: d.rescheduleReason ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    doctor: doctor.User ? { id: doctor.id, user: doctor.User } : { id: doctor.id },
    clinic: d.Clinic ? {
      id: d.Clinic.id,
      name: d.Clinic.name,
      addressLine: d.Clinic.addressLine,
      city: d.Clinic.city,
      area: d.Clinic.area,
    } : null,
    patient: patient.User ? { id: patient.id, user: patient.User } : { id: patient.id },
  };
}

export async function reschedule(req, res) {
  try {
    const user = req.user;
    if (!['patient', 'receptionist'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to reschedule appointments' });
    }

    const id = parseInt(req.params.id, 10);
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const isPatient = user.role === 'patient' && user.patientId === appointment.patientId;
    const isReceptionist = user.role === 'receptionist' && user.clinicId && user.clinicId === appointment.clinicId;
    if (!isPatient && !isReceptionist) {
      return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
    }

    const manuallyReschedulable =
      ['requested', 'approved'].includes(appointment.status) || appointment.requiresReschedule === true;
    if (!manuallyReschedulable) {
      return res.status(400).json({
        success: false,
        message: 'Only requested, approved, or flagged appointments can be rescheduled',
      });
    }
    if (['completed', 'cancelled', 'rejected', 'in_progress'].includes(appointment.status)) {
      return res.status(400).json({ success: false, message: 'This appointment cannot be rescheduled' });
    }

    const { appointmentDate, window, timeBlock, reason, symptoms } = req.body;
    if (!isValidDateString(appointmentDate)) {
      return res.status(400).json({ success: false, message: 'Valid appointmentDate (YYYY-MM-DD) required' });
    }

    const previousSnapshot = appointment.get({ plain: true });
    const outcome = await sequelize.transaction(async (transaction) => {
      const lockedAppointment = await Appointment.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lockedAppointment) {
        return { error: { status: 404, message: 'Appointment not found' } };
      }

      const doctor = await Doctor.findByPk(lockedAppointment.doctorId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const slot = await resolveAppointmentSlot({
        Appointment,
        doctor,
        doctorId: lockedAppointment.doctorId,
        appointmentDate,
        window,
        timeBlock,
        excludeAppointmentId: lockedAppointment.id,
        transaction,
      });
      if (slot.error) return slot;

      const nextStatus = lockedAppointment.status === 'approved' ? 'requested' : lockedAppointment.status;
      await lockedAppointment.update(
        {
          appointmentDate,
          clinicId: slot.clinicId,
          window: slot.windowName,
          serial: slot.serialNum,
          timeBlock: slot.legacyTimeBlock,
          type: lockedAppointment.type,
          reason: reason !== undefined ? reason || null : lockedAppointment.reason,
          symptoms: symptoms !== undefined ? symptoms || null : lockedAppointment.symptoms,
          status: nextStatus,
          requiresReschedule: false,
          rescheduleReason: null,
        },
        { transaction }
      );

      return { appointment: lockedAppointment, nextStatus };
    });

    if (outcome.error) {
      return res.status(outcome.error.status).json({ success: false, message: outcome.error.message });
    }

    await notifyAppointmentRescheduled(outcome.appointment.id, user.role, previousSnapshot);
    logAudit({
      action: 'appointment_rescheduled',
      userId: user.id,
      entityType: 'appointment',
      entityId: String(outcome.appointment.id),
      details: {
        appointmentId: outcome.appointment.id,
        actorRole: user.role,
        oldDate: previousSnapshot.appointmentDate,
        oldWindow: previousSnapshot.window,
        oldSerial: previousSnapshot.serial,
        oldStatus: previousSnapshot.status,
        newDate: outcome.appointment.appointmentDate,
        newWindow: outcome.appointment.window,
        newSerial: outcome.appointment.serial,
        newStatus: outcome.nextStatus,
      },
      ip: getClientIp(req),
    }).catch(() => {});

    const withAssocs = await Appointment.findByPk(outcome.appointment.id, {
      include: [
        { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }] },
        { model: Clinic, as: 'Clinic' },
        { model: Patient, as: 'Patient', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }] },
      ],
    });
    return res.json({ success: true, data: { appointment: formatAppointment(withAssocs) } });
  } catch (err) {
    console.error('Reschedule appointment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function listForPatient(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }
    const { status, limit = 20, page = 1, sortBy = 'appointmentDate', sortOrder = 'DESC' } = req.query;
    const where = { patientId: user.patientId };
    if (status) where.status = status;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const allowedSortFields = new Set(['appointmentDate', 'createdAt', 'status', 'type']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'appointmentDate';
    const safeSortOrder = String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [[safeSortBy, safeSortOrder]];
    const { rows, count } = await Appointment.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order,
      include: [
        { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }] },
        { model: Clinic, as: 'Clinic' },
      ],
    });
    const list = rows.map((a) => formatAppointment(a));
    return res.json({
      success: true,
      data: { appointments: list },
      pagination: { page: parseInt(page, 10), limit: limitNum, total: count },
    });
  } catch (err) {
    console.error('List patient appointments error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function listForDoctor(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }
    const doctorId = req.params.id;
    if (parseInt(doctorId, 10) !== user.doctorId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const { date, status, limit = 20, page = 1 } = req.query;
    const where = { doctorId: user.doctorId };
    if (date) where.appointmentDate = date;
    if (status) where.status = status;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { rows, count } = await Appointment.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['appointment_date', 'ASC'], ['time_block', 'ASC']],
      include: [
        { model: Patient, as: 'Patient', include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }] },
        { model: Clinic, as: 'Clinic' },
      ],
    });
    const list = rows.map((a) => formatAppointment(a));
    return res.json({
      success: true,
      data: { appointments: list },
      pagination: { page: parseInt(page, 10), limit: limitNum, total: count },
    });
  } catch (err) {
    console.error('List doctor appointments error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = req.user;
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }] },
        { model: Clinic, as: 'Clinic' },
        { model: Patient, as: 'Patient', include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }] },
      ],
    });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const isPatient = user.role === 'patient' && user.patientId === appointment.patientId;
    const isDoctor = user.role === 'doctor' && user.doctorId === appointment.doctorId;
    const isReceptionist = user.role === 'receptionist' && user.clinicId && appointment.clinicId === user.clinicId;
    const isAdmin = user.role === 'admin';
    if (!isPatient && !isDoctor && !isReceptionist && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this appointment' });
    }
    return res.json({ success: true, data: { appointment: formatAppointment(appointment) } });
  } catch (err) {
    console.error('Get appointment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function approve(req, res) {
  try {
    const user = req.user;
    if (!['doctor', 'receptionist'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to approve appointments' });
    }
    const id = parseInt(req.params.id, 10);
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (user.role === 'doctor' && appointment.doctorId !== user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not your appointment' });
    }
    if (user.role === 'receptionist' && appointment.clinicId !== user.clinicId) {
      return res.status(403).json({ success: false, message: 'Not in your clinic queue' });
    }
    if (appointment.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Only requested appointments can be approved' });
    }
    const oldStatus = appointment.status;
    await appointment.update({ status: 'approved' });
    await notifyAppointmentTransition(appointment.id, 'approved', 'doctor');
    logAudit({
      action: 'appointment_status_updated',
      userId: user.id,
      entityType: 'appointment',
      entityId: String(appointment.id),
      details: { appointmentId: appointment.id, oldStatus, newStatus: 'approved' },
      ip: getClientIp(req),
    }).catch(() => {});
    return res.json({ success: true, data: { appointment: formatAppointment(appointment) } });
  } catch (err) {
    console.error('Approve appointment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function reject(req, res) {
  try {
    const user = req.user;
    if (!['doctor', 'receptionist'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject appointments' });
    }
    const id = parseInt(req.params.id, 10);
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (user.role === 'doctor' && appointment.doctorId !== user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not your appointment' });
    }
    if (user.role === 'receptionist' && appointment.clinicId !== user.clinicId) {
      return res.status(403).json({ success: false, message: 'Not in your clinic queue' });
    }
    if (appointment.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Only requested appointments can be rejected' });
    }
    const oldStatus = appointment.status;
    await appointment.update({ status: 'rejected' });
    await notifyAppointmentTransition(appointment.id, 'rejected', 'doctor');
    logAudit({
      action: 'appointment_status_updated',
      userId: user.id,
      entityType: 'appointment',
      entityId: String(appointment.id),
      details: { appointmentId: appointment.id, oldStatus, newStatus: 'rejected' },
      ip: getClientIp(req),
    }).catch(() => {});
    return res.json({ success: true, data: { appointment: formatAppointment(appointment) } });
  } catch (err) {
    console.error('Reject appointment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function listForReceptionist(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'receptionist' || !user.clinicId) {
      return res.status(403).json({ success: false, message: 'Not a receptionist' });
    }
    const { date, status, limit = 50, page = 1 } = req.query;
    const where = { clinicId: user.clinicId };
    if (date) where.appointmentDate = date;
    if (status) where.status = status;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;

    const { rows, count } = await Appointment.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['appointment_date', 'ASC'], ['time_block', 'ASC']],
      include: [
        { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }] },
        { model: Patient, as: 'Patient', include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }] },
        { model: Clinic, as: 'Clinic' },
      ],
    });

    return res.json({
      success: true,
      data: { appointments: rows.map((row) => formatAppointment(row)), clinicId: user.clinicId },
      pagination: { page: parseInt(page, 10), limit: limitNum, total: count },
    });
  } catch (err) {
    console.error('List receptionist appointments error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function start(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }
    const id = parseInt(req.params.id, 10);
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appointment.doctorId !== user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not your appointment' });
    }
    if (appointment.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only approved appointments can be started' });
    }
    const oldStatus = appointment.status;
    await appointment.update({ status: 'in_progress' });
    logAudit({
      action: 'appointment_status_updated',
      userId: user.id,
      entityType: 'appointment',
      entityId: String(appointment.id),
      details: { appointmentId: appointment.id, oldStatus, newStatus: 'in_progress' },
      ip: getClientIp(req),
    }).catch(() => {});
    return res.json({ success: true, data: { appointment: formatAppointment(appointment) } });
  } catch (err) {
    console.error('Start appointment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function complete(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }
    const id = parseInt(req.params.id, 10);
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appointment.doctorId !== user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not your appointment' });
    }
    if (appointment.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Only in-progress appointments can be completed' });
    }
    const oldStatus = appointment.status;
    await appointment.update({ status: 'completed' });
    await notifyAppointmentTransition(appointment.id, 'completed', 'doctor');
    logAudit({
      action: 'appointment_status_updated',
      userId: user.id,
      entityType: 'appointment',
      entityId: String(appointment.id),
      details: { appointmentId: appointment.id, oldStatus, newStatus: 'completed' },
      ip: getClientIp(req),
    }).catch(() => {});
    return res.json({ success: true, data: { appointment: formatAppointment(appointment) } });
  } catch (err) {
    console.error('Complete appointment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function cancel(req, res) {
  try {
    const user = req.user;
    const id = parseInt(req.params.id, 10);
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const isPatient = user.role === 'patient' && user.patientId === appointment.patientId;
    const isDoctor = user.role === 'doctor' && user.doctorId === appointment.doctorId;
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel' });
    }
    if (['cancelled', 'rejected', 'completed'].includes(appointment.status)) {
      return res.status(400).json({ success: false, message: 'Appointment cannot be cancelled' });
    }
    const oldStatus = appointment.status;
    await appointment.update({ status: 'cancelled' });
    await notifyAppointmentTransition(appointment.id, 'cancelled', isPatient ? 'patient' : 'doctor');
    logAudit({
      action: 'appointment_status_updated',
      userId: user.id,
      entityType: 'appointment',
      entityId: String(appointment.id),
      details: { appointmentId: appointment.id, oldStatus, newStatus: 'cancelled' },
      ip: getClientIp(req),
    }).catch(() => {});
    return res.json({ success: true, data: { appointment: formatAppointment(appointment) } });
  } catch (err) {
    console.error('Cancel appointment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}
