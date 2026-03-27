import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedMedicalImagingFile,
  serializeMedicalImagingRecord,
} from '../src/lib/medicalImaging.js';

test('isAllowedMedicalImagingFile accepts common imaging image/pdf formats', () => {
  assert.equal(isAllowedMedicalImagingFile({ mimetype: 'application/pdf' }), true);
  assert.equal(isAllowedMedicalImagingFile({ mimetype: 'image/jpeg' }), true);
  assert.equal(isAllowedMedicalImagingFile({ mimetype: 'image/png' }), true);
  assert.equal(isAllowedMedicalImagingFile({ mimetype: 'text/plain' }), false);
});

test('serializeMedicalImagingRecord preserves uploader and clinic-linked appointment context', () => {
  const record = {
    id: 9,
    patientId: 4,
    appointmentId: 11,
    uploadedByUserId: 2,
    title: 'Chest X-ray',
    studyType: 'xray',
    bodyPart: 'Chest',
    studyDate: '2026-03-20',
    sourceType: 'provider',
    reportText: 'No focal consolidation.',
    notes: 'Uploaded after follow-up review.',
    fileUrl: '/uploads/imaging-123.pdf',
    fileName: 'chest-xray.pdf',
    mimeType: 'application/pdf',
    fileSize: 2048,
    status: 'available',
    createdAt: '2026-03-21T10:00:00.000Z',
    updatedAt: '2026-03-21T10:00:00.000Z',
    Uploader: { id: 2, firstName: 'Sara', lastName: 'Khan', email: 'sara@example.com' },
    Appointment: {
      id: 11,
      appointmentDate: '2026-03-18',
      type: 'in_person',
      status: 'completed',
      clinicId: 3,
      Clinic: {
        id: 3,
        name: 'City Diagnostic Clinic',
        type: 'clinic',
        addressLine: '12 Main Road',
        area: 'Banani',
        city: 'Dhaka',
        phone: '123',
        status: 'active',
      },
    },
  };

  const serialized = serializeMedicalImagingRecord(record);
  assert.equal(serialized.uploader?.firstName, 'Sara');
  assert.equal(serialized.appointment?.clinic?.name, 'City Diagnostic Clinic');
  assert.equal(serialized.fileName, 'chest-xray.pdf');
});
