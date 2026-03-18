import sequelize from '../config/database.js';
import User from './User.js';
import Doctor from './Doctor.js';
import Patient from './Patient.js';
import './PasswordResetToken.js';
import Appointment from './Appointment.js';
import Prescription from './Prescription.js';
import Rating from './Rating.js';
import AuditLog from './AuditLog.js';

const db = {
  sequelize,
  User,
  Doctor,
  Patient,
  Appointment,
  Prescription,
  Rating,
  AuditLog,
};

export default db;
