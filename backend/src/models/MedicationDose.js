import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import PatientMedicationTracker from './PatientMedicationTracker.js';

const MedicationDose = sequelize.define(
  'MedicationDose',
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
    trackerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'patient_medication_trackers', key: 'id' },
      onDelete: 'CASCADE',
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Planned date-time (UTC) when the dose should be taken',
    },
    windowEndAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Optional end of the acceptable window for taking the dose',
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'notified', 'taken', 'missed', 'skipped'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    takenAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM('system', 'manual'),
      allowNull: false,
      defaultValue: 'system',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: 'medication_doses',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tracker_id', 'scheduled_at'] },
      { fields: ['patient_id', 'scheduled_at'] },
    ],
  }
);

MedicationDose.belongsTo(PatientMedicationTracker, { foreignKey: 'trackerId', as: 'tracker' });

export default MedicationDose;

