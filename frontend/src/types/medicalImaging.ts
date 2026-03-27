export interface MedicalImagingRecord {
  id: number;
  patientId: number;
  appointmentId?: number | null;
  uploadedByUserId: number;
  title: string;
  studyType: string;
  bodyPart?: string | null;
  studyDate?: string | null;
  sourceType: string;
  reportText?: string | null;
  notes?: string | null;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  uploader?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  appointment?: {
    id: number;
    appointmentDate?: string;
    type?: string;
    status?: string;
    clinicId?: number | null;
    clinic?: {
      id: number;
      name?: string;
      type?: string;
      addressLine?: string;
      area?: string;
      city?: string;
      phone?: string;
      status?: string;
    } | null;
  } | null;
}
