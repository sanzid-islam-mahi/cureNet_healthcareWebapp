import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Patient from './Patient.js';
import Prescription from './Prescription.js';

const PatientMedicationTracker = sequelize.define(
  'PatientMedicationTracker',
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
    medicineKey: {
      type: DataTypes.STRING(120),
      allowNull: false,
      comment: 'Stable medicine identifier within a prescription payload',
    },
    medicineName: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    timesPerDay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    mealTiming: {
      type: DataTypes.ENUM('before_meal', 'after_meal', 'with_meal', 'any'),
      allowNull: false,
      defaultValue: 'any',
    },
    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    remindersEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reminderTimes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of HH:mm strings',
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'completed'),
      allowNull: false,
      defaultValue: 'active',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'patient_medication_trackers',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['patient_id', 'prescription_id', 'medicine_key'] },
      { fields: ['patient_id', 'status'] },
    ],
  }
);

Patient.hasMany(PatientMedicationTracker, { foreignKey: 'patientId' });
PatientMedicationTracker.belongsTo(Patient, { foreignKey: 'patientId' });
Prescription.hasMany(PatientMedicationTracker, { foreignKey: 'prescriptionId' });
PatientMedicationTracker.belongsTo(Prescription, { foreignKey: 'prescriptionId' });

export default PatientMedicationTracker;
