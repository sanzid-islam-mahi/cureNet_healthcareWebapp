import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Patient from './Patient.js';
import Prescription from './Prescription.js';
import Appointment from './Appointment.js';

export const reminderPlanStatuses = ['active', 'paused', 'stopped'];

const MedicationReminderPlan = sequelize.define(
  'MedicationReminderPlan',
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
    prescriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'prescriptions', key: 'id' },
      onDelete: 'CASCADE',
    },
    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'appointments', key: 'id' },
      onDelete: 'SET NULL',
    },
    medicineIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    medicineName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    dosage: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    frequencyLabel: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...reminderPlanStatuses),
      allowNull: false,
      defaultValue: 'active',
    },
    timezone: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'UTC',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    scheduleTimes: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of exact reminder times in HH:MM format chosen by the patient',
    },
    lastGeneratedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'medication_reminder_plans',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['prescription_id'] },
      { fields: ['status'] },
    ],
  }
);

Patient.hasMany(MedicationReminderPlan, { foreignKey: 'patientId' });
MedicationReminderPlan.belongsTo(Patient, { foreignKey: 'patientId' });
Prescription.hasMany(MedicationReminderPlan, { foreignKey: 'prescriptionId' });
MedicationReminderPlan.belongsTo(Prescription, { foreignKey: 'prescriptionId' });
Appointment.hasMany(MedicationReminderPlan, { foreignKey: 'appointmentId' });
MedicationReminderPlan.belongsTo(Appointment, { foreignKey: 'appointmentId' });

export default MedicationReminderPlan;
