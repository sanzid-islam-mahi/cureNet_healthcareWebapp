import sequelize from '../config/database.js';
import User from './User.js';
import Clinic from './Clinic.js';
import Doctor from './Doctor.js';
import Patient from './Patient.js';
import PatientMedicalHistory from './PatientMedicalHistory.js';
import './PasswordResetToken.js';
import EmailVerificationCode from './EmailVerificationCode.js';
import Appointment from './Appointment.js';
import Prescription from './Prescription.js';
import MedicationReminderPlan from './MedicationReminderPlan.js';
import MedicationReminderDose from './MedicationReminderDose.js';
import Rating from './Rating.js';
import AuditLog from './AuditLog.js';
import Notification from './Notification.js';

const db = {
  sequelize,
  User,
  Clinic,
  Doctor,
  Patient,
  PatientMedicalHistory,
  EmailVerificationCode,
  Appointment,
  Prescription,
  MedicationReminderPlan,
  MedicationReminderDose,
  Rating,
  AuditLog,
  Notification,
};

export default db;
