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
  strength?: string;
  dose?: string;
  unit?: string;
  frequency?: string;
  duration?: string;
  route?: string;
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
    insuranceNumber?: string;
    profileImage?: string;
  };
  history: {
    chronicConditions?: string[];
    pastProcedures?: string[];
    familyHistory?: string[];
    currentLongTermMedications?: string[];
    immunizationNotes?: string;
    lifestyleRiskNotes?: string;
    generalMedicalNotes?: string;
  };
  summary: {
    totalVisitsWithDoctor: number;
    prescriptionCount?: number;
    activeReminderCount?: number;
    recentAppointments: Array<{
      id: number;
      appointmentDate: string;
      status: string;
      type?: string;
      window?: string;
      serial?: number;
      reason?: string;
      symptoms?: string;
      hasPrescription?: boolean;
      diagnosis?: string | null;
    }>;
  };
  prescriptions: Array<{
    id: number;
    appointmentId: number;
    diagnosis?: string | null;
    notes?: string | null;
    createdAt?: string;
    appointment?: {
      id: number;
      appointmentDate?: string;
      status?: string;
      type?: string;
      reason?: string;
      symptoms?: string;
      window?: string;
      serial?: number;
    } | null;
    medicines?: Array<MedicineEntry & {
      activeReminder?: {
        id: number;
        prescriptionId: number;
        medicineIndex: number;
        medicineName: string;
        status: string;
        scheduleTimes: string[];
      } | null;
    }>;
  }>;
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
