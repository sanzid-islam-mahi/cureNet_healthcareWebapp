import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { MEDICAL_IMAGING_STUDY_TYPES, serializeMedicalImagingRecord } from '../lib/medicalImaging.js';
import { getUploadsDir } from '../config/appPaths.js';
const { MedicalImagingRecord, Patient, Appointment, User, Clinic } = db;

const PATIENT_IMAGING_UPLOAD_LIMIT_PER_DAY = Math.max(0, parseInt(process.env.PATIENT_IMAGING_UPLOAD_LIMIT_PER_DAY || '5', 10) || 0);

function uploadsRoot() {
  return getUploadsDir();
}

function removeUploadedFile(fileUrl) {
  if (!fileUrl) return;
  const filename = path.basename(fileUrl);
  const fullPath = path.join(uploadsRoot(), filename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

async function findPatientOrThrow(patientId) {
  if (!Number.isFinite(patientId)) return null;
  return Patient.findByPk(patientId);
}

async function doctorHasPatientRelationship(doctorId, patientId) {
  if (!doctorId || !patientId) return false;
  const count = await Appointment.count({ where: { doctorId, patientId } });
  return count > 0;
}

async function canReceptionistAccessAppointment(receptionistUser, appointment) {
  return Boolean(
    receptionistUser?.role === 'receptionist'
      && receptionistUser?.clinicId
      && appointment?.clinicId
      && receptionistUser.clinicId === appointment.clinicId
  );
}

async function loadAppointmentForImaging(appointmentId) {
  if (!appointmentId) return null;
  return Appointment.findByPk(appointmentId, {
    include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'addressLine', 'area', 'city', 'phone', 'status'], required: false }],
  });
}

async function loadImagingRecordById(id) {
  return MedicalImagingRecord.findByPk(id, {
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
  });
}

function getDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function getPatientUploadCountToday(userId) {
  const { start, end } = getDayBounds();
  return MedicalImagingRecord.count({
    where: {
      uploadedByUserId: userId,
      sourceType: 'external',
      createdAt: {
        [Op.gte]: start,
        [Op.lt]: end,
      },
    },
  });
}

export async function createImagingRecord(req, res) {
  try {
    const user = req.user;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Imaging file is required' });
    }

    const requestedPatientId = req.body.patientId ? parseInt(req.body.patientId, 10) : null;
    const appointmentId = req.body.appointmentId ? parseInt(req.body.appointmentId, 10) : null;
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const studyType = typeof req.body.studyType === 'string' ? req.body.studyType.trim().toLowerCase() : 'other';
    const bodyPart = typeof req.body.bodyPart === 'string' ? req.body.bodyPart.trim() : null;
    const studyDate = typeof req.body.studyDate === 'string' && req.body.studyDate ? req.body.studyDate : null;
    const reportText = typeof req.body.reportText === 'string' ? req.body.reportText.trim() : null;
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : null;

    if (!title) {
      removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (!MEDICAL_IMAGING_STUDY_TYPES.includes(studyType)) {
      removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Invalid studyType value' });
    }

    if (!['doctor', 'receptionist', 'patient'].includes(user.role)) {
      removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(403).json({ success: false, message: 'Unauthorized to upload imaging records' });
    }

    const patientId = user.role === 'patient' ? user.patientId : requestedPatientId;
    if (!Number.isFinite(patientId)) {
      removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Valid patientId is required' });
    }

    const patient = await findPatientOrThrow(patientId);
    if (!patient) {
      removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    let appointment = null;
    if (user.role === 'patient') {
      if (PATIENT_IMAGING_UPLOAD_LIMIT_PER_DAY > 0) {
        const uploadsToday = await getPatientUploadCountToday(user.id);
        if (uploadsToday >= PATIENT_IMAGING_UPLOAD_LIMIT_PER_DAY) {
          removeUploadedFile(`/uploads/${req.file.filename}`);
          return res.status(429).json({
            success: false,
            code: 'PATIENT_IMAGING_UPLOAD_LIMIT_REACHED',
            message: `Patient uploads are limited to ${PATIENT_IMAGING_UPLOAD_LIMIT_PER_DAY} imaging files per day`,
            data: { limit: PATIENT_IMAGING_UPLOAD_LIMIT_PER_DAY, uploadsToday },
          });
        }
      }
      if (appointmentId != null) {
        removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(400).json({ success: false, message: 'Patient uploads must stay external and cannot be linked to an appointment' });
      }
    } else {
      if (!appointmentId) {
        removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(400).json({ success: false, message: 'appointmentId is required for staff uploads' });
      }
      appointment = await loadAppointmentForImaging(appointmentId);
      if (!appointment || appointment.patientId !== patientId) {
        removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(400).json({ success: false, message: 'Appointment does not match the selected patient' });
      }
      if (user.role === 'doctor') {
        if (appointment.doctorId !== user.doctorId) {
          removeUploadedFile(`/uploads/${req.file.filename}`);
          return res.status(403).json({ success: false, message: 'Doctor is not authorized to upload imaging for this appointment' });
        }
      }
      if (user.role === 'receptionist') {
        const allowed = await canReceptionistAccessAppointment(user, appointment);
        if (!allowed) {
          removeUploadedFile(`/uploads/${req.file.filename}`);
          return res.status(403).json({ success: false, message: 'Receptionist is not authorized to upload imaging for this appointment' });
        }
      }
    }

    const created = await MedicalImagingRecord.create({
      patientId,
      appointmentId,
      uploadedByUserId: user.id,
      title,
      studyType,
      bodyPart: bodyPart || null,
      studyDate,
      sourceType: user.role === 'patient' ? 'external' : 'provider',
      reportText: reportText || null,
      notes: notes || null,
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      status: 'available',
    });

    const record = await loadImagingRecordById(created.id);
    return res.status(201).json({
      success: true,
      data: { record: serializeMedicalImagingRecord(record) },
    });
  } catch (err) {
    console.error('Create imaging record error:', err);
    if (req.file?.filename) {
      removeUploadedFile(`/uploads/${req.file.filename}`);
    }
    return res.status(500).json({ success: false, message: err.message || 'Failed to upload imaging record' });
  }
}

export async function updateImagingRecord(req, res) {
  try {
    const user = req.user;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Invalid imaging id' });
    }

    const record = await loadImagingRecordById(id);
    if (!record) {
      if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ success: false, message: 'Imaging record not found' });
    }

    if (user.role === 'patient') {
      if (user.patientId !== record.patientId || record.sourceType !== 'external') {
        if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    } else if (user.role === 'doctor') {
      if (!record.appointmentId) {
        if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(403).json({ success: false, message: 'Doctors can only edit appointment-linked imaging' });
      }
      const appointment = await loadAppointmentForImaging(record.appointmentId);
      if (!appointment || appointment.doctorId !== user.doctorId) {
        if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    } else if (user.role === 'receptionist') {
      if (!record.appointmentId) {
        if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(403).json({ success: false, message: 'Receptionists can only edit appointment-linked imaging' });
      }
      const appointment = await loadAppointmentForImaging(record.appointmentId);
      if (!appointment || !(await canReceptionistAccessAppointment(user, appointment))) {
        if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    } else if (user.role !== 'admin') {
      if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updates = {};
    if (typeof req.body.title === 'string') updates.title = req.body.title.trim();
    if (typeof req.body.studyType === 'string') {
      const studyType = req.body.studyType.trim().toLowerCase();
      if (!MEDICAL_IMAGING_STUDY_TYPES.includes(studyType)) {
        if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
        return res.status(400).json({ success: false, message: 'Invalid studyType value' });
      }
      updates.studyType = studyType;
    }
    if (req.body.bodyPart !== undefined) updates.bodyPart = req.body.bodyPart?.trim() || null;
    if (req.body.studyDate !== undefined) updates.studyDate = req.body.studyDate || null;
    if (req.body.reportText !== undefined) updates.reportText = req.body.reportText?.trim() || null;
    if (req.body.notes !== undefined) updates.notes = req.body.notes?.trim() || null;
    if (req.file) {
      updates.fileUrl = `/uploads/${req.file.filename}`;
      updates.fileName = req.file.originalname;
      updates.mimeType = req.file.mimetype;
      updates.fileSize = req.file.size;
    }

    const previousFileUrl = record.fileUrl;
    await record.update(updates);
    if (req.file && previousFileUrl && previousFileUrl !== updates.fileUrl) {
      removeUploadedFile(previousFileUrl);
    }

    const updated = await loadImagingRecordById(record.id);
    return res.json({
      success: true,
      data: { record: serializeMedicalImagingRecord(updated) },
    });
  } catch (err) {
    console.error('Update imaging record error:', err);
    if (req.file?.filename) removeUploadedFile(`/uploads/${req.file.filename}`);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update imaging record' });
  }
}

export async function listPatientImaging(req, res) {
  try {
    const viewer = req.user;
    const patientId = parseInt(req.params.patientId, 10);

    if (!Number.isFinite(patientId)) {
      return res.status(400).json({ success: false, message: 'Valid patientId is required' });
    }

    if (viewer.role === 'patient' && viewer.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (viewer.role === 'doctor') {
      const allowed = await doctorHasPatientRelationship(viewer.doctorId, patientId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }
    if (!['patient', 'doctor', 'admin'].includes(viewer.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const records = await MedicalImagingRecord.findAll({
      where: { patientId },
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
    });

    return res.json({
      success: true,
      data: { records: records.map(serializeMedicalImagingRecord) },
    });
  } catch (err) {
    console.error('List patient imaging error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load imaging records' });
  }
}

export async function listAppointmentImaging(req, res) {
  try {
    const viewer = req.user;
    const appointmentId = parseInt(req.params.appointmentId, 10);
    if (!Number.isFinite(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Valid appointmentId is required' });
    }

    const appointment = await loadAppointmentForImaging(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const isPatient = viewer.role === 'patient' && viewer.patientId === appointment.patientId;
    const isDoctor = viewer.role === 'doctor' && viewer.doctorId === appointment.doctorId;
    const isReceptionist = await canReceptionistAccessAppointment(viewer, appointment);
    const isAdmin = viewer.role === 'admin';
    if (!isPatient && !isDoctor && !isReceptionist && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const records = await MedicalImagingRecord.findAll({
      where: { appointmentId },
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
    });

    return res.json({ success: true, data: { records: records.map(serializeMedicalImagingRecord) } });
  } catch (err) {
    console.error('List appointment imaging error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load appointment imaging' });
  }
}

export async function listMyImaging(req, res) {
  try {
    const viewer = req.user;
    if (viewer.role !== 'patient' || !viewer.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }

    const records = await MedicalImagingRecord.findAll({
      where: { patientId: viewer.patientId },
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
    });

    return res.json({
      success: true,
      data: { records: records.map(serializeMedicalImagingRecord) },
    });
  } catch (err) {
    console.error('List my imaging error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load imaging records' });
  }
}

export async function getImagingRecord(req, res) {
  try {
    const viewer = req.user;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid imaging id' });
    }

    const record = await loadImagingRecordById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Imaging record not found' });
    }

    if (viewer.role === 'patient' && viewer.patientId !== record.patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (viewer.role === 'doctor') {
      const allowed = await doctorHasPatientRelationship(viewer.doctorId, record.patientId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }
    if (viewer.role === 'receptionist') {
      if (!record.appointmentId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      const appointment = await loadAppointmentForImaging(record.appointmentId);
      if (!appointment || !(await canReceptionistAccessAppointment(viewer, appointment))) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }
    if (!['patient', 'doctor', 'receptionist', 'admin'].includes(viewer.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    return res.json({
      success: true,
      data: { record: serializeMedicalImagingRecord(record) },
    });
  } catch (err) {
    console.error('Get imaging record error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load imaging record' });
  }
}

export async function deleteImagingRecord(req, res) {
  try {
    const viewer = req.user;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid imaging id' });
    }
    if (!['doctor', 'receptionist', 'admin'].includes(viewer.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const record = await loadImagingRecordById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Imaging record not found' });
    }

    if (viewer.role === 'doctor') {
      const allowed = await doctorHasPatientRelationship(viewer.doctorId, record.patientId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }
    if (viewer.role === 'receptionist') {
      if (!record.appointmentId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      const appointment = await loadAppointmentForImaging(record.appointmentId);
      if (!appointment || !(await canReceptionistAccessAppointment(viewer, appointment))) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    const fileUrl = record.fileUrl;
    await record.destroy();
    removeUploadedFile(fileUrl);

    return res.json({ success: true, message: 'Imaging record deleted' });
  } catch (err) {
    console.error('Delete imaging record error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete imaging record' });
  }
}
