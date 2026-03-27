import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Patient from './Patient.js';
import Doctor from './Doctor.js';
import Clinic from './Clinic.js';

const statusEnum = ['requested', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'];
const typeEnum = ['in_person', 'video', 'phone'];

const Appointment = sequelize.define(
  'Appointment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'patients', key: 'id' },
      onDelete: 'CASCADE',
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'doctors', key: 'id' },
      onDelete: 'CASCADE',
    },
    clinicId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'clinics', key: 'id' },
      onDelete: 'SET NULL',
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    timeBlock: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'DEPRECATED: Use window+serial instead. Slot string e.g. 09:00',
    },
    window: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Window name: morning, noon, or evening',
    },
    serial: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Serial number within the window (1, 2, 3, ...)',
    },
    type: {
      type: DataTypes.ENUM(...typeEnum),
      allowNull: false,
      defaultValue: 'in_person',
    },
    reason: { type: DataTypes.STRING(500), allowNull: true },
    symptoms: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM(...statusEnum),
      allowNull: false,
      defaultValue: 'requested',
    },
  },
  {
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['doctor_id', 'appointment_date'] },
      { fields: ['patient_id'] },
      { fields: ['status'] },
    ],
  }
);

Patient.hasMany(Appointment, { foreignKey: 'patientId' });
Appointment.belongsTo(Patient, { foreignKey: 'patientId' });
Doctor.hasMany(Appointment, { foreignKey: 'doctorId' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId' });
Clinic.hasMany(Appointment, { foreignKey: 'clinicId', as: 'Appointments' });
Appointment.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'Clinic' });

export default Appointment;
export { statusEnum, typeEnum };
