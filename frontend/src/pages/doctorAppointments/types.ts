export interface AppointmentItem {
  id: number;
  appointmentDate: string;
  timeBlock: string;
  type: string;
  status: string;
  reason?: string;
  symptoms?: string;
  window?: string;
  serial?: number;
  patient?: { id: number; user?: { firstName: string; lastName: string } };
}

export interface DoctorPatientRow {
  patientId: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  profile?: {
    bloodType?: string;
    allergies?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  };
  totalVisits: number;
  lastVisitDate?: string | null;
  nextVisitDate?: string | null;
}

export interface PrescriptionData {
  id: number;
  diagnosis?: string;
  medicines?: MedicineEntry[];
  notes?: string;
}

export interface MedicineEntry {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface PrescriptionApiResponse {
  success: boolean;
  data: { prescription: PrescriptionData };
}

export interface PatientContextData {
  id: number;
  user: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
  };
  medical: {
    bloodType?: string;
    allergies?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    insuranceProvider?: string;
  };
  summary: {
    totalVisitsWithDoctor: number;
    recentAppointments: Array<{
      id: number;
      appointmentDate: string;
      status: string;
      reason?: string;
      symptoms?: string;
      hasPrescription?: boolean;
      diagnosis?: string | null;
    }>;
  };
}

export type AppointmentAction = 'approve' | 'reject' | 'start' | 'complete';

export const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];
