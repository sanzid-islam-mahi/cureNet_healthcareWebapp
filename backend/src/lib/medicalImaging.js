export const MEDICAL_IMAGING_STUDY_TYPES = [
  'xray',
  'mri',
  'ct',
  'ultrasound',
  'echo',
  'mammography',
  'other',
];

export const MEDICAL_IMAGING_SOURCE_TYPES = ['provider', 'external'];
export const MEDICAL_IMAGING_STATUSES = ['available', 'archived'];

export function isAllowedMedicalImagingFile(file) {
  if (!file) return false;
  const allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/tiff',
    'image/bmp',
  ]);
  return allowedMimeTypes.has(file.mimetype);
}

function serializeUser(user) {
  if (!user) return null;
  const value = user.get ? user.get({ plain: true }) : user;
  return {
    id: value.id,
    firstName: value.firstName,
    lastName: value.lastName,
    email: value.email,
  };
}

function serializeClinic(clinic) {
  if (!clinic) return null;
  const value = clinic.get ? clinic.get({ plain: true }) : clinic;
  return {
    id: value.id,
    name: value.name,
    type: value.type,
    addressLine: value.addressLine,
    area: value.area,
    city: value.city,
    phone: value.phone,
    status: value.status,
  };
}

function serializeAppointment(appointment) {
  if (!appointment) return null;
  const value = appointment.get ? appointment.get({ plain: true }) : appointment;
  return {
    id: value.id,
    appointmentDate: value.appointmentDate,
    type: value.type,
    status: value.status,
    clinicId: value.clinicId ?? null,
    clinic: serializeClinic(value.Clinic),
  };
}

export function serializeMedicalImagingRecord(record) {
  if (!record) return null;
  const value = record.get ? record.get({ plain: true }) : record;

  return {
    id: value.id,
    patientId: value.patientId,
    appointmentId: value.appointmentId,
    uploadedByUserId: value.uploadedByUserId,
    title: value.title,
    studyType: value.studyType,
    bodyPart: value.bodyPart,
    studyDate: value.studyDate,
    sourceType: value.sourceType,
    reportText: value.reportText,
    notes: value.notes,
    fileUrl: value.fileUrl,
    fileName: value.fileName,
    mimeType: value.mimeType,
    fileSize: value.fileSize,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    uploader: serializeUser(value.Uploader),
    appointment: serializeAppointment(value.Appointment),
  };
}
