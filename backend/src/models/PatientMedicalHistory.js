import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Patient from './Patient.js';

const PatientMedicalHistory = sequelize.define(
  'PatientMedicalHistory',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'patients', key: 'id' },
      onDelete: 'CASCADE',
    },
    chronicConditions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    pastProcedures: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    familyHistory: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    currentLongTermMedications: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    immunizationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lifestyleRiskNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    generalMedicalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'patient_medical_histories',
    timestamps: true,
    underscored: true,
  }
);

Patient.hasOne(PatientMedicalHistory, { foreignKey: 'patientId' });
PatientMedicalHistory.belongsTo(Patient, { foreignKey: 'patientId' });

export default PatientMedicalHistory;
